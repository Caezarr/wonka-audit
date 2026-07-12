# Wonka AI Usage Audit

Local AI usage audit CLI for Claude Code, Codex, Cursor and local Git signals.

The goal is to create a **pre-training baseline** before Wonka workshops, then run the same audit again after the training cycle to measure whether AI habits improved.

This is not a token-consumption report. It measures whether people use AI better:

- more real work context;
- more files, projects and concrete inputs;
- fewer vague prompts;
- more workflow-oriented sessions;
- more validation before using AI output.

The score is a **directional, uncalibrated coaching indicator**. It must not be used as an employee performance score or as proof that training caused a business outcome. See `METHODOLOGY.md`.

## Install And Run

```bash
npx wonka-audit
```

By default, the CLI creates a local folder on the user's Desktop:

```text
Desktop/Wonka AI Audit/<run-folder>/
```

The folder contains:

```text
wonka-ai-usage-audit.pdf
index.html
wonka-ai-wrapped-card.svg
wonka-ai-audit-report.json
wonka-ai-audit-report.md
linkedin-post.txt
wonka-ai-audit-methodology.json
wonka-ai-audit-manifest.json
```

`index.html` is the local user-friendly recap page. It opens with a terminal-style AI Wrapped card, share actions, and plain-language levers. `wonka-ai-wrapped-card.svg` is the standalone share card. The PDF is the portable report. `linkedin-post.txt` is a short privacy-safe draft the user can copy into LinkedIn if they want to share their AI practice recap. The LinkedIn button uses a privacy-safe one-click flow: copy the post text and open LinkedIn. The JSON is useful only if the employee or client explicitly decides to share it with Wonka.

Each run gets its own folder by default, so weekly usage does not overwrite previous reports.

## Privacy Model

`wonka-audit` is local-first.

By default, it does not upload:

- full prompts;
- assistant responses;
- source code;
- secrets;
- environment variables;
- raw conversation logs;
- absolute local paths.

An admin cannot read employee local data through this CLI. Each user runs the audit locally and owns the generated PDF/JSON. Any sharing must be explicit and manual.

To print the privacy model:

```bash
npx wonka-audit --explain-privacy
```

Disable prompt/message classification entirely:

```bash
npx wonka-audit --metadata-only
# equivalent: --no-content
```

This mode still processes structural metadata such as timestamps, counts, tool calls and commands locally.

## What It Reads

Claude Code:

```text
~/.claude/projects/*.jsonl
```

Codex:

```text
~/.codex/sessions/**/*.jsonl
```

Cursor:

```text
Cursor local state database, when available
```

Git:

```text
local Git metadata from the current working directory, when available
```

Cursor support depends on a local `sqlite3` binary. If `sqlite3` is unavailable, Cursor is marked unavailable instead of forcing installation.

## Common Commands

Run the default local audit:

```bash
npx wonka-audit
```

Preview detected sources:

```bash
npx wonka-audit --preview
```

Choose an output directory:

```bash
npx wonka-audit --out ./wonka-audit
```

When `--out` is provided, the CLI writes directly to that folder.

Create an explicit weekly run folder:

```bash
npx wonka-audit --period weekly --run-label week-2026-27
```

Select a date window:

```bash
npx wonka-audit --since 2026-06-01 --until 2026-06-30
```

Compare two local exports:

```bash
npx wonka-audit --compare baseline.json checkpoint.json --out ./wonka-compare
```

Create the private report and a public microsite in one run:

```bash
npx wonka-audit --share
```

That is the normal sharing command. The private files and the public website are written to separate folders automatically.

To rebuild a website from an existing export, the optional advanced form remains available:

```bash
npx wonka-audit --share ./wonka-ai-audit-report.json --out ./public-share
```

After hosting it, add the final HTTPS URL with `--share-url` to generate canonical LinkedIn/Open Graph metadata. The share payload excludes organization, team, participant pseudonym, prompts, paths and raw conversations. See `docs/SHARE-SITE.md`.

Enterprise operators can provide `WONKA_AUDIT_PARTICIPANT_ID` and a tenant secret of at least 24 characters in `WONKA_AUDIT_TENANT_SECRET`. The export then contains a stable tenant-scoped HMAC pseudonym used only to remove duplicate participants during aggregation.

Optionally sign and verify an audit manifest with Ed25519 keys:

```bash
npx wonka-audit --sign-private-key ./audit-private.pem --out ./signed-audit
npx wonka-audit --verify-signature ./signed-audit/wonka-ai-audit-manifest.signature.json --public-key ./audit-public.pem
```

Only exports with the same schema, methodology, scoring model and content mode can be compared. Collection windows must be equivalent.

Aggregate compatible employee-owned exports with small-cohort suppression:

```bash
npx wonka-audit --aggregate ./approved-exports --min-cohort-size 5 --out ./aggregate
```

## Score Calibration

Current model: `local_individual_v3_directional`.

The AI Practice Score is a directional local individual baseline across Claude Code, Codex and Cursor. Unobservable metrics are excluded and reported as `n/a`, not scored as zero.

Scale:

- `40/100`: needs work
- `70/100`: healthy
- `90/100`: strong

Dimensions:

```text
AI Practice Score =
  usage consistency      20%
+ real work usage        25%
+ interaction quality    20%
+ proof and impact       25%
+ fair usage             10%
```

The JSON export includes `score.calibration`, with component-level scores and priority levers. The score is not a black box.

## User-Friendly Report

The premium PDF is designed as a coaching recap, not a technical audit.

It shows:

- a local HTML recap page with a shareable AI Wrapped card;
- a standalone SVG card for sharing or design handoff;
- the user's AI profile;
- conversations and message volume;
- top detected tool;
- top detected use case;
- quick chat vs workflow mode;
- the clearest improvement levers;
- three next moves;
- a reusable prompt frame.

Example levers:

- finish with proof;
- give more context;
- use real work material;
- move from chat to workflow.

## Pre-Training And Post-Training Flow

Recommended client flow:

1. Run the audit before training.
2. Use the PDF to help employees understand their current habits.
3. Use the aggregate learning patterns to tailor Wonka workshops.
4. Run the same audit again after the training cycle.
5. Compare baseline vs checkpoint exports.

The core comparison is:

```text
post-training checkpoint vs pre-training baseline
```

## Local Development

```bash
npm test
npm run preview
npm run audit:local
npm run report:client
npm run go-live:check
npm run pack:check
```

The package intentionally has no npm runtime dependencies.

## Weekly Run Folder Structure

If a user runs `npx wonka-audit` every week, outputs are organized like this:

```text
Desktop/Wonka AI Audit/
  baseline_2026-06-01_to_2026-06-30_2026-06-29-10-45/
    wonka-ai-usage-audit.pdf
    wonka-ai-audit-report.json
    wonka-ai-audit-report.md
  weekly_2026-06-08_to_2026-07-07_2026-07-06-09-12/
    wonka-ai-usage-audit.pdf
    index.html
    wonka-ai-wrapped-card.svg
    wonka-ai-audit-report.json
    wonka-ai-audit-report.md
    linkedin-post.txt
```

For managed recurring runs, use explicit labels:

```bash
npx wonka-audit --period weekly --run-label week-2026-27
```

## Published Package

Package name:

```text
wonka-audit
```

Repository:

```text
https://github.com/Caezarr/wonka-audit
```

## Current Limitations

- No automatic upload.
- No admin dashboard.
- No central employee monitoring.
- Cursor coverage depends on local `sqlite3`.
- Git correlation is intentionally basic and local.
- The report is strongest when run over a meaningful activity window.

## Security Notes

See [SECURITY-CISO.md](./SECURITY-CISO.md).
