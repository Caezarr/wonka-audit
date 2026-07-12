# Threat Model

## Protected assets

- prompt and conversation content;
- source code, local paths and secrets;
- employee identity and team membership;
- accurate methodology and audit integrity;
- client trust in the voluntary coaching purpose.

## Primary abuse cases and controls

| Abuse case | Control | Residual risk |
| --- | --- | --- |
| Individual surveillance | employee-owned local report; no upload; public payload excludes identifiers | customer endpoint policy may still collect local files |
| Re-identifying small teams | cohort threshold and suppression | auxiliary HR knowledge can reveal a unique subgroup |
| Duplicate exports inflating cohorts | tenant-scoped HMAC participant pseudonym | exports without enterprise environment variables cannot be deduplicated |
| Tampered audit before aggregation | optional Ed25519 manifest signature | key custody remains the client’s responsibility |
| Malformed local trace crashing audit | collector isolation and corrupt fixture tests | upstream formats may change without notice |
| Prompt or path leakage in a share page | explicit public payload allowlist and regression tests | custom downstream transformations are outside scope |
| Score used for employment decisions | directional/un­calibrated label and documented prohibition | software cannot prevent policy misuse alone |
| Guessable public report URL | future host requires random 128-bit identifiers | link recipients can intentionally redistribute it |
| Supply-chain compromise | zero runtime dependencies, npm provenance, multi-OS CI | GitHub/npm account compromise remains possible |

## Trust boundaries

1. AI-tool traces → local collector.
2. Normalized sessions → aggregate audit export.
3. Full private export → allowlisted public share payload.
4. Signed manifest → enterprise aggregation operator.

Crossing boundary 3 must always require an explicit user command and preview.
