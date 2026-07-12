# Wonka AI Usage Audit - CISO Security Brief

## Executive summary

`wonka-audit` is a local command-line audit tool used to help employees understand and improve their usage of AI coding assistants such as Claude Code, Codex and Cursor.

The default client command is:

```bash
npx wonka-audit
```

By default, the tool:

- runs locally on the employee workstation;
- does not upload prompts, source code, secrets or raw conversations;
- generates a local PDF report on the user's Desktop;
- writes a local JSON export with aggregated metrics only;
- uses the JSON export only if the client explicitly decides to share it with Wonka.

The tool is designed to be ISO 27001-friendly because it follows data minimization, local processing, explicit output, no default network upload, and auditable open package behavior. It does not by itself certify the customer environment or replace the customer's own risk assessment, DPIA, vendor review or internal security approval.

The score is directional and uncalibrated. It is not intended for employee ranking, automated employment decisions or individual performance monitoring.

Public sharing is a separate opt-in transformation. The generated public payload excludes organization, team, participant pseudonym, source coverage, prompts, paths, raw conversations and token detail. The full audit is never required by the public microsite.

## Purpose

The goal is to measure how employees use AI tools before training, tune the workshops to those real practices, then measure whether employees use AI tools better after training. It is not about whether they consume more tokens.

The audit focuses on practice quality indicators:

- use of concrete business or project context;
- use of files, repositories or tool-aware workflows;
- reduction of vague prompts;
- verification habits such as tests, lint, typecheck, acceptance criteria or review loops;
- fair usage signals, such as avoiding long token-heavy sessions without concrete action.

## User journey

1. An employee opens a terminal.
2. The employee runs:

    ```bash
   npx wonka-audit
   ```

3. The command scans local AI assistant activity traces.
4. The command creates a local folder:

   ```text
   Desktop/Wonka AI Audit/
   ```

5. The folder contains:

   ```text
   wonka-ai-usage-audit.pdf
   wonka-ai-audit-report.json
   wonka-ai-audit-report.md
   ```

6. The PDF is the employee-facing recap.
7. The JSON can be shared with Wonka only if the customer explicitly chooses to do so.

## Runtime and dependencies

The npm package is intentionally small and dependency-light.

Runtime:

- Node.js 18 or higher.
- npm / npx.
- Local operating system: macOS, Windows or Linux.

Package behavior:

- The published npm package contains the CLI source files and documentation.
- No third-party npm runtime dependencies are required by the package at this stage.
- The package uses Node.js built-in modules such as `fs`, `path`, `os`, `crypto` and `child_process`.

Local optional tools:

- `git` is used to read local Git metadata when available.
- `sqlite3` is used to inspect local Cursor databases when available.
- If `sqlite3` is unavailable, Cursor coverage is marked as unavailable rather than forcing installation.

## Data sources scanned

The command reads local traces created by AI tools already installed on the employee machine.

Claude Code:

```text
~/.claude/projects/
```

Codex:

```text
~/.codex/sessions/
```

Cursor:

```text
Cursor local state databases
```

Git:

```text
Current local Git context, when available
```

The tool does not request credentials for these tools. It only reads local files accessible to the current OS user.

## Data processed locally

The tool processes signals such as:

- number of sessions;
- active days;
- source coverage by tool;
- rough task categories;
- presence of file or repository context;
- presence of tool calls or shell commands;
- presence of validation signals;
- approximate prompt quality indicators;
- token counts when already present in local traces;
- hashed session and project identifiers used only during local aggregation.

The tool may read short prompt/message text locally in memory to classify whether a prompt appears vague, contextualized, constrained or corrective. The raw prompt text is not written to the default JSON, Markdown or PDF outputs.

With `--metadata-only` or `--no-content`, prompt/message text is not selected for Cursor and is not extracted or classified by the Claude Code and Codex adapters. Structural records are still parsed locally to obtain timestamps, roles, counts and tool metadata.

## Data not uploaded by default

By default, `wonka-audit` does not upload:

- full prompts;
- assistant answers;
- source code;
- secrets;
- environment variables;
- API keys;
- raw conversation logs;
- raw local files;
- absolute local paths;
- repository contents.

The CLI currently has no implemented upload path. The `--upload` flag is reserved for future use and exits with an error.

## Output files

The default output is local.

PDF:

```text
Desktop/Wonka AI Audit/wonka-ai-usage-audit.pdf
```

The PDF contains:

- AI Practice Score;
- key indicators;
- source coverage;
- top usage areas;
- employee action plan;
- workshop recommendation if usage quality is weak;
- next-measurement guidance.

JSON:

```text
Desktop/Wonka AI Audit/wonka-ai-audit-report.json
```

The JSON contains:

- schema version;
- generation timestamp;
- client/team labels if provided;
- collection window;
- privacy flags;
- source coverage;
- aggregated metrics;
- aggregate score;
- recommendations.

Markdown:

```text
Desktop/Wonka AI Audit/wonka-ai-audit-report.md
```

The Markdown file is a readable local companion report.

## Network behavior

There are two separate network considerations.

During installation or execution through `npx`:

- npm may contact the npm registry to download the package.
- This is standard npm behavior.
- The package code itself does not require a Wonka API call.

During audit execution:

- the current CLI implementation does not call Wonka servers;
- the current CLI implementation does not call third-party APIs;
- report generation happens locally.

Customers who require full network isolation can review the package, mirror it to an internal npm registry, or install it from an approved internal artifact.

## Privacy and minimization design

The tool follows these privacy principles:

- Local-first processing: metrics are computed on the employee workstation.
- Data minimization: only aggregate metrics are written by default.
- No raw content in default outputs: prompts, answers and code are not included.
- No default upload: sharing the JSON export is an explicit customer action.
- Limited retention: output files are stored locally and can be deleted by the employee or managed by endpoint policy.
- Pseudonymization: internal identifiers are hashed with an ephemeral per-audit salt that is not exported. This prevents cross-audit linkage of local session and project hashes.
- Path minimization: home directories are compacted and absolute local paths are not included in the default aggregate report.

## Security controls and ISO 27001 alignment

The tool can support an ISO 27001 control environment when deployed with the customer's normal software approval process.

Relevant control themes:

| ISO 27001-friendly theme | How `wonka-audit` supports it |
| --- | --- |
| Asset management | The package name, version and output artifacts are explicit and reviewable. |
| Access control | The tool runs with the current user's local permissions and does not request elevated privileges. |
| Information classification | Outputs are aggregate audit artifacts and can be classified by the customer before sharing. |
| Data minimization | Default outputs exclude raw prompts, answers, code and secrets. |
| Secure development | The CLI has a small code surface and no runtime npm dependencies at this stage. |
| Logging and monitoring | Execution is visible in terminal output and produces explicit local artifacts. |
| Supplier management | The npm package can be reviewed, pinned, mirrored or approved through the customer's vendor process. |
| Secure configuration | Customers can run with a controlled output path using `--out`. |
| Privacy by design | No default upload and local-first processing reduce data exposure. |
| Continual improvement | Baseline and later checkpoint reports support training effectiveness measurement. |

This alignment is not a certification statement. It is a technical explanation that helps the customer's security team map the tool to their own ISO 27001 Statement of Applicability, risk register and vendor review process.

## Recommended CISO approval path

For enterprise rollout, Wonka recommends the following review steps:

1. Review the npm package name and version:

   ```bash
   npm view wonka-audit
   ```

2. Inspect the package contents:

   ```bash
   npm pack wonka-audit --dry-run
   ```

3. Run the tool on a test workstation:

   ```bash
   npx wonka-audit --out ./wonka-audit-test
   ```

4. Inspect generated files:

   ```text
   ./wonka-audit-test/wonka-ai-usage-audit.pdf
   ./wonka-audit-test/wonka-ai-audit-report.json
   ./wonka-audit-test/wonka-ai-audit-report.md
   ```

5. Confirm that no raw prompts, source code, secrets or raw conversations are present in the outputs.
6. Decide whether JSON sharing with Wonka is allowed, optional or prohibited.
7. If needed, mirror the package to an internal npm registry and distribute the internal command.

## Customer deployment options

Low-friction deployment:

```bash
npx wonka-audit
```

Controlled output folder:

```bash
npx wonka-audit --out ./wonka-audit
```

Specific measurement window:

```bash
npx wonka-audit --since 2026-06-01 --until 2026-06-30
```

Internal registry option:

```bash
npm_config_registry=https://npm.company.example npx wonka-audit
```

Version-pinned option:

```bash
npx wonka-audit@0.1.1
```

## Data sharing model with Wonka

Default model:

- The employee keeps the PDF locally.
- No automatic data transfer happens.

Optional model:

- The customer shares the JSON export with Wonka.
- Wonka uses it to prepare team-level restitution, training focus areas and a later checkpoint comparison.

Recommended enterprise model:

- The CISO or security owner defines whether JSON exports may be shared.
- If sharing is approved, the customer should use an approved channel.
- Wonka should not ask employees to send raw AI logs, prompts, code or local trace directories.

## Risk assessment

| Risk | Default mitigation |
| --- | --- |
| Accidental raw prompt disclosure | Raw prompts are not written to the default outputs. |
| Source code disclosure | Repository contents are not exported. |
| Secret disclosure | Secrets are not intentionally exported; output review is still recommended before sharing. |
| Unwanted upload | No upload is implemented in the current CLI. |
| Endpoint policy concerns | Customers can run in a test machine, internal registry or managed developer environment first. |
| Supply-chain concerns | Package is small, versioned, dependency-light and can be mirrored internally. |
| Overcollection | The tool outputs aggregate usage metrics, not raw conversations. |
| Employee monitoring concerns | The report is practice-oriented and local-first; customers should communicate purpose and scope clearly. |

## Limitations and open points

The current version is intentionally conservative.

Current limitations:

- No automatic upload to Wonka.
- No centralized identity integration.
- No centralized consent workflow.
- No admin dashboard.
- No enterprise policy engine.
- No formal SOC 2 or ISO 27001 certification claim for the tool itself.
- Cursor coverage depends on local availability of `sqlite3`.

Recommended before broad enterprise deployment:

- validate the generated JSON on a sample machine;
- decide whether JSON sharing is allowed;
- define retention rules for local PDF/JSON outputs;
- define employee communication and consent language;
- consider internal package mirroring for highly regulated environments;
- document the tool in the customer's software inventory.

## Suggested employee communication

```text
Run this command from your terminal:

npx wonka-audit

The audit runs locally on your computer. It does not upload prompts, source code,
secrets or raw conversations. It creates a PDF in a "Wonka AI Audit" folder on
your Desktop.

Website: https://wonka-ai.com
Terms: https://wonka-ai.com/cgv
```

## Suggested CISO decision statement

```text
Approved for pilot use, subject to local execution only, no automatic upload,
review of generated JSON before any external sharing, and use of approved
internal communication channels for any transfer to Wonka.
```
