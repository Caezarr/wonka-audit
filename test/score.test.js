import test from "node:test";
import assert from "node:assert/strict";
import { buildMetrics, buildScore } from "../src/metrics/score.js";

const session = {
  tool: "codex",
  started_at: "2026-06-01T10:00:00.000Z",
  project_label_hash: "project",
  cwd_hash: "cwd",
  file_refs_count: 2,
  tool_calls: 1,
  shell_commands_count: 1,
  test_commands_count: 1,
  validation_commands_count: 1,
  task_categories: ["code_review", "testing"],
  user_turns: 2,
  prompt_quality: {
    vague_prompts: 0,
    contextualized_prompts: 2,
    constrained_prompts: 1,
    correction_prompts: 0
  },
  outcome: {
    has_verifiable_action: true,
    has_test_or_validation: true,
    likely_abandoned: false
  },
  duration_minutes: 12,
  input_tokens: 100,
  output_tokens: 50,
  cache_read_tokens: 50,
  cache_write_tokens: 0
};

test("buildScore exposes directional confidence metadata", () => {
  const metrics = buildMetrics({ sessions: [session], git: { commits_in_window: 0 } });
  const score = buildScore(metrics);
  assert.equal(score.planned_metric_count, 3);
  assert.ok(score.observed_metric_count > 10);
  assert.equal(metrics.measurement_quality.confidence, "low");
  assert.equal(score.calibration.model, "local_individual_v2");
  assert.ok(score.calibration.priority_levers.length > 0);
});
