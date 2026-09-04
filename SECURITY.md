# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in `wonka-audit`, please report it through [GitHub Security Advisories](https://github.com/Caezarr/wonka-audit/security/advisories/new).

**Do not** open a public issue for security vulnerabilities.

We will respond to security reports as quickly as possible and coordinate a fix and disclosure timeline.

## Threat Model

`wonka-audit` is a **local-first** audit tool. By design:

- No data is uploaded by default
- No central monitoring or admin dashboard exists
- Users own their generated reports
- All processing happens locally

For detailed threat analysis and architectural security notes, see [SECURITY-CISO.md](./SECURITY-CISO.md).

## Out of Scope

The following are **not** considered security vulnerabilities for this tool:

- User choosing to share their local reports manually
- Access to local filesystem data that the tool is designed to read (Claude/Codex/Cursor logs, Git metadata)
- Output file permissions matching the user's local umask
- Supply chain attacks on npm dependencies (this package has **zero runtime dependencies** by design)
