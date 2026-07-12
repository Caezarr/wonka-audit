import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicSharePayload, renderPublicSharePage } from "../src/reports/public-share.js";

const audit = {
  generated_at: "2026-07-12T10:00:00.000Z",
  org_slug: "secret-client",
  team_slug: "secret-team",
  participant_hash: "secret-participant",
  collection_window: { start: "2026-06-01T00:00:00Z", end: "2026-07-01T00:00:00Z" },
  score: {
    ai_practice_score: 67,
    status: "directional_uncalibrated",
    confidence: "directional",
    calibration: { priority_levers: [{ label: "Finish with proof", action: "Run checks before sharing work." }] }
  },
  metrics: {
    measurement_quality: { source_count: 2 },
    adoption: { active_days: 8, source_mix: { codex: 0.5, claude_code: 0.5 } },
    wrapped_summary: { conversations: 18, top_tool: "codex", top_use_case: "code_review" },
    interaction_quality: { contextualized_prompt_rate: 0.52, vague_prompt_rate: 0.2 },
    business_usage: { advanced_workflow_rate: 0.61, file_context_rate: 0.55 },
    verifiable_impact: { validation_rate: 0.34 },
    fair_usage: { long_session_without_action_rate: 0.05 }
  }
};

test("public share payload excludes enterprise and participant identifiers", () => {
  const payload = buildPublicSharePayload(audit);
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("secret-client"), false);
  assert.equal(serialized.includes("secret-team"), false);
  assert.equal(serialized.includes("secret-participant"), false);
});

test("public page includes social metadata and escapes untrusted URLs", () => {
  const html = renderPublicSharePage(audit, { shareUrl: "https://reports.example.com/u/abc/" });
  assert.match(html, /property="og:title"/);
  assert.match(html, /linkedin\.com\/sharing\/share-offsite/);
  assert.match(html, /share-card\.svg/);
  assert.doesNotMatch(html, /secret-client|secret-team|secret-participant/);
  assert.throws(() => renderPublicSharePage(audit, { shareUrl: "javascript:alert(1)" }), /http or https/);
});
