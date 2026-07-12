import { readFileSync } from "node:fs";
import { validateAuditExport } from "../lib/schema.js";

export function loadAudit(path) {
  return validateAuditExport(JSON.parse(readFileSync(path, "utf8")));
}

export function renderComparisonReport(base, current) {
  assertComparable(base, current);
  const baseLabel = base.period || "base";
  const currentLabel = current.period || "current";
  const baseScore = base.score?.ai_practice_score || 0;
  const currentScore = current.score?.ai_practice_score || 0;
  const delta = currentScore - baseScore;

  return `# Wonka AI Usage Audit Comparison

Client: \`${current.org_slug || base.org_slug}\`  
Baseline: \`${baseLabel}\`  
Current: \`${currentLabel}\`

## Executive Summary

AI Practice Score moved from **${baseScore}/100** to **${currentScore}/100** (${signed(delta)} points).

${interpretDelta(delta)}

## Score Evolution

| Dimension | ${baseLabel} | ${currentLabel} | Delta |
| --- | ---: | ---: | ---: |
${dimensionRows(base, current)}

## KPI Evolution

| KPI | ${baseLabel} | ${currentLabel} | Delta |
| --- | ---: | ---: | ---: |
${kpiRows(base, current)}

## Recommended Follow-up

${recommendations(base, current).map((r) => `- **${r.title}**: ${r.body}`).join("\n")}
`;
}

export function assertComparable(base, current) {
  const baseKey = base.methodology?.comparability_key;
  const currentKey = current.methodology?.comparability_key;
  if (!baseKey || !currentKey) {
    throw new Error("Audits are not comparable: methodology comparability metadata is missing.");
  }
  if (baseKey !== currentKey) {
    throw new Error(`Audits are not comparable: ${baseKey} != ${currentKey}`);
  }
  const baseStart = Date.parse(base.collection_window?.start);
  const baseEnd = Date.parse(base.collection_window?.end);
  const currentStart = Date.parse(current.collection_window?.start);
  const currentEnd = Date.parse(current.collection_window?.end);
  const baseDays = baseEnd - baseStart;
  const currentDays = currentEnd - currentStart;
  if (![baseDays, currentDays].every(Number.isFinite) || Math.abs(baseDays - currentDays) > 86400000) {
    throw new Error("Audits are not comparable: collection windows differ by more than one day.");
  }
}

function dimensionRows(base, current) {
  const dims = [
    ["adoption_durable", "Adoption durable"],
    ["usage_metier_reel", "Usage metier reel"],
    ["qualite_interaction", "Qualite d'interaction"],
    ["impact_verifiable", "Impact verifiable"],
    ["usage_juste", "Usage juste"]
  ];
  return dims.map(([key, label]) => {
    const a = base.score?.dimensions?.[key] || 0;
    const b = current.score?.dimensions?.[key] || 0;
    return `| ${label} | ${a} | ${b} | ${signed(b - a)} |`;
  }).join("\n");
}

function kpiRows(base, current) {
  const rows = [
    ["metrics.adoption.total_sessions", "Total sessions", "num"],
    ["metrics.business_usage.file_context_rate", "File context rate", "pct"],
    ["metrics.business_usage.advanced_workflow_rate", "Advanced workflow rate", "pct"],
    ["metrics.interaction_quality.contextualized_prompt_rate", "Contextualized prompts", "pct"],
    ["metrics.interaction_quality.vague_prompt_rate", "Vague prompts", "pct-inverse"],
    ["metrics.interaction_quality.abandoned_session_rate", "Abandoned sessions", "pct-inverse"],
    ["metrics.verifiable_impact.validation_rate", "Validation rate", "pct"],
    ["metrics.verifiable_impact.test_run_rate", "Test run rate", "pct"],
    ["metrics.fair_usage.long_session_without_action_rate", "Long no-action sessions", "pct-inverse"]
  ];
  return rows.map(([path, label, kind]) => {
    const a = get(base, path);
    const b = get(current, path);
    return `| ${label} | ${format(a, kind)} | ${format(b, kind)} | ${formatDelta(a, b, kind)} |`;
  }).join("\n");
}

function recommendations(base, current) {
  const out = [];
  const validation = get(current, "metrics.verifiable_impact.validation_rate") || 0;
  const vague = get(current, "metrics.interaction_quality.vague_prompt_rate") || 0;
  const contextualizedDelta = (get(current, "metrics.interaction_quality.contextualized_prompt_rate") || 0) -
    (get(base, "metrics.interaction_quality.contextualized_prompt_rate") || 0);
  if (validation < 0.25) {
    out.push({
      title: "Prioritize verification",
      body: "Validation remains low. The next training should focus on test, lint, typecheck and review loops."
    });
  }
  if (vague > 0.3) {
    out.push({
      title: "Reduce vague prompts",
      body: "Prompt quality is still a bottleneck. Introduce templates tied to real team workflows."
    });
  }
  if (contextualizedDelta > 0.1) {
    out.push({
      title: "Scale the winning pattern",
      body: "Contextualized prompts improved meaningfully. Turn the best examples into shared playbooks."
    });
  }
  if (!out.length) {
    out.push({
      title: "Maintain and deepen",
      body: "The trend is healthy. Move the next review toward business outcomes and workflow standardization."
    });
  }
  return out.slice(0, 3);
}

function interpretDelta(delta) {
  if (delta >= 10) return "Strong improvement. The training appears to have changed day-to-day practice.";
  if (delta >= 3) return "Positive movement. The training is taking hold, but follow-up coaching is still useful.";
  if (delta > -3) return "Mostly stable. Look at dimension-level changes to find where the training did or did not transfer.";
  return "Regression detected. The team likely needs targeted follow-up and simpler workflow templates.";
}

function get(obj, path) {
  return path.split(".").reduce((cur, key) => cur && cur[key], obj);
}

function signed(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function format(v, kind) {
  if (v === null || v === undefined) return "n/a";
  if (kind.startsWith("pct")) return `${Math.round(v * 100)}%`;
  return String(v);
}

function formatDelta(a, b, kind) {
  if (a === null || a === undefined || b === null || b === undefined) return "n/a";
  const delta = b - a;
  if (kind.startsWith("pct")) return `${delta >= 0 ? "+" : ""}${Math.round(delta * 100)} pts`;
  return signed(delta);
}
