import { AUDIT_SCHEMA_VERSION } from "./contracts.js";

export function validateAuditExport(audit) {
  const errors = [];
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) errors.push("export must be an object");
  if (audit?.schema_version !== AUDIT_SCHEMA_VERSION) errors.push(`schema_version must be ${AUDIT_SCHEMA_VERSION}`);
  if (!audit?.methodology?.comparability_key) errors.push("methodology.comparability_key is required");
  if (!validDate(audit?.collection_window?.start)) errors.push("collection_window.start must be an ISO date");
  if (!validDate(audit?.collection_window?.end)) errors.push("collection_window.end must be an ISO date");
  if (!finite(audit?.score?.ai_practice_score)) errors.push("score.ai_practice_score must be numeric");
  if (!audit?.metrics || typeof audit.metrics !== "object") errors.push("metrics is required");
  if (errors.length) throw new Error(`Invalid audit export: ${errors.join("; ")}`);
  return audit;
}

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}
