#!/usr/bin/env node
// CLI entry point: parses flags and dispatches to one mode.
// Pipeline: collectors (src/collectors) -> session normalization (src/lib/session.js)
// -> metrics + score (src/metrics) -> audit export (src/pipeline/build-audit.js)
// -> renderers (src/reports) written by src/pipeline/write-outputs.js.
// See docs/ARCHITECTURE.md.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs, printHelp } from "./lib/args.js";
import { deriveWindow, iso } from "./lib/time.js";
import { makePrivacy } from "./lib/privacy.js";
import { collectClaudeCode } from "./collectors/claude-code.js";
import { collectCodex } from "./collectors/codex.js";
import { collectCursor } from "./collectors/cursor.js";
import { collectGit } from "./collectors/git.js";
import { loadAudit, renderComparisonReport } from "./reports/compare.js";
import { collectSafely } from "./lib/collection.js";
import { aggregateAudits, loadAuditDirectory, renderAggregateMarkdown } from "./enterprise/aggregate.js";
import { signManifest, verifyManifestSignature } from "./lib/signature.js";
import { buildAudit } from "./pipeline/build-audit.js";
import {
  DEFAULT_OUTPUT_FOLDER,
  ensureOutputDir,
  writeAuditArtifacts,
  writeShareBundle
} from "./pipeline/write-outputs.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.explainPrivacy) {
    printPrivacyExplanation();
    return;
  }
  if (args.verifySignature) {
    if (!args.publicKey) throw new Error("--verify-signature requires --public-key");
    const result = verifyManifestSignature(resolve(args.verifySignature), resolve(args.publicKey));
    console.log(`Valid ${result.algorithm} signature for ${result.manifest}`);
    return;
  }
  if (args.compare) {
    if (args.compare.length !== 2) throw new Error("--compare requires two JSON files");
    const base = loadAudit(args.compare[0]);
    const current = loadAudit(args.compare[1]);
    const outDir = resolve(args.out || "wonka-audit-compare");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, "wonka-ai-audit-comparison.md");
    writeFileSync(outPath, renderComparisonReport(base, current));
    console.log(`Wrote ${outPath}`);
    return;
  }
  if (args.aggregate) {
    const loaded = loadAuditDirectory(resolve(args.aggregate));
    const aggregate = aggregateAudits(loaded.audits, { minCohortSize: args.minCohortSize });
    aggregate.input = { files_scanned: loaded.files_scanned, rejected: loaded.rejected };
    const outDir = resolve(args.out || "wonka-audit-aggregate");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "wonka-ai-audit-aggregate.json"), JSON.stringify(aggregate, null, 2));
    writeFileSync(resolve(outDir, "wonka-ai-audit-aggregate.md"), renderAggregateMarkdown(aggregate));
    console.log(`Aggregated ${aggregate.input_export_count} compatible exports into ${outDir}`);
    console.log(`${aggregate.suppressed_cohorts.length} cohort(s) suppressed below the privacy threshold`);
    return;
  }
  if (typeof args.share === "string") {
    const audit = loadAudit(resolve(args.share));
    const outDir = resolve(args.out || "wonka-audit-share");
    writeShareBundle(audit, outDir, args.shareUrl, args.noOpen);
    return;
  }
  if (args.upload) {
    throw new Error("Upload is not implemented. This MVP is local-only; share the generated PDF/JSON manually if needed.");
  }

  printClientNotice(args);

  const window = deriveWindow(args);
  const privacy = makePrivacy(args.org);
  const participantHash = privacy.stableParticipantHash(
    process.env.WONKA_AUDIT_PARTICIPANT_ID,
    process.env.WONKA_AUDIT_TENANT_SECRET
  );
  const context = {
    window,
    privacy,
    orgSlug: args.org,
    teamSlug: args.team,
    contentInspection: !args.noContent
  };

  const [claude, codex, cursor, git] = await Promise.all([
    collectSafely("claude_code", collectClaudeCode, context),
    collectSafely("codex", collectCodex, context),
    collectSafely("cursor", collectCursor, context),
    collectSafely("git", collectGit, context)
  ]);

  if (args.preview) {
    printPreview({ claude, codex, cursor, git, window });
    return;
  }

  const audit = buildAudit({
    results: { claude, codex, cursor, git },
    window,
    args,
    contentInspection: context.contentInspection,
    participantHash
  });

  const outDir = ensureOutputDir(args, window);
  const { jsonPath, htmlPath, pdfPath, cardPath, linkedinPath, methodologyPath, manifestPath } =
    writeAuditArtifacts(audit, outDir);
  if (args.signPrivateKey) {
    const signaturePath = resolve(outDir, "wonka-ai-audit-manifest.signature.json");
    writeFileSync(signaturePath, JSON.stringify(signManifest(manifestPath, resolve(args.signPrivateKey)), null, 2));
    console.log(`Signature: ${signaturePath}`);
  }
  if (args.share === true) writeShareBundle(audit, resolve(outDir, "public-share"), args.shareUrl, args.noOpen);
  console.log("");
  console.log(`Local page: ${htmlPath}`);
  console.log(`Wrapped card: ${cardPath}`);
  console.log(`PDF ready: ${pdfPath}`);
  console.log(`LinkedIn draft: ${linkedinPath}`);
  console.log(`Data export: ${jsonPath}`);
  console.log(`Methodology: ${methodologyPath}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`AI Practice Score: ${audit.score.ai_practice_score}/100`);
}

function printPreview({ claude, codex, cursor, git, window }) {
  console.log("Wonka AI Usage Audit preview");
  console.log(`Window: ${iso(window.start)} -> ${iso(window.end)}`);
  console.log("");
  console.log(`Claude Code: ${claude.status} (${claude.sessions?.length || 0} sessions)`);
  console.log(`Codex:       ${codex.status} (${codex.sessions?.length || 0} sessions)`);
  console.log(`Cursor:      ${cursor.status} (${cursor.sessions?.length || 0} sessions)`);
  if (cursor.reason) console.log(`             ${cursor.reason}`);
  console.log(`Git:         ${git.status} (${git.commits_in_window || 0} commits in window)`);
}

function printClientNotice(args) {
  if (args.preview) return;
  const defaultTarget = args.out ? resolve(args.out) : join(homedir(), "Desktop", DEFAULT_OUTPUT_FOLDER, "<run-folder>");
  console.log("Wonka AI Usage Audit");
  console.log("Runs locally on this computer. No prompts, source code, secrets or raw conversations are uploaded.");
  console.log(args.noContent
    ? "Metadata-only mode: prompt/message text is not classified."
    : "Short prompt snippets may be inspected locally in memory to classify usage quality; they are not exported by default.");
  console.log("Website: https://wonka-ai.com");
  console.log("Terms:   https://wonka-ai.com/cgv");
  console.log(`Output:  ${defaultTarget}`);
  console.log("");
  console.log("Scanning Claude Code, Codex, Cursor and local Git signals...");
}

function printPrivacyExplanation() {
  console.log("Wonka AI Usage Audit - privacy model");
  console.log("");
  console.log("Default behavior:");
  console.log("- Runs locally on the employee workstation.");
  console.log("- Does not call Wonka servers or third-party APIs.");
  console.log("- Writes a local PDF, JSON and Markdown report.");
  console.log("- Does not export full prompts, assistant answers, source code, secrets or absolute local paths.");
  console.log("");
  console.log("Local processing:");
  console.log("- The CLI may read short local prompt/message text in memory to classify whether usage is vague, contextualized, constrained or corrective.");
  console.log("- Cursor is read through aggregate sqlite queries; the default report stores counts and rates, not raw Cursor conversations.");
  console.log("- Hashes use a non-exported ephemeral salt and cannot be linked across audits.");
  console.log("");
  console.log("Sharing:");
  console.log("- Automatic upload is not implemented.");
  console.log("- The PDF/JSON export should be shared only by the employee or client through an explicit manual process.");
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
