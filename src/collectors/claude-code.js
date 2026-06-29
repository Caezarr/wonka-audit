import { createReadStream, existsSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import { walkFiles } from "../lib/files.js";
import { classifyPrompt } from "../lib/classify.js";
import { inWindow } from "../lib/time.js";

export async function collectClaudeCode({ window, privacy, orgSlug, teamSlug }) {
  const base = join(homedir(), ".claude", "projects");
  if (!existsSync(base)) {
    return { source: "claude_code", status: "missing", sessions: [] };
  }

  const files = walkFiles(base, (_full, entry) => entry.endsWith(".jsonl"), 2);
  const bySession = new Map();

  for (const file of files) {
    await parseFile(file.path, bySession, { window, privacy, orgSlug, teamSlug });
  }

  return {
    source: "claude_code",
    status: "ready",
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
      const text = extractText(message.content);
      applyPromptFeatures(session, text);
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
          }
        }
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

function registerPath(session, filePath) {
  if (typeof filePath !== "string" || !filePath) return;
  session.file_refs_count += 1;
  const ext = filePath.toLowerCase().split(".").pop();
  if (ext && ext.length <= 8) session.file_ext_counts[ext] = (session.file_ext_counts[ext] || 0) + 1;
}

function addNum(session, key, value) {
  if (typeof value === "number" && Number.isFinite(value)) session[key] += value;
}

function compactProject(cwd) {
  return cwd.split("/").filter(Boolean).slice(-2).join("/");
}

function finalizeSession(s) {
  const hasAction = s.tool_calls > 0 || s.file_refs_count > 0;
  return {
    ...s,
    started_at: new Date(s.started_at_ms).toISOString(),
    ended_at: new Date(s.ended_at_ms).toISOString(),
    duration_minutes: Math.max(1, Math.round((s.ended_at_ms - s.started_at_ms) / 60000)),
    model_names: [...s.model_names],
    task_categories: [...s.task_categories],
    outcome: {
      has_verifiable_action: hasAction,
      has_test_or_validation: false,
      likely_abandoned: s.user_turns > 0 && !hasAction && s.assistant_turns <= 1
    }
  };
}

