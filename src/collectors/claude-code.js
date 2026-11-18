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

export async function collectClaudeCode({ window, privacy, orgSlug, teamSlug, contentInspection = true, sourcePaths = {} }) {
  const base = sourcePaths.claudeCode || join(homedir(), ".claude", "projects");
  if (!existsSync(base)) {
    return { source: "claude_code", status: "missing", sessions: [] };
  }

  const files = walkFiles(base, (_full, entry) => entry.endsWith(".jsonl"), 2);
  const bySession = new Map();

  for (const file of files) {
    await parseFile(file.path, bySession, { window, privacy, orgSlug, teamSlug, contentInspection });
  }

  return {
    source: "claude_code",
    status: "ready",
    capabilities: commonCapabilities({ contentInspection, validationObservable: true }),
    files_scanned: files.length,
    sessions: [...bySession.values()].map(finalizeSession)
  };
}

async function parseFile(filePath, bySession, ctx) {
  const fallbackId = filePath.split("/").pop()?.replace(/\.jsonl$/, "") || filePath;
  let sessionId = fallbackId;
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
    if (!Number.isFinite(ts) || !inWindow(ts, ctx.window)) continue;
    if (typeof row.sessionId === "string") sessionId = row.sessionId;

    const session = getSession(bySession, sessionId, "claude_code", ctx, ts);
    updateTime(session, ts);

    if (typeof row.cwd === "string") {
      session.cwd_hash ||= ctx.privacy.hash(row.cwd);
      session.project_label_hash ||= ctx.privacy.hash(compactProject(row.cwd));
    }

    const message = row.message;
    if (!message || typeof message !== "object") continue;

    if (row.type === "user") {
      session.user_turns += 1;
      if (ctx.contentInspection) {
        const text = extractText(message.content);
        applyPromptFeatures(session, text);
      }
    }

    if (row.type === "assistant") {
      session.assistant_turns += 1;
      if (typeof message.model === "string") session.model_names.add(message.model);
      const usage = message.usage;
      if (usage && typeof usage === "object") {
        addNum(session, "input_tokens", usage.input_tokens);
        addNum(session, "output_tokens", usage.output_tokens);
        addNum(session, "cache_read_tokens", usage.cache_read_input_tokens);
        addNum(session, "cache_write_tokens", usage.cache_creation_input_tokens);
      }
      if (Array.isArray(message.content)) {
        for (const item of message.content) {
          if (!item || typeof item !== "object") continue;
          if (item.type === "tool_use") {
            session.tool_calls += 1;
            const input = item.input && typeof item.input === "object" ? item.input : {};
            registerPath(session, input.file_path);
            registerPath(session, input.path);
            registerPath(session, input.notebook_path);
            const command = input.command || input.cmd;
            if (typeof command === "string") {
              session.shell_commands_count += 1;
              if (isTestCommand(command)) session.test_commands_count += 1;
              if (isValidationCommand(command)) session.validation_commands_count += 1;
              if (/\bgit\b/.test(command)) session.git_actions_count += 1;
            }
          }
        }
      }
    }
  }
}

function addNum(session, key, value) {
  if (typeof value === "number" && Number.isFinite(value)) session[key] += value;
}

/** @param {import("../lib/session.js").SessionDraft} s */
function finalizeSession(s) {
  return finalizeNormalizedSession(s, {
    hasAction: (d) => d.tool_calls > 0 || d.file_refs_count > 0,
    hasValidation: (d) => d.validation_commands_count > 0
  });
}
