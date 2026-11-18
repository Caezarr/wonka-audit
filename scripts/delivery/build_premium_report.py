#!/usr/bin/env python3
import argparse
import json

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


W, H = A4
M = 22 * mm

INK = colors.HexColor("#101A17")
FOREST = colors.HexColor("#0B211A")
MOSS = colors.HexColor("#51664B")
SAGE = colors.HexColor("#8D9A82")
BRONZE = colors.HexColor("#B6813A")
CREAM = colors.HexColor("#F4F1E9")
PAPER = colors.HexColor("#FBFAF6")
LINE = colors.HexColor("#DDD8C8")
SOFT = colors.HexColor("#EFECE3")
MUTED = colors.HexColor("#6E7169")
RED = colors.HexColor("#9F3B31")
WHITE = colors.HexColor("#F8F4E8")

FONT = "Times-Roman"
BOLD = "Times-Bold"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get(obj, path, default=None):
    cur = obj
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return default
        cur = cur[part]
    return cur


def pct(value):
    if value is None:
        return "n/a"
    return f"{round(float(value) * 100)}%"


def source_label(key):
    return {
        "claude_code": "Claude Code",
        "cursor": "Cursor",
        "codex": "Codex",
    }.get(key, key)


def task_label(key):
    return {
        "testing": "Testing",
        "debugging": "Debugging",
        "code_review": "Review",
        "documentation": "Documentation",
        "refactor": "Refactor",
        "data_analysis": "Data analysis",
        "business_writing": "Business writing",
        "planning": "Planning",
        "code_generation": "Code generation",
        "other": "Other",
    }.get(key, key)


def score_message(score):
    if score >= 70:
        return "You already have solid AI habits. The next step is to make them repeatable and easier to share."
    if score >= 50:
        return "You use AI often. The biggest gain now is to add better context and finish with proof."
    return "You are still early. Start with simple frames: goal, context, expected output and one check."


def workshop_message(score, validation_rate, vague_rate):
    if score < 60:
        return "Recommended: join the next Wonka Workshop to turn loose prompts into concrete workflows on your own use cases."
    if validation_rate < 0.20:
        return "Recommended: join the next Wonka Workshop to learn how to finish AI sessions with proof: tests, reviews, checks or acceptance criteria."
    if vague_rate > 0.45:
        return "Recommended: join the next Wonka Workshop to move from improvised chat to framed requests with objective, context and expected output."
    return "Optional: join the next Wonka Workshop to share strong habits and turn individual best practices into team standards."


def profile_title(audit):
    m = audit["metrics"]
    wrapped = m.get("wrapped_summary", {})
    top_use = wrapped.get("top_use_case") or "other"
    validation = m["verifiable_impact"]["validation_rate"]
    context = m["interaction_quality"]["contextualized_prompt_rate"]
    workflow = wrapped.get("workflow_or_agent_rate", 0)

    use_label = {
        "code_review": "AI reviewer",
        "code_generation": "AI builder",
        "planning": "AI planner",
        "business_writing": "AI writer",
        "debugging": "AI debugger",
        "testing": "AI tester",
        "documentation": "AI documenter",
        "data_analysis": "AI analyst",
        "refactor": "AI improver",
    }.get(top_use, "AI explorer")

    if validation < 0.2:
        suffix = "who needs stronger proof loops"
    elif context < 0.35:
        suffix = "who can unlock more with clearer context"
    elif workflow >= 0.6:
        suffix = "who is already moving beyond simple chat"
    else:
        suffix = "building repeatable habits"
    return f"{use_label} {suffix}"


def next_unlock(m):
    if m["verifiable_impact"]["validation_rate"] < 0.2:
        return "Finish important AI work with a check: test, review, checklist or acceptance criteria."
    if m["interaction_quality"]["vague_prompt_rate"] > 0.45:
        return "Start each request with goal, context, constraints and expected output."
    if m["business_usage"]["file_context_rate"] < 0.45:
        return "Bring the real work into the prompt: files, examples, errors, specs or customer context."
    return "Turn your best prompts into reusable team playbooks."


def plain_levers(m):
    return [
        {
            "title": "Give more context",
            "value": pct(m["interaction_quality"]["contextualized_prompt_rate"]),
            "signal": "of prompts include enough context",
            "meaning": "AI performs better when it knows the goal, the input, the audience and constraints.",
            "action": "Before asking, add: what I want, what this is for, what good looks like.",
            "color": MOSS,
        },
        {
            "title": "Use real work material",
            "value": pct(m["business_usage"]["file_context_rate"]),
            "signal": "of sessions include files or concrete context",
            "meaning": "Generic chat gives generic answers. Real files and examples make the answer usable.",
            "action": "Attach the relevant doc, code, error, spec or previous version.",
            "color": SAGE,
        },
        {
            "title": "Move from chat to workflow",
            "value": pct(m["business_usage"]["advanced_workflow_rate"]),
            "signal": "of sessions use tools, files or multi-step work",
            "meaning": "The best usage is not one question. It is a small workflow with review and iteration.",
            "action": "Ask for a plan, produce a version, review it, then package the final output.",
            "color": BRONZE,
        },
        {
            "title": "Finish with proof",
            "value": pct(m["verifiable_impact"]["validation_rate"]),
            "signal": "of sessions show explicit validation",
            "meaning": "This is the main unlock. AI output becomes safer when it is checked before sharing.",
            "action": "End with: what should I verify, what could be wrong, and how do I check it?",
            "color": RED,
        },
    ]


def coaching_moves(m):
    moves = []
    if m["verifiable_impact"]["validation_rate"] < 0.25:
        moves.append(("Proof loop", "For your next important AI answer, ask for a verification checklist before you use it.", RED))
    if m["interaction_quality"]["vague_prompt_rate"] > 0.3:
        moves.append(("Prompt frame", "Use this frame: Goal / Context / Constraints / Expected output / Check.", BRONZE))
    if m["business_usage"]["file_context_rate"] < 0.55:
        moves.append(("Bring evidence", "Paste or attach the real input: file, example, error, customer note or spec.", MOSS))
    if m["business_usage"]["advanced_workflow_rate"] < 0.7:
        moves.append(("Workflow mode", "Ask AI to work in steps: diagnose, propose, draft, review, improve.", SAGE))
    if not moves:
        moves.append(("Share your pattern", "Pick your best AI workflow and turn it into a reusable team template.", MOSS))
    return moves[:3]


class WonkaReport:
    def __init__(self, out):
        self.c = canvas.Canvas(str(out), pagesize=A4)
        self.c.setTitle("Wonka AI Usage Audit - Employee Report")
        self.c.setAuthor("Wonka")
        self.c.setSubject("Current AI usage baseline and 90-day adoption plan")
        self.c.setCreator("Wonka AI Usage Audit")
        self.page = 0

    def save(self):
        self.c.save()

    def page_bg(self, color=PAPER):
        self.c.setFillColor(color)
        self.c.rect(0, 0, W, H, fill=1, stroke=0)

    def new_page(self, header=True):
        if self.page:
            self.c.showPage()
        self.page += 1
        self.page_bg()
        if header:
            self.header()
        self.footer()

    def header(self):
        self.c.setFillColor(FOREST)
        self.c.setFont(BOLD, 13)
        self.c.drawString(M, H - 17 * mm, "wonka")
        self.c.setFillColor(MUTED)
        self.c.setFont(FONT, 7.5)
        self.c.drawRightString(W - M, H - 16.5 * mm, "AI Usage Audit")
        self.c.setStrokeColor(LINE)
        self.c.setLineWidth(0.4)
        self.c.line(M, H - 22 * mm, W - M, H - 22 * mm)

    def footer(self):
        self.c.setFillColor(MUTED)
        self.c.setFont(FONT, 7.5)
        self.c.drawString(M, 12 * mm, "Wonka AI Usage Audit - confidential")
        self.c.drawRightString(W - M, 12 * mm, str(self.page))

    def text(self, x, y, text, size=10, color=INK, font=FONT, leading=12, max_width=None):
        self.c.setFillColor(color)
        self.c.setFont(font, size)
        if not max_width:
            self.c.drawString(x, y, str(text))
            return y - leading

        line = ""
        for word in str(text).split():
            candidate = f"{line} {word}".strip()
            if self.c.stringWidth(candidate, font, size) <= max_width:
                line = candidate
            else:
                if line:
                    self.c.drawString(x, y, line)
                    y -= leading
                line = word
        if line:
            self.c.drawString(x, y, line)
            y -= leading
        return y

    def label(self, x, y, text, color=BRONZE):
        self.c.setFillColor(color)
        self.c.circle(x - 2.5 * mm, y + 0.7 * mm, 0.55 * mm, fill=1, stroke=0)
        return self.text(x, y, str(text).upper(), 7.5, color, BOLD, 9)

    def title(self, x, y, main, sub=None):
        self.text(x, y, main, 31, INK, BOLD, 32)
        if sub:
            self.text(x, y - 15 * mm, sub, 22, colors.HexColor("#CFCBC0"), BOLD, 24, 150 * mm)
        return y - 35 * mm

    def box(self, x, y, w, h, fill=CREAM, stroke=LINE, radius=8):
        self.c.setFillColor(fill)
        self.c.setStrokeColor(stroke)
        self.c.setLineWidth(0.35)
        self.c.roundRect(x, y, w, h, radius, fill=1, stroke=1)

    def dark_box(self, x, y, w, h, title, body):
        self.box(x, y, w, h, FOREST, FOREST, 8)
        self.c.setFillColor(BRONZE)
        self.c.circle(x + 8 * mm, y + h - 11 * mm, 1.6 * mm, fill=1, stroke=0)
        self.text(x + 14 * mm, y + h - 13 * mm, title, 12, WHITE, BOLD, 13)
        self.text(x + 8 * mm, y + h - 24 * mm, body, 9.2, colors.HexColor("#E5DECB"), FONT, 10.8, w - 16 * mm)

    def metric(self, x, y, value, label, note, accent=BRONZE):
        self.text(x, y, str(value), 31, INK, BOLD, 31)
        self.c.setFillColor(accent)
        self.c.roundRect(x + 28 * mm, y + 1 * mm, 1.1 * mm, 11 * mm, 0.5 * mm, fill=1, stroke=0)
        self.text(x + 34 * mm, y + 7 * mm, label, 10, INK, BOLD, 11)
        self.text(x + 34 * mm, y, note, 9, MUTED, FONT, 10, 105 * mm)

    def bar(self, x, y, w, label, value, color=MOSS):
        value = max(0, min(1, float(value or 0)))
        self.text(x, y + 5 * mm, label, 9.5, INK, FONT, 9)
        self.c.setFillColor(MUTED)
        self.c.setFont(FONT, 9.5)
        self.c.drawRightString(x + w, y + 5 * mm, f"{round(value * 100)}%")
        self.c.setFillColor(SOFT)
        self.c.roundRect(x, y, w, 2.4 * mm, 1.2 * mm, fill=1, stroke=0)
        self.c.setFillColor(color)
        self.c.roundRect(x, y, max(1.6 * mm, w * value), 2.4 * mm, 1.2 * mm, fill=1, stroke=0)

    def action_card(self, x, y, number, title, body, accent=BRONZE):
        self.box(x, y, W - 2 * M, 27 * mm, CREAM, LINE, 8)
        self.c.setFillColor(accent)
        self.c.circle(x + 8 * mm, y + 18 * mm, 3.2 * mm, fill=1, stroke=0)
        self.text(x + 6.8 * mm, y + 16.4 * mm, str(number), 9, PAPER, BOLD)
        self.text(x + 16 * mm, y + 19 * mm, title, 12, INK, BOLD, 13)
        self.text(x + 16 * mm, y + 10 * mm, body, 9.1, MUTED, FONT, 10.5, W - 2 * M - 24 * mm)

    def lever_card(self, x, y, title, value, signal, meaning, action, accent=BRONZE):
        self.box(x, y, W - 2 * M, 34 * mm, CREAM, LINE, 8)
        self.text(x + 8 * mm, y + 22 * mm, value, 23, INK, BOLD)
        self.c.setFillColor(accent)
        self.c.roundRect(x + 34 * mm, y + 23 * mm, 1.2 * mm, 8 * mm, 0.6 * mm, fill=1, stroke=0)
        self.text(x + 40 * mm, y + 27 * mm, title, 11.5, INK, BOLD)
        self.text(x + 40 * mm, y + 21 * mm, signal, 8.2, MUTED, FONT)
        self.text(x + 8 * mm, y + 12 * mm, meaning, 8.8, MUTED, FONT, 10, W - 2 * M - 16 * mm)
        self.text(x + 8 * mm, y + 5 * mm, f"Activate this lever: {action}", 8.8, INK, BOLD, 10, W - 2 * M - 16 * mm)

    def cover_bg(self):
        self.page_bg(FOREST)
        bands = [
            (0, H * 0.62, W, H * 0.38, "#6D755E"),
            (0, H * 0.50, W, H * 0.22, "#9A946D"),
            (0, H * 0.39, W, H * 0.20, "#B99C61"),
            (0, H * 0.25, W, H * 0.20, "#314D38"),
            (0, 0, W, H * 0.30, "#16271E"),
        ]
        for x, y, w, h, col in bands:
            self.c.setFillColor(colors.HexColor(col))
            self.c.rect(x, y, w, h, fill=1, stroke=0)
        self.c.setFillColor(colors.Color(1, 1, 1, alpha=0.10))
        for i in range(18):
            x = (i * 41) % int(W)
            self.c.ellipse(x - 8 * mm, H * 0.18, x + 30 * mm, H * 0.90, fill=1, stroke=0)
        self.c.setFillColor(colors.Color(0.04, 0.08, 0.06, alpha=0.45))
        self.c.rect(0, 0, W, H, fill=1, stroke=0)


def draw_cover(r, audit):
    r.new_page(header=False)
    r.cover_bg()
    r.text(M, H - 17 * mm, "wonka", 18, WHITE, BOLD)
    r.c.setFillColor(WHITE)
    r.c.setFont(BOLD, 7.5)
    r.c.drawRightString(W - M, H - 18 * mm, "CONFIDENTIAL")

    y = H - 82 * mm
    r.label(M + 40 * mm, y, "pre-training baseline - personal recap", BRONZE)
    r.text(M + 25 * mm, y - 15 * mm, "Leave no", 32, WHITE, BOLD)
    r.text(M + 25 * mm, y - 31 * mm, "human behind.", 32, WHITE, BOLD)
    r.text(M + 25 * mm, y - 45 * mm, "A clear snapshot of how you use AI today, and which levers will help you get better faster.", 10, colors.HexColor("#E7E1CF"), FONT, 12, 115 * mm)

    score = get(audit, "score.ai_practice_score", 0)
    client = audit.get("org_slug", "client")
    window = audit.get("collection_window", {})

    r.box(M + 28 * mm, 55 * mm, 125 * mm, 39 * mm, colors.Color(0.96, 0.94, 0.86, alpha=0.92), colors.Color(1, 1, 1, alpha=0.2), 8)
    r.text(M + 36 * mm, 79 * mm, "AI Practice Score", 8.5, MUTED, BOLD)
    r.text(M + 36 * mm, 60 * mm, f"{score}/100", 36, FOREST, BOLD)
    r.text(M + 83 * mm, 75 * mm, score_message(score), 9.2, INK, FONT, 10.5, 61 * mm)
    r.text(M + 83 * mm, 60 * mm, "Next measurement: after the workshop cycle.", 8.7, BRONZE, BOLD, 10, 61 * mm)

    r.text(M, 29 * mm, f"Client: {client}", 8.8, colors.HexColor("#E7E1CF"), FONT)
    r.text(M, 23 * mm, f"Baseline window: {window.get('start', '')[:10]} -> {window.get('end', '')[:10]}", 8.8, colors.HexColor("#E7E1CF"), FONT)


def draw_wrapped_recap(r, audit):
    r.new_page()
    m = audit["metrics"]
    wrapped = m.get("wrapped_summary", {})
    score = get(audit, "score.ai_practice_score", 0)
    top_tool = source_label(wrapped.get("top_tool") or "n/a")
    top_use_case = task_label(wrapped.get("top_use_case") or "other")

    y = H - 48 * mm
    r.label(M, y, "your ai profile")
    y = r.title(M, y - 12 * mm, "Your AI baseline", profile_title(audit))

    r.box(M, y - 43 * mm, W - 2 * M, 43 * mm, CREAM, LINE, 9)
    r.text(M + 8 * mm, y - 12 * mm, "What we detected", 8.5, MUTED, BOLD)
    r.text(M + 8 * mm, y - 31 * mm, f"{wrapped.get('conversations', 0)} conversations", 29, FOREST, BOLD)
    r.text(M + 93 * mm, y - 14 * mm, f"AI Practice Score: {score}/100", 10, INK, BOLD)
    r.text(M + 93 * mm, y - 25 * mm, next_unlock(m), 9.5, MUTED, FONT, 11, 58 * mm)

    y -= 59 * mm
    cards = [
        ("Messages", wrapped.get("messages", 0), "total turns detected"),
        ("Avg / conv", wrapped.get("avg_messages_per_conversation", 0), "conversation depth"),
        ("Top tool", top_tool, "most present source"),
        ("Top use", top_use_case, "best workshop entry point"),
    ]
    col_w = (W - 2 * M - 8 * mm) / 2
    for idx, (label_text, value, note) in enumerate(cards):
        x = M + (idx % 2) * (col_w + 8 * mm)
        yy = y - (idx // 2) * 32 * mm
        r.box(x, yy - 24 * mm, col_w, 24 * mm, PAPER, LINE, 7)
        r.text(x + 6 * mm, yy - 8 * mm, label_text, 8, MUTED, BOLD)
        r.text(x + 6 * mm, yy - 17 * mm, value, 14, INK, BOLD, 15, col_w - 12 * mm)
        r.text(x + 6 * mm, yy - 22 * mm, note, 7.4, MUTED, FONT, 8, col_w - 12 * mm)

    y -= 76 * mm
    r.text(M, y, "How you use AI", 12, INK, BOLD)
    y -= 10 * mm
    r.bar(M, y, 137 * mm, "Quick chat", wrapped.get("free_chat_rate", 0), SAGE)
    y -= 13 * mm
    r.bar(M, y, 137 * mm, "Workflow mode", wrapped.get("workflow_or_agent_rate", 0), MOSS)
    y -= 20 * mm

    r.dark_box(
        M,
        34 * mm,
        W - 2 * M,
        46 * mm,
        "What to work on first",
        f"Start from your main use case: {top_use_case}. Then activate the highest-impact lever: {next_unlock(m)}",
    )


def draw_recap(r, audit):
    r.new_page()
    m = audit["metrics"]
    score = get(audit, "score.ai_practice_score", 0)
    validation_rate = m["verifiable_impact"]["validation_rate"]
    vague_rate = m["interaction_quality"]["vague_prompt_rate"]
    contextualized_rate = m["interaction_quality"]["contextualized_prompt_rate"]

    y = H - 48 * mm
    r.label(M, y, "your levers")
    y = r.title(M, y - 12 * mm, "What to activate", "four habits that change the quality of your AI work.")

    y -= 5 * mm
    for lever in plain_levers(m):
        r.lever_card(M, y - 34 * mm, lever["title"], lever["value"], lever["signal"], lever["meaning"], lever["action"], lever["color"])
        y -= 42 * mm


def draw_usage_patterns(r, audit):
    r.new_page()
    m = audit["metrics"]
    y = H - 48 * mm
    r.label(M, y, "plain-language reading")
    y = r.title(M, y - 12 * mm, "What the stats mean", "not more AI. Better AI.")

    kpis = [
        ("Work context included", m["business_usage"]["project_bound_session_rate"], FOREST),
        ("Files or examples used", m["business_usage"]["file_context_rate"], MOSS),
        ("Workflow mode", m["business_usage"]["advanced_workflow_rate"], MOSS),
        ("Checked before use", m["verifiable_impact"]["validation_rate"], RED),
        ("Long loops without result", m["fair_usage"]["long_session_without_action_rate"], RED),
    ]
    for label, value, color in kpis:
        r.bar(M, y, 137 * mm, label, value, color)
        y -= 12.5 * mm

    y -= 5 * mm
    r.box(M, y - 39 * mm, W - 2 * M, 39 * mm, CREAM, LINE, 8)
    r.text(M + 8 * mm, y - 11 * mm, "Your tool mix", 9, MUTED, BOLD)
    x = M + 8 * mm
    for tool, share in sorted(m["adoption"].get("source_mix", {}).items(), key=lambda item: item[1], reverse=True):
        r.text(x, y - 25 * mm, pct(share), 24, INK, BOLD)
        r.text(x, y - 33 * mm, source_label(tool), 8.5, MUTED, BOLD)
        x += 45 * mm

    y -= 54 * mm
    r.text(M, y, "What you mostly use AI for", 12, INK, BOLD)
    y -= 10 * mm
    for item in m["business_usage"].get("top_task_categories", [])[:4]:
        r.bar(M, y, 118 * mm, task_label(item["category"]), item["share"], SAGE)
        y -= 12 * mm


def draw_actions(r, audit):
    r.new_page()
    m = audit["metrics"]
    score = get(audit, "score.ai_practice_score", 0)
    validation_rate = m["verifiable_impact"]["validation_rate"]
    vague_rate = m["interaction_quality"]["vague_prompt_rate"]

    y = H - 48 * mm
    r.label(M, y, "personal action plan")
    y = r.title(M, y - 12 * mm, "Your next 3 moves", "small changes you can apply immediately.")

    actions = coaching_moves(m)
    for i, (title, body, accent) in enumerate(actions, 1):
        r.action_card(M, y - 27 * mm, i, title, body, accent)
        y -= 34 * mm

    prompt_frame = "Try this next: 'I want [goal]. Context: [situation/files]. Constraints: [format, audience, limits]. Before final answer, tell me what to verify.' Bring one real use case and one weak prompt to the workshop."
    r.dark_box(
        M,
        y - 37 * mm,
        W - 2 * M,
        43 * mm,
        "Your next prompt frame",
        prompt_frame,
    )


def draw_method(r, audit):
    r.new_page()
    y = H - 48 * mm
    r.label(M, y, "method and privacy")
    y = r.title(M, y - 12 * mm, "Measured locally.", "Shared safely.")

    paragraphs = [
        "This report is a current baseline. It should be repeated in 3 months to measure whether the training and workshops changed daily habits.",
        "The score combines adoption, real work usage, interaction quality, verifiable impact and fair usage. It is a directional operating metric, not a judgement of individual performance.",
        "Explicit validation means the session shows evidence that the AI output was checked: test, lint, typecheck, review, acceptance criteria, checklist or comparable proof.",
        "Full prompts, assistant answers, source code, secrets and absolute local paths are not included by default. Cursor is analysed in safe aggregate mode.",
    ]
    for p in paragraphs:
        y = r.text(M, y, p, 11, INK, FONT, 15, 145 * mm)
        y -= 5 * mm

    y -= 7 * mm
    r.box(M, y - 38 * mm, W - 2 * M, 38 * mm, CREAM, LINE, 8)
    r.text(M + 8 * mm, y - 12 * mm, "Sources used", 9, MUTED, BOLD)
    r.text(M + 8 * mm, y - 24 * mm, "Claude Code local logs · Cursor state.vscdb aggregate signals · Codex local sessions · local Git read-only signals", 9.5, INK, FONT, 12, 132 * mm)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="out/wonka-ai-audit-report.json")
    parser.add_argument("--base")
    parser.add_argument("--current")
    parser.add_argument("--out", default="output/pdf/wonka-ai-usage-audit-premium-report.pdf")
    args = parser.parse_args()

    audit = load_json(args.input)
    r = WonkaReport(args.out)
    draw_cover(r, audit)
    draw_wrapped_recap(r, audit)
    draw_recap(r, audit)
    draw_usage_patterns(r, audit)
    draw_actions(r, audit)
    draw_method(r, audit)
    r.save()
    print(args.out)


if __name__ == "__main__":
    main()
