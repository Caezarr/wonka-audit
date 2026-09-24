# Contributing to wonka-audit

Thank you for your interest in contributing to `wonka-audit`!

## Development Workflow

This project intentionally has **zero runtime dependencies**. Please maintain this constraint.

### Testing Your Changes

Before submitting a pull request, run:

```bash
npm test
```

The test suite includes a golden fixture (`test/fixtures/export-shape.json`) that validates the structure and required keys of CLI export output. This fixture ensures backward compatibility and serves as a reference for the expected export format.

To preview source detection without processing:

```bash
npm run preview
```

To validate the package structure:

```bash
npm run pack:check
```

All three checks should pass before opening a PR.

## Pull Request Guidelines

1. **Test your changes**: Run `npm test`, `npm run preview`, and `npm run pack:check` locally
2. **No secrets in PRs**: Never commit API keys, tokens, credentials, or private data
3. **Keep it dependency-free**: Do not add runtime dependencies to `package.json`
4. **Clear commit messages**: Use descriptive commit messages that explain *why*, not just *what*
5. **Small, focused PRs**: One logical change per pull request

## What to Contribute

We welcome contributions that:

- Fix bugs or improve error messages
- Improve documentation clarity
- Add test coverage
- Enhance privacy protections
- Improve cross-platform compatibility
- Optimize performance

## What We Won't Accept

- Runtime npm dependencies (devDependencies are fine)
- Features that require network calls by default
- Changes that expose user data without explicit consent
- Modifications that break the local-first privacy model

## Security Vulnerabilities

**Do not** open public issues for security vulnerabilities.

Report security issues through [GitHub Security Advisories](https://github.com/Caezarr/wonka-audit/security/advisories/new).

See [SECURITY.md](./SECURITY.md) for our security policy.

## Questions?

Open an issue for:

- Feature requests
- Bug reports
- Documentation improvements
- General questions about the project

We'll do our best to respond promptly.
