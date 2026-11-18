import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Privacy primitives for one audit run.
 *
 * `hash()` pseudonymizes session ids and working directories with a random
 * per-run salt that is never written anywhere, so hashes cannot be linked
 * across audits. `stableParticipantHash()` is the only cross-audit identifier
 * and only exists when an operator supplies a tenant secret.
 *
 * @param {string} [orgSlug]
 * @param {string} [auditSalt] Injected only by tests; defaults to 32 random bytes.
 */
export function makePrivacy(orgSlug, auditSalt = randomBytes(32).toString("hex")) {
  const salt = `wonka-ai-audit:${orgSlug || "local"}:${auditSalt}`;
  return {
    /**
     * @param {unknown} value
     * @returns {string | null} 16 hex chars, or null for empty input.
     */
    hash(value) {
      if (!value) return null;
      return createHash("sha256").update(salt).update(String(value)).digest("hex").slice(0, 16);
    },
    /**
     * Tenant-scoped HMAC pseudonym used only to de-duplicate participants during aggregation.
     * @param {string | undefined} participantId
     * @param {string | undefined} tenantSecret At least 24 characters.
     * @returns {string | null}
     */
    stableParticipantHash(participantId, tenantSecret) {
      if (!participantId || !tenantSecret) return null;
      if (String(tenantSecret).length < 24) throw new Error("WONKA_AUDIT_TENANT_SECRET must be at least 24 characters");
      return createHmac("sha256", String(tenantSecret)).update(String(participantId)).digest("hex").slice(0, 32);
    }
  };
}
