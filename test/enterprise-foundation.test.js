import test from "node:test";
import assert from "node:assert/strict";
import { collectSafely } from "../src/lib/collection.js";
import { buildMetrics, buildScore } from "../src/metrics/score.js";
import { assertComparable } from "../src/reports/compare.js";
import { aggregateAudits } from "../src/enterprise/aggregate.js";
import { deriveWindow, inWindow } from "../src/lib/time.js";
import { makePrivacy } from "../src/lib/privacy.js";
import { validateAuditExport } from "../src/lib/schema.js";

test("collector failures are isolated as source errors", async () => {
  const result = await collectSafely("broken", async () => {
    throw new Error("fixture failure");
  }, {});
  assert.equal(result.status, "error");
  assert.equal(result.reason, "Error: collector failed");
  assert.deepEqual(result.sessions, []);
});

test("unavailable validation and cache signals are neutral, not zero", () => {
  const session = {
    tool: "cursor",
    started_at: "2026-07-01T00:00:00.000Z",
    duration_minutes: 2,
    user_turns: 1,
    assistant_turns: 1,
    tool_calls: 1,
    file_refs_count: 1,
    shell_commands_count: 0,
    test_commands_count: 0,
    task_categories: [],
    prompt_quality: {},
    capabilities: { validation_detection: false, content_classification: false },
    outcome: { has_verifiable_action: true, has_test_or_validation: null, likely_abandoned: false }
  };
  const metrics = buildMetrics({ sessions: [session], git: {} });
  const score = buildScore(metrics);
  assert.equal(metrics.verifiable_impact.validation_rate, null);
  assert.equal(metrics.fair_usage.cache_reuse_rate, null);
  const impactValidation = score.calibration.dimensions.impact_verifiable.components.find((c) => c.label === "Explicit validation");
  const cache = score.calibration.dimensions.usage_juste.components.find((c) => c.label === "Cache reuse");
  assert.equal(impactValidation.available, false);
  assert.equal(cache.available, false);
});

test("score calculation is deterministic for identical normalized input", () => {
  const sessions = [];
  const first = buildScore(buildMetrics({ sessions, git: {} }));
  const second = buildScore(buildMetrics({ sessions, git: {} }));
  assert.deepEqual(first, second);
  assert.equal(first.ai_practice_score, 0);
});

test("comparison rejects incompatible methodologies", () => {
  const audit = (key) => ({
    methodology: { comparability_key: key },
    collection_window: { start: "2026-06-01T00:00:00Z", end: "2026-07-01T00:00:00Z" }
  });
  assert.doesNotThrow(() => assertComparable(audit("same"), audit("same")));
  assert.throws(() => assertComparable(audit("v1"), audit("v2")), /not comparable/);
});

test("enterprise aggregation suppresses cohorts below the privacy threshold", () => {
  const makeAudit = (team, score = 70, participantHash) => ({
    team_slug: team,
    participant_hash: participantHash,
    methodology: { comparability_key: "compatible" },
    score: { ai_practice_score: score },
    metrics: {
      business_usage: { file_context_rate: 0.5, advanced_workflow_rate: 0.4 },
      interaction_quality: { contextualized_prompt_rate: 0.5, vague_prompt_rate: 0.2 },
      verifiable_impact: { validation_rate: 0.3 },
      fair_usage: { long_session_without_action_rate: 0.1 }
    }
  });
  const aggregate = aggregateAudits([
    ...Array.from({ length: 5 }, () => makeAudit("large")),
    ...Array.from({ length: 2 }, () => makeAudit("small"))
  ]);
  assert.equal(aggregate.cohorts.length, 1);
  assert.equal(aggregate.cohorts[0].cohort, "large");
  assert.equal(aggregate.suppressed_cohorts[0].cohort, "small");
  assert.equal(JSON.stringify(aggregate).includes("session_id_hash"), false);
});

test("enterprise aggregation removes duplicate stable participants", () => {
  const base = {
    team_slug: "team",
    participant_hash: "same-person",
    methodology: { comparability_key: "compatible" },
    score: { ai_practice_score: 70 },
    metrics: {
      business_usage: { file_context_rate: 0.5, advanced_workflow_rate: 0.5 },
      interaction_quality: { contextualized_prompt_rate: 0.5, vague_prompt_rate: 0.2 },
      verifiable_impact: { validation_rate: 0.3 },
      fair_usage: { long_session_without_action_rate: 0.1 }
    }
  };
  const aggregate = aggregateAudits([base, structuredClone(base)], { minCohortSize: 3 });
  assert.equal(aggregate.unique_participant_count, 1);
  assert.equal(aggregate.cohorts.length, 0);
});

test("enterprise aggregation rejects incompatible methodologies", () => {
  assert.throws(() => aggregateAudits([
    { methodology: { comparability_key: "v1" } },
    { methodology: { comparability_key: "v2" } }
  ]), /incompatible/);
});

test("date windows reject invalid input and include their boundaries", () => {
  assert.throws(() => deriveWindow({ since: "not-a-date", until: null }), /Invalid date/);
  const window = deriveWindow({ since: "2026-07-01", until: "2026-07-01" });
  assert.equal(inWindow(Date.parse("2026-07-01T00:00:00"), window), true);
  assert.equal(inWindow(Date.parse("2026-07-02T00:00:00"), window), false);
});

test("tenant pseudonyms are stable without exposing participant ids", () => {
  const privacy = makePrivacy("client", "ephemeral-audit-salt");
  const first = privacy.stableParticipantHash("employee@example.com", "tenant-secret-with-at-least-24-chars");
  const second = privacy.stableParticipantHash("employee@example.com", "tenant-secret-with-at-least-24-chars");
  assert.equal(first, second);
  assert.equal(first.includes("employee"), false);
  assert.throws(() => privacy.stableParticipantHash("employee", "short"), /24 characters/);
});

test("audit schema validation rejects incomplete or legacy exports", () => {
  assert.throws(() => validateAuditExport({ schema_version: "1.0" }), /Invalid audit export/);
});
