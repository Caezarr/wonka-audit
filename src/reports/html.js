import { buildWrappedRecap, label, pct } from "./wrapped.js";
import { renderLinkedInPost } from "./linkedin.js";

export function renderHtmlReport(audit) {
  const wrapped = buildWrappedRecap(audit);
  const m = audit.metrics;
  const s = audit.score;
  const dimensions = Object.entries(s.dimensions || {});
  const linkedin = renderLinkedInPost(audit);
  const windowLabel = `${audit.collection_window.start.slice(0, 10)} to ${audit.collection_window.end.slice(0, 10)}`;
  const days = daysBetween(audit.collection_window.start, audit.collection_window.end);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wonka AI Wrapped</title>
  <style>${css()}</style>
</head>
<body>
  <main class="shell">
    <section class="wrapped-stage" aria-label="Wonka AI Wrapped">
      <button class="nav-dot" type="button" aria-label="Previous card">&lsaquo;</button>

      <article class="wrapped-card" id="wrapped-card">
        <div class="terminal-bar">
          <span class="lights"><i></i><i></i><i></i></span>
          <span>wonka-audit -- wrapped</span>
        </div>
        <div class="card-inner">
          <div class="card-frame">
            <header class="card-head">
              <p>YOUR AI WRAPPED</p>
              <span>LOCAL ONLY</span>
            </header>

            <section class="score-zone">
              <div>
                <div class="score-glitch">${escapeHtml(String(s.ai_practice_score || 0))}</div>
                <p><strong>/100</strong> AI Practice Score</p>
              </div>
              <div class="ascii-badge" aria-label="${escapeHtml(wrapped.profile.name)}">
                <pre>${escapeHtml(asciiBadge(wrapped.profile.name))}</pre>
                <span>${escapeHtml(wrapped.profile.name.toUpperCase())}</span>
              </div>
            </section>

            <p class="style-line">${escapeHtml(styleLine(wrapped, m, days))}</p>

            <section class="terminal-grid">
              <div class="terminal-box">
                <h2>CONTEXT</h2>
                <p><strong>${escapeHtml(pct(m.interaction_quality?.contextualized_prompt_rate))}</strong> context-rich prompts</p>
                <p>${escapeHtml(contextHint(m))}</p>
              </div>
              <div class="terminal-box">
                <h2>WORKFLOW</h2>
                <p><strong>${escapeHtml(pct(m.business_usage?.advanced_workflow_rate))}</strong> workflow mode</p>
                <p>${escapeHtml(number(m.wrapped_summary?.conversations))} sessions across ${escapeHtml(number(m.adoption?.active_days))} active days</p>
              </div>
              <div class="terminal-box wide">
                <h2>PROOF LOOP</h2>
                <div class="proof-row">
                  <span>validation</span>
                  <i><b style="width:${clamp(m.verifiable_impact?.validation_rate || 0) * 100}%"></b></i>
                  <strong>${escapeHtml(pct(m.verifiable_impact?.validation_rate))}</strong>
                </div>
                <div class="proof-row">
                  <span>file context</span>
                  <i><b style="width:${clamp(m.business_usage?.file_context_rate || 0) * 100}%"></b></i>
                  <strong>${escapeHtml(pct(m.business_usage?.file_context_rate))}</strong>
                </div>
              </div>
            </section>

            <footer class="card-footer">
              <span>${escapeHtml(wrapped.top_tool)} + ${escapeHtml(wrapped.top_use_case)}</span>
              <span>${escapeHtml(windowLabel)}</span>
            </footer>
          </div>
        </div>
      </article>

      <aside class="share-rail" aria-label="Share actions">
        <button class="share-button black" type="button" data-copy-post>Copy LinkedIn post</button>
        <a class="share-button blue" href="https://www.linkedin.com/feed/" target="_blank" rel="noreferrer">Open LinkedIn</a>
        <button class="share-button green" type="button" data-copy-card>Copy card text</button>
        <a class="share-button soft" href="wonka-ai-wrapped-card.svg" download>Download your card</a>
        <p class="share-note">No upload. Everything stays in this local file.</p>
      </aside>

      <button class="nav-dot" type="button" aria-label="Next card">&rsaquo;</button>
    </section>

    <section class="below-fold">
      <div class="panel">
        <div class="section-title">
          <p class="eyebrow">What this means</p>
          <h1>${escapeHtml(wrapped.headline)}</h1>
        </div>
        <p class="body-copy">${escapeHtml(wrapped.profile.description)}</p>
        <div class="move-grid">
          ${wrapped.next_moves.map((move) => `
            <article class="move">
              <h2>${escapeHtml(move.title)}</h2>
              <p>${escapeHtml(move.body)}</p>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="panel">
        <div class="section-title">
          <p class="eyebrow">Score calibration</p>
          <h1>Where the score comes from</h1>
        </div>
        <div class="dimension-grid">
          ${dimensions.map(([key, value]) => `
            <article class="dimension">
              <div>
                <strong>${escapeHtml(dimensionLabel(key, value))}</strong>
                <span>${escapeHtml(scoreLabel(value))}</span>
              </div>
              <div class="bar"><i style="width:${clampPercent(value)}%"></i></div>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="panel share-panel">
        <div class="section-title">
          <p class="eyebrow">Share draft</p>
          <h1>LinkedIn-ready recap</h1>
        </div>
        <pre id="linkedin-post">${escapeHtml(linkedin)}</pre>
      </div>
    </section>

    <footer class="page-footer">
      <span>Wonka AI Usage Audit</span>
      <span>Generated locally. No prompts, code, secrets, raw conversations or absolute local paths are included.</span>
      <span>wonka-ai.com</span>
    </footer>
  </main>
  <script>${script(linkedin)}</script>
</body>
</html>`;
}

function styleLine(wrapped, metrics, days) {
  const conversations = metrics.wrapped_summary?.conversations || 0;
  const useCase = wrapped.top_use_case.toLowerCase();
  return `${wrapped.profile.name}: ${conversations} AI conversations over ${days} days, mostly around ${useCase}, with ${wrapped.next_moves[0]?.title.toLowerCase() || "better habits"} as the next unlock.`;
}

function contextHint(metrics) {
  const vague = metrics.interaction_quality?.vague_prompt_rate || 0;
  if (vague > 0.3) return "Reduce vague prompts to unlock better answers.";
  return "Your inputs already carry useful signal.";
}

function asciiBadge(profileName) {
  if (/proof/i.test(profileName)) {
    return " [ test ]\n    |\n [ done ]";
  }
  if (/workflow/i.test(profileName)) {
    return String.raw` [ plan ]
    |
 [ ship ]`;
  }
  if (/context/i.test(profileName)) {
    return String.raw` { goal }
 { ctx  }
 { done }`;
  }
  return "  >_\n /|\\\n / \\";
}

function css() {
  return `
:root {
  color-scheme: light;
  --paper: #f4f3ee;
  --ink: #111816;
  --terminal: #070b0d;
  --terminal-2: #0d1216;
  --muted: #858a96;
  --line: #233f31;
  --green: #28d66f;
  --green-soft: #143822;
  --blue: #1176d8;
  --panel: #fffefa;
  --soft: #e8e6dd;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background:
    radial-gradient(circle at 50% 12%, rgba(40, 214, 111, .08), transparent 34%),
    var(--paper);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
button, a {
  font: inherit;
}
.shell {
  width: min(1320px, calc(100% - 28px));
  margin: 0 auto;
  padding: 34px 0 30px;
}
.wrapped-stage {
  min-height: calc(100vh - 70px);
  display: grid;
  grid-template-columns: 58px minmax(0, 760px) 250px 58px;
  gap: 22px;
  align-items: center;
  justify-content: center;
}
.nav-dot {
  width: 44px;
  height: 44px;
  border: 1px solid #dedbd0;
  border-radius: 50%;
  background: #ebe9e0;
  color: #2b3b34;
  font-size: 32px;
  line-height: 1;
  cursor: default;
}
.wrapped-card {
  overflow: hidden;
  border-radius: 22px;
  background: #111820;
  box-shadow: 0 30px 70px rgba(16, 22, 18, .24);
}
.terminal-bar {
  height: 38px;
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  align-items: center;
  padding: 0 14px;
  background: #121820;
  color: #686f7e;
  font: 700 14px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-align: center;
}
.lights {
  display: flex;
  gap: 7px;
}
.lights i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff5d54;
}
.lights i:nth-child(2) { background: #ffc145; }
.lights i:nth-child(3) { background: #29c96f; }
.card-inner {
  padding: 26px;
  background: var(--terminal);
}
.card-frame {
  min-height: 700px;
  padding: 28px;
  border: 2px solid var(--green);
  border-radius: 14px;
  color: #f2f5f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  box-shadow: inset 0 0 40px rgba(40, 214, 111, .08);
}
.card-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 28px;
}
.card-head p {
  margin: 0;
  color: #f4f4ef;
  font-size: clamp(42px, 7vw, 76px);
  line-height: .95;
  font-weight: 950;
  letter-spacing: 0;
}
.card-head span {
  color: var(--green);
  font-size: 13px;
  font-weight: 900;
}
.score-zone {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  gap: 22px;
  align-items: center;
  margin-bottom: 24px;
}
.score-glitch {
  color: var(--green);
  font-size: clamp(110px, 17vw, 172px);
  line-height: .8;
  font-weight: 950;
  letter-spacing: 0;
  text-shadow: -5px 0 0 rgba(40, 214, 111, .2), 5px 0 0 rgba(255, 255, 255, .08);
}
.score-zone p {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 19px;
}
.score-zone strong {
  color: #eef2ed;
}
.ascii-badge {
  color: var(--green);
  text-align: center;
}
.ascii-badge pre {
  margin: 0;
  font-size: 22px;
  line-height: 1.1;
  background: transparent;
  color: var(--green);
  padding: 0;
}
.ascii-badge span {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0;
}
.style-line {
  max-width: 680px;
  margin: 0 auto 28px;
  color: #a6abb7;
  text-align: center;
  font-size: 17px;
  line-height: 1.45;
}
.terminal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.terminal-box {
  min-height: 130px;
  padding: 17px;
  border: 1px solid #1e8b4a;
  border-radius: 8px;
  background: rgba(13, 18, 22, .86);
}
.terminal-box.wide {
  grid-column: 1 / -1;
}
.terminal-box h2 {
  margin: 0 0 12px;
  color: var(--green);
  font-size: 20px;
  line-height: 1;
  letter-spacing: 0;
}
.terminal-box p {
  margin: 7px 0;
  color: #9fa6b3;
  font-size: 16px;
  line-height: 1.35;
}
.terminal-box strong {
  color: #f4f6f2;
  font-size: 24px;
}
.proof-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 54px;
  gap: 12px;
  align-items: center;
  margin: 10px 0;
  color: #aab0ba;
}
.proof-row i {
  height: 16px;
  background: #14221b;
  overflow: hidden;
}
.proof-row b {
  display: block;
  height: 100%;
  background: var(--green);
}
.proof-row strong {
  color: #dfe8df;
  text-align: right;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-top: 26px;
  color: #69717e;
  font-size: 13px;
}
.share-rail {
  display: grid;
  gap: 12px;
  align-content: center;
}
.share-button {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: 28px;
  text-decoration: none;
  font-weight: 850;
  color: #fff;
  cursor: pointer;
}
.share-button.black { background: #020302; }
.share-button.blue { background: var(--blue); }
.share-button.green { background: #29d36a; color: #08200f; }
.share-button.soft { background: var(--soft); color: #39483f; box-shadow: inset 0 0 0 1px #dad8ce; }
.share-note {
  margin: 4px 8px 0;
  color: #7b847d;
  font-size: 12px;
  line-height: 1.4;
}
.below-fold {
  display: grid;
  gap: 18px;
  margin-top: 26px;
}
.panel {
  padding: 24px;
  background: var(--panel);
  border: 1px solid #dedbd0;
}
.section-title {
  margin-bottom: 20px;
}
.eyebrow {
  margin: 0 0 8px;
  color: #1d7f48;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}
h1, h2, h3, p { margin-top: 0; }
.section-title h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.08;
}
.body-copy {
  max-width: 780px;
  color: #607068;
  font-size: 16px;
  line-height: 1.55;
}
.move-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.move {
  padding: 16px;
  background: #f6f5ef;
  border: 1px solid #dedbd0;
}
.move h2 {
  margin-bottom: 8px;
  font-size: 18px;
}
.move p {
  margin: 0;
  color: #65716a;
  line-height: 1.45;
}
.dimension-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.dimension {
  min-height: 142px;
  padding: 15px;
  background: #f6f5ef;
  border: 1px solid #dedbd0;
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
  color: #65716a;
  font-size: 13px;
}
.bar {
  height: 9px;
  overflow: hidden;
  background: #dedbd0;
}
.bar i {
  display: block;
  height: 100%;
  background: #1d7f48;
}
pre {
  white-space: pre-wrap;
  margin: 0;
  padding: 16px;
  background: #101816;
  color: #edf7f2;
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.page-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 0 0;
  color: #77827b;
  font-size: 12px;
}
@media (max-width: 1120px) {
  .wrapped-stage {
    grid-template-columns: minmax(0, 760px);
  }
  .nav-dot { display: none; }
  .share-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .shell { width: min(100% - 18px, 640px); padding-top: 12px; }
  .card-inner { padding: 14px; }
  .card-frame { min-height: 0; padding: 18px; }
  .card-head, .score-zone, .terminal-grid, .move-grid, .dimension-grid {
    grid-template-columns: 1fr;
  }
  .score-zone { text-align: center; }
  .ascii-badge { display: none; }
  .proof-row { grid-template-columns: 90px minmax(0, 1fr) 48px; }
  .share-rail { grid-template-columns: 1fr; }
  .page-footer, .card-footer { flex-direction: column; }
}
`;
}

function script(linkedin) {
  return `
const linkedinPost = ${JSON.stringify(linkedin)};
function copyText(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
  return Promise.resolve();
}
document.querySelector("[data-copy-post]")?.addEventListener("click", async (event) => {
  await copyText(linkedinPost);
  event.currentTarget.textContent = "Copied";
});
document.querySelector("[data-copy-card]")?.addEventListener("click", async (event) => {
  await copyText(document.querySelector("#wrapped-card")?.innerText || "");
  event.currentTarget.textContent = "Card copied";
});
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

function daysBetween(start, end) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function clampPercent(value) {
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
