# Wonka AI Usage Audit - Go Live

## Goal

Launch the audit before training with employees as the primary users of the report.

The audit creates a pre-training baseline now, helps Wonka tune the workshops to real usage, then runs again 3 months after the training/workshops to check whether teams actually applied better AI habits.

## Client Flow

1. Confirm scope with the client sponsor: Claude Code, Cursor, Codex, and optional local Git signals.
2. Send a transparency note to employees.
3. Run the first local audit as the pre-training baseline.
4. Deliver the employee report: Wrapped-style recap, usage patterns, personal tips, 90-day actions, method/privacy.
5. Use the baseline to tune Wonka workshops around real employee use cases.
6. Run the same audit again after 3 months.
7. Compare baseline vs 3-month checkpoint.

## Operator Commands

```bash
npm run preview
npm run audit:local
npm run report:client
```

The current MVP writes:

- `out/wonka-ai-audit-report.json`
- `out/wonka-ai-audit-report.md`
- `out/wonka-ai-audit-methodology.json`
- `out/wonka-ai-audit-manifest.json`
- `output/pdf/wonka-ai-usage-audit-premium-report.pdf`

## Employee Message

Hello,

Before the Wonka AI training program, we are creating a baseline of how our teams use Claude, Cursor and Codex today.

This is not about monitoring individuals or pushing people to use more tokens. The goal is to understand whether our AI usage becomes more useful over time: clearer context, better workflows, stronger validation and more reusable team habits.

By default, the report does not include full prompts, assistant answers, source code, secrets or absolute local paths. It uses aggregate signals to produce a practical recap and a short action plan.

Wonka will use this baseline to adapt the workshops to our real usage. We will run the same audit again in 3 months to see whether the workshops helped us apply better habits in daily work.

## Workshop Triggers

Recommend a Wonka Workshop when:

- AI Practice Score is below 60/100.
- Explicit validation is below 20%.
- Vague prompts remain above 45%.
- File/context usage is low.
- Teams do not have reusable AI instructions such as `CLAUDE.md`, `AGENTS.md`, Cursor rules or project-specific AI guidance.

## Workshop Inputs

Ask employees to bring:

- one real work use case;
- one prompt that failed or produced weak output;
- one AI output they want to learn how to validate;
- one project where team instructions could help.

## 90-Day Success Criteria

At the 3-month checkpoint, look for:

- higher contextualized prompt rate;
- higher explicit validation rate;
- more file/context usage;
- more advanced workflows;
- lower vague prompt rate;
- evidence that teams created or improved reusable AI instructions.

## Go-Live Checklist

- `npm run preview` detects at least one AI tool.
- `npm run audit:local` produces JSON and Markdown.
- `npm run report:client` produces the employee PDF without external images.
- PDF is in English.
- PDF has consistent typography and no overflowing text.
- Report explains what explicit validation means.
- Report clearly states that this is a pre-training baseline now and the comparison happens after the training cycle.
- Workshop invitation is visible when usage is fragile.
