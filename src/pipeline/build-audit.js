// Pipeline core: collector results -> normalized sessions -> metrics -> score -> audit export.
// No I/O happens here, so the export shape can be tested without touching the filesystem.

import { buildMetrics, buildScore } from "../metrics/score.js";
import { buildRecommendations } from "../metrics/recommendations.js";
import { AUDIT_SCHEMA_VERSION, collectorMetadata, methodologyDescriptor } from "../lib/contracts.js";
import { iso } from "../lib/time.js";

/**
 * @typedef {object} CollectorResults
 * @property {any} claude
 * @property {any} codex
 * @property {any} cursor
 * @property {any} git
 */

/**
 * Assemble the audit export (schemas/audit-export.schema.json) from collector results.
 *
 * @param {object} input
 * @param {CollectorResults} input.results
 * @param {{ start: Date, end: Date }} input.window
 * @param {any} input.args Parsed CLI arguments (see src/lib/args.js).
 * @param {boolean} input.contentInspection
 * @param {string | null} input.participantHash
 * @returns {any}
 */
export function buildAudit({ results, window, args, contentInspection, participantHash }) {
  const { claude, codex, cursor, git } = results;
  const sessions = [
    ...(claude.sessions || []),
    ...(codex.sessions || []),
    ...(cursor.sessions || [])
  ];
  const metrics = buildMetrics({ sessions, git });
  const score = buildScore(metrics);
  const recommendations = buildRecommendations(metrics, score);
  return {
    schema_version: AUDIT_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    org_slug: args.org,
    participant_hash: participantHash || undefined,
    team_slug: args.team || undefined,
    period: args.period,
    training_date: args.trainingDate || undefined,
    collection_window: {
      start: iso(window.start),
      end: iso(window.end)
    },
    privacy: {
      content_uploaded: false,
      examples_included: false,
      hashing: "sha256_with_ephemeral_audit_salt",
      local_content_inspection: contentInspection,
      raw_content_exported: false
    },
    methodology: methodologyDescriptor({ contentInspection }),
    collectors: {
      claude_code: collectorMetadata(claude),
      codex: collectorMetadata(codex),
      cursor: collectorMetadata(cursor),
      git: collectorMetadata(git)
    },
    source_coverage: {
      claude_code: coverage(claude),
      cursor: coverage(cursor),
      codex: coverage(codex),
      git: {
        status: git.status,
        repos_detected: git.repos_detected || 0,
        commits_in_window: git.commits_in_window || 0
      }
    },
    metrics,
    score,
    recommendations
  };
}

/** @param {any} result */
function coverage(result) {
  return {
    status: result.status,
    sessions_detected: result.sessions?.length || 0,
    files_scanned: result.files_scanned,
    reason: result.reason,
    capabilities: result.capabilities || {},
    warnings: result.warnings || []
  };
}
