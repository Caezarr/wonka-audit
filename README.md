# wonka-audit

[![CI](https://github.com/Caezarr/wonka-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/Caezarr/wonka-audit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/wonka-audit)](https://www.npmjs.com/package/wonka-audit)

A local-first CLI that audits **how** people work with Claude Code, Codex and Cursor, not how many tokens they burn.

```bash
npx wonka-audit
```

## The problem

Teams roll out coding agents and then measure adoption with seat counts and token bills. Those numbers do not tell you whether people give the model real context, work in agentic workflows, or verify what comes back. The logs that would answer this already sit on each developer's machine, and they are full of prompts, code and secrets that must never be uploaded.

`wonka-audit` reads those logs locally, keeps only counts and salted hashes, and scores practice quality:

- Is AI used on real work: project-bound sessions, file context, workflows rather than free chat?
- Are prompts specific: context, constraints, few vague or corrective turns?
- Is output verified: tests, linters, diffs and reviews run inside the session?

The AI Practice Score is a **directional, uncalibrated coaching indicator**. It is not a performance metric. See [METHODOLOGY.md](./METHODOLOGY.md).

## Privacy guarantees

- **No network.** The CLI makes no HTTP calls and has no upload path (`--upload` exits with an error). The only subprocesses are local `git` and `sqlite3`.
- **No content in outputs.** Prompts and answers are classified in memory into a few booleans and then discarded. Sessions store counters, file extensions and hashes. They never store text, paths or code.
- **Unlinkable by default.** Hashes use a random per-run salt that is never written, so two audits cannot be joined. A cross-run pseudonym exists only when an operator supplies a tenant secret (HMAC).
- **Metadata-only mode.** `--metadata-only` skips text classification entirely. For Cursor, the SQL query does not even select message text.
- **The user owns the output.** Files land in a local folder. Sharing is a manual, explicit act. The optional public page is built from an allow-listed subset with no org, team or identifiers.

Each guarantee is mapped to the code that enforces it in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md#privacy-model). Print the model from the CLI with `npx wonka-audit --explain-privacy`.

## Usage

Requires Node.js 18+. There are no runtime dependencies. Cursor support uses the system `sqlite3` binary when present.

```bash
npx wonka-audit                                        # last 30 days → Desktop/Wonka AI Audit/<run>/
npx wonka-audit --preview                              # list detected sources, write nothing
npx wonka-audit --metadata-only --out ./audit          # no text classification, custom folder
npx wonka-audit --since 2026-06-01 --until 2026-06-30  # explicit window
npx wonka-audit --share                                # also build an opt-in public recap page
npx wonka-audit --compare baseline.json checkpoint.json --out ./compare
npx wonka-audit --aggregate ./approved-exports --min-cohort-size 5 --out ./aggregate
npx wonka-audit --sign-private-key ./key.pem --out ./signed
npx wonka-audit --verify-signature ./signed/wonka-ai-audit-manifest.signature.json --public-key ./pub.pem
```

`npx wonka-audit --help` lists every flag.

| Source | What is read |
| --- | --- |
| Claude Code | `~/.claude/projects/**/*.jsonl` |
| Codex | `~/.codex/sessions/**/*.jsonl` |
| Cursor | `state.vscdb` (aggregate SQL via `sqlite3`) |
| Git | Commits by the configured author in the current repo, plus AI co-author trailers |

A missing source is reported as `missing` or `unavailable` and is left out of the score. It is never counted as zero.

## Outputs

Each run writes a new folder, so repeated runs never overwrite each other:

| File | Purpose |
| --- | --- |
| `index.html` | Local recap page with the shareable "AI Wrapped" card |
| `wonka-ai-usage-audit.pdf` | Portable report, generated without dependencies |
| `wonka-ai-audit-report.json` | Machine-readable export ([schema](./schemas/audit-export.schema.json)) |
| `wonka-ai-audit-report.md` | Markdown report |
| `wonka-ai-wrapped-card.svg` | Standalone share card |
| `linkedin-post.txt` | Privacy-safe post draft |
| `wonka-ai-audit-methodology.json` | Versions, source coverage, privacy flags |
| `wonka-ai-audit-manifest.json` | SHA-256 of every artifact, optionally Ed25519-signed |

Exports carry a `comparability_key` (schema, methodology and scoring versions, content mode). `--compare` and `--aggregate` refuse to mix incompatible exports, and aggregation suppresses cohorts below the threshold (minimum 3).

## Scoring

Five weighted dimensions: usage consistency 20%, real work usage 25%, interaction quality 20%, proof and impact 25%, fair usage 10%. Signals that a source cannot observe are excluded rather than scored as zero. Component scores, weights and evidence are all in `score.calibration` in the JSON, so nothing is hidden. Details are in [METHODOLOGY.md](./METHODOLOGY.md).

## Architecture

Collectors (one per tool) → session normalization → metrics and score → audit export → renderers. Every stage is a plain function and one module owns all filesystem writes. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the pipeline diagram, the module map and where each privacy guarantee is enforced.

## Development

```bash
npm ci              # dev tooling only (ESLint, TypeScript for JSDoc checking)
npm test            # node:test suite, no install required
npm run lint
npm run typecheck   # tsc --noEmit over JSDoc types
npm run check       # all three
npm run pack:check  # inspect the npm tarball
```

CI runs the tests, the package dry-run and a privacy-asserting smoke run on Ubuntu, macOS and Windows with Node 18, 20 and 22, plus a lint and typecheck job. `scripts/` contains maintainer checks and optional Python report builders that do not ship to npm ([scripts/README.md](./scripts/README.md)).

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): system design
- [METHODOLOGY.md](./METHODOLOGY.md): scoring model and limits
- [SECURITY-CISO.md](./SECURITY-CISO.md) and [docs/THREAT-MODEL.md](./docs/THREAT-MODEL.md): security review material
- [docs/GO-LIVE.md](./docs/GO-LIVE.md): running a baseline and checkpoint for a team
- [docs/INDEX.md](./docs/INDEX.md): everything else, including specs, the FAQ and share-site details
- [llms.txt](./llms.txt): a summary for agents

## Limitations

- The score is heuristic and not yet calibrated against outcomes ([calibration plan](./docs/CALIBRATION-PLAN.md)).
- Cursor validation commands are not observable in its local database.
- Git correlation covers the current repository only.
- There is no central dashboard by design. Aggregation only works on exports that users chose to hand over.

## Contributing and security

See [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SUPPORT.md](./SUPPORT.md). Report vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).
