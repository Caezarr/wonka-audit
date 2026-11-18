# wonka-audit

[![CI](https://github.com/Caezarr/wonka-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/Caezarr/wonka-audit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/wonka-audit)](https://www.npmjs.com/package/wonka-audit)

Measure how people actually work with Claude Code, Codex and Cursor (practice quality, not token volume), without a single byte leaving the machine.

```bash
npx wonka-audit --preview
```

## The problem

Companies buy AI coding seats and pay for enablement workshops, then judge the result with seat counts and token bills. Those numbers cannot tell you whether anyone changed how they work: whether they give the model real context, run agentic workflows on real projects, or verify what comes back. The evidence already exists in the session logs each tool writes on every developer's laptop. Nobody uses it because those logs are full of prompts, source code and secrets that must never be uploaded to a vendor dashboard.

## How it solves it

`wonka-audit` is a local CLI. It reads those logs on the machine, reduces every session to counters and salted hashes in memory, scores practice quality, and writes a report bundle to a local folder. Run it before a workshop (baseline) and a few weeks after (checkpoint), then diff the two exports.

Key design decisions:

- **No network path at all.** No module imports `http`, `https`, `net` or `fetch`; the only subprocesses are local `git` and `sqlite3`. `--upload` exits with an error.
- **Raw content never leaves the collector's stack frame.** Prompt text is classified into a few booleans (vague, contextualized, constrained, corrective) and dropped. Paths are kept as file extensions or hashes. `--metadata-only` skips classification entirely.
- **Unlinkable by default.** Hashes use a random per-run salt that is never written. Cross-run identity exists only if an operator supplies a tenant secret (HMAC).
- **Unobservable is not zero.** A signal a tool cannot expose (for example test runs in Cursor) is excluded and the weights rebalance, so tool choice does not bias the score. Token volume is not a scored input.
- **Comparable or refused.** Every export carries a `comparability_key` (schema, methodology and scoring versions). `--compare` and `--aggregate` refuse to mix incompatible exports, and aggregation suppresses cohorts below a minimum size.

Pipeline and privacy enforcement map: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Try it

Requires Node.js 18+. No runtime dependencies.

**On your own machine (published package).** `--preview` lists what it can see and writes nothing:

```bash
npx wonka-audit --explain-privacy   # prints the privacy model
npx wonka-audit --preview           # detected sources and session counts, no files written
npx wonka-audit --local --no-open --out ./audit   # full report bundle in ./audit
```

**From a fresh clone, on bundled fixtures (no personal logs needed).** The collectors resolve `~/.claude` and `~/.codex` from `HOME`, so point `HOME` at a throwaway directory seeded with the test fixtures (macOS/Linux):

```bash
git clone https://github.com/Caezarr/wonka-audit && cd wonka-audit
T=$(mktemp -d)
mkdir -p $T/.claude/projects/demo $T/.codex/sessions/2026/07/01
cp test/fixtures/claude/session.jsonl $T/.claude/projects/demo/
cp test/fixtures/codex/2026/07/01/session.jsonl $T/.codex/sessions/2026/07/01/
HOME=$T node src/cli.js --preview --since 2026-01-01 --until 2026-12-31
HOME=$T node src/cli.js --local --no-open --since 2026-01-01 --until 2026-12-31 --out $T/out
```

Output of the last two commands (paths shortened):

```text
Claude Code: ready (1 sessions)
Codex:       ready (1 sessions)
Cursor:      missing (0 sessions)
Git:         unavailable (0 commits in window)

Scanning Claude Code, Codex, Cursor and local Git signals...
Local page: $T/out/index.html
...
Data export: $T/out/wonka-ai-audit-report.json
Manifest: $T/out/wonka-ai-audit-manifest.json
AI Practice Score: 71/100
```

The Claude fixture contains a deliberately corrupt JSONL line; it is skipped, not fatal. Then compare two exports (here the same one against itself, so every delta is zero):

```bash
node src/cli.js --compare $T/out/wonka-ai-audit-report.json $T/out/wonka-ai-audit-report.json --out $T/cmp
head -20 $T/cmp/wonka-ai-audit-comparison.md
```

```text
AI Practice Score moved from **71/100** to **71/100** (+0 points).
...
| Dimension | baseline | baseline | Delta |
| Adoption durable | 14 | 14 | +0 |
| Usage metier reel | 65 | 65 | +0 |
...
```

## How it works

1. Collectors parse each tool's local format: Claude Code and Codex JSONL (streamed line by line), Cursor's `state.vscdb` through aggregate SQL only, and `git log` for the current repo.
2. Each collector runs in `collectSafely()`, so one broken source reports `error` and the others still run. A missing source is reported as `missing`, never scored as zero.
3. Sessions are normalized into one shape that holds counters, extensions and hashes, never text.
4. `buildMetrics()` and `buildScore()` produce five weighted dimensions (usage consistency 20%, real work usage 25%, interaction quality 20%, proof and impact 25%, fair usage 10%) plus confidence.
5. A pure function assembles the versioned export; pure renderers produce HTML, Markdown, PDF (hand-written, no dependency), SVG card and a post draft; one module owns all filesystem writes and a SHA-256 manifest, optionally Ed25519-signed.

Details: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Scoring thresholds and limits: [METHODOLOGY.md](./METHODOLOGY.md).

## Proof

- `npm test`: 35 tests on Node's built-in runner. They cover collectors on fixtures (including corrupt JSONL), scoring, every renderer, signature round-trip, aggregation suppression, and a golden-file regression of the CLI export shape ([test/fixtures/cli-export-golden.json](./test/fixtures/cli-export-golden.json)).
- [CI](./.github/workflows/ci.yml) runs tests, `npm pack --dry-run` and a metadata-only smoke run with a privacy assertion (`local_content_inspection === false`) on Ubuntu, macOS and Windows for Node 18, 20 and 22, plus a lint and typecheck job.
- Export contracts are JSON Schemas in [schemas/](./schemas/). A demo payload is in [sample-export.json](./sample-export.json) ([docs/SAMPLE-EXPORT.md](./docs/SAMPLE-EXPORT.md)).
- Each privacy guarantee is mapped to the function that enforces it in [docs/ARCHITECTURE.md#privacy-model](./docs/ARCHITECTURE.md#privacy-model). Threat model: [docs/THREAT-MODEL.md](./docs/THREAT-MODEL.md).

## Limits and status

- Version 0.3.x. The AI Practice Score is a directional, uncalibrated coaching indicator, not a performance metric. It has not been validated against outcomes yet ([calibration plan](./docs/CALIBRATION-PLAN.md)).
- Cursor test and lint runs are not observable in its local database, so that signal is excluded for Cursor.
- Git correlation covers the current repository only.
- Dimension labels and recommendations in the generated reports are currently in French.
- No central dashboard by design. Team views come only from `--aggregate` over exports that people chose to hand over.

## Development

```bash
npm ci              # dev tooling only (ESLint, TypeScript for JSDoc checking)
npm test            # node:test suite
npm run lint
npm run typecheck   # tsc --noEmit over JSDoc types
npm run check       # all three
npm run pack:check  # inspect the npm tarball
```

`scripts/` holds maintainer checks and optional Python report builders that do not ship to npm ([scripts/](./scripts/)). More docs: [docs/INDEX.md](./docs/INDEX.md), [docs/GO-LIVE.md](./docs/GO-LIVE.md) (running a baseline and checkpoint for a team), [SECURITY-CISO.md](./SECURITY-CISO.md).

Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md). Vulnerabilities: [SECURITY.md](./SECURITY.md).

## License

Source-available, not open source (Wonka Audit Commercial Source License). You may install and run the published package for local audits; redistribution, hosted use or modification for third parties needs a written agreement. See [LICENSE](./LICENSE) for the exact terms.
