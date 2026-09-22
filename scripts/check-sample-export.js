#!/usr/bin/env node
/**
 * Smoke: sample-export.json still has the keys the report templates expect.
 * No network. Exit 1 on shape drift (issue #14).
 */
const fs = require("fs");
const path = require("path");

const samplePath = path.join(__dirname, "..", "sample-export.json");
const raw = fs.readFileSync(samplePath, "utf8");
const data = JSON.parse(raw);

function req(obj, key, ctx) {
  if (obj == null || typeof obj !== "object" || !(key in obj)) {
    throw new Error(`missing ${ctx}.${key}`);
  }
}

req(data, "schema_version", "root");
req(data, "metrics", "root");
req(data, "score", "root");
req(data, "recommendations", "root");

for (const dim of [
  "adoption",
  "business_usage",
  "interaction_quality",
  "verifiable_impact",
  "fair_usage",
]) {
  req(data.metrics, dim, "metrics");
}

req(data.score, "ai_practice_score", "score");
req(data.score, "dimensions", "score");
if (!Array.isArray(data.recommendations) || data.recommendations.length < 1) {
  throw new Error("recommendations must be a non-empty array");
}

console.log("sample-export shape ok", data.schema_version);
