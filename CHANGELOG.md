# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2026

### Added

- Local AI usage audit for Claude Code, Codex, Cursor and Git
- AI Practice Score with directional calibration (`local_individual_v3_directional`)
- Pre-training baseline and post-training checkpoint comparison workflow
- User-friendly HTML recap page with AI Wrapped card
- Standalone SVG card for sharing (`wonka-ai-wrapped-card.svg`)
- Premium PDF report with coaching insights and next moves
- LinkedIn post draft generation with privacy-safe one-click sharing
- JSON/Markdown export formats (`wonka-ai-audit-report.json`, `wonka-ai-audit-report.md`)
- Privacy-first local processing (no uploads by default)
- `--preview` flag to show detected sources without processing
- `--out` flag for custom output directories
- `--since` and `--until` date window filtering
- `--compare` mode for baseline vs checkpoint analysis
- `--share` mode for generating public microsite alongside private report
- `--share-url` for canonical metadata on hosted share sites
- `--metadata-only` mode to disable prompt/message classification
- `--explain-privacy` command to print privacy model
- `--aggregate` for multi-participant exports with cohort suppression
- `--sign-private-key` and `--verify-signature` for manifest signing with Ed25519
- `--period` and `--run-label` for managed recurring runs
- Enterprise participant pseudonym support via `WONKA_AUDIT_PARTICIPANT_ID` and `WONKA_AUDIT_TENANT_SECRET`
- Automatic weekly run folder organization
- Score calibration breakdown in JSON exports (`score.calibration`)
- Multi-dimensional scoring: usage consistency (20%), real work usage (25%), interaction quality (20%), proof and impact (25%), fair usage (10%)
- `npm test`, `npm run preview`, `npm run audit:local` development commands
- `npm run pack:check` for package validation
- Zero runtime dependencies by design

### Security

- Local-first threat model with no default data upload
- GitHub Security Advisories for vulnerability disclosure
- See [SECURITY.md](./SECURITY.md) and [SECURITY-CISO.md](./SECURITY-CISO.md)

[0.3.2]: https://github.com/Caezarr/wonka-audit/releases/tag/v0.3.2
