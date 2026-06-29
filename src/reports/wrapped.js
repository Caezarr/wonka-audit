export function buildWrappedRecap(audit) {
  const m = audit.metrics;
  const s = audit.score;
  const score = s.ai_practice_score || 0;
  const workflowRate = m.business_usage?.advanced_workflow_rate || 0;
  const validationRate = m.verifiable_impact?.validation_rate || 0;
  const contextRate = m.interaction_quality?.contextualized_prompt_rate || 0;
  const vagueRate = m.interaction_quality?.vague_prompt_rate || 0;
  const fileRate = m.business_usage?.file_context_rate || 0;
  const topUseCase = label(m.wrapped_summary?.top_use_case || "general_ai_work");
  const topTool = label(m.wrapped_summary?.top_tool || "ai_tools");

  const profile = chooseProfile({ score, workflowRate, validationRate, contextRate, vagueRate });
  const headline = buildHeadline({ profile, score, topUseCase, validationRate, workflowRate });
  const insights = [
    metricInsight("Context", contextRate, "Your prompts include useful context", "Add objective, context, constraints and expected output earlier."),
    metricInsight("Workflow", workflowRate, "You turn AI into multi-step work", "Bring files, repo state and tasks into the conversation."),
    metricInsight("Proof", validationRate, "You close work with verification", "Finish important sessions with checks, tests or review criteria."),
    metricInsight("Real material", fileRate, "You use concrete work material", "Attach the relevant file, example, spec or error log.")
  ];

  const nextMoves = buildNextMoves(audit, { vagueRate, workflowRate, validationRate, fileRate, contextRate });

  return {
    profile,
    headline,
    top_use_case: topUseCase,
    top_tool: topTool,
    stats: [
      { label: "AI Practice Score", value: `${score}/100`, tone: scoreTone(score) },
      { label: "Conversations", value: String(m.wrapped_summary?.conversations || 0), tone: "neutral" },
      { label: "Top use case", value: topUseCase, tone: "neutral" },
      { label: "Workflow mode", value: pct(workflowRate), tone: rateTone(workflowRate) }
    ],
    insights,
    next_moves: nextMoves,
    linkedin_angle: buildLinkedInAngle({ score, topUseCase, workflowRate, validationRate, contextRate })
  };
}

function chooseProfile({ score, workflowRate, validationRate, contextRate, vagueRate }) {
  if (score >= 78 && validationRate >= 0.35) {
    return {
      name: "The Proof Builder",
      description: "You are already turning AI into useful work. The next edge is standardizing the best workflows for the team."
    };
  }
  if (workflowRate >= 0.5 && validationRate < 0.3) {
    return {
      name: "The Workflow Sprinter",
      description: "You use AI in real work, but the final verification habit is where the next gains sit."
    };
  }
  if (contextRate >= 0.45 && vagueRate <= 0.25) {
    return {
      name: "The Context Giver",
      description: "You give AI enough signal to be useful. Now convert that clarity into repeatable workflows and proof."
    };
  }
  if (score >= 45) {
    return {
      name: "The Active Explorer",
      description: "You are using AI regularly, but the practice still needs stronger context, workflow structure and validation."
    };
  }
  return {
    name: "The Starter",
    description: "The baseline is early. Focus on one simple prompt frame and one verification habit before adding complexity."
  };
}

function buildHeadline({ profile, score, topUseCase, validationRate, workflowRate }) {
  if (score >= 80) return `${profile.name}: strong AI practice led by ${topUseCase}.`;
  if (validationRate < 0.25) return `${profile.name}: your fastest upgrade is ending more work with proof.`;
  if (workflowRate < 0.4) return `${profile.name}: the next step is moving from chat to workflow.`;
  return `${profile.name}: a healthy baseline with clear room to compound.`;
}

function buildNextMoves(audit, rates) {
  const levers = audit.score?.calibration?.priority_levers || [];
  const fromScore = levers.map((lever) => ({
    title: lever.label,
    body: lever.action
  }));
  if (fromScore.length) return fromScore.slice(0, 3);

  const moves = [];
  if (rates.contextRate < 0.5 || rates.vagueRate > 0.25) {
    moves.push({
      title: "Use a prompt frame",
      body: "For important work, start with objective, context, constraints and expected output."
    });
  }
  if (rates.workflowRate < 0.5 || rates.fileRate < 0.4) {
    moves.push({
      title: "Bring real work in",
      body: "Attach files, examples, specs or logs so AI works on the actual problem."
    });
  }
  if (rates.validationRate < 0.3) {
    moves.push({
      title: "Finish with proof",
      body: "End sessions with tests, checks, review criteria or a concrete acceptance list."
    });
  }
  if (!moves.length) {
    moves.push({
      title: "Package the best patterns",
      body: "Turn your strongest workflows into reusable team playbooks."
    });
  }
  return moves.slice(0, 3);
}

function metricInsight(labelText, value, good, improve) {
  return {
    label: labelText,
    value: pct(value),
    level: value >= 0.6 ? "strong" : value >= 0.35 ? "developing" : "needs-work",
    sentence: value >= 0.6 ? good : improve
  };
}

function buildLinkedInAngle({ score, topUseCase, workflowRate, validationRate, contextRate }) {
  const strongest = [
    ["context", contextRate],
    ["workflow", workflowRate],
    ["verification", validationRate]
  ].sort((a, b) => b[1] - a[1])[0][0];
  return `A ${score}/100 local AI practice baseline, led by ${topUseCase}, with ${strongest} as the strongest current signal.`;
}

function scoreTone(score) {
  if (score >= 75) return "strong";
  if (score >= 55) return "developing";
  return "needs-work";
}

function rateTone(value) {
  if (value >= 0.6) return "strong";
  if (value >= 0.35) return "developing";
  return "needs-work";
}

export function pct(v) {
  return `${Math.round((v || 0) * 100)}%`;
}

export function label(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
