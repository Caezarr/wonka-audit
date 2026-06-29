import { buildWrappedRecap, pct } from "./wrapped.js";

export function renderWrappedCardSvg(audit) {
  const wrapped = buildWrappedRecap(audit);
  const m = audit.metrics;
  const score = audit.score.ai_practice_score || 0;
  const validation = m.verifiable_impact?.validation_rate || 0;
  const fileContext = m.business_usage?.file_context_rate || 0;
  const context = m.interaction_quality?.contextualized_prompt_rate || 0;
  const workflow = m.business_usage?.advanced_workflow_rate || 0;
  const windowLabel = `${audit.collection_window.start.slice(0, 10)} to ${audit.collection_window.end.slice(0, 10)}`;
  const line = `${wrapped.profile.name}: ${m.wrapped_summary?.conversations || 0} AI conversations, mostly around ${wrapped.top_use_case.toLowerCase()}.`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="Wonka AI Wrapped card">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="26" stdDeviation="28" flood-color="#101612" flood-opacity=".28"/>
    </filter>
    <linearGradient id="scan" x1="0" x2="1">
      <stop offset="0" stop-color="#28d66f" stop-opacity=".2"/>
      <stop offset=".48" stop-color="#28d66f" stop-opacity=".04"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity=".1"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="#f4f3ee"/>
  <rect x="74" y="64" width="932" height="1222" rx="34" fill="#111820" filter="url(#shadow)"/>
  <rect x="74" y="64" width="932" height="46" rx="34" fill="#121820"/>
  <circle cx="102" cy="87" r="8" fill="#ff5d54"/>
  <circle cx="126" cy="87" r="8" fill="#ffc145"/>
  <circle cx="150" cy="87" r="8" fill="#29c96f"/>
  <text x="540" y="93" text-anchor="middle" fill="#69717e" font-size="18" font-weight="700" font-family="Menlo, Consolas, monospace">wonka-audit -- wrapped</text>

  <rect x="106" y="146" width="868" height="1082" rx="18" fill="#070b0d" stroke="#28d66f" stroke-width="3"/>
  <rect x="108" y="148" width="864" height="1078" rx="16" fill="url(#scan)" opacity=".25"/>

  <text x="142" y="238" fill="#f4f4ef" font-size="74" font-weight="950" font-family="Menlo, Consolas, monospace">YOUR AI WRAPPED</text>
  <text x="840" y="238" fill="#28d66f" font-size="18" font-weight="900" font-family="Menlo, Consolas, monospace">LOCAL ONLY</text>

  <text x="170" y="480" fill="#28d66f" font-size="170" font-weight="950" font-family="Menlo, Consolas, monospace">${escapeXml(score)}</text>
  <text x="430" y="472" fill="#858a96" font-size="30" font-weight="800" font-family="Menlo, Consolas, monospace">/100</text>
  <text x="174" y="528" fill="#28d66f" font-size="31" font-weight="800" font-family="Menlo, Consolas, monospace">AI Practice Score</text>

  <text x="735" y="390" text-anchor="middle" fill="#28d66f" font-size="30" font-weight="800" font-family="Menlo, Consolas, monospace">[ profile ]</text>
  <text x="735" y="444" text-anchor="middle" fill="#f3f6f1" font-size="30" font-weight="900" font-family="Menlo, Consolas, monospace">${escapeXml(wrapped.profile.name)}</text>
  <text x="735" y="498" text-anchor="middle" fill="#28d66f" font-size="22" font-weight="700" font-family="Menlo, Consolas, monospace">${escapeXml(wrapped.top_tool)} + ${escapeXml(wrapped.top_use_case)}</text>

  ${wrappedText(line, 170, 620, 38, 34, "#a6abb7", "middle", 740)}

  ${metricBox(142, 720, "CONTEXT", `${pct(context)} context-rich`, contextHint(m))}
  ${metricBox(552, 720, "WORKFLOW", `${pct(workflow)} workflow mode`, `${m.wrapped_summary?.conversations || 0} sessions / ${m.adoption?.active_days || 0} active days`)}
  ${proofBox(142, 900, validation, fileContext)}

  <text x="142" y="1160" fill="#69717e" font-size="20" font-weight="700" font-family="Menlo, Consolas, monospace">${escapeXml(windowLabel)}</text>
  <text x="938" y="1160" text-anchor="end" fill="#69717e" font-size="20" font-weight="700" font-family="Menlo, Consolas, monospace">wonka-ai.com</text>
</svg>`;
}

function metricBox(x, y, title, value, body) {
  return `
  <rect x="${x}" y="${y}" width="386" height="140" rx="10" fill="#0d1216" stroke="#1e8b4a" stroke-width="2"/>
  <text x="${x + 26}" y="${y + 46}" fill="#28d66f" font-size="27" font-weight="900" font-family="Menlo, Consolas, monospace">${escapeXml(title)}</text>
  <text x="${x + 26}" y="${y + 86}" fill="#f3f6f1" font-size="26" font-weight="800" font-family="Menlo, Consolas, monospace">${escapeXml(value)}</text>
  <text x="${x + 26}" y="${y + 118}" fill="#9fa6b3" font-size="18" font-weight="700" font-family="Menlo, Consolas, monospace">${escapeXml(body)}</text>`;
}

function proofBox(x, y, validation, fileContext) {
  return `
  <rect x="${x}" y="${y}" width="796" height="170" rx="10" fill="#0d1216" stroke="#1e8b4a" stroke-width="2"/>
  <text x="${x + 26}" y="${y + 48}" fill="#28d66f" font-size="27" font-weight="900" font-family="Menlo, Consolas, monospace">PROOF LOOP</text>
  ${barRow(x + 26, y + 82, "validation", validation)}
  ${barRow(x + 26, y + 124, "file context", fileContext)}`;
}

function barRow(x, y, label, value) {
  const width = Math.round(410 * Math.max(0, Math.min(1, value || 0)));
  return `
  <text x="${x}" y="${y}" fill="#aab0ba" font-size="20" font-weight="700" font-family="Menlo, Consolas, monospace">${escapeXml(label)}</text>
  <rect x="${x + 210}" y="${y - 20}" width="410" height="18" fill="#14221b"/>
  <rect x="${x + 210}" y="${y - 20}" width="${width}" height="18" fill="#28d66f"/>
  <text x="${x + 650}" y="${y}" text-anchor="end" fill="#dfe8df" font-size="20" font-weight="900" font-family="Menlo, Consolas, monospace">${escapeXml(pct(value))}</text>`;
}

function wrappedText(text, x, y, size, lineHeight, color, anchor, maxWidth) {
  const chars = Math.max(22, Math.floor(maxWidth / (size * 0.58)));
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > chars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3).map((line, index) => {
    const tx = anchor === "middle" ? x + maxWidth / 2 : x;
    return `<text x="${tx}" y="${y + index * lineHeight}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="750" font-family="Menlo, Consolas, monospace">${escapeXml(line)}</text>`;
  }).join("\n  ");
}

function contextHint(metrics) {
  const vague = metrics.interaction_quality?.vague_prompt_rate || 0;
  if (vague > 0.3) return "lower vague prompts";
  return "strong input signal";
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
