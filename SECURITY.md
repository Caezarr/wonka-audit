# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in `wonka-audit`, please report it through [GitHub Security Advisories](https://github.com/Caezarr/wonka-audit/security/advisories/new).

**Do not** open a public issue for security vulnerabilities.

We will respond to security reports as quickly as possible and coordinate a fix and disclosure timeline.

### What NOT to Include in Security Reports

When reporting security issues or filing bug reports:

**Never paste raw transcripts, logs, or tool outputs that may contain:**

- API keys, tokens, or authentication credentials
- Access tokens from Claude, Codex, Cursor, or other AI tools
- Environment variables or secrets
- Session identifiers or authentication cookies
- Private keys or certificates
- Database connection strings
- Internal URLs or endpoints

**Preferred redaction:**

1. **For code examples:** Replace sensitive values with placeholders like `[REDACTED-TOKEN]` or `***`
2. **For JSON exports:** Remove or mask all `token`, `key`, `secret`, and `credential` fields before sharing
3. **For logs:** Use `--metadata-only` mode to generate structure-only exports without content
4. **For error messages:** Redact file paths, usernames, and any identifiable information

If you need to share an example that demonstrates the issue, use synthetic data or thoroughly sanitized samples. When in doubt, describe the issue in words rather than pasting raw output.

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
