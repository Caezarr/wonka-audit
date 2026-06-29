import test from "node:test";
import assert from "node:assert/strict";
import { renderLinkedInPost } from "../src/reports/linkedin.js";

test("renderLinkedInPost creates a privacy-safe share draft", () => {
  const post = renderLinkedInPost({
    score: { ai_practice_score: 64 },
    metrics: {
      measurement_quality: { source_count: 3 },
      adoption: { source_mix: { codex: 1, cursor: 1, claude_code: 1 } },
      wrapped_summary: { top_use_case: "code_review" },
      interaction_quality: { vague_prompt_rate: 0.4 },
      business_usage: { advanced_workflow_rate: 0.2 },
      verifiable_impact: { validation_rate: 0.1 },
      fair_usage: { long_session_without_action_rate: 0.1 }
    }
  });

  assert.match(post, /AI Practice Score: 64\/100/);
  assert.match(post, /Top use case: Code Review/);
  assert.match(post, /No prompts, code, secrets, or raw conversations included/);
  assert.doesNotMatch(post, /undefined/);
});
