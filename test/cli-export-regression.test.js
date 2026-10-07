import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "cli-export-golden.json");
const tmpDir = join(__dirname, "..", ".tmp", "cli-regression");

function validateJsonShape(obj, path = "") {
  assert.equal(typeof obj.schema_version, "string", `${path}schema_version must be string`);
  assert.equal(typeof obj.generated_at, "string", `${path}generated_at must be string`);
  assert.equal(typeof obj.org_slug, "string", `${path}org_slug must be string`);
  assert.equal(typeof obj.period, "string", `${path}period must be string`);

  assert.equal(typeof obj.collection_window, "object", `${path}collection_window must be object`);
  assert.equal(typeof obj.collection_window.start, "string", `${path}collection_window.start must be string`);
  assert.equal(typeof obj.collection_window.end, "string", `${path}collection_window.end must be string`);

  assert.equal(typeof obj.privacy, "object", `${path}privacy must be object`);
  assert.equal(typeof obj.privacy.content_uploaded, "boolean", `${path}privacy.content_uploaded must be boolean`);
  assert.equal(typeof obj.privacy.examples_included, "boolean", `${path}privacy.examples_included must be boolean`);
  assert.equal(typeof obj.privacy.hashing, "string", `${path}privacy.hashing must be string`);
  assert.equal(typeof obj.privacy.local_content_inspection, "boolean", `${path}privacy.local_content_inspection must be boolean`);
  assert.equal(typeof obj.privacy.raw_content_exported, "boolean", `${path}privacy.raw_content_exported must be boolean`);

  assert.equal(typeof obj.methodology, "object", `${path}methodology must be object`);
  assert.equal(typeof obj.methodology.methodology_version, "string", `${path}methodology.methodology_version must be string`);
  assert.equal(typeof obj.methodology.scoring_model_version, "string", `${path}methodology.scoring_model_version must be string`);

  assert.equal(typeof obj.collectors, "object", `${path}collectors must be object`);
  assert.equal(typeof obj.source_coverage, "object", `${path}source_coverage must be object`);
  assert.equal(typeof obj.metrics, "object", `${path}metrics must be object`);
  
  assert.equal(typeof obj.score, "object", `${path}score must be object`);
  assert.equal(typeof obj.score.ai_practice_score, "number", `${path}score.ai_practice_score must be number`);
  assert.equal(typeof obj.score.dimensions, "object", `${path}score.dimensions must be object`);
  assert.equal(typeof obj.score.interpretation, "string", `${path}score.interpretation must be string`);
  
  assert.equal(Array.isArray(obj.recommendations), true, `${path}recommendations must be array`);
}

test("CLI export produces JSON matching the golden fixture shape", () => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });

  const cliPath = join(__dirname, "..", "src", "cli.js");
  execSync(
    `node "${cliPath}" --metadata-only --since 1990-01-01 --until 1990-01-02 --out "${tmpDir}"`,
    { encoding: "utf8", stdio: "pipe" }
  );

  const outputPath = join(tmpDir, "wonka-ai-audit-report.json");
  assert.ok(existsSync(outputPath), "CLI should generate wonka-ai-audit-report.json");

  const output = JSON.parse(readFileSync(outputPath, "utf8"));
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

  validateJsonShape(output, "CLI output: ");
  validateJsonShape(fixture, "Golden fixture: ");

  const outputKeys = Object.keys(output).sort();
  const fixtureKeys = Object.keys(fixture).sort();
  assert.deepEqual(outputKeys, fixtureKeys, "CLI output must have same top-level keys as golden fixture");

  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});
