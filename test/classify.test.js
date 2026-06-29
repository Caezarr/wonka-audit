import test from "node:test";
import assert from "node:assert/strict";
import { classifyPrompt, isValidationCommand } from "../src/lib/classify.js";

test("classifyPrompt separates vague and contextualized prompts", () => {
  assert.equal(classifyPrompt("help").vague, true);
  const rich = classifyPrompt("Review src/cli.js and return a markdown table with risks and fixes");
  assert.equal(rich.contextualized, true);
  assert.equal(rich.constrained, true);
  assert.ok(rich.categories.includes("code_review"));
});

test("isValidationCommand detects common checks", () => {
  assert.equal(isValidationCommand("npm run typecheck"), true);
  assert.equal(isValidationCommand("git status"), true);
  assert.equal(isValidationCommand("echo hello"), false);
});
