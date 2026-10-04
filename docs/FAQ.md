# Frequently Asked Questions

## What is the goal of this audit?

The audit creates a **pre-training baseline** before Wonka workshops to understand how teams currently use AI coding assistants like Claude Code, Cursor, and Codex. It measures practice quality—not token consumption—focusing on whether people use more concrete context, files, validation, and workflows. After the training cycle, the same audit runs again to check whether employees applied better AI habits.

## Does the audit upload my prompts, code, or conversations?

No. By default, `wonka-audit` does **not upload**:

- full prompts
- assistant answers
- source code
- secrets
- environment variables
- raw conversation logs
- absolute local paths

The CLI runs locally on your workstation. It generates a PDF and JSON on your Desktop. The JSON export contains only aggregated metrics. Sharing it with Wonka is an explicit, separate customer decision.

## What data sources does the audit scan?

The audit reads **local traces** created by AI tools already installed on your machine:

- **Claude Code**: `~/.claude/projects/*.jsonl`
- **Codex**: `~/.codex/sessions/**/*.jsonl`
- **Cursor**: local state databases (requires `sqlite3`)
- **Git**: local repository metadata from the current working directory

It does not request credentials. It only reads files accessible to your current OS user.

## What permissions or access does the tool need?

The tool runs with your **current user's local permissions**. It does not:

- request elevated privileges
- require admin or root access
- call external APIs during audit execution
- upload data to Wonka servers

You can review the package before running it:

```bash
npm view wonka-audit
npm pack wonka-audit --dry-run
```

## When should we run the audit?

Follow this timeline:

1. **Before training**: Run the first audit as a pre-training baseline.
2. **Use the baseline**: Deliver employee reports and tune Wonka workshops to real usage patterns.
3. **After 3 months**: Run the same audit again.
4. **Compare**: Baseline vs checkpoint to measure whether the workshops helped teams apply better habits.

The report is strongest when run over a meaningful activity window, not a single day.

## What triggers a workshop recommendation?

The audit recommends a Wonka Workshop when:

- AI Practice Score is below 60/100
- Explicit validation is below 20%
- Vague prompts remain above 45%
- File/context usage is low
- Teams do not have reusable AI instructions (`CLAUDE.md`, `AGENTS.md`, Cursor rules, or project-specific guidance)

Ask employees to bring one real work use case, one prompt that failed, one AI output they want to validate, and one project where team instructions could help.

## Is this tool ISO 27001-friendly?

The tool supports ISO 27001 control environments through:

- **Data minimization**: default outputs exclude raw prompts, answers, code, and secrets
- **Local processing**: metrics are computed on the employee workstation
- **No default upload**: sharing is an explicit customer action
- **Access control**: runs with current user permissions, no elevated privileges
- **Auditable behavior**: small code surface, no runtime npm dependencies, explicit local artifacts
- **Privacy by design**: local-first processing reduces data exposure

This is not a certification statement. It is a technical explanation to help your security team map the tool to your Statement of Applicability, risk register, and vendor review process.

## What are the 90-day success criteria?

At the 3-month checkpoint, look for:

- Higher contextualized prompt rate
- Higher explicit validation rate
- More file/context usage
- More advanced workflows
- Lower vague prompt rate
- Evidence that teams created or improved reusable AI instructions

Compare the checkpoint report to the baseline to measure progress.

## How do I share the results with Wonka?

The audit generates a local JSON export. **Sharing it is optional and manual.**

Recommended enterprise model:

1. Your CISO or security owner defines whether JSON exports may be shared.
2. If sharing is approved, use an approved channel (not employee email).
3. Wonka uses the export to prepare team-level restitution, training focus areas, and checkpoint comparisons.

Wonka should not ask employees to send raw AI logs, prompts, code, or local trace directories.

## What does the employee report show?

The PDF and HTML report is designed as a **coaching recap**, not a technical audit. It shows:

- AI Practice Score (directional, uncalibrated—not for employee ranking)
- Conversations and message volume
- Top detected tool and use case
- Quick chat vs workflow mode usage
- Clearest improvement levers (e.g., "finish with proof," "give more context")
- Three recommended next moves
- A reusable prompt frame

The report explains what explicit validation means and clearly states this is a pre-training baseline with a comparison after the training cycle.
