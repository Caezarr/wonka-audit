import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

export function signManifest(manifestPath, privateKeyPath) {
  const data = readFileSync(manifestPath);
  const privateKey = createPrivateKey(readFileSync(privateKeyPath, "utf8"));
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("Manifest signing requires an Ed25519 private key");
  return {
    signature_version: "1.0",
    algorithm: "Ed25519",
    manifest: basename(manifestPath),
    signature: sign(null, data, privateKey).toString("base64")
  };
}

export function verifyManifestSignature(signaturePath, publicKeyPath) {
  const envelope = JSON.parse(readFileSync(signaturePath, "utf8"));
  if (envelope.algorithm !== "Ed25519" || !envelope.manifest || !envelope.signature) {
    throw new Error("Invalid signature envelope");
  }
  const manifestPath = resolve(dirname(signaturePath), envelope.manifest);
  const publicKey = createPublicKey(readFileSync(publicKeyPath, "utf8"));
  const valid = verify(null, readFileSync(manifestPath), publicKey, Buffer.from(envelope.signature, "base64"));
  if (!valid) throw new Error("Manifest signature verification failed");
  return { valid: true, manifest: manifestPath, algorithm: envelope.algorithm };
}
