export function renderMarkdownReport(audit) {
  const m = audit.metrics;
  const s = audit.score;
  return `# Wonka AI Usage Audit

Client: \`${audit.org_slug}\`  
Team: \`${audit.team_slug || "all"}\`  
Period: \`${audit.period}\`  
Window: \`${audit.collection_window.start}\` -> \`${audit.collection_window.end}\`

## Executive Summary

AI Practice Score: **${s.ai_practice_score}/100**

${s.interpretation}

Confidence: **${s.confidence || "low"}** (${s.observed_metric_count || 0} observed MVP metrics, ${s.planned_metric_count || 0} planned enterprise metrics pending)

## Score

| Dimension | Score |
| --- | ---: |
| Adoption durable | ${s.dimensions.adoption_durable} |
| Usage metier reel | ${s.dimensions.usage_metier_reel} |
| Qualite d'interaction | ${s.dimensions.qualite_interaction} |
| Impact verifiable | ${s.dimensions.impact_verifiable} |
| Usage juste | ${s.dimensions.usage_juste} |

## KPI

| KPI | Value |
| --- | ---: |
| Total sessions | ${m.adoption.total_sessions} |
| Messages | ${m.wrapped_summary?.messages || 0} |
| Avg messages / conversation | ${m.wrapped_summary?.avg_messages_per_conversation || 0} |
| Active days | ${m.adoption.active_days} |
| Project-bound sessions | ${pct(m.business_usage.project_bound_session_rate)} |
| File context rate | ${pct(m.business_usage.file_context_rate)} |
| Advanced workflow rate | ${pct(m.business_usage.advanced_workflow_rate)} |
| Contextualized prompts | ${pct(m.interaction_quality.contextualized_prompt_rate)} |
| Vague prompts | ${pct(m.interaction_quality.vague_prompt_rate)} |
| Correction rate | ${pct(m.interaction_quality.correction_rate)} |
| Abandoned sessions | ${pct(m.interaction_quality.abandoned_session_rate)} |
| Tool/action sessions | ${pct(m.verifiable_impact.tool_action_rate)} |
| Test run rate | ${pct(m.verifiable_impact.test_run_rate)} |
| Validation rate | ${pct(m.verifiable_impact.validation_rate)} |
| Long sessions without action | ${pct(m.fair_usage.long_session_without_action_rate)} |

## Wrapped Recap

| Item | Value |
| --- | ---: |
| Conversations | ${m.wrapped_summary?.conversations || 0} |
| Top tool | ${label(m.wrapped_summary?.top_tool || "n/a")} |
| Top use case | ${label(m.wrapped_summary?.top_use_case || "other")} |
| Free chat share | ${pct(m.wrapped_summary?.free_chat_rate)} |
| Workflow / agentic share | ${pct(m.wrapped_summary?.workflow_or_agent_rate)} |
| Longest conversation | ${m.wrapped_summary?.longest_conversation_label || "n/a"} |

## Measurement Quality

${(m.measurement_quality?.notes || []).map((note) => `- ${note}`).join("\n")}

## Source Coverage

| Source | Status | Sessions |
| --- | --- | ---: |
${Object.entries(audit.source_coverage).map(([name, c]) => `| ${name} | ${c.status} | ${c.sessions_detected ?? c.sessions ?? 0} |`).join("\n")}

## Recommendations

${recommendations(audit).map((r) => `- **${r.title}**: ${r.body}`).join("\n")}

## Privacy

This report is generated from aggregated local metrics. Full prompts, assistant responses, source code, secrets and absolute local paths are not included by default.

Short prompt/message text may be inspected locally in memory for classification. Raw content is not exported by default.
`;
}

function recommendations(audit) {
  if (Array.isArray(audit.recommendations) && audit.recommendations.length) {
    return audit.recommendations;
  }
  const m = audit.metrics;
  const out = [];
  if (m.interaction_quality.vague_prompt_rate > 0.25) {
    out.push({
      title: "Improve prompt context",
      body: "Vague prompts are still high. Reinforce templates with objective, context, constraints and expected output."
    });
  }
  if (m.verifiable_impact.validation_rate < 0.25) {
    out.push({
      title: "Train validation loops",
      body: "Few sessions end with tests, lint, typecheck or diff review. Add a workshop on AI-assisted verification."
    });
  }
  if (m.business_usage.advanced_workflow_rate < 0.25) {
    out.push({
      title: "Move from chat to workflows",
      body: "Advanced workflows are still limited. Teach file-aware, repo-aware and multi-step usage patterns."
    });
  }
  if (!out.length) {
    out.push({
      title: "Maintain the practice",
      body: "Usage is healthy. Keep monthly reviews focused on verification quality and concrete business workflows."
    });
  }
  return out.slice(0, 3);
}

function pct(v) {
  return `${Math.round((v || 0) * 100)}%`;
}

function label(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
