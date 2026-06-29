export function renderLinkedInPost(audit) {
  const m = audit.metrics;
  const s = audit.score;
  const levers = pickLevers(audit);
  const topUseCase = label(m.wrapped_summary?.top_use_case || "AI workflows");
  const sourceCount = m.measurement_quality?.source_count || Object.keys(m.adoption?.source_mix || {}).length;

  return [
    `I ran a local AI usage audit across my developer tools.`,
    "",
    `AI Practice Score: ${s.ai_practice_score}/100`,
    `Top use case: ${topUseCase}`,
    `Tools detected: ${sourceCount}`,
    "",
    "What I am looking at next:",
    ...levers.map((lever) => `- ${lever}`),
    "",
    "The useful question is not whether people use AI more. It is whether AI work becomes more contextual, more workflow-based, and easier to verify.",
    "",
    "Generated locally with Wonka AI Usage Audit. No prompts, code, secrets, or raw conversations included.",
    "",
    "#AI #Productivity #DeveloperTools #AIAdoption"
  ].join("\n");
}

function pickLevers(audit) {
  const m = audit.metrics;
  const out = [];

  if ((m.interaction_quality?.vague_prompt_rate || 0) > 0.3) {
    out.push("Use clearer prompt frames: objective, context, constraints, expected output.");
  }
  if ((m.business_usage?.advanced_workflow_rate || 0) < 0.5) {
    out.push("Move from generic chat to file-aware and repo-aware workflows.");
  }
  if ((m.verifiable_impact?.validation_rate || 0) < 0.3) {
    out.push("End more AI sessions with tests, checks, reviews, or acceptance criteria.");
  }
  if ((m.fair_usage?.long_session_without_action_rate || 0) > 0.2) {
    out.push("Reduce long conversations that do not produce a concrete next action.");
  }
  if (!out.length) {
    out.push("Turn the best AI workflows into reusable team playbooks.");
    out.push("Keep measuring validation quality, not only usage volume.");
  }

  return out.slice(0, 3);
}

function label(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
