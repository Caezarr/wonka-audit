# Sample export fixture

`sample-export.json` is the canonical demo payload for reports.

## Regression

```bash
node scripts/check-sample-export.js
```

Fails if required metric/score keys drift (see issue #14). Run before publishing CLI changes that touch the export schema.
