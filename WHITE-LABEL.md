# White-Label Distribution Notes

`wonka-audit` is designed to become a white-label local audit package for consulting firms.

## Product Shape

The current public package is the Wonka-branded implementation.

White-label versions should keep the same local-first privacy model:

- no silent upload;
- no admin access to employee machines;
- no raw prompt or source-code export by default;
- employee-owned local PDF/JSON output;
- optional manual sharing only.

## Weekly Runs

If a user runs:

```bash
npx wonka-audit
```

every week, the CLI creates a new run folder by default:

```text
Desktop/Wonka AI Audit/
  baseline_2026-06-01_to_2026-06-30_2026-06-29-10-45/
    wonka-ai-usage-audit.pdf
    wonka-ai-audit-report.json
    wonka-ai-audit-report.md
  baseline_2026-06-08_to_2026-07-07_2026-07-06-09-12/
    wonka-ai-usage-audit.pdf
    wonka-ai-audit-report.json
    wonka-ai-audit-report.md
```

This avoids overwriting previous reports.

For explicit weekly labels:

```bash
npx wonka-audit --period weekly --run-label week-2026-27
```

For a fixed client-managed folder:

```bash
npx wonka-audit --out "./audit-exports/week-2026-27"
```

When `--out` is provided, the CLI writes directly to that folder and does not create an extra subfolder.

## Baseline And Checkpoint

Recommended consulting workflow:

```bash
npx wonka-audit --period baseline --run-label pre-training
npx wonka-audit --period checkpoint --run-label post-training-90d
```

Then compare:

```bash
npx wonka-audit \
  --compare "./pre-training/wonka-ai-audit-report.json" "./post-training-90d/wonka-ai-audit-report.json" \
  --out "./comparison"
```

## White-Label Requirements

Before selling a white-label edition:

1. Move brand strings into a config file.
2. Add `--brand-name`, `--brand-url`, `--terms-url`, and `--output-title`.
3. Generate PDFs from brand tokens: colors, name, footer, report title.
4. Replace package name for partner editions, for example `@partner/ai-practice-audit`.
5. Keep license terms separate per partner.
6. Keep the local-first privacy model unchanged.

## Recommended Partner Packaging

For consulting firms, prefer a scoped private or public package:

```text
@consulting-firm/ai-practice-audit
```

The package can reuse the same engine while changing:

- brand name;
- report title;
- website and terms URLs;
- PDF color palette;
- support contact;
- commercial license text.
