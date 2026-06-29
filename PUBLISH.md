# Publish `wonka-audit` to npm

## Client command target

```bash
npx wonka-audit
```

## What the npm package contains

The public npm package should contain only:

- `src/` CLI and collectors;
- `README.md`;
- `SECURITY-CISO.md`.

It should not publish generated reports, PDFs, local audit outputs, `tmp/`, or Wonka internal PDF assets.

## Pre-publish checklist

```bash
npm run preview
npm run audit:local
npm test
npm run pack:check
npm pack --cache /private/tmp/wonka-npm-cache
npx --yes ./wonka-audit-0.1.3.tgz --out ./tmp/package-smoke
```

Check that the dry-run package does not include:

- `out/`
- `output/`
- `tmp/`
- `scripts/build_premium_report.py`
- generated PDFs
- local screenshots

## Publish

```bash
npm login
npm publish
```

If the `wonka-audit` package name is unavailable on npm, use a scope:

```json
{
  "name": "@wonka/audit"
}
```

Then clients run:

```bash
npx @wonka/audit
```

## Client instructions

Send this to the client:

```bash
npx wonka-audit
```

Expected output:

```text
Desktop/Wonka AI Audit/wonka-ai-usage-audit.pdf
Desktop/Wonka AI Audit/wonka-ai-audit-report.json
```

The PDF is the main employee-facing artifact. The JSON is optional and useful if Wonka needs to consolidate teams or compare the baseline with a 90-day checkpoint.

Suggested client communication:

```text
Run this command from your terminal:

npx wonka-audit

The audit runs locally on your computer. It does not upload prompts, source code,
secrets or raw conversations. It creates a PDF in a "Wonka AI Audit" folder on
your Desktop.

Website: https://wonka-ai.com
Terms: https://wonka-ai.com/cgv
```

## Notes

- Node.js 18+ is required.
- Cursor coverage depends on local `sqlite3` availability.
- The CLI does not upload content by default.
- Full prompts, assistant answers, source code, secrets and absolute local paths are not included by default.
- Short prompt/message text may be inspected locally in memory for classification; raw content is not exported by default.
