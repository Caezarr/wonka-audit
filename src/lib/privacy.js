import { createHash, createHmac, randomBytes } from "node:crypto";
import { homedir } from "node:os";

const SECRET_RE = /\b(api[_-]?key|secret|token|password|passwd|authorization|bearer)\b(["'\s:=]{1,4})([A-Za-z0-9_\-./+]{12,})/gi;

export function makePrivacy(orgSlug, auditSalt = randomBytes(32).toString("hex")) {
  const salt = `wonka-ai-audit:${orgSlug || "local"}:${auditSalt}`;
  return {
    hash(value) {
      if (!value) return null;
      return createHash("sha256").update(salt).update(String(value)).digest("hex").slice(0, 16);
    },
    stableParticipantHash(participantId, tenantSecret) {
      if (!participantId || !tenantSecret) return null;
      if (String(tenantSecret).length < 24) throw new Error("WONKA_AUDIT_TENANT_SECRET must be at least 24 characters");
      return createHmac("sha256", String(tenantSecret)).update(String(participantId)).digest("hex").slice(0, 32);
    },
    redactText(value, maxLen = 220) {
      if (!value) return "";
      const home = homedir();
      let text = String(value).replaceAll(home, "~");
      text = text.replace(SECRET_RE, "$1$2[REDACTED]");
      text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]");
      text = text.replace(/\s+/g, " ").trim();
      return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
    },
    compactPath(value) {
      if (!value) return null;
      return String(value).replaceAll(homedir(), "~");
    }
  };
}
