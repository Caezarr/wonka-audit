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
