import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signManifest, verifyManifestSignature } from "../src/lib/signature.js";

test("Ed25519 signatures detect modified audit manifests", () => {
  const dir = mkdtempSync(join(tmpdir(), "wonka-signature-"));
  const manifest = join(dir, "manifest.json");
  const privatePath = join(dir, "private.pem");
  const publicPath = join(dir, "public.pem");
  const signaturePath = join(dir, "manifest.signature.json");
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  writeFileSync(privatePath, privateKey.export({ type: "pkcs8", format: "pem" }));
  writeFileSync(publicPath, publicKey.export({ type: "spki", format: "pem" }));
  writeFileSync(manifest, JSON.stringify({ audit: "valid" }));
  writeFileSync(signaturePath, JSON.stringify(signManifest(manifest, privatePath)));
  assert.equal(verifyManifestSignature(signaturePath, publicPath).valid, true);
  writeFileSync(manifest, JSON.stringify({ audit: "modified" }));
  assert.throws(() => verifyManifestSignature(signaturePath, publicPath), /verification failed/);
});
