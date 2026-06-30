import test from "node:test";
import assert from "node:assert/strict";
import { renderHtmlReport } from "../src/reports/html.js";
import { buildWrappedRecap } from "../src/reports/wrapped.js";

const audit = {
  org_slug: "local",
  team_slug: "engineering",
  period: "baseline",
  collection_window: {
    start: "2026-06-01T00:00:00.000Z",
    end: "2026-06-30T00:00:00.000Z"
  },
  score: {
    ai_practice_score: 62,
    interpretation: "Healthy baseline. Usage is real, but the next gain comes from context and verification.",
    dimensions: {
      adoption_durable: 70,
      usage_metier_reel: 58,
      qualite_interaction: 61,
      impact_verifiable: 42,
      usage_juste: 80
    },
    calibration: {
      priority_levers: [
        { label: "Finish with proof", action: "End important AI sessions with checks or acceptance criteria." },
        { label: "Use real work material", action: "Attach the relevant file, example, error, spec or previous version." }
      ]
    }
  },
  metrics: {
    measurement_quality: { source_count: 3 },
    adoption: { active_days: 8, source_mix: { codex: 1, cursor: 1, claude_code: 1 } },
    wrapped_summary: {
      conversations: 24,
      messages: 180,
      top_tool: "codex",
      top_use_case: "code_generation"
    },
    interaction_quality: {
      contextualized_prompt_rate: 0.46,
      vague_prompt_rate: 0.31
    },
    business_usage: {
      advanced_workflow_rate: 0.48,
      file_context_rate: 0.35
    },
    verifiable_impact: {
      validation_rate: 0.18
    },
    fair_usage: {
      long_session_without_action_rate: 0.08
    }
  }
};

test("buildWrappedRecap creates a personalized recap", () => {
  const wrapped = buildWrappedRecap(audit);
  assert.equal(wrapped.top_use_case, "Code Generation");
  assert.ok(wrapped.profile.name.length > 0);
  assert.ok(wrapped.next_moves.length > 0);
});

test("renderHtmlReport creates the local report page", () => {
  const html = renderHtmlReport(audit);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /YOUR AI WRAPPED/);
  assert.match(html, /Download your card/);
  assert.match(html, /Copy & open LinkedIn/);
  assert.match(html, /LinkedIn-ready recap/);
  assert.match(html, /AI Practice Score/);
  assert.match(html, /No prompts, code, secrets/);
  assert.doesNotMatch(html, /undefined/);
});
