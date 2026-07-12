# Wonka AI Usage Audit Methodology

## Status

The AI Practice Score is a **directional, uncalibrated coaching indicator**. It is not a scientific measure of productivity, employee performance, training causality or compliance.

Current versions:

- audit schema: `2.0`;
- normalized session schema: `1.0`;
- methodology: `2026.07`;
- scoring model: `local_individual_v3_directional`.

Every audit exports these versions and a `comparability_key`. Comparison and aggregation reject incompatible keys. Collection windows must also be equivalent for longitudinal comparison.

## Source capabilities

Signals are scored only when observable. Missing capabilities are represented as `null` and excluded from the relevant weighted dimension instead of being treated as zero.

| Source | Prompt classification | Validation detection | Token usage | Project context |
| --- | --- | --- | --- | --- |
| Claude Code | default only | supported from tool commands | supported when present | supported |
| Codex | default only | supported from shell calls | supported when present | supported |
| Cursor | default only | unavailable in the current database adapter | supported when present | partial |
| Git | no | no | no | current repository only |

`--no-content` and `--metadata-only` disable prompt/message text classification. Structural metadata, tool names, commands, counts and timestamps may still be processed locally.

## Scoring and confidence

The score combines usage consistency, real work usage, interaction quality, proof and impact, and fair usage. Available components are reweighted within their dimension. The export records component weights, availability, evidence, source coverage and confidence.

The current thresholds are expert-authored heuristics. Before external benchmarking claims, Wonka must calibrate them on consented datasets, measure inter-rater agreement, test tool and role bias, publish sample sizes and validate relationships with independent business outcomes.

## Enterprise aggregation

`--aggregate <dir>` accepts compatible schema `2.0` exports. It produces cohort-level mean, median, p25 and p75 values. Cohorts below `--min-cohort-size` are suppressed; the default is 5 and the hard minimum is 3. Individual rows and session identifiers are not copied to the aggregate.

Enterprise operators can provide tenant-scoped participant input through environment variables. The exported HMAC pseudonym enables duplicate removal without exposing the source identifier. Exports without a pseudonym are treated as distinct participants and reported as non-deduplicable.

Audit manifests can be signed with an Ed25519 private key and verified before aggregation. Key generation, custody and rotation remain the client's responsibility.

## Interpretation limits

- Score changes are associations, not proof that training caused the change.
- Local traces may be incomplete or affected by retention settings.
- Tool capabilities and schemas differ.
- Employee monitoring or ranking is not a supported use case.
- Reports should be interpreted with source coverage, observed counts and confidence.
