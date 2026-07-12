import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/lib/args.js";

test("parseArgs supports privacy explanation", () => {
  const args = parseArgs(["--explain-privacy"]);
  assert.equal(args.explainPrivacy, true);
});

test("parseArgs reads compare paths", () => {
  const args = parseArgs(["--compare", "m0.json", "m3.json", "--out", "out/compare"]);
  assert.deepEqual(args.compare, ["m0.json", "m3.json"]);
  assert.equal(args.out, "out/compare");
});

test("parseArgs supports run labels", () => {
  const args = parseArgs(["--period", "weekly", "--run-label", "week-2026-27"]);
  assert.equal(args.period, "weekly");
  assert.equal(args.runLabel, "week-2026-27");
});

test("parseArgs supports public share and signature workflows", () => {
  const args = parseArgs([
    "--share", "audit.json",
    "--share-url", "https://example.com/report/",
    "--sign-private-key", "private.pem"
  ]);
  assert.equal(args.share, "audit.json");
  assert.equal(args.shareUrl, "https://example.com/report/");
  assert.equal(args.signPrivateKey, "private.pem");
});
