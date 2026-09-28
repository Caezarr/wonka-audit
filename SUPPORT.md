# Support

Wonka AI Usage Audit is a local-first CLI for auditing AI tool usage (Claude Code, Codex, Cursor). This is a personal audit toolkit; support is best-effort and community-based.

## Quick Start

Install and run:

```bash
npx wonka-audit
```

By default, the audit runs locally and creates a folder on your Desktop:

```text
Desktop/Wonka AI Audit/<run-folder>/
```

For more installation options and common commands, see the [README.md](./README.md).

## Sample Export

A typical audit run produces:

```text
wonka-ai-usage-audit.pdf          # User-friendly coaching report
index.html                         # Local recap page with AI Wrapped card
wonka-ai-wrapped-card.svg         # Shareable card
wonka-ai-audit-report.json        # Structured export
wonka-ai-audit-report.md          # Markdown summary
linkedin-post.txt                  # Privacy-safe draft post
wonka-ai-audit-methodology.json   # Scoring model and calibration
wonka-ai-audit-manifest.json      # Run metadata
```

Use `--preview` to see detected sources before running the audit:

```bash
npx wonka-audit --preview
```

Use `--explain-privacy` to review the privacy model:

```bash
npx wonka-audit --explain-privacy
```

## Bug Reports And Feature Requests

File a [GitHub Issue](https://github.com/Caezarr/wonka-audit/issues).

When reporting bugs, please include:

- Audit stage (export, KPI calculation, report generation)
- Platform (macOS, Linux, Windows)
- Node version
- Sample anonymized input if relevant (never paste raw exports with PII)

## Security Vulnerabilities

**Never report security vulnerabilities as public issues.**

Use [GitHub Security Advisories](https://github.com/Caezarr/wonka-audit/security/advisories/new) to report security issues privately.

For more details, see [SECURITY.md](./SECURITY.md).

## Questions And Discussion

For general questions about usage, methodology, or scoring:

1. Check the [README.md](./README.md) and [METHODOLOGY.md](./METHODOLOGY.md)
2. Search [existing issues](https://github.com/Caezarr/wonka-audit/issues)
3. File a new issue for clarification

For questions about Wonka workshops or enterprise usage patterns, contact:

**gabriel@meetwonka.com**

## No SLA

This is a personal audit toolkit without formal support SLA. Responses are best-effort and community-driven.
