import { writeFileSync } from "node:fs";

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;

export function writePdfReport(audit, outPath) {
  const doc = new PdfDoc();
  renderRecapPage(doc, audit);
  renderActionPage(doc, audit);
  writeFileSync(outPath, doc.toBuffer());
}

function renderRecapPage(doc, audit) {
  const m = audit.metrics;
  const s = audit.score;
  doc.header("Wonka AI Usage Audit", "wonka-ai.com | Terms: wonka-ai.com/cgv");
  doc.text("AI practice recap", 48, doc.y, 28, "bold");
  doc.y -= 28;
  doc.text(`Client: ${audit.org_slug}    Team: ${audit.team_slug || "all"}    Period: ${audit.period}`, 48, doc.y, 9);
  doc.y -= 18;
  doc.text(`Window: ${audit.collection_window.start.slice(0, 10)} to ${audit.collection_window.end.slice(0, 10)}`, 48, doc.y, 9);
  doc.y -= 34;

  doc.scoreBox(s.ai_practice_score, s.interpretation);
  doc.y -= 28;

  doc.section("Key indicators");
  doc.metric("Context-rich prompts", m.interaction_quality.contextualized_prompt_rate, "Higher is better. Strong teams give objective, context, constraints and expected output.");
  doc.metric("Vague prompts", m.interaction_quality.vague_prompt_rate, "Lower is better. Vague prompts usually mean weaker business context.");
  doc.metric("Validation loops", m.verifiable_impact.validation_rate, "Higher is better. Looks for tests, lint, typecheck, acceptance criteria or review loops.");
  doc.metric("Advanced workflows", m.business_usage.advanced_workflow_rate, "Higher is better. File-aware, repo-aware or tool-based sessions.");
  doc.metric("Long sessions without action", m.fair_usage.long_session_without_action_rate, "Lower is better. This helps detect token-heavy usage without concrete output.");

  doc.y -= 8;
  doc.section("Detected sources");
  const sources = Object.entries(audit.source_coverage)
    .map(([name, c]) => `${label(name)}: ${c.status} (${c.sessions_detected ?? c.sessions ?? c.commits_in_window ?? 0})`)
    .join("   ");
  doc.wrap(sources, 48, doc.y, 9, 92);
  doc.y -= 28;

  doc.section("Top usage areas");
  const top = m.business_usage.top_task_categories || [];
  if (top.length) {
    for (const item of top.slice(0, 4)) {
      doc.bullet(`${label(item.category)} - ${pct(item.share)} of detected sessions`);
    }
  } else {
    doc.bullet("No dominant usage area detected yet.");
  }

  doc.footer("Generated locally. No prompts, code, secrets, or raw conversations are included by default.");
}

function renderActionPage(doc, audit) {
  const m = audit.metrics;
  const s = audit.score;
  doc.addPage();
  doc.header("Wonka AI Usage Audit", "Action plan");
  doc.text("What to improve before the next checkpoint", 48, doc.y, 24, "bold");
  doc.y -= 26;
  const introUsed = doc.wrap("This baseline is meant to help employees improve their AI practice over the next 90 days. The goal is not to maximize tokens. The goal is clearer context, stronger workflows and verifiable outcomes.", 48, doc.y, 10, 92);
  doc.y -= introUsed + 18;

  doc.section("Priority actions");
  const actions = buildEmployeeActions(m, s);
  for (const action of actions) {
    doc.action(action.title, action.body);
  }

  doc.y -= 10;
  doc.section("Workshop recommendation");
  const workshop = s.ai_practice_score >= 75
    ? "Keep the momentum with an advanced workshop focused on team playbooks and repeatable workflows."
    : s.ai_practice_score >= 55
      ? "Join the Wonka workshop track to turn this healthy baseline into consistent validation habits."
      : "Join the Wonka workshops as a priority. The fastest gains will come from prompt structure, file context and validation loops.";
  doc.wrap(workshop, 48, doc.y, 11, 88);
  doc.y -= 44;

  doc.section("Next measurement");
  doc.bullet("Run the same command again after the training cycle, ideally around 90 days from now.");
  doc.bullet("Compare the next PDF and JSON export with this baseline.");
  doc.bullet("Progress means better evidence of useful work, not more messages or more token spend.");

  doc.footer("Website: wonka-ai.com | Terms and conditions: wonka-ai.com/cgv");
}

function buildEmployeeActions(m, s) {
  const actions = [];
  if ((m.interaction_quality.contextualized_prompt_rate || 0) < 0.5 || (m.interaction_quality.vague_prompt_rate || 0) > 0.25) {
    actions.push({
      title: "Use a clear prompt frame",
      body: "For important requests, include objective, context, constraints, examples and expected output. This can live in Claude.md, AGENTS.md, project rules or team templates."
    });
  }
  if ((m.business_usage.file_context_rate || 0) < 0.4 || (m.business_usage.advanced_workflow_rate || 0) < 0.5) {
    actions.push({
      title: "Bring the work into the conversation",
      body: "Attach the relevant files, error logs, specs or repo context. Prefer concrete workflows over generic chat questions."
    });
  }
  if ((m.verifiable_impact.validation_rate || 0) < 0.3) {
    actions.push({
      title: "End with verification",
      body: "Ask the AI to run or propose checks: tests, lint, typecheck, diff review, acceptance criteria or a short QA checklist."
    });
  }
  if ((m.fair_usage.long_session_without_action_rate || 0) > 0.2) {
    actions.push({
      title: "Avoid token-heavy loops",
      body: "If a conversation gets long without producing an action, stop and restate the goal, current state and next concrete step."
    });
  }
  if (!actions.length || s.ai_practice_score >= 75) {
    actions.push({
      title: "Turn good patterns into team habits",
      body: "Collect the best anonymized workflows and convert them into reusable team playbooks."
    });
  }
  return actions.slice(0, 4);
}

class PdfDoc {
  constructor() {
    this.pages = [];
    this.addPage();
  }

  addPage() {
    this.current = [];
    this.pages.push(this.current);
    this.y = PAGE.height - MARGIN;
  }

  header(left, right) {
    this.text(left, 48, 812, 10, "bold");
    this.text(right, 360, 812, 8);
    this.line(48, 798, 547, 798, 0.82);
    this.y = 760;
  }

  footer(text) {
    this.line(48, 44, 547, 44, 0.88);
    this.text(text, 48, 28, 7);
  }

  section(text) {
    this.text(text, 48, this.y, 13, "bold");
    this.y -= 18;
  }

  scoreBox(score, interpretation) {
    this.rect(48, this.y - 88, 499, 102, [0.95, 0.96, 0.94]);
    this.text("AI Practice Score", 68, this.y - 16, 12, "bold");
    this.text(`${score}/100`, 68, this.y - 56, 34, "bold");
    this.wrap(interpretation, 210, this.y - 24, 11, 48);
    this.y -= 116;
  }

  metric(name, value, help) {
    const y = this.y;
    this.text(name, 48, y, 10, "bold");
    this.bar(205, y - 4, 170, 8, value);
    this.text(pct(value), 388, y - 6, 10, "bold");
    this.wrap(help, 48, y - 15, 7, 96);
    this.y -= 35;
  }

  action(title, body) {
    const top = this.y;
    this.rect(48, top - 62, 499, 74, [0.97, 0.97, 0.96]);
    this.text(title, 66, top - 10, 12, "bold");
    this.wrap(body, 66, top - 29, 9, 86);
    this.y -= 88;
  }

  bullet(text) {
    this.text("-", 52, this.y, 10, "bold");
    const used = this.wrap(text, 66, this.y, 9, 86);
    this.y -= Math.max(16, used);
  }

  wrap(text, x, y, size, maxChars) {
    const lines = wrapText(text, maxChars);
    lines.forEach((line, index) => this.text(line, x, y - index * (size + 3), size));
    return lines.length * (size + 3);
  }

  text(text, x, y, size = 10, weight = "regular") {
    const font = weight === "bold" ? "F2" : "F1";
    this.current.push(`0 0 0 rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdf(clean(text))}) Tj ET`);
  }

  line(x1, y1, x2, y2, gray = 0) {
    this.current.push(`${gray} G ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  rect(x, y, w, h, rgb) {
    this.current.push(`${rgb.join(" ")} rg ${x} ${y} ${w} ${h} re f`);
  }

  bar(x, y, w, h, value) {
    this.rect(x, y, w, h, [0.88, 0.89, 0.86]);
    this.rect(x, y, Math.max(0, Math.min(w, w * (value || 0))), h, [0.39, 0.55, 0.95]);
  }

  toBuffer() {
    const objects = [];
    const add = (body) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = add("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesId = add("");
    const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const boldFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageIds = [];

    for (const page of this.pages) {
      const stream = page.join("\n");
      const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
      const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    }

    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, i) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf);
  }
}

function wrapText(input, maxChars) {
  const words = clean(input).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pct(v) {
  return `${Math.round((v || 0) * 100)}%`;
}

function label(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapePdf(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function clean(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
