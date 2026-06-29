#!/usr/bin/env node
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
import { buildMetrics, buildScore } from "./metrics/score.js";
import { buildRecommendations } from "./metrics/recommendations.js";
import { renderMarkdownReport } from "./reports/markdown.js";
import { writePdfReport } from "./reports/pdf.js";
import { renderLinkedInPost } from "./reports/linkedin.js";
import { loadAudit, renderComparisonReport } from "./reports/compare.js";

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
  if (args.upload) {
    throw new Error("Upload is not implemented. This MVP is local-only; share the generated PDF/JSON manually if needed.");
  }

  printClientNotice(args);

  const window = deriveWindow(args);
  const privacy = makePrivacy(args.org);
  const context = {
    window,
    privacy,
    orgSlug: args.org,
    teamSlug: args.team
  };

  const [claude, codex, cursor, git] = await Promise.all([
    collectClaudeCode(context),
    collectCodex(context),
    collectCursor(context),
    collectGit(context)
  ]);

  if (args.preview) {
    printPreview({ claude, codex, cursor, git, window });
    return;
  }

  const sessions = [
    ...(claude.sessions || []),
    ...(codex.sessions || []),
    ...(cursor.sessions || [])
  ];
  const metrics = buildMetrics({ sessions, git });
  const score = buildScore(metrics);
  const recommendations = buildRecommendations(metrics, score);
  const audit = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    org_slug: args.org,
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
      hashing: "sha256_with_org_salt",
      local_content_inspection: true,
      raw_content_exported: false
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

  const outDir = ensureOutputDir(args, window);
  const jsonPath = resolve(outDir, "wonka-ai-audit-report.json");
  const markdownPath = resolve(outDir, "wonka-ai-audit-report.md");
  const pdfPath = resolve(outDir, "wonka-ai-usage-audit.pdf");
  const linkedinPath = resolve(outDir, "linkedin-post.txt");
  writeFileSync(jsonPath, JSON.stringify(audit, null, 2));
  writeFileSync(markdownPath, renderMarkdownReport(audit));
  writeFileSync(linkedinPath, renderLinkedInPost(audit));
  writePdfReport(audit, pdfPath);
  console.log("");
  console.log(`PDF ready: ${pdfPath}`);
  console.log(`LinkedIn draft: ${linkedinPath}`);
  console.log(`Data export: ${jsonPath}`);
  console.log(`AI Practice Score: ${score.ai_practice_score}/100`);
}

function coverage(result) {
  return {
    status: result.status,
    sessions_detected: result.sessions?.length || 0,
    files_scanned: result.files_scanned,
    reason: result.reason
  };
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

function resolveOutputDir(args, window) {
  if (args.out) return resolve(args.out);
  const desktop = join(homedir(), "Desktop");
  const root = existsSync(desktop) ? join(desktop, "Wonka AI Audit") : resolve("Wonka AI Audit");
  return join(root, runFolderName(args, window));
}

function ensureOutputDir(args, window) {
  const preferred = resolveOutputDir(args, window);
  try {
    if (!existsSync(preferred)) mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch (error) {
    if (args.out) throw error;
    const fallback = resolve("Wonka AI Audit", runFolderName(args, window));
    if (!existsSync(fallback)) mkdirSync(fallback, { recursive: true });
    console.log(`Desktop output unavailable; using ${fallback}`);
    return fallback;
  }
}

function runFolderName(args, window) {
  const label = sanitizePathPart(args.runLabel || args.period || "audit");
  const start = datePart(window.start);
  const end = datePart(window.end);
  const generated = dateTimePart(new Date());
  return `${label}_${start}_to_${end}_${generated}`;
}

function sanitizePathPart(value) {
  return String(value || "audit")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "audit";
}

function datePart(date) {
  return date.toISOString().slice(0, 10);
}

function dateTimePart(date) {
  return date.toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function printClientNotice(args) {
  if (args.preview) return;
  const defaultTarget = args.out ? resolve(args.out) : join(homedir(), "Desktop", "Wonka AI Audit", "<run-folder>");
  console.log("Wonka AI Usage Audit");
  console.log("Runs locally on this computer. No prompts, source code, secrets or raw conversations are uploaded.");
  console.log("Short prompt snippets may be inspected locally in memory to classify usage quality; they are not exported by default.");
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
  console.log("- Hashes use an org-specific salt for local aggregation.");
  console.log("");
  console.log("Sharing:");
  console.log("- Automatic upload is not implemented.");
  console.log("- The PDF/JSON export should be shared only by the employee or client through an explicit manual process.");
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
