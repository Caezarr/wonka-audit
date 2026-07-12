import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { walkFiles } from "../lib/files.js";
import { AUDIT_SCHEMA_VERSION } from "../lib/contracts.js";

const KPI_PATHS = [
  "score.ai_practice_score",
  "metrics.business_usage.file_context_rate",
  "metrics.business_usage.advanced_workflow_rate",
  "metrics.interaction_quality.contextualized_prompt_rate",
  "metrics.interaction_quality.vague_prompt_rate",
  "metrics.verifiable_impact.validation_rate",
  "metrics.fair_usage.long_session_without_action_rate"
];

export function loadAuditDirectory(root) {
  const files = walkFiles(root, (full, entry) => entry === "wonka-ai-audit-report.json" || entry.endsWith(".audit.json"), 8);
  const audits = [];
  const rejected = [];
  for (const file of files) {
    try {
      const audit = JSON.parse(readFileSync(file.path, "utf8"));
      if (audit.schema_version !== AUDIT_SCHEMA_VERSION || !audit.methodology?.comparability_key) {
        rejected.push({ file: basename(file.path), reason: "unsupported schema or missing methodology" });
      } else {
        audits.push(audit);
      }
    } catch (error) {
      rejected.push({ file: basename(file.path), reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { audits, rejected, files_scanned: files.length };
}

export function aggregateAudits(audits, { minCohortSize = 5 } = {}) {
  if (!Number.isInteger(minCohortSize) || minCohortSize < 3) {
    throw new Error("Minimum cohort size must be an integer of at least 3.");
  }
  const methodologyKeys = new Set(audits.map((audit) => audit.methodology?.comparability_key));
  if (methodologyKeys.size > 1) throw new Error("Cannot aggregate audits with incompatible methodologies.");

  const cohorts = new Map();
  for (const audit of audits) {
    const key = audit.team_slug || "all";
    if (!cohorts.has(key)) cohorts.set(key, []);
    cohorts.get(key).push(audit);
  }

  const visible = [];
  const suppressed = [];
  for (const [cohort, members] of cohorts) {
    if (members.length < minCohortSize) {
      suppressed.push({ cohort, participant_count: members.length, reason: "below_minimum_cohort_size" });
      continue;
    }
    const metrics = {};
    for (const path of KPI_PATHS) {
      const values = members.map((audit) => get(audit, path)).filter(Number.isFinite);
      metrics[path] = summarize(values);
    }
    visible.push({ cohort, participant_count: members.length, metrics });
  }

  return {
    schema_version: "enterprise-aggregate-1.0",
    generated_at: new Date().toISOString(),
    methodology_comparability_key: [...methodologyKeys][0] || null,
    privacy: {
      minimum_cohort_size: minCohortSize,
      individual_rows_exported: false,
      small_cohorts_suppressed: true
    },
    input_export_count: audits.length,
    cohorts: visible,
    suppressed_cohorts: suppressed,
    limitations: [
      "Each input export is treated as one participant; operators must prevent duplicate participant exports.",
      "Aggregates describe observed practice and do not establish causal training impact."
    ]
  };
}

export function renderAggregateMarkdown(aggregate) {
  const rows = aggregate.cohorts.map((cohort) => {
    const score = cohort.metrics["score.ai_practice_score"]?.mean;
    const validation = cohort.metrics["metrics.verifiable_impact.validation_rate"]?.mean;
    return `| ${escapeCell(cohort.cohort)} | ${cohort.participant_count} | ${format(score)} | ${formatPct(validation)} |`;
  }).join("\n");
  return `# Wonka Enterprise AI Usage Aggregate

Minimum cohort size: ${aggregate.privacy.minimum_cohort_size}

| Cohort | Participants | Mean directional score | Mean validation rate |
| --- | ---: | ---: | ---: |
${rows || "| No cohort met the privacy threshold | 0 | n/a | n/a |"}

Suppressed cohorts: ${aggregate.suppressed_cohorts.length}

The score is directional and uncalibrated. Individual rows are never included in this aggregate.
`;
}

function summarize(values) {
  if (!values.length) return { observed_count: 0, mean: null, median: null, p25: null, p75: null };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    observed_count: sorted.length,
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    median: percentile(sorted, 0.5),
    p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75)
  };
}

function percentile(sorted, p) {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function get(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function format(value) {
  return Number.isFinite(value) ? String(value) : "n/a";
}

function formatPct(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "n/a";
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}
