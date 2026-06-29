import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { classifyPrompt } from "../lib/classify.js";
import { inWindow } from "../lib/time.js";

export async function collectCursor({ window, privacy, orgSlug, teamSlug }) {
  const dbPath = findCursorDb();
  if (!dbPath) return { source: "cursor", status: "missing", sessions: [] };
  if (!sqliteAvailable()) {
    return {
      source: "cursor",
      status: "unavailable",
      reason: "Cursor DB detected, but sqlite3 binary is unavailable.",
      db_detected: true,
      sessions: []
    };
  }

  const composers = readComposers(dbPath);
  const sessions = new Map();
  for (const composer of composers.values()) {
    if (!composer.createdAt || !inWindow(composer.createdAt, window)) continue;
    sessions.set(composer.composerId, makeSession(composer, { privacy, orgSlug, teamSlug }));
  }

  readBubbles(dbPath, window, (bubble) => {
    if (!bubble.createdAt || !inWindow(bubble.createdAt, window)) return;
    let session = sessions.get(bubble.conversationId);
    if (!session) {
      const composer = composers.get(bubble.conversationId) || {
        composerId: bubble.conversationId,
        createdAt: bubble.createdAt,
        modelName: bubble.modelName || null
      };
      session = makeSession(composer, { privacy, orgSlug, teamSlug });
      sessions.set(bubble.conversationId, session);
    }
    updateTime(session, bubble.createdAt);
    if (bubble.modelName) session.model_names.add(bubble.modelName);
    if (bubble.type === 1) {
      session.user_turns += 1;
      applyPromptFeatures(session, bubble.text || "");
    } else if (bubble.type === 2) {
      session.assistant_turns += 1;
    }
    if (bubble.inputTokens) session.input_tokens += bubble.inputTokens;
    if (bubble.outputTokens) session.output_tokens += bubble.outputTokens;
    session.file_refs_count += bubble.fileRefCount || 0;
    if (bubble.toolName) session.tool_calls += 1;
    if (bubble.agentic) session.tool_calls += 1;
  });

  return {
    source: "cursor",
    status: "ready",
    db_detected: true,
    composer_count: composers.size,
    sessions: [...sessions.values()].map(finalizeSession)
  };
}

function findCursorDb() {
  const home = homedir();
  const os = platform();
  const candidates = os === "darwin" ? [
    join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb")
  ] : os === "linux" ? [
    join(home, ".config", "Cursor", "User", "globalStorage", "state.vscdb")
  ] : os === "win32" ? [
    join(home, "AppData", "Roaming", "Cursor", "User", "globalStorage", "state.vscdb")
  ] : [];
  return candidates.find((p) => existsSync(p)) || null;
}

function sqliteAvailable() {
  try {
    execFileSync("sqlite3", ["-version"], { stdio: ["ignore", "ignore", "ignore"], timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function readComposers(dbPath) {
  const rows = queryComposerFields(dbPath);
  const composers = new Map();
  for (const row of rows) {
    const composerId = row.composerId || row.key.slice("composerData:".length);
    const modelName = row.modelName && row.modelName !== "default" ? row.modelName : row.latestSelectedModel || null;
    composers.set(composerId, {
      composerId,
      createdAt: numericTs(row.createdAt || row.lastUpdatedAt),
      modelName
    });
  }
  return composers;
}

function readBubbles(dbPath, window, onBubble) {
  for (const row of queryBubblesInWindow(dbPath, window)) {
    const parts = row.key.split(":");
    if (parts.length < 3) continue;
    const fileRefCount = Number(row.relevantFilesCount || 0) +
      Number(row.attachedMetadataCount || 0) +
      Number(row.attachedChunksCount || 0) +
      Number(row.recentFilesCount || 0) +
      Number(row.fileSelectionsCount || 0) +
      Number(row.selectionsCount || 0);
    onBubble({
      conversationId: parts[1],
      type: row.type,
      text: typeof row.text === "string" ? row.text : "",
      createdAt: numericTs(row.createdAt),
      modelName: row.modelName && row.modelName !== "default" ? row.modelName : null,
      inputTokens: Number(row.inputTokens || 0),
      outputTokens: Number(row.outputTokens || 0),
      fileRefCount,
      toolName: row.toolName || null,
      agentic: Boolean(row.isAgentic)
    });
  }
}

function queryComposerFields(dbPath) {
  const sql = [
    "select key,",
    "json_extract(value, '$.composerId') as composerId,",
    "json_extract(value, '$.createdAt') as createdAt,",
    "json_extract(value, '$.lastUpdatedAt') as lastUpdatedAt,",
    "json_extract(value, '$.modelConfig.modelName') as modelName,",
    "json_extract(value, '$.latestSelectedModel') as latestSelectedModel",
    "from cursorDiskKV",
    "where key like 'composerData:%';"
  ].join(" ");
  const raw = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
  return raw ? JSON.parse(raw) : [];
}

function queryBubblesInWindow(dbPath, window) {
  const start = window.start.toISOString();
  const end = window.end.toISOString();
  const sql = [
    "select key,",
    "json_extract(value, '$.type') as type,",
    "json_extract(value, '$.createdAt') as createdAt,",
    "substr(coalesce(json_extract(value, '$.text'), ''), 1, 1200) as text,",
    "json_extract(value, '$.modelInfo.modelName') as modelName,",
    "json_extract(value, '$.tokenCount.inputTokens') as inputTokens,",
    "json_extract(value, '$.tokenCount.outputTokens') as outputTokens,",
    "json_extract(value, '$.toolFormerData.name') as toolName,",
    "json_extract(value, '$.isAgentic') as isAgentic,",
    "coalesce(json_array_length(json_extract(value, '$.relevantFiles')), 0) as relevantFilesCount,",
    "coalesce(json_array_length(json_extract(value, '$.attachedFileCodeChunksMetadataOnly')), 0) as attachedMetadataCount,",
    "coalesce(json_array_length(json_extract(value, '$.attachedCodeChunks')), 0) as attachedChunksCount,",
    "coalesce(json_array_length(json_extract(value, '$.recentlyViewedFiles')), 0) as recentFilesCount,",
    "coalesce(json_array_length(json_extract(value, '$.context.fileSelections')), 0) as fileSelectionsCount,",
    "coalesce(json_array_length(json_extract(value, '$.context.selections')), 0) as selectionsCount",
    "from cursorDiskKV",
    "where key like 'bubbleId:%'",
    `and datetime(json_extract(value, '$.createdAt')) >= datetime('${start}')`,
    `and datetime(json_extract(value, '$.createdAt')) <= datetime('${end}')`,
    "order by key;"
  ].join(" ");
  const raw = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
  return raw ? JSON.parse(raw) : [];
}

function makeSession(composer, ctx) {
  return {
    session_id_hash: ctx.privacy.hash(`cursor:${composer.composerId}`),
    tool: "cursor",
    user_hash: null,
    org_slug: ctx.orgSlug,
    team_slug: ctx.teamSlug,
    started_at_ms: composer.createdAt || Date.now(),
    ended_at_ms: composer.createdAt || Date.now(),
    cwd_hash: null,
    project_label_hash: null,
    model_names: new Set(composer.modelName ? [composer.modelName] : []),
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
}

function updateTime(session, ts) {
  session.started_at_ms = Math.min(session.started_at_ms, ts);
  session.ended_at_ms = Math.max(session.ended_at_ms, ts);
}

function applyPromptFeatures(session, text) {
  const features = classifyPrompt(text);
  for (const c of features.categories) session.task_categories.add(c);
  if (features.vague) session.prompt_quality.vague_prompts += 1;
  if (features.contextualized) session.prompt_quality.contextualized_prompts += 1;
  if (features.constrained) session.prompt_quality.constrained_prompts += 1;
  if (features.correction) session.prompt_quality.correction_prompts += 1;
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

function numericTs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value > 1e12 ? value : value * 1000;
  if (typeof value === "string") {
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : null;
  }
  return null;
}
