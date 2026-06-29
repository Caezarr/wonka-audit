import { buildWrappedRecap } from "./wrapped.js";

export function renderLinkedInPost(audit) {
  const m = audit.metrics;
  const s = audit.score;
  const wrapped = buildWrappedRecap(audit);
  const levers = wrapped.next_moves.map((move) => move.body);
  const topUseCase = wrapped.top_use_case;
  const sourceCount = m.measurement_quality?.source_count || Object.keys(m.adoption?.source_mix || {}).length;

  return [
    `I ran a local AI usage audit across my developer tools.`,
    "",
    `Profile: ${wrapped.profile.name}`,
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
