import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import { walkFiles } from "../lib/files.js";
import { isTestCommand, isValidationCommand } from "../lib/classify.js";
import { commonCapabilities } from "../lib/collection.js";
import {
  applyPromptFeatures,
  compactProject,
  extractText,
  finalizeSession as finalizeNormalizedSession,
  getOrCreateSession as getSession,
  registerPath,
  updateTime
} from "../lib/session.js";
import { inWindow } from "../lib/time.js";

export async function collectCodex({ window, privacy, orgSlug, teamSlug, contentInspection = true, sourcePaths = {} }) {
  const base = sourcePaths.codex || join(homedir(), ".codex", "sessions");
  if (!existsSync(base)) {
    return { source: "codex", status: "missing", sessions: [] };
  }

  const files = walkFiles(base, (_full, entry) => entry.endsWith(".jsonl"), 6);
  const bySession = new Map();
  for (const file of files) {
    await parseFile(file.path, bySession, { window, privacy, orgSlug, teamSlug, contentInspection });
  }

  return {
    source: "codex",
    status: "ready",
    capabilities: commonCapabilities({ contentInspection, validationObservable: true }),
    files_scanned: files.length,
    sessions: [...bySession.values()].map(finalizeSession)
  };
}

async function parseFile(filePath, bySession, ctx) {
  let sessionId = filePath;
  let cwd = null;
  let model = null;
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    const ts = typeof row.timestamp === "string" ? Date.parse(row.timestamp) : NaN;
    const payload = row.payload;
    if (row.type === "session_meta" && payload && typeof payload === "object") {
      if (typeof payload.id === "string") sessionId = payload.id;
      if (typeof payload.cwd === "string") cwd = payload.cwd;
      if (typeof payload.model === "string") model = payload.model;
    }
    if (!Number.isFinite(ts) || !inWindow(ts, ctx.window)) continue;

    const session = getSession(bySession, sessionId, "codex", ctx, ts);
    updateTime(session, ts);
    if (cwd) {
      session.cwd_hash ||= ctx.privacy.hash(cwd);
      session.project_label_hash ||= ctx.privacy.hash(compactProject(cwd));
    }
    if (model) session.model_names.add(model);

    if (row.type === "event_msg" && payload?.info?.total_token_usage) {
      const usage = payload.info.total_token_usage;
      const cached = usage.cached_input_tokens || 0;
      session.input_tokens = Math.max(0, (usage.input_tokens || 0) - cached);
      session.output_tokens = usage.output_tokens || session.output_tokens;
      session.cache_read_tokens = cached;
    }

    if (row.type !== "response_item" || !payload || typeof payload !== "object") continue;
    if (payload.role === "user") {
      session.user_turns += 1;
      if (ctx.contentInspection) {
        const text = extractText(payload.content);
        applyPromptFeatures(session, text);
      }
    }
    if (payload.role === "assistant") session.assistant_turns += 1;
    if (payload.type === "function_call" || payload.type === "local_shell_call") {
      session.tool_calls += 1;
      const name = payload.name || (payload.type === "local_shell_call" ? "shell" : "function");
      if (name === "shell" || payload.type === "local_shell_call") session.shell_commands_count += 1;
      const args = parseArguments(payload.arguments);
      registerPath(session, args.path);
      registerPath(session, args.file_path);
      if (typeof args.cmd === "string") {
        if (isTestCommand(args.cmd)) session.test_commands_count += 1;
        if (isValidationCommand(args.cmd)) session.validation_commands_count += 1;
        if (/\bgit\b/.test(args.cmd)) session.git_actions_count += 1;
        const paths = args.cmd.match(/[\w./-]+\.[a-zA-Z0-9]{1,8}\b/g) || [];
        for (const p of paths.slice(0, 8)) registerPath(session, p);
      }
    }
  }
}

function parseArguments(raw) {
  if (!raw || typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** @param {import("../lib/session.js").SessionDraft} s */
function finalizeSession(s) {
  return finalizeNormalizedSession(s, {
    hasAction: (d) => d.tool_calls > 0 || d.file_refs_count > 0 || d.shell_commands_count > 0,
    hasValidation: (d) => d.test_commands_count > 0 || d.validation_commands_count > 0
  });
}
