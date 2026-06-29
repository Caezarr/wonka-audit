import test from "node:test";
import assert from "node:assert/strict";
import { renderWrappedCardSvg } from "../src/reports/card-svg.js";

const audit = {
  collection_window: {
    start: "2026-06-01T00:00:00.000Z",
    end: "2026-06-30T00:00:00.000Z"
  },
  score: {
    ai_practice_score: 78,
    calibration: {
      priority_levers: [
        { label: "Finish with proof", action: "End important AI sessions with checks." }
      ]
    }
  },
  metrics: {
    measurement_quality: { source_count: 3 },
    adoption: { active_days: 12, source_mix: { codex: 1, cursor: 1, claude_code: 1 } },
    wrapped_summary: {
      conversations: 42,
      top_tool: "codex",
      top_use_case: "code_generation"
    },
    interaction_quality: {
      contextualized_prompt_rate: 0.62,
      vague_prompt_rate: 0.18
    },
    business_usage: {
      advanced_workflow_rate: 0.7,
      file_context_rate: 0.58
    },
    verifiable_impact: {
      validation_rate: 0.41
    },
    fair_usage: {
      long_session_without_action_rate: 0.04
    }
  }
};

test("renderWrappedCardSvg creates a standalone share card", () => {
  const svg = renderWrappedCardSvg(audit);
  assert.match(svg, /<svg/);
  assert.match(svg, /YOUR AI WRAPPED/);
  assert.match(svg, /AI Practice Score/);
  assert.match(svg, /wonka-ai.com/);
  assert.doesNotMatch(svg, /undefined/);
});
