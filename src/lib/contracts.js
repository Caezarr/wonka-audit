export const AUDIT_SCHEMA_VERSION = "2.0";
export const SESSION_SCHEMA_VERSION = "1.0";
export const SCORING_MODEL_VERSION = "local_individual_v3_directional";
export const METHODOLOGY_VERSION = "2026.07";
export const COLLECTOR_VERSION = "1.0";

export function methodologyDescriptor({ contentInspection }) {
  return {
    methodology_version: METHODOLOGY_VERSION,
    session_schema_version: SESSION_SCHEMA_VERSION,
    scoring_model_version: SCORING_MODEL_VERSION,
    score_status: "directional_uncalibrated",
    content_inspection: Boolean(contentInspection),
    comparability_key: [
      AUDIT_SCHEMA_VERSION,
      METHODOLOGY_VERSION,
      SCORING_MODEL_VERSION,
      contentInspection ? "content" : "metadata"
    ].join(":"),
    limitations: [
      "The score is directional and has not been empirically calibrated against business outcomes.",
      "Source capabilities differ; unavailable signals are excluded rather than scored as zero.",
      "A change in score is an observed association, not proof that training caused the change."
    ]
  };
}

export function collectorMetadata(result) {
  return {
    collector_version: COLLECTOR_VERSION,
    status: result.status,
    capabilities: result.capabilities || {},
    warnings: result.warnings || []
  };
}
