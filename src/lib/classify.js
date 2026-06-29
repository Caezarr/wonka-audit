const CATEGORY_RULES = [
  ["testing", /\b(test|pytest|jest|vitest|unit|coverage|assert|lint|typecheck|tsc)\b/i],
  ["debugging", /\b(error|bug|debug|failing|failed|stacktrace|traceback|exception|fix)\b/i],
  ["code_review", /\b(review|pr|pull request|diff|security|regression|risk)\b/i],
  ["documentation", /\b(readme|doc|docs|documentation|explain|guide|changelog)\b/i],
  ["refactor", /\b(refactor|cleanup|simplify|restructure|rename|extract)\b/i],
  ["data_analysis", /\b(csv|sql|dataframe|analy[sz]e|chart|dashboard|metric)\b/i],
  ["business_writing", /\b(email|proposal|offer|client|deck|presentation|copy)\b/i],
  ["planning", /\b(plan|roadmap|spec|architecture|milestone|strategy)\b/i],
  ["code_generation", /\b(create|build|implement|generate|write|add)\b/i]
];

const CORRECTION_RE = /\b(no|nope|actually|wrong|incorrect|instead|revert|undo|don't|dont|stop|not what|that's not)\b/i;

export function classifyPrompt(text) {
  const value = String(text || "");
  const lower = value.toLowerCase();
  const categories = [];
  for (const [name, re] of CATEGORY_RULES) {
    if (re.test(value)) categories.push(name);
  }

  const words = lower.split(/\s+/).filter(Boolean);
  const hasGoal = /\b(help|create|build|fix|review|explain|write|analyze|implement|compare|prepare)\b/i.test(value);
  const hasContext = /\b(file|repo|project|client|customer|function|class|api|database|csv|error|context)\b/i.test(value);
  const hasConstraint = /\b(format|only|must|should|avoid|keep|limit|json|markdown|table|step|criteria)\b/i.test(value);
  const hasReference = /[`'"]|\/|\.tsx?\b|\.jsx?\b|\.py\b|\.md\b|#\d+/.test(value);
  const signalCount = [hasGoal, hasContext, hasConstraint, hasReference].filter(Boolean).length;

  return {
    categories: categories.length ? categories : ["other"],
    vague: words.length < 10 && signalCount < 2,
    contextualized: signalCount >= 2,
    constrained: hasConstraint,
    correction: CORRECTION_RE.test(value)
  };
}

export function isTestCommand(cmd) {
  return /\b(test|pytest|jest|vitest|go test|cargo test)\b/i.test(cmd || "");
}

export function isValidationCommand(cmd) {
  return /\b(test|lint|typecheck|tsc|pytest|jest|vitest|go test|cargo test|mypy|ruff|eslint|git diff|git status)\b/i.test(cmd || "");
}

