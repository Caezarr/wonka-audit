import { label, pct } from "./format.js";
import { buildWrappedRecap } from "./wrapped.js";

export function renderLinkedInPost(audit) {
  const m = audit.metrics;
  const s = audit.score;
  const wrapped = buildWrappedRecap(audit);
  const levers = wrapped.next_moves.map((move) => move.body);
  const topUseCase = wrapped.top_use_case;
  const sourceCount = m.measurement_quality?.source_count || Object.keys(m.adoption?.source_mix || {}).length;
  const topUses = (m.business_usage?.top_task_categories || []).slice(0, 3)
    .map((item) => `${label(item.category)} (${pct(item.share)})`)
    .join(", ");
  const context = pct(m.interaction_quality?.contextualized_prompt_rate);
  const workflow = pct(m.business_usage?.advanced_workflow_rate);
  const proof = pct(m.verifiable_impact?.validation_rate);

  return [
    `I ran a local AI usage audit across my developer tools.`,
    "",
    `${m.wrapped_summary?.conversations || 0} conversations across ${m.adoption?.active_days || 0} active days.`,
    `Primary tool: ${wrapped.top_tool}`,
    `Main uses: ${topUses || topUseCase}`,
    "",
    `Context-rich prompts: ${context}`,
    `Workflow sessions: ${workflow}`,
    `Sessions with explicit proof: ${proof}`,
    "",
    `Profile: ${wrapped.profile.name}`,
    `AI Practice Score: ${s.ai_practice_score}/100`,
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
