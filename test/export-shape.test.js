import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "export-shape.json");

test("export shape fixture has required top-level keys", () => {
  const raw = readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(raw);

  assert.equal(typeof fixture.schema_version, "string", "schema_version must be string");
  assert.equal(typeof fixture.generated_at, "string", "generated_at must be string");
  assert.equal(typeof fixture.org_slug, "string", "org_slug must be string");
  assert.equal(typeof fixture.team_slug, "string", "team_slug must be string");
  assert.equal(typeof fixture.period, "string", "period must be string");
  assert.equal(typeof fixture.training_date, "string", "training_date must be string");
});

test("export shape fixture has required object keys", () => {
  const raw = readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(raw);

  assert.equal(typeof fixture.collection_window, "object", "collection_window must be object");
  assert.equal(typeof fixture.privacy, "object", "privacy must be object");
  assert.equal(typeof fixture.source_coverage, "object", "source_coverage must be object");
  assert.equal(typeof fixture.metrics, "object", "metrics must be object");
  assert.equal(typeof fixture.score, "object", "score must be object");
  assert.equal(Array.isArray(fixture.recommendations), true, "recommendations must be array");
});

test("export shape fixture collection_window has required fields", () => {
  const raw = readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(raw);

  assert.equal(typeof fixture.collection_window.start, "string", "collection_window.start must be string");
  assert.equal(typeof fixture.collection_window.end, "string", "collection_window.end must be string");
});

test("export shape fixture privacy has required fields", () => {
  const raw = readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(raw);

  assert.equal(typeof fixture.privacy.content_uploaded, "boolean", "privacy.content_uploaded must be boolean");
  assert.equal(typeof fixture.privacy.examples_included, "boolean", "privacy.examples_included must be boolean");
  assert.equal(typeof fixture.privacy.hashing, "string", "privacy.hashing must be string");
});

test("export shape fixture score has required fields", () => {
  const raw = readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(raw);

  assert.equal(typeof fixture.score.ai_practice_score, "number", "score.ai_practice_score must be number");
  assert.equal(typeof fixture.score.dimensions, "object", "score.dimensions must be object");
  assert.equal(typeof fixture.score.interpretation, "string", "score.interpretation must be string");
});
