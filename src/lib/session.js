// Normalization layer: every collector produces sessions in this one shape.
// Collectors only parse their tool-specific logs; building, enriching and
// finalizing the normalized session record lives here.

import { classifyPrompt } from "./classify.js";
import { commonCapabilities } from "./collection.js";

/**
 * @typedef {"claude_code" | "codex" | "cursor"} SessionTool
 *
 * @typedef {object} SessionContext
 * @property {{ hash(value: unknown): string | null }} privacy
 * @property {string} [orgSlug]
 * @property {string | null} [teamSlug]
 * @property {boolean} [contentInspection]
 *
 * @typedef {object} PromptQuality
 * @property {number} vague_prompts
 * @property {number} contextualized_prompts
 * @property {number} constrained_prompts
 * @property {number} correction_prompts
 *
 * Mutable session accumulator used while a collector parses logs.
 * Raw text, paths and identifiers never enter it: only hashes and counts.
 * @typedef {object} SessionDraft
 * @property {string | null} session_id_hash
 * @property {SessionTool} tool
 * @property {null} user_hash
 * @property {string | undefined} org_slug
 * @property {string | null | undefined} team_slug
 * @property {number} started_at_ms
 * @property {number} ended_at_ms
 * @property {string | null} cwd_hash
 * @property {string | null} project_label_hash
 * @property {Set<string>} model_names
 * @property {number} input_tokens
 * @property {number} output_tokens
 * @property {number} cache_read_tokens
 * @property {number} cache_write_tokens
 * @property {number} user_turns
 * @property {number} assistant_turns
 * @property {number} tool_calls
 * @property {number} file_refs_count
 * @property {Record<string, number>} file_ext_counts
 * @property {number} shell_commands_count
 * @property {number} test_commands_count
 * @property {number} validation_commands_count
 * @property {number} git_actions_count
 * @property {Set<string>} task_categories
 * @property {PromptQuality} prompt_quality
 * @property {ReturnType<typeof commonCapabilities>} capabilities
 *
 * @typedef {object} SessionOutcome
 * @property {boolean} has_verifiable_action
 * @property {boolean | null} has_test_or_validation
 * @property {boolean} likely_abandoned
 *
 * Normalized, export-ready session consumed by the metrics layer.
 * @typedef {Omit<SessionDraft, "model_names" | "task_categories"> & {
 *   started_at: string,
 *   ended_at: string,
 *   duration_minutes: number,
 *   model_names: string[],
 *   task_categories: string[],
 *   outcome: SessionOutcome
 * }} NormalizedSession
 */

/**
 * Create an empty session draft. The tool-scoped key is hashed with the
 * per-audit salt, so session ids cannot be linked across audits.
 *
 * @param {object} options
 * @param {string} options.key Tool-scoped session key, e.g. `codex:<id>`.
 * @param {SessionTool} options.tool
 * @param {number} options.startedAtMs
 * @param {SessionContext} options.ctx
 * @param {boolean} options.validationObservable Whether this source exposes shell/test commands.
 * @param {string[]} [options.modelNames]
 * @returns {SessionDraft}
 */
export function createSession({ key, tool, startedAtMs, ctx, validationObservable, modelNames = [] }) {
  return {
    session_id_hash: ctx.privacy.hash(key),
    tool,
    user_hash: null,
    org_slug: ctx.orgSlug,
    team_slug: ctx.teamSlug,
    started_at_ms: startedAtMs,
    ended_at_ms: startedAtMs,
    cwd_hash: null,
    project_label_hash: null,
    model_names: new Set(modelNames),
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
    },
    capabilities: commonCapabilities({ contentInspection: ctx.contentInspection, validationObservable })
  };
}

/**
 * Get or lazily create the session for a tool-scoped id.
 *
 * @param {Map<string, SessionDraft>} map
 * @param {string} id
 * @param {"claude_code" | "codex"} tool
 * @param {SessionContext} ctx
 * @param {number} ts
 * @returns {SessionDraft}
 */
export function getOrCreateSession(map, id, tool, ctx, ts) {
  const key = `${tool}:${id}`;
  let session = map.get(key);
  if (!session) {
    session = createSession({ key, tool, startedAtMs: ts, ctx, validationObservable: true });
    map.set(key, session);
  }
  return session;
}

/**
 * @param {SessionDraft} session
 * @param {number} ts
 */
export function updateTime(session, ts) {
  session.started_at_ms = Math.min(session.started_at_ms, ts);
  session.ended_at_ms = Math.max(session.ended_at_ms, ts);
}

/**
 * Flatten a message `content` field (string or content-block array) to text.
 * The text is only used in memory for classification and is never stored.
 *
 * @param {unknown} content
 * @returns {string}
 */
export function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((item) => item && typeof item.text === "string" ? item.text : "").join(" ");
}

/**
 * Classify a prompt locally and record only the derived counters.
 *
 * @param {SessionDraft} session
 * @param {string} text
 */
export function applyPromptFeatures(session, text) {
  const features = classifyPrompt(text);
  for (const c of features.categories) session.task_categories.add(c);
  if (features.vague) session.prompt_quality.vague_prompts += 1;
  if (features.contextualized) session.prompt_quality.contextualized_prompts += 1;
  if (features.constrained) session.prompt_quality.constrained_prompts += 1;
  if (features.correction) session.prompt_quality.correction_prompts += 1;
}

/**
 * Count a file reference. Only the extension is kept, never the path.
 *
 * @param {SessionDraft} session
 * @param {unknown} filePath
 */
export function registerPath(session, filePath) {
  if (typeof filePath !== "string" || !filePath) return;
  session.file_refs_count += 1;
  const ext = filePath.toLowerCase().split(".").pop();
  if (ext && ext.length <= 8) session.file_ext_counts[ext] = (session.file_ext_counts[ext] || 0) + 1;
}

/**
 * Last two path segments of a working directory, used (hashed) as a project label.
 *
 * @param {string} cwd
 * @returns {string}
 */
export function compactProject(cwd) {
  return cwd.split("/").filter(Boolean).slice(-2).join("/");
}

/**
 * Freeze a draft into the normalized export shape.
 *
 * @param {SessionDraft} s
 * @param {object} rules Source-specific outcome rules.
 * @param {(s: SessionDraft) => boolean} rules.hasAction
 * @param {(s: SessionDraft) => boolean | null} rules.hasValidation
 * @returns {NormalizedSession}
 */
export function finalizeSession(s, { hasAction, hasValidation }) {
  const action = hasAction(s);
  return {
    ...s,
    started_at: new Date(s.started_at_ms).toISOString(),
    ended_at: new Date(s.ended_at_ms).toISOString(),
    duration_minutes: Math.max(1, Math.round((s.ended_at_ms - s.started_at_ms) / 60000)),
    model_names: [...s.model_names],
    task_categories: [...s.task_categories],
    outcome: {
      has_verifiable_action: action,
      has_test_or_validation: hasValidation(s),
      likely_abandoned: s.user_turns > 0 && !action && s.assistant_turns <= 1
    }
  };
}

/**
 * Input shared by every collector.
 * @typedef {SessionContext & {
 *   window: { start: Date, end: Date },
 *   sourcePaths?: { claudeCode?: string, codex?: string, cursorDb?: string }
 * }} CollectorContext
 */
