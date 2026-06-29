import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import { walkFiles } from "../lib/files.js";
import { classifyPrompt, isTestCommand, isValidationCommand } from "../lib/classify.js";
import { inWindow } from "../lib/time.js";

export async function collectCodex({ window, privacy, orgSlug, teamSlug }) {
  const base = join(homedir(), ".codex", "sessions");
  if (!existsSync(base)) {
    return { source: "codex", status: "missing", sessions: [] };
  }

  const files = walkFiles(base, (_full, entry) => entry.endsWith(".jsonl"), 6);
  const bySession = new Map();
  for (const file of files) {
    await parseFile(file.path, bySession, { window, privacy, orgSlug, teamSlug });
  }

  return {
    source: "codex",
    status: "ready",
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
      const text = extractText(payload.content);
      applyPromptFeatures(session, text);
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

function getSession(map, id, tool, ctx, ts) {
  const key = `${tool}:${id}`;
  let session = map.get(key);
  if (!session) {
    session = {
      session_id_hash: ctx.privacy.hash(key),
      tool,
      user_hash: null,
      org_slug: ctx.orgSlug,
      team_slug: ctx.teamSlug,
      started_at_ms: ts,
      ended_at_ms: ts,
      cwd_hash: null,
      project_label_hash: null,
      model_names: new Set(),
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      user_turns: 0,
      assistant_turns: 0,
      tool_calls: 0,
      file_refs_count: 0,
      file_ext_counts: {},
      shell_commands_count: 0,
      test_commands_count: 0,
      validation_commands_count: 0,
      git_actions_count: 0,
      task_categories: new Set(),
      prompt_quality: {
        vague_prompts: 0,
        contextualized_prompts: 0,
        constrained_prompts: 0,
        correction_prompts: 0
      }
    };
    map.set(key, session);
  }
  return session;
}

function updateTime(session, ts) {
  session.started_at_ms = Math.min(session.started_at_ms, ts);
  session.ended_at_ms = Math.max(session.ended_at_ms, ts);
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((item) => item && typeof item.text === "string" ? item.text : "").join(" ");
}

function applyPromptFeatures(session, text) {
  const features = classifyPrompt(text);
  for (const c of features.categories) session.task_categories.add(c);
  if (features.vague) session.prompt_quality.vague_prompts += 1;
  if (features.contextualized) session.prompt_quality.contextualized_prompts += 1;
  if (features.constrained) session.prompt_quality.constrained_prompts += 1;
  if (features.correction) session.prompt_quality.correction_prompts += 1;
}

function parseArguments(raw) {
  if (!raw || typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function registerPath(session, filePath) {
  if (typeof filePath !== "string" || !filePath) return;
  session.file_refs_count += 1;
  const ext = filePath.toLowerCase().split(".").pop();
  if (ext && ext.length <= 8) session.file_ext_counts[ext] = (session.file_ext_counts[ext] || 0) + 1;
}

function compactProject(cwd) {
  return cwd.split("/").filter(Boolean).slice(-2).join("/");
}

function finalizeSession(s) {
  const hasAction = s.tool_calls > 0 || s.file_refs_count > 0 || s.shell_commands_count > 0;
  return {
    ...s,
    started_at: new Date(s.started_at_ms).toISOString(),
    ended_at: new Date(s.ended_at_ms).toISOString(),
    duration_minutes: Math.max(1, Math.round((s.ended_at_ms - s.started_at_ms) / 60000)),
    model_names: [...s.model_names],
    task_categories: [...s.task_categories],
    outcome: {
      has_verifiable_action: hasAction,
      has_test_or_validation: s.test_commands_count > 0 || s.validation_commands_count > 0,
      likely_abandoned: s.user_turns > 0 && !hasAction && s.assistant_turns <= 1
    }
  };
}
