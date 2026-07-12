import { SCORING_MODEL_VERSION } from "../lib/contracts.js";

export function buildMetrics({ sessions, git }) {
  const total = sessions.length;
  const activeProjects = new Set(sessions.map((s) => s.project_label_hash).filter(Boolean));
  const activeDays = new Set(sessions.map((s) => s.started_at?.slice(0, 10)).filter(Boolean));
  const totalMessages = sum(sessions, "user_turns") + sum(sessions, "assistant_turns");
  const withFile = count(sessions, (s) => s.file_refs_count > 0);
  const withRepo = count(sessions, (s) => Boolean(s.cwd_hash));
  const advanced = count(sessions, (s) => s.tool_calls > 0 || s.shell_commands_count > 0 || s.file_refs_count >= 2);
  const action = count(sessions, (s) => s.outcome?.has_verifiable_action);
  const validationObservable = sessions.filter((s) => s.capabilities?.validation_detection !== false);
  const validation = count(validationObservable, (s) => s.outcome?.has_test_or_validation === true);
  const contentObservable = sessions.filter((s) => s.capabilities?.content_classification !== false);
  const abandoned = count(sessions, (s) => s.outcome?.likely_abandoned);
  const longNoAction = count(sessions, (s) => s.duration_minutes >= 30 && !s.outcome?.has_verifiable_action);

  const promptTotals = contentObservable.reduce((acc, s) => {
    acc.user += s.user_turns || 0;
    acc.vague += s.prompt_quality?.vague_prompts || 0;
    acc.contextualized += s.prompt_quality?.contextualized_prompts || 0;
    acc.constrained += s.prompt_quality?.constrained_prompts || 0;
    acc.corrections += s.prompt_quality?.correction_prompts || 0;
    return acc;
  }, { user: 0, vague: 0, contextualized: 0, constrained: 0, corrections: 0 });

  const taskMix = {};
  const sourceMix = {};
  for (const s of sessions) {
    for (const c of s.task_categories || ["other"]) taskMix[c] = (taskMix[c] || 0) + 1;
    sourceMix[s.tool] = (sourceMix[s.tool] || 0) + 1;
  }
  for (const key of Object.keys(taskMix)) taskMix[key] = round(taskMix[key] / Math.max(1, contentObservable.length));
  for (const key of Object.keys(sourceMix)) sourceMix[key] = round(sourceMix[key] / Math.max(1, total));

  const topTaskCategories = Object.entries(taskMix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, share]) => ({ category, share }));

  const tokenTotal = sum(sessions, "input_tokens") + sum(sessions, "output_tokens") + sum(sessions, "cache_read_tokens") + sum(sessions, "cache_write_tokens");
  const actionsTotal = action + validation;
  const longestConversationMinutes = sessions.reduce((max, s) => Math.max(max, s.duration_minutes || 0), 0);

  const metrics = {
    measurement_quality: null,
    wrapped_summary: {
      conversations: total,
      messages: totalMessages,
      avg_messages_per_conversation: total ? round(totalMessages / total) : 0,
      free_chat_rate: rate(count(sessions, (s) => !s.tool_calls && !s.file_refs_count && !s.shell_commands_count), total),
      workflow_or_agent_rate: rate(advanced, total),
      tools_connected_count: Object.keys(sourceMix).length,
      top_tool: topEntry(sourceMix),
      top_use_case: topTaskCategories[0]?.category || "other",
      longest_conversation_minutes: longestConversationMinutes <= 480 ? longestConversationMinutes : null,
      longest_conversation_label: longestConversationMinutes > 480 ? "multi-day session span detected" : `${longestConversationMinutes} min`
    },
    adoption: {
      total_sessions: total,
      active_days: activeDays.size,
      active_project_count: activeProjects.size,
      source_mix: sourceMix
    },
    business_usage: {
      project_bound_session_rate: rate(withRepo, total),
      file_context_rate: rate(withFile, total),
      repo_context_rate: rate(withRepo, total),
      business_context_rate: nullableRate(promptTotals.contextualized, promptTotals.user),
      advanced_workflow_rate: rate(advanced, total),
      task_category_mix: taskMix,
      top_task_categories: topTaskCategories
    },
    interaction_quality: {
      vague_prompt_rate: nullableRate(promptTotals.vague, promptTotals.user),
      contextualized_prompt_rate: nullableRate(promptTotals.contextualized, promptTotals.user),
      constraint_rate: nullableRate(promptTotals.constrained, promptTotals.user),
      correction_rate: nullableRate(promptTotals.corrections, promptTotals.user),
      abandoned_session_rate: rate(abandoned, total),
      iteration_count_avg: total ? round(promptTotals.user / total) : 0
    },
    verifiable_impact: {
      tool_action_rate: rate(action, total),
      test_run_rate: nullableRate(count(validationObservable, (s) => s.test_commands_count > 0), validationObservable.length),
      validation_rate: nullableRate(validation, validationObservable.length),
      validation_observable_sessions: validationObservable.length,
      commit_after_ai_rate: null,
      ai_assisted_commit_rate: git?.commits_in_window ? rate(git.ai_assisted_commits || 0, git.commits_in_window) : null,
      review_workflow_rate: nullableRate(count(contentObservable, (s) => (s.task_categories || []).includes("code_review")), contentObservable.length)
    },
    fair_usage: {
      tokens_per_action: actionsTotal ? Math.round(tokenTotal / actionsTotal) : null,
      tokens_per_validated_session: validation ? Math.round(tokenTotal / validation) : null,
      long_session_without_action_rate: rate(longNoAction, total),
      premium_model_simple_task_rate: null,
      cache_reuse_rate: tokenTotal ? rate(sum(sessions, "cache_read_tokens"), tokenTotal) : null
    }
  };

  metrics.measurement_quality = buildMeasurementQuality({ total, activeProjects, sourceMix, metrics });
  return metrics;
}

export function buildScore(metrics) {
  const calibration = buildCalibration(metrics);
  const adoption = calibration.dimensions.adoption_durable.score;
  const business = calibration.dimensions.usage_metier_reel.score;
  const interaction = calibration.dimensions.qualite_interaction.score;
  const impact = calibration.dimensions.impact_verifiable.score;
  const fair = calibration.dimensions.usage_juste.score;

  const final = metrics.adoption.total_sessions === 0 ? 0 : Math.round(
    adoption * 0.2 +
    business * 0.25 +
    interaction * 0.2 +
    impact * 0.25 +
    fair * 0.1
  );

  return {
    ai_practice_score: final,
    status: "directional_uncalibrated",
    confidence: metrics.measurement_quality?.confidence || "low",
    observed_metric_count: metrics.measurement_quality?.observed_metric_count || 0,
    planned_metric_count: metrics.measurement_quality?.planned_metric_count || 0,
    calibration,
    dimensions: {
      adoption_durable: adoption,
      usage_metier_reel: business,
      qualite_interaction: interaction,
      impact_verifiable: impact,
      usage_juste: fair
    },
    interpretation: interpret(final, metrics)
  };
}

function buildMeasurementQuality({ total, activeProjects, sourceMix, metrics }) {
  const planned = [
    "commit_after_ai_rate",
    "premium_model_simple_task_rate",
    "repeat_same_prompt_rate"
  ];
  const observed = [
    metrics.adoption.total_sessions,
    metrics.adoption.active_days,
    metrics.adoption.active_project_count,
    metrics.business_usage.project_bound_session_rate,
    metrics.business_usage.file_context_rate,
    metrics.business_usage.business_context_rate,
    metrics.business_usage.advanced_workflow_rate,
    metrics.interaction_quality.vague_prompt_rate,
    metrics.interaction_quality.contextualized_prompt_rate,
    metrics.interaction_quality.constraint_rate,
    metrics.interaction_quality.correction_rate,
    metrics.interaction_quality.abandoned_session_rate,
    metrics.verifiable_impact.tool_action_rate,
    metrics.verifiable_impact.test_run_rate,
    metrics.verifiable_impact.validation_rate,
    metrics.verifiable_impact.review_workflow_rate,
    metrics.fair_usage.long_session_without_action_rate,
    metrics.fair_usage.cache_reuse_rate
  ].filter((v) => typeof v === "number" && Number.isFinite(v)).length;
  const sourceCount = Object.keys(sourceMix || {}).length;
  const confidence = total >= 50 && sourceCount >= 2
    ? "medium"
    : total >= 10 || activeProjects.size >= 2
      ? "directional"
      : "low";
  return {
    confidence,
    observed_metric_count: observed,
    planned_metric_count: planned.length,
    source_count: sourceCount,
    notes: [
      "Score is a directional, uncalibrated local individual baseline across Claude Code, Codex and Cursor.",
      "No admin can read employee local data through this CLI; the employee owns the generated PDF/JSON.",
      "Pre-formation baseline and post-formation checkpoint should use the same local collection window."
    ]
  };
}

function buildCalibration(metrics) {
  const sourceCount = Object.keys(metrics.adoption.source_mix || {}).length;
  const categoryDiversity = Object.keys(metrics.business_usage.task_category_mix || {}).length;
  const actionRate = metrics.verifiable_impact.tool_action_rate || 0;
  const validationRate = metrics.verifiable_impact.validation_rate;
  const validatedActionRatio = actionRate && validationRate !== null ? validationRate / actionRate : null;

  const dimensions = {
    adoption_durable: dimension("Usage consistency", [
      component("Active days", scoreCount(metrics.adoption.active_days, 3, 10, 20), 0.35, `${metrics.adoption.active_days} active days`),
      component("Conversation volume", scoreCount(metrics.adoption.total_sessions, 5, 25, 80), 0.25, `${metrics.adoption.total_sessions} conversations`),
      component("Tool coverage", scoreCount(sourceCount, 1, 2, 3), 0.2, `${sourceCount} tools detected`),
      component("Project breadth", scoreCount(metrics.adoption.active_project_count, 1, 4, 10), 0.2, `${metrics.adoption.active_project_count} project contexts`)
    ]),
    usage_metier_reel: dimension("Real work usage", [
      component("Work context", scoreRate(metrics.business_usage.project_bound_session_rate, 0.2, 0.55, 0.8), 0.25, `${pct(metrics.business_usage.project_bound_session_rate)} project-bound`),
      component("File/examples context", scoreRate(metrics.business_usage.file_context_rate, 0.15, 0.5, 0.75), 0.3, `${pct(metrics.business_usage.file_context_rate)} with files or examples`),
      componentForRate("Context-rich prompts", metrics.business_usage.business_context_rate, scoreRate, [0.15, 0.45, 0.7], 0.2, "context-rich prompts"),
      component("Workflow mode", scoreRate(metrics.business_usage.advanced_workflow_rate, 0.2, 0.55, 0.8), 0.2, `${pct(metrics.business_usage.advanced_workflow_rate)} workflow sessions`),
      metrics.business_usage.business_context_rate === null
        ? { label: "Use-case variety", score: null, weight: 0.05, evidence: "not observable", available: false }
        : component("Use-case variety", scoreCount(categoryDiversity, 2, 5, 8), 0.05, `${categoryDiversity} detected use cases`)
    ]),
    qualite_interaction: dimension("Interaction quality", [
      componentForRate("Context-rich prompts", metrics.interaction_quality.contextualized_prompt_rate, scoreRate, [0.15, 0.45, 0.7], 0.3, "contextualized"),
      componentForRate("Low vague prompts", metrics.interaction_quality.vague_prompt_rate, scoreLowRate, [0.15, 0.35, 0.65], 0.3, "vague"),
      componentForRate("Clear constraints", metrics.interaction_quality.constraint_rate, scoreRate, [0.1, 0.35, 0.6], 0.2, "constrained"),
      componentForRate("Low corrections", metrics.interaction_quality.correction_rate, scoreLowRate, [0.05, 0.15, 0.35], 0.1, "corrections"),
      component("Low abandoned sessions", scoreLowRate(metrics.interaction_quality.abandoned_session_rate, 0.03, 0.1, 0.25), 0.1, `${pct(metrics.interaction_quality.abandoned_session_rate)} abandoned`)
    ]),
    impact_verifiable: dimension("Proof and impact", [
      component("Concrete actions", scoreRate(actionRate, 0.2, 0.6, 0.85), 0.25, `${pct(actionRate)} action sessions`),
      componentForRate("Explicit validation", validationRate, scoreRate, [0.05, 0.3, 0.55], 0.35, "validated"),
      componentForRate("Tests/checks", metrics.verifiable_impact.test_run_rate, scoreRate, [0.03, 0.2, 0.4], 0.25, "with tests/checks"),
      componentForRate("Review workflow", metrics.verifiable_impact.review_workflow_rate, scoreRate, [0.1, 0.35, 0.6], 0.15, "review-oriented")
    ]),
    usage_juste: dimension("Fair usage", [
      component("Low long loops", scoreLowRate(metrics.fair_usage.long_session_without_action_rate, 0.03, 0.12, 0.3), 0.45, `${pct(metrics.fair_usage.long_session_without_action_rate)} long no-action sessions`),
      componentForRate("Proof/action balance", validationRate === null ? null : validatedActionRatio, scoreRate, [0.1, 0.45, 0.75], 0.35, "of action sessions validated"),
      componentForRate("Cache reuse", metrics.fair_usage.cache_reuse_rate, scoreRate, [0.1, 0.35, 0.65], 0.2, "cache reuse")
    ])
  };

  return {
    model: SCORING_MODEL_VERSION,
    scale: {
      "0": "not detected",
      "40": "needs work",
      "70": "healthy",
      "90": "strong"
    },
    score_weights: {
      adoption_durable: 0.2,
      usage_metier_reel: 0.25,
      qualite_interaction: 0.2,
      impact_verifiable: 0.25,
      usage_juste: 0.1
    },
    dimensions,
    priority_levers: priorityLevers(metrics)
  };
}

function dimension(label, components) {
  const available = components.filter((component) => component.available !== false);
  const weight = available.reduce((sum, component) => sum + component.weight, 0);
  return {
    label,
    score: weight ? clampScore(available.reduce((sum, c) => sum + c.score * c.weight, 0) / weight) : null,
    available_weight: round(weight),
    components
  };
}

function component(label, score, weight, evidence) {
  return {
    label,
    score: clampScore(score),
    weight,
    evidence,
    available: true
  };
}

function componentForRate(label, value, scorer, thresholds, weight, suffix) {
  if (value === null || value === undefined) {
    return { label, score: null, weight, evidence: "not observable", available: false };
  }
  return component(label, scorer(value, ...thresholds), weight, `${pct(value)} ${suffix}`);
}

function scoreRate(value, poor, healthy, strong) {
  return scoreThreshold(Number(value || 0), poor, healthy, strong);
}

function scoreCount(value, poor, healthy, strong) {
  return scoreThreshold(Number(value || 0), poor, healthy, strong);
}

function scoreLowRate(value, strong, healthy, poor) {
  const v = Number(value || 0);
  if (v <= strong) return 100;
  if (v >= poor) return 0;
  if (v <= healthy) return 100 - ((v - strong) / (healthy - strong)) * 30;
  return 70 - ((v - healthy) / (poor - healthy)) * 70;
}

function scoreThreshold(value, poor, healthy, strong) {
  if (value <= poor) return 0;
  if (value >= strong) return 100;
  if (value <= healthy) return ((value - poor) / (healthy - poor)) * 70;
  return 70 + ((value - healthy) / (strong - healthy)) * 30;
}

function priorityLevers(metrics) {
  const candidates = [
    {
      key: "finish_with_proof",
      label: "Finish with proof",
      score: metrics.verifiable_impact.validation_rate === null ? null : scoreRate(metrics.verifiable_impact.validation_rate, 0.05, 0.3, 0.55),
      action: "End important AI sessions with a check, test, diff review, checklist or acceptance criteria."
    },
    {
      key: "give_more_context",
      label: "Give more context",
      score: metrics.interaction_quality.contextualized_prompt_rate === null ? null : scoreRate(metrics.interaction_quality.contextualized_prompt_rate, 0.15, 0.45, 0.7),
      action: "Start prompts with goal, context, constraints and expected output."
    },
    {
      key: "use_real_material",
      label: "Use real work material",
      score: scoreRate(metrics.business_usage.file_context_rate, 0.15, 0.5, 0.75),
      action: "Attach the relevant file, example, error, spec or previous version."
    },
    {
      key: "move_to_workflow",
      label: "Move from chat to workflow",
      score: scoreRate(metrics.business_usage.advanced_workflow_rate, 0.2, 0.55, 0.8),
      action: "Ask AI to plan, draft, review, improve and package the result."
    }
  ];
  return candidates
    .filter((item) => item.score !== null)
    .map((item) => ({ ...item, score: clampScore(item.score) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

function interpret(score, metrics) {
  if (metrics.adoption.total_sessions === 0) return "No local AI sessions were detected in the selected window.";
  const lever = metrics.measurement_quality?.confidence === "low"
    ? "Run the audit on a longer window for a more useful baseline."
    : "Focus first on the lowest-scoring lever.";
  if (score >= 80) return `Strong AI practice. Keep the habits, then turn the best workflows into reusable templates. ${lever}`;
  if (score >= 60) return `Healthy baseline. Usage is real, but the next gain comes from context and verification. ${lever}`;
  if (score >= 40) return `Active but uneven usage. The priority is to turn loose conversations into concrete workflows with proof. ${lever}`;
  return `Early-stage usage. Start with simple prompt frames and one verification habit. ${lever}`;
}

function count(arr, pred) {
  return arr.reduce((n, x) => n + (pred(x) ? 1 : 0), 0);
}

function sum(arr, key) {
  return arr.reduce((n, x) => n + (Number.isFinite(x[key]) ? x[key] : 0), 0);
}

function topEntry(obj) {
  const [key] = Object.entries(obj || {}).sort((a, b) => b[1] - a[1])[0] || [];
  return key || null;
}

function rate(n, d) {
  return d ? round(n / d) : 0;
}

function nullableRate(n, d) {
  return d ? round(n / d) : null;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function pct(v) {
  return `${Math.round((v || 0) * 100)}%`;
}

function clampScore(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}
