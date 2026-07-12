import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makePrivacy } from "../src/lib/privacy.js";
import { collectClaudeCode } from "../src/collectors/claude-code.js";
import { collectCodex } from "../src/collectors/codex.js";

const here = dirname(fileURLToPath(import.meta.url));
const window = {
  start: new Date("2026-07-01T00:00:00.000Z"),
  end: new Date("2026-07-02T00:00:00.000Z")
};
const base = {
  window,
  privacy: makePrivacy("fixture-org"),
  orgSlug: "fixture-org",
  teamSlug: "engineering"
};

test("Claude collector detects validation and tolerates corrupt JSONL", async () => {
  const result = await collectClaudeCode({
    ...base,
    sourcePaths: { claudeCode: join(here, "fixtures", "claude") }
  });
  assert.equal(result.status, "ready");
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].validation_commands_count, 1);
  assert.equal(result.sessions[0].outcome.has_test_or_validation, true);
});

test("Codex collector detects validation and tolerates corrupt JSONL", async () => {
  const result = await collectCodex({
    ...base,
    sourcePaths: { codex: join(here, "fixtures", "codex") }
  });
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].validation_commands_count, 1);
  assert.equal(result.sessions[0].outcome.has_test_or_validation, true);
});

test("metadata-only collection does not classify prompt content", async () => {
  const result = await collectClaudeCode({
    ...base,
    contentInspection: false,
    sourcePaths: { claudeCode: join(here, "fixtures", "claude") }
  });
  assert.equal(result.capabilities.content_classification, false);
  assert.deepEqual(result.sessions[0].task_categories, []);
  assert.deepEqual(result.sessions[0].prompt_quality, {
    vague_prompts: 0,
    contextualized_prompts: 0,
    constrained_prompts: 0,
    correction_prompts: 0
  });
  assert.equal(result.sessions[0].validation_commands_count, 1);
  assert.equal(JSON.stringify(result).includes("Review src/api.js"), false);
});
