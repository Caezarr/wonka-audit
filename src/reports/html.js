import { buildWrappedRecap, label, pct } from "./wrapped.js";
import { renderLinkedInPost } from "./linkedin.js";

export function renderHtmlReport(audit) {
  const wrapped = buildWrappedRecap(audit);
  const m = audit.metrics;
  const s = audit.score;
  const dimensions = Object.entries(s.dimensions || {});
  const levers = wrapped.next_moves;
  const linkedin = renderLinkedInPost(audit);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wonka AI Usage Audit</title>
  <style>${css()}</style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Local AI practice recap</p>
        <h1>${escapeHtml(wrapped.profile.name)}</h1>
        <p class="headline">${escapeHtml(wrapped.headline)}</p>
        <p class="privacy">Generated locally. No prompts, code, secrets, raw conversations or absolute local paths are included.</p>
      </div>
      <div class="score-panel" aria-label="AI Practice Score">
        <div class="score-ring" style="--score:${clamp(s.ai_practice_score || 0)}">
          <span>${s.ai_practice_score || 0}</span>
          <small>/100</small>
        </div>
        <p>${escapeHtml(s.interpretation || "")}</p>
      </div>
    </section>

    <section class="stats-grid" aria-label="Key stats">
      ${wrapped.stats.map((stat) => `
        <article class="stat ${escapeHtml(stat.tone)}">
          <span>${escapeHtml(stat.label)}</span>
          <strong>${escapeHtml(stat.value)}</strong>
        </article>
      `).join("")}
    </section>

    <section class="two-col">
      <div class="panel">
        <div class="section-title">
          <p class="eyebrow">What this means</p>
          <h2>Your AI practice profile</h2>
        </div>
        <p class="body-copy">${escapeHtml(wrapped.profile.description)}</p>
        <div class="signal-list">
          ${wrapped.insights.map((item) => `
            <div class="signal ${escapeHtml(item.level)}">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.sentence)}</p>
              </div>
              <span>${escapeHtml(item.value)}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="panel action-panel">
        <div class="section-title">
          <p class="eyebrow">Next levers</p>
          <h2>What to activate now</h2>
        </div>
        ${levers.map((lever) => `
          <article class="move">
            <h3>${escapeHtml(lever.title)}</h3>
            <p>${escapeHtml(lever.body)}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <p class="eyebrow">Score calibration</p>
        <h2>Where the score comes from</h2>
      </div>
      <div class="dimension-grid">
        ${dimensions.map(([key, value]) => `
          <article class="dimension">
            <div>
              <strong>${escapeHtml(dimensionLabel(key, value))}</strong>
              <span>${escapeHtml(scoreLabel(value))}</span>
            </div>
            <div class="bar"><i style="width:${clamp(value)}%"></i></div>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="two-col">
      <div class="panel">
        <div class="section-title">
          <p class="eyebrow">Detected activity</p>
          <h2>Signals used</h2>
        </div>
        <dl class="facts">
          <div><dt>Conversations</dt><dd>${number(m.wrapped_summary?.conversations)}</dd></div>
          <div><dt>Messages</dt><dd>${number(m.wrapped_summary?.messages)}</dd></div>
          <div><dt>Active days</dt><dd>${number(m.adoption?.active_days)}</dd></div>
          <div><dt>Top tool</dt><dd>${escapeHtml(label(m.wrapped_summary?.top_tool || "n/a"))}</dd></div>
          <div><dt>File context</dt><dd>${escapeHtml(pct(m.business_usage?.file_context_rate))}</dd></div>
          <div><dt>Validation loops</dt><dd>${escapeHtml(pct(m.verifiable_impact?.validation_rate))}</dd></div>
        </dl>
      </div>

      <div class="panel share-panel">
        <div class="section-title">
          <p class="eyebrow">Share draft</p>
          <h2>LinkedIn-ready recap</h2>
        </div>
        <p class="body-copy">${escapeHtml(wrapped.linkedin_angle)}</p>
        <pre>${escapeHtml(linkedin)}</pre>
      </div>
    </section>

    <footer>
      <span>Wonka AI Usage Audit</span>
      <span>${escapeHtml(audit.collection_window.start.slice(0, 10))} to ${escapeHtml(audit.collection_window.end.slice(0, 10))}</span>
      <span>wonka-ai.com</span>
    </footer>
  </main>
</body>
</html>`;
}

function css() {
  return `
:root {
  color-scheme: light;
  --paper: #f7f8f3;
  --ink: #16201d;
  --muted: #65716c;
  --line: #d9ded5;
  --panel: #ffffff;
  --blue: #2f6fbd;
  --green: #20a36b;
  --amber: #d58b19;
  --red: #c84e45;
  --mint: #d9f2e5;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.shell {
  width: min(1180px, calc(100% - 36px));
  margin: 0 auto;
  padding: 34px 0 28px;
}
.hero {
  min-height: 390px;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) 360px;
  gap: 22px;
  align-items: stretch;
  border-top: 6px solid var(--ink);
}
.hero-copy {
  padding: 42px 0 28px;
}
.eyebrow {
  margin: 0 0 10px;
  color: var(--blue);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}
h1, h2, h3, p { margin-top: 0; }
h1 {
  max-width: 760px;
  margin-bottom: 18px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(46px, 8vw, 96px);
  line-height: .92;
  letter-spacing: 0;
}
h2 {
  margin-bottom: 0;
  font-size: 28px;
  line-height: 1.05;
  letter-spacing: 0;
}
h3 {
  margin-bottom: 7px;
  font-size: 17px;
}
.headline {
  max-width: 710px;
  font-size: 25px;
  line-height: 1.22;
}
.privacy, .body-copy {
  max-width: 740px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.55;
}
.score-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 340px;
  padding: 30px;
  background: var(--ink);
  color: white;
}
.score-panel p {
  margin: 22px 0 0;
  color: #d9e5de;
  line-height: 1.45;
}
.score-ring {
  --p: calc(var(--score) * 1%);
  width: 218px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  align-self: center;
  border-radius: 50%;
  background: conic-gradient(var(--green) var(--p), #3b4642 0);
  position: relative;
}
.score-ring::after {
  content: "";
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  background: var(--ink);
}
.score-ring span, .score-ring small {
  position: relative;
  z-index: 1;
}
.score-ring span {
  font-size: 64px;
  font-weight: 850;
}
.score-ring small {
  margin-top: 72px;
  margin-left: -22px;
  color: #b9c8c0;
  font-weight: 800;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}
.stat, .panel {
  background: var(--panel);
  border: 1px solid var(--line);
}
.stat {
  min-height: 118px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.stat span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 750;
}
.stat strong {
  font-size: 28px;
  line-height: 1;
}
.stat.strong { border-top: 5px solid var(--green); }
.stat.developing { border-top: 5px solid var(--amber); }
.stat.needs-work { border-top: 5px solid var(--red); }
.two-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}
.panel {
  padding: 24px;
}
.section-title {
  margin-bottom: 22px;
}
.signal-list {
  display: grid;
  gap: 10px;
}
.signal {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px;
  gap: 16px;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--line);
}
.signal p, .move p {
  margin: 4px 0 0;
  color: var(--muted);
  line-height: 1.45;
}
.signal span {
  text-align: right;
  font-size: 20px;
  font-weight: 850;
}
.signal.strong span { color: var(--green); }
.signal.developing span { color: var(--amber); }
.signal.needs-work span { color: var(--red); }
.move {
  padding: 17px 0;
  border-top: 1px solid var(--line);
}
.dimension-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.dimension {
  min-height: 142px;
  padding: 15px;
  background: #f9faf7;
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.dimension strong {
  display: block;
  margin-bottom: 8px;
  line-height: 1.15;
}
.dimension span {
  color: var(--muted);
  font-size: 13px;
}
.bar {
  height: 9px;
  overflow: hidden;
  background: #e4e8df;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--blue);
}
.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}
.facts div {
  padding: 14px;
  background: #f9faf7;
  border: 1px solid var(--line);
}
.facts dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.facts dd {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 850;
}
pre {
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  margin: 16px 0 0;
  padding: 16px;
  background: #101816;
  color: #edf7f2;
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 0 0;
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 860px) {
  .shell { width: min(100% - 24px, 680px); padding-top: 18px; }
  .hero, .two-col { grid-template-columns: 1fr; }
  .stats-grid, .dimension-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .score-panel { min-height: 280px; }
  .headline { font-size: 20px; }
}
@media (max-width: 560px) {
  .stats-grid, .dimension-grid, .facts { grid-template-columns: 1fr; }
  .panel { padding: 18px; }
  footer { flex-direction: column; }
}
`;
}

function dimensionLabel(key, value) {
  return value?.label || label(key);
}

function scoreLabel(value) {
  return `${Math.round(value || 0)}/100`;
}

function number(value) {
  return String(Number.isFinite(value) ? value : 0);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
