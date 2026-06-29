#!/usr/bin/env python3
import argparse
import json
import math
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


WONKA_DARK = colors.HexColor("#28288C")
WONKA_LIGHT = colors.HexColor("#7864F0")
INK = colors.HexColor("#151529")
MUTED = colors.HexColor("#666A80")
SOFT_BG = colors.HexColor("#F7F7FC")
LINE = colors.HexColor("#E5E4F4")
GOOD = colors.HexColor("#168A5B")
WARN = colors.HexColor("#B7791F")
BAD = colors.HexColor("#B83232")


def pct(v):
    if v is None:
        return "n/a"
    return f"{round(float(v) * 100)}%"


def num(v):
    if v is None:
        return "n/a"
    if isinstance(v, float):
        return f"{v:.2f}".rstrip("0").rstrip(".")
    return f"{v:,}".replace(",", " ")


def safe_get(obj, path, default=None):
    cur = obj
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur


def score_color(score):
    if score >= 70:
        return GOOD
    if score >= 50:
        return WARN
    return BAD


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "WonkaTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=32,
            textColor=INK,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "WonkaSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=MUTED,
        ),
        "h1": ParagraphStyle(
            "WonkaH1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=23,
            textColor=INK,
            spaceBefore=8,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "WonkaH2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=WONKA_DARK,
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "WonkaBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "WonkaSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=MUTED,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.black,
        ),
        "card_label": ParagraphStyle(
            "CardLabel",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "card_value": ParagraphStyle(
            "CardValue",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=21,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "cover_score": ParagraphStyle(
            "CoverScore",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=44,
            leading=48,
            textColor=WONKA_DARK,
            alignment=TA_CENTER,
        ),
        "right": ParagraphStyle(
            "Right",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            alignment=TA_RIGHT,
        ),
    }


def header_footer(canvas, doc, logo_path):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.drawImage(str(logo_path), 18 * mm, height - 18 * mm, width=34 * mm, height=7.5 * mm, mask="auto", preserveAspectRatio=True)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(18 * mm, height - 22 * mm, width - 18 * mm, height - 22 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 13 * mm, "Wonka AI Usage Audit - rapport client confidentiel")
    canvas.drawRightString(width - 18 * mm, 13 * mm, f"Page {doc.page}")
    canvas.restoreState()


def card(label, value, accent=WONKA_DARK):
    data = [
        [Paragraph(label.upper(), ST["card_label"])],
        [Paragraph(str(value), ST["card_value"])],
    ]
    table = Table(data, colWidths=[42 * mm], rowHeights=[9 * mm, 18 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("LINEABOVE", (0, 0), (-1, 0), 3, accent),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def progress_bar(label_text, value, width=120 * mm, color=WONKA_LIGHT):
    value = max(0, min(1, float(value or 0)))
    filled = width * value
    empty = max(1, width - filled)
    filled = max(1, filled)
    bar = Table([["", ""]], colWidths=[filled, empty], rowHeights=[3.5 * mm])
    bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), color),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#ECEBFA")),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    data = [
        [Paragraph(label_text, ST["table_cell"]), Paragraph(f"{round(value * 100)}%", ST["table_cell"])],
        [bar, ""],
    ]
    table = Table(data, colWidths=[width - 18 * mm, 18 * mm], rowHeights=[6 * mm, 4 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("SPAN", (0, 1), (1, 1)),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table


def simple_bar_rows(items, title_left="Item", title_right="Part"):
    rows = [[title_left, title_right]]
    for name, share in items:
        rows.append([name, pct(share)])
    return rows


def section_table(rows, widths=None):
    normalized = [rows[0]]
    for row in rows[1:]:
        normalized.append([
            Paragraph(str(cell), ST["table_cell"]) if isinstance(cell, str) else cell
            for cell in row
        ])
    table = Table(normalized, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), WONKA_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("LEADING", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_BG]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def bullet(text):
    return Paragraph(f"- {text}", ST["body"])


def build_story(audit):
    score = audit["score"]["ai_practice_score"]
    dims = audit["score"]["dimensions"]
    metrics = audit["metrics"]
    weak = sorted(dims.items(), key=lambda kv: kv[1])[:2]
    strong = sorted(dims.items(), key=lambda kv: kv[1], reverse=True)[:2]
    return [
        f"Le AI Practice Score actuel est de {score}/100. C'est un score de maturité pratique, pas un score de consommation de tokens.",
        f"Les dimensions les plus solides sont {label(strong[0][0])} ({strong[0][1]}/100) et {label(strong[1][0])} ({strong[1][1]}/100).",
        f"Les axes prioritaires sont {label(weak[0][0])} ({weak[0][1]}/100) et {label(weak[1][0])} ({weak[1][1]}/100).",
        f"La qualité du contexte reste le principal levier comportemental : {pct(metrics['interaction_quality']['vague_prompt_rate'])} des prompts sont encore classés comme vagues, contre {pct(metrics['interaction_quality']['contextualized_prompt_rate'])} de prompts contextualisés.",
        f"La vérification est la prochaine cible de formation : seulement {pct(metrics['verifiable_impact']['validation_rate'])} des sessions montrent un comportement de validation comme test, lint, typecheck ou revue de diff.",
    ]


def label(key):
    return {
        "adoption_durable": "Adoption durable",
        "usage_metier_reel": "Usage métier réel",
        "qualite_interaction": "Qualité d'interaction",
        "impact_verifiable": "Impact vérifiable",
        "usage_juste": "Usage juste",
    }.get(key, key.replace("_", " "))


def make_report(audit, compare, logo_path, out_path):
    doc = BaseDocTemplate(
        str(out_path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=28 * mm,
        bottomMargin=20 * mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=lambda c, d: header_footer(c, d, logo_path))])

    story = []
    score = audit["score"]["ai_practice_score"]
    metrics = audit["metrics"]
    dims = audit["score"]["dimensions"]
    period = audit.get("period", "m1").upper()
    client = audit.get("org_slug", "Client")
    team = audit.get("team_slug", "All teams")

    story.append(Image(str(logo_path), width=52 * mm, height=11.5 * mm))
    story.append(Spacer(1, 22 * mm))
    story.append(Paragraph("AI Usage Audit", ST["title"]))
    story.append(Paragraph("Mesurer l'amélioration réelle de l'usage IA après formation - pas le volume de tokens.", ST["subtitle"]))
    story.append(Spacer(1, 12 * mm))
    story.append(Table([
        [Paragraph("Client", ST["small"]), Paragraph(str(client), ST["body"])],
        [Paragraph("Équipe", ST["small"]), Paragraph(str(team), ST["body"])],
        [Paragraph("Période", ST["small"]), Paragraph(period, ST["body"])],
        [Paragraph("Fenêtre", ST["small"]), Paragraph(f"{audit['collection_window']['start'][:10]} -> {audit['collection_window']['end'][:10]}", ST["body"])],
    ], colWidths=[24 * mm, 110 * mm], style=TableStyle([
        ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])))
    story.append(Spacer(1, 16 * mm))
    story.append(Table([
        [Paragraph("AI PRACTICE SCORE", ST["card_label"])],
        [Paragraph(f"{score}/100", ST["cover_score"])],
        [Paragraph(audit["score"]["interpretation"], ST["subtitle"])],
    ], colWidths=[92 * mm], hAlign="LEFT", style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SOFT_BG),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("LINEABOVE", (0, 0), (-1, 0), 5, score_color(score)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ])))
    story.append(Spacer(1, 16 * mm))
    story.append(Paragraph("Confidentiel - préparé par Wonka", ST["small"]))
    story.append(PageBreak())

    story.append(Paragraph("Synthèse Exécutive", ST["h1"]))
    for line in build_story(audit):
        story.append(bullet(line))
        story.append(Spacer(1, 2 * mm))
    story.append(Spacer(1, 4 * mm))

    cards = [
        card("Total sessions", num(metrics["adoption"]["total_sessions"]), WONKA_DARK),
        card("Context prompts", pct(metrics["interaction_quality"]["contextualized_prompt_rate"]), WONKA_LIGHT),
        card("Validation rate", pct(metrics["verifiable_impact"]["validation_rate"]), WARN),
        card("Vague prompts", pct(metrics["interaction_quality"]["vague_prompt_rate"]), BAD),
    ]
    story.append(Table([cards], colWidths=[43 * mm] * 4, hAlign="LEFT"))
    story.append(Spacer(1, 8 * mm))

    if compare:
        base_score = safe_get(compare, "base_score")
        current_score = safe_get(compare, "current_score")
        delta = current_score - base_score
        story.append(Paragraph("Progression Depuis La Baseline", ST["h2"]))
        story.append(Paragraph(f"Le AI Practice Score passe de {base_score}/100 à {current_score}/100 ({delta:+} points).", ST["body"]))
        story.append(Spacer(1, 3 * mm))

    story.append(Paragraph("Score Par Dimension", ST["h1"]))
    story.append(Paragraph("Lecture Visuelle", ST["h2"]))
    for key, value in dims.items():
        color = score_color(value)
        story.append(progress_bar(label(key), value / 100, width=140 * mm, color=color))
        story.append(Spacer(1, 2 * mm))
    story.append(PageBreak())
    story.append(Paragraph("Détail Des Dimensions", ST["h1"]))
    rows = [["Dimension", "Score", "Lecture"]]
    for key, value in dims.items():
        rows.append([label(key), f"{value}/100", dimension_reading(key, value)])
    story.append(section_table(rows, widths=[48 * mm, 24 * mm, 96 * mm]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("KPI Opérationnels", ST["h1"]))
    rows = [
        ["KPI", "Valeur", "Pourquoi c'est important"],
        ["Sessions liées à un projet", pct(metrics["business_usage"]["project_bound_session_rate"]), "Le travail est attaché à de vrais projets, pas à du chat générique."],
        ["Usage fichiers/contexte", pct(metrics["business_usage"]["file_context_rate"]), "Les utilisateurs donnent à l'IA du contexte concret."],
        ["Workflows avancés", pct(metrics["business_usage"]["advanced_workflow_rate"]), "Usage d'outils, fichiers, shell ou workflows multi-étapes."],
        ["Prompts contextualisés", pct(metrics["interaction_quality"]["contextualized_prompt_rate"]), "Les prompts incluent objectif, contexte, contraintes ou références."],
        ["Prompts vagues", pct(metrics["interaction_quality"]["vague_prompt_rate"]), "Signal principal de gaspillage : les demandes floues produisent des réponses faibles."],
        ["Taux de validation", pct(metrics["verifiable_impact"]["validation_rate"]), "Tests, lint, typecheck ou revue après assistance IA."],
        ["Longues sessions sans action", pct(metrics["fair_usage"]["long_session_without_action_rate"]), "Signal de sobriété : éviter les longues conversations sans résultat."],
    ]
    story.append(section_table(rows, widths=[44 * mm, 26 * mm, 98 * mm]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Mix Des Outils Et Cas D'usage", ST["h1"]))
    source_mix = metrics["adoption"].get("source_mix", {})
    source_rows = simple_bar_rows(
        [(tool_label(k), v) for k, v in sorted(source_mix.items(), key=lambda item: item[1], reverse=True)],
        "Outil",
        "Part des sessions",
    )
    task_rows = simple_bar_rows(
        [(task_label(item["category"]), item["share"]) for item in metrics["business_usage"].get("top_task_categories", [])],
        "Catégorie",
        "Part des sessions",
    )
    story.append(Table([
        [section_table(source_rows, widths=[50 * mm, 28 * mm]), section_table(task_rows, widths=[58 * mm, 28 * mm])]
    ], colWidths=[82 * mm, 86 * mm], hAlign="LEFT", style=TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ])))
    story.append(PageBreak())

    if compare:
        story.append(Paragraph("M0 vs Période Courante", ST["h1"]))
        rows = [["Metric", "M0", period, "Delta"]]
        for item in compare["rows"]:
            rows.append(item)
        story.append(section_table(rows, widths=[58 * mm, 28 * mm, 28 * mm, 28 * mm]))
        story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("Recommandations", ST["h1"]))
    for title, body in recommendations(audit):
        story.append(KeepTogether([
            Paragraph(title, ST["h2"]),
            Paragraph(body, ST["body"]),
            Spacer(1, 3 * mm),
        ]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Prochains 30 Jours", ST["h1"]))
    rows = [
        ["Priorité", "Action", "KPI cible"],
        ["1", "Animer un atelier court sur les boucles de validation : test, lint, typecheck, revue de diff.", "Taux de validation +10 pts"],
        ["2", "Publier trois templates de prompts par workflow d'équipe.", "Prompts vagues -15 pts"],
        ["3", "Collecter un bon pattern anonymisé par équipe.", "Workflows avancés +10 pts"],
    ]
    story.append(section_table(rows, widths=[18 * mm, 105 * mm, 45 * mm]))

    story.append(PageBreak())
    story.append(Paragraph("Note Confidentialité", ST["h1"]))
    story.append(Paragraph(
        "Ce rapport est généré à partir de métriques locales agrégées. Les prompts complets, réponses assistant, code source, secrets et chemins locaux absolus ne sont pas inclus par défaut. Cursor est analysé en mode agrégé safe : seuls certains champs de métadonnées sont lus depuis la base locale.",
        ST["body"],
    ))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Méthodologie", ST["h1"]))
    story.append(Paragraph(
        "Le score combine cinq dimensions : adoption durable, usage métier réel, qualité d'interaction, impact vérifiable et usage juste. Les métriques sont calculées à partir des traces locales Claude Code, Cursor et Codex, puis agrégées sur la fenêtre M0, M+1, M+2 ou M+3. Les recommandations ciblent les dimensions les plus faibles et les comportements les plus actionnables.",
        ST["body"],
    ))

    doc.build(story)


def dimension_reading(key, value):
    if key == "usage_juste":
        return "Mesure le rapport résultat/ressources, pas la baisse de tokens en soi."
    if value >= 70:
        return "Signal fort. À maintenir et renforcer."
    if value >= 50:
        return "Base saine, encore améliorable via des playbooks d'équipe."
    return "Axe prioritaire pour le prochain atelier."


def tool_label(key):
    return {
        "claude_code": "Claude Code",
        "cursor": "Cursor",
        "codex": "Codex",
    }.get(key, key)


def task_label(key):
    return {
        "testing": "Tests",
        "debugging": "Debug",
        "code_review": "Review",
        "documentation": "Documentation",
        "refactor": "Refactor",
        "data_analysis": "Analyse data",
        "business_writing": "Rédaction métier",
        "planning": "Planning",
        "code_generation": "Génération code",
        "other": "Autre",
    }.get(key, key)


def recommendations(audit):
    m = audit["metrics"]
    out = []
    if m["verifiable_impact"]["validation_rate"] < 0.25:
        out.append(("1. Construire les réflexes de validation", "L'axe le plus clair est la vérification. Former les utilisateurs à terminer le travail assisté par IA par des tests, lint, typecheck, revue de diff ou critère d'acceptation concret."))
    if m["interaction_quality"]["vague_prompt_rate"] > 0.3:
        out.append(("2. Réduire les prompts vagues", "Introduire des templates réutilisables autour de quatre champs : objectif, contexte, contraintes, résultat attendu. Cela améliore la qualité sans encourager le token maxing."))
    if m["business_usage"]["advanced_workflow_rate"] < 0.5:
        out.append(("3. Passer du chat au workflow", "Encourager les workflows avec fichiers, repo et contexte métier. L'objectif n'est pas plus de messages, mais plus de travail terminé avec le bon contexte et un résultat vérifiable."))
    if not out:
        out.append(("1. Maintenir le rythme d'usage", "Le pattern d'usage est sain. Garder les revues mensuelles centrées sur les résultats métier et les playbooks d'équipe."))
    return out[:3]


def build_compare_summary(compare_path):
    if not compare_path or not Path(compare_path).exists():
        return None
    # Prefer raw JSON pair in future. For now use the generated M0/M1 JSON files if present.
    return None


def compare_from_json(base_path, current_path):
    if not base_path or not current_path:
        return None
    base = load_json(base_path)
    current = load_json(current_path)
    rows = []
    specs = [
        ("Sessions totales", "metrics.adoption.total_sessions", "num"),
        ("Taux de contexte fichier", "metrics.business_usage.file_context_rate", "pct"),
        ("Prompts contextualisés", "metrics.interaction_quality.contextualized_prompt_rate", "pct"),
        ("Vague prompts", "metrics.interaction_quality.vague_prompt_rate", "pct"),
        ("Taux de validation", "metrics.verifiable_impact.validation_rate", "pct"),
        ("Taux de tests", "metrics.verifiable_impact.test_run_rate", "pct"),
    ]
    for name, path, kind in specs:
        a = safe_get(base, path)
        b = safe_get(current, path)
        rows.append([name, fmt(a, kind), fmt(b, kind), delta_fmt(a, b, kind)])
    return {
        "base_score": base["score"]["ai_practice_score"],
        "current_score": current["score"]["ai_practice_score"],
        "rows": rows,
    }


def fmt(v, kind):
    return pct(v) if kind == "pct" else num(v)


def delta_fmt(a, b, kind):
    if a is None or b is None:
        return "n/a"
    d = b - a
    if kind == "pct":
        return f"{d * 100:+.0f} pts"
    return f"{d:+.0f}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="out/wonka-ai-audit-report.json")
    parser.add_argument("--base")
    parser.add_argument("--current")
    parser.add_argument("--logo", default="/Users/gabriel/Desktop/GR/Vault/Wonka/Offers/Weston-Premium-Woods/_wonka-logo-dark.png")
    parser.add_argument("--out", default="output/pdf/wonka-ai-usage-audit-client-report.pdf")
    args = parser.parse_args()

    audit = load_json(args.input)
    compare = compare_from_json(args.base, args.current) if args.base and args.current else None
    make_report(audit, compare, Path(args.logo), Path(args.out))
    print(args.out)


ST = styles()


if __name__ == "__main__":
    main()
