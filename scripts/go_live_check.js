#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const checks = [];

function run(name, command, args) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
  });
  const ok = result.status === 0;
  checks.push({ name, ok, output: `${result.stdout || ""}${result.stderr || ""}`.trim() });
  return ok;
}

function fileCheck(name, path, minBytes = 1) {
  const ok = existsSync(path) && statSync(path).size >= minBytes;
  checks.push({ name, ok, output: ok ? path : `${path} missing or empty` });
  return ok;
}

run("Preview detects local AI tools", "node", ["src/cli.js", "--preview"]);
run("Local audit writes aggregate report", "node", ["src/cli.js", "--local", "--out", "./out"]);
run("Employee PDF generation", "python3", [
  "scripts/build_premium_report.py",
  "--input",
  "out/wonka-ai-audit-report.json",
  "--out",
  "output/pdf/wonka-ai-usage-audit-premium-report.pdf",
]);

fileCheck("Aggregate JSON exists", "out/wonka-ai-audit-report.json", 100);
fileCheck("Local HTML recap exists", "out/index.html", 1000);
fileCheck("Wrapped share card exists", "out/wonka-ai-wrapped-card.svg", 1000);
fileCheck("LinkedIn draft exists", "out/linkedin-post.txt", 100);
fileCheck("Methodology manifest exists", "out/wonka-ai-audit-methodology.json", 100);
fileCheck("Audit integrity manifest exists", "out/wonka-ai-audit-manifest.json", 100);
fileCheck("Employee PDF exists", "output/pdf/wonka-ai-usage-audit-premium-report.pdf", 1000);
fileCheck("Go-live runbook exists", "GO-LIVE.md", 100);

console.log("Wonka AI Usage Audit go-live check\n");
for (const check of checks) {
  console.log(`${check.ok ? "OK " : "FAIL"} ${check.name}`);
  if (!check.ok && check.output) {
    console.log(`   ${check.output.split("\n")[0]}`);
  }
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log("\nReady for client baseline launch.");
