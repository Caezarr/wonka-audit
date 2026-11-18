// @ts-check
// Output layer: renders an audit export into the local artifact bundle and
// writes the integrity manifest. Everything is written to a local directory;
// nothing here performs network I/O.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { renderMarkdownReport } from "../reports/markdown.js";
import { writePdfReport } from "../reports/pdf.js";
import { renderLinkedInPost } from "../reports/linkedin.js";
import { renderHtmlReport } from "../reports/html.js";
import { renderWrappedCardSvg } from "../reports/card-svg.js";
import { buildPublicSharePayload, renderPublicSharePage } from "../reports/public-share.js";
import { openLocalFile } from "../lib/open.js";

/** Default output root, created under the user's Desktop when it exists. */
export const DEFAULT_OUTPUT_FOLDER = "Wonka AI Audit";

/**
 * Write every per-run artifact plus the SHA-256 manifest.
 *
 * @param {any} audit Audit export built by buildAudit().
 * @param {string} outDir Existing output directory.
 * @returns {{ jsonPath: string, htmlPath: string, markdownPath: string, pdfPath: string,
 *   cardPath: string, linkedinPath: string, methodologyPath: string, manifestPath: string }}
 */
export function writeAuditArtifacts(audit, outDir) {
  const paths = {
    jsonPath: resolve(outDir, "wonka-ai-audit-report.json"),
    htmlPath: resolve(outDir, "index.html"),
    markdownPath: resolve(outDir, "wonka-ai-audit-report.md"),
    pdfPath: resolve(outDir, "wonka-ai-usage-audit.pdf"),
    cardPath: resolve(outDir, "wonka-ai-wrapped-card.svg"),
    linkedinPath: resolve(outDir, "linkedin-post.txt"),
    methodologyPath: resolve(outDir, "wonka-ai-audit-methodology.json"),
    manifestPath: resolve(outDir, "wonka-ai-audit-manifest.json")
  };
  writeFileSync(paths.jsonPath, JSON.stringify(audit, null, 2));
  writeFileSync(paths.htmlPath, renderHtmlReport(audit));
  writeFileSync(paths.markdownPath, renderMarkdownReport(audit));
  writeFileSync(paths.cardPath, renderWrappedCardSvg(audit));
  writeFileSync(paths.linkedinPath, renderLinkedInPost(audit));
  writeFileSync(paths.methodologyPath, JSON.stringify({
    schema_version: audit.schema_version,
    methodology: audit.methodology,
    collectors: audit.collectors,
    collection_window: audit.collection_window,
    privacy: audit.privacy,
    source_coverage: audit.source_coverage
  }, null, 2));
  writePdfReport(audit, paths.pdfPath);
  const artifactPaths = [
    paths.jsonPath, paths.htmlPath, paths.markdownPath, paths.pdfPath,
    paths.cardPath, paths.linkedinPath, paths.methodologyPath
  ];
  writeFileSync(paths.manifestPath, JSON.stringify({
    manifest_version: "1.0",
    generated_at: audit.generated_at,
    schema_version: audit.schema_version,
    comparability_key: audit.methodology.comparability_key,
    privacy: audit.privacy,
    artifacts: artifactPaths.map((path) => ({
      // basename(), not split("/"), so Windows manifests never carry an absolute path.
      name: basename(path),
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex")
    }))
  }, null, 2));
  return paths;
}

/**
 * Write the opt-in public share bundle. It only contains the reduced public
 * payload (see buildPublicSharePayload), never the private export.
 *
 * @param {any} audit
 * @param {string} outDir
 * @param {string | null | undefined} shareUrl
 * @param {boolean} [noOpen]
 */
export function writeShareBundle(audit, outDir, shareUrl, noOpen = false) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), renderPublicSharePage(audit, { shareUrl: shareUrl || "" }));
  writeFileSync(resolve(outDir, "share-card.svg"), renderWrappedCardSvg(audit));
  writeFileSync(resolve(outDir, "public-share.json"), JSON.stringify(buildPublicSharePayload(audit), null, 2));
  const pagePath = resolve(outDir, "index.html");
  console.log(`Share preview: ${pagePath}`);
  console.log("Only the public recap is included; private audit details stay outside this folder.");
  console.log("Local preview only: no public URL has been created yet.");
  if (!noOpen && process.stdout.isTTY && !process.env.CI) {
    console.log("Opening the preview in your browser...");
    openLocalFile(pagePath);
  }
}

/**
 * Resolve and create the run folder: `--out` verbatim, otherwise a
 * timestamped folder under Desktop/Wonka AI Audit (or ./Wonka AI Audit).
 *
 * @param {any} args
 * @param {{ start: Date, end: Date }} window
 * @returns {string}
 */
export function ensureOutputDir(args, window) {
  const preferred = resolveOutputDir(args, window);
  try {
    if (!existsSync(preferred)) mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch (error) {
    if (args.out) throw error;
    const fallback = resolve(DEFAULT_OUTPUT_FOLDER, runFolderName(args, window));
    if (!existsSync(fallback)) mkdirSync(fallback, { recursive: true });
    console.log(`Desktop output unavailable; using ${fallback}`);
    return fallback;
  }
}

/**
 * @param {any} args
 * @param {{ start: Date, end: Date }} window
 */
function resolveOutputDir(args, window) {
  if (args.out) return resolve(args.out);
  const desktop = join(homedir(), "Desktop");
  const root = existsSync(desktop) ? join(desktop, DEFAULT_OUTPUT_FOLDER) : resolve(DEFAULT_OUTPUT_FOLDER);
  return join(root, runFolderName(args, window));
}

/**
 * @param {any} args
 * @param {{ start: Date, end: Date }} window
 */
function runFolderName(args, window) {
  const label = sanitizePathPart(args.runLabel || args.period || "audit");
  const start = datePart(window.start);
  const end = datePart(window.end);
  const generated = dateTimePart(new Date());
  return `${label}_${start}_to_${end}_${generated}`;
}

/** @param {unknown} value */
function sanitizePathPart(value) {
  return String(value || "audit")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "audit";
}

/** @param {Date} date */
function datePart(date) {
  return date.toISOString().slice(0, 10);
}

/** @param {Date} date */
function dateTimePart(date) {
  return date.toISOString().slice(0, 16).replace(/[:T]/g, "-");
}
