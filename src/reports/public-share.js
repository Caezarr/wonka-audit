import { buildWrappedRecap, label, pct } from "./wrapped.js";
import { renderLinkedInPost } from "./linkedin.js";

export function buildPublicSharePayload(audit) {
  const wrapped = buildWrappedRecap(audit);
  const m = audit.metrics;
  const topUseCases = (m.business_usage?.top_task_categories || []).slice(0, 3).map((item) => ({
    label: label(item.category),
    share: item.share
  }));
  const signals = {
    context: m.interaction_quality?.contextualized_prompt_rate ?? null,
    workflow: m.business_usage?.advanced_workflow_rate ?? null,
    validation: m.verifiable_impact?.validation_rate ?? null
  };
  return {
    share_schema_version: "1.1",
    generated_at: audit.generated_at,
    period: {
      start: audit.collection_window.start.slice(0, 10),
      end: audit.collection_window.end.slice(0, 10)
    },
    score: audit.score.ai_practice_score,
    score_status: audit.score.status || "directional_uncalibrated",
    confidence: audit.score.confidence || "low",
    profile: wrapped.profile.name,
    diagnosis: buildDiagnosis(audit, wrapped, signals, topUseCases),
    top_use_case: wrapped.top_use_case,
    usage: {
      conversations: m.wrapped_summary?.conversations || 0,
      active_days: m.adoption?.active_days || 0,
      primary_tool: wrapped.top_tool,
      top_use_cases: topUseCases,
      free_chat_rate: m.wrapped_summary?.free_chat_rate ?? null
    },
    signals,
    next_moves: wrapped.next_moves.slice(0, 3),
    disclosure: "Directional, uncalibrated coaching indicator. No prompts, code, secrets, raw conversations, local paths, organization, team or participant identifier included."
  };
}

export function renderPublicSharePage(audit, { shareUrl = "" } = {}) {
  const p = buildPublicSharePayload(audit);
  const post = renderLinkedInPost(audit);
  const canonical = safeHttpUrl(shareUrl);
  const linkedInUrl = canonical
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`
    : "https://www.linkedin.com/feed/?shareActive=true";
  const imageUrl = canonical ? shareAssetUrl(canonical) : "share-card.svg";
  const title = `${p.diagnosis.title} · AI Practice ${p.score}/100`;
  const description = `${p.diagnosis.body} Directional local audit, shared by explicit choice.`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
  <meta name="robots" content="noindex, nofollow">
  <title>${esc(title)}</title>
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
  <meta name="description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(imageUrl)}">
  ${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(imageUrl)}">
  <style>${css()}</style>
</head>
<body>
  <main>
    <nav aria-label="Report context">
      <a href="https://wonka-ai.com">WONKA / PRACTICE AUDIT</a>
      <span>${esc(p.period.start)} → ${esc(p.period.end)}</span>
    </nav>

    <article class="ticket" aria-labelledby="share-title">
      <div class="ticket-stub" aria-hidden="true">
        <span>LOCAL</span><span>OPT-IN</span><span>PUBLIC CUT</span>
      </div>
      <section class="ticket-body">
        <header>
          <p class="kicker">${esc(p.profile)} · ${esc(p.confidence)} confidence</p>
          <h1 id="share-title">${esc(p.diagnosis.title)}</h1>
          <p class="headline">${esc(p.diagnosis.body)}</p>
        </header>

        <div class="score-row">
          <div class="score"><strong>${esc(p.score)}</strong><span>/100<br>directional</span></div>
          <p>Not a productivity grade.<br>Not an employee ranking.<br>A starting point for better habits.</p>
        </div>

        <dl class="signals">
          ${signal("Context", p.signals.context)}
          ${signal("Workflow", p.signals.workflow)}
          ${signal("Proof", p.signals.validation)}
        </dl>

        <section class="fingerprint" aria-label="Your usage fingerprint">
          ${fact("Conversations", p.usage.conversations)}
          ${fact("Active days", p.usage.active_days)}
          ${fact("Primary tool", p.usage.primary_tool)}
          ${fact("Main use", p.top_use_case)}
        </section>

        <section class="use-cases">
          <div class="section-label">WHAT YOU ACTUALLY USE AI FOR</div>
          ${p.usage.top_use_cases.length ? `<ol>${p.usage.top_use_cases.map(useCaseRow).join("")}</ol>` : `<p>No stable use-case mix was observable yet.</p>`}
          ${p.usage.top_use_cases.length ? `<p class="overlap-note">Share of conversations carrying each signal. A conversation can contain several uses.</p>` : ""}
        </section>

        <section class="contrast">
          <article><span>STRONGEST SIGNAL</span><strong>${esc(p.diagnosis.strongest.label)}</strong><p>${esc(p.diagnosis.strongest.explanation)}</p></article>
          <article><span>CLEAREST GAP</span><strong>${esc(p.diagnosis.weakest.label)}</strong><p>${esc(p.diagnosis.weakest.explanation)}</p></article>
        </section>

        <section class="moves">
          <div class="section-label">THREE PRACTICES TO TRY NEXT</div>
          ${p.next_moves.map((move, index) => `<article><span>0${index + 1}</span><div><strong>${esc(move.title)}</strong><p>${esc(move.body)}</p></div></article>`).join("")}
        </section>

        <footer>
          <span>Top use case · ${esc(p.top_use_case)}</span>
          <span>wonka-ai.com</span>
        </footer>
      </section>
    </article>

    <section class="actions" aria-label="Share this recap">
      <button type="button" data-linkedin aria-live="polite">Copy post & open LinkedIn ↗</button>
      <a href="share-card.svg" download>Download card</a>
      <p class="share-help">LinkedIn blocks pre-filled post text. The button copies your complete draft, opens the composer, then you paste.</p>
    </section>

    <details class="post-preview"><summary>Preview the copied LinkedIn post</summary><pre>${esc(post)}</pre></details>

    <p class="privacy">${esc(p.disclosure)}</p>
  </main>
  <script>
    const post = ${safeJson(post)};
    const linkedInUrl = ${safeJson(linkedInUrl)};
    document.querySelector('[data-linkedin]').addEventListener('click', (event) => {
      try {
        fallbackCopy(post);
        const popup = window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
        event.currentTarget.textContent = popup ? 'Copied — paste in LinkedIn' : 'Copied — open LinkedIn manually';
      } catch {
        event.currentTarget.textContent = 'Copy unavailable';
      }
    });
    function fallbackCopy(value) {
          const area = document.createElement('textarea');
          area.value = value;
          area.style.position = 'fixed'; area.style.opacity = '0';
          document.body.appendChild(area); area.select();
          const copied = document.execCommand('copy'); area.remove();
          if (!copied) throw new Error('copy failed');
    }
  </script>
</body>
</html>`;
}

function signal(label, value) {
  const display = value === null ? "n/a" : pct(value);
  const width = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value * 100)));
  return `<div><dt>${esc(label)}</dt><dd><span>${esc(display)}</span><i><b style="width:${width}%"></b></i></dd></div>`;
}

function fact(labelText, value) {
  return `<div><span>${esc(labelText)}</span><strong>${esc(value ?? "n/a")}</strong></div>`;
}

function useCaseRow(item) {
  const width = Math.max(0, Math.min(100, Math.round((item.share || 0) * 100)));
  return `<li><span>${esc(item.label)}</span><i><b style="width:${width}%"></b></i><strong>${esc(pct(item.share))}</strong></li>`;
}

function buildDiagnosis(audit, wrapped, signals, topUseCases) {
  const conversations = audit.metrics.wrapped_summary?.conversations || 0;
  const activeDays = audit.metrics.adoption?.active_days || 0;
  const ranked = [
    signalReading("Context", signals.context, "Your prompts carry goals, constraints and useful work context.", "Prompts often lack enough goal, constraint or reference material."),
    signalReading("Workflow", signals.workflow, "You regularly move beyond chat into files, tools and multi-step work.", "Much of the usage stays conversational instead of becoming a concrete workflow."),
    signalReading("Proof", signals.validation, "You frequently close AI work with tests, checks or review evidence.", "AI work is rarely closed with an observable test, check or review step.")
  ].filter((item) => item.value !== null).sort((a, b) => b.value - a.value);
  const strongest = ranked[0] || signalReading("Coverage", null, "", "This signal was not observable.");
  const weakest = ranked[ranked.length - 1] || strongest;

  let title = "Your AI practice has one clear next edge.";
  if (conversations < 10) title = "Your signal is early. More usage will make the pattern clearer.";
  else if (signals.validation !== null && signals.workflow !== null && signals.workflow - signals.validation >= 0.2) title = "You build with AI more often than you verify it.";
  else if (signals.context !== null && signals.workflow !== null && signals.context - signals.workflow >= 0.2) title = "Your prompts are clear, but the work stays conversational.";
  else if ((signals.workflow || 0) >= 0.55 && (signals.validation || 0) >= 0.35) title = "Your AI use already behaves like a working system.";
  else if ((signals.context || 0) >= 0.55) title = "Context is your advantage. Proof is the next multiplier.";

  const uses = topUseCases.slice(0, 2).map((item) => item.label).join(" and ") || wrapped.top_use_case;
  const body = `${conversations} conversations across ${activeDays} active days, led by ${wrapped.top_tool}. Your detected work clusters around ${uses}.`;
  return { title, body, strongest, weakest };
}

function signalReading(labelText, value, strongExplanation, weakExplanation) {
  return {
    label: value === null ? `${labelText}: n/a` : `${labelText}: ${pct(value)}`,
    value,
    explanation: value !== null && value >= 0.5 ? strongExplanation : weakExplanation
  };
}

function safeHttpUrl(value) {
  if (!value) return "";
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("--share-url must use http or https");
  return url.href;
}

function shareAssetUrl(canonical) {
  const url = new URL(canonical);
  if (!url.pathname.endsWith("/") && !url.pathname.endsWith(".html")) url.pathname += "/";
  return new URL("share-card.svg", url).href;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function css() {
  return `
:root { --paper:#e9e4d9; --ink:#121317; --blue:#304ffe; --red:#ff4f32; --mint:#a8f0c6; --line:#aaa497; }
* { box-sizing:border-box; }
body { margin:0; color:var(--ink); background:var(--paper); font-family:"Arial Narrow", "Helvetica Neue", Arial, sans-serif; }
body::before { content:""; position:fixed; inset:0; pointer-events:none; opacity:.22; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E"); }
main { width:min(1040px, calc(100% - 32px)); margin:auto; padding:28px 0 44px; }
nav { display:flex; justify-content:space-between; gap:16px; padding-bottom:18px; border-bottom:2px solid var(--ink); font:800 12px/1 monospace; letter-spacing:.12em; }
nav a { color:inherit; text-decoration:none; }
.ticket { width:100%; margin:clamp(34px,7vw,86px) auto 28px; display:grid; grid-template-columns:72px minmax(0,1fr); max-width:900px; background:#f8f5ed; border:2px solid var(--ink); box-shadow:14px 14px 0 var(--blue); transform:rotate(-.45deg); }
.ticket-stub { padding:22px 0; border-right:2px dashed var(--ink); display:flex; flex-direction:column; align-items:center; justify-content:space-between; background:var(--mint); font:900 10px/1 monospace; letter-spacing:.12em; }
.ticket-stub span { writing-mode:vertical-rl; transform:rotate(180deg); }
.ticket-body { min-width:0; padding:clamp(24px,5vw,58px); }
.kicker { margin:0 0 12px; color:var(--blue); font:900 12px/1 monospace; letter-spacing:.09em; text-transform:uppercase; }
h1 { max-width:760px; margin:0; font-family:Georgia, "Times New Roman", serif; font-size:clamp(48px,7vw,84px); font-weight:400; line-height:.9; letter-spacing:-.055em; }
.headline { max-width:680px; margin:28px 0 0; font-size:clamp(20px,3vw,30px); line-height:1.08; }
.score-row { margin:48px 0 34px; padding:24px 0; border-block:2px solid var(--ink); display:flex; align-items:flex-end; justify-content:space-between; gap:24px; }
.score { display:flex; align-items:flex-end; gap:12px; }
.score strong { color:var(--red); font:900 clamp(72px,14vw,154px)/.68 Georgia,serif; letter-spacing:-.08em; }
.score span,.score-row>p { margin:0; font:800 12px/1.35 monospace; text-transform:uppercase; }
.signals { display:grid; grid-template-columns:repeat(3,1fr); margin:0; }
.signals>div { padding:18px; border:1px solid var(--ink); }
.signals>div+div { border-left:0; }
dt { font:900 12px/1 monospace; text-transform:uppercase; letter-spacing:.08em; }
dd { margin:28px 0 0; display:grid; gap:8px; }
dd span { font:900 32px/1 Georgia,serif; }
dd i { height:8px; background:#d8d2c7; }
dd b { display:block; height:100%; background:var(--blue); }
.fingerprint { margin-top:28px; display:grid; grid-template-columns:repeat(4,1fr); border-block:2px solid var(--ink); }
.fingerprint div { padding:16px 12px; border-right:1px solid var(--line); }
.fingerprint div:last-child { border-right:0; }
.fingerprint span,.section-label { display:block; color:#5e5b54; font:900 10px/1.2 monospace; letter-spacing:.08em; text-transform:uppercase; }
.fingerprint strong { display:block; margin-top:9px; font:700 20px/1.1 Georgia,serif; }
.use-cases,.moves { margin-top:36px; }
.use-cases ol { margin:16px 0 0; padding:0; list-style:none; border-top:1px solid var(--ink); }
.use-cases li { display:grid; grid-template-columns:minmax(120px,1fr) 2fr 54px; align-items:center; gap:14px; padding:13px 0; border-bottom:1px solid var(--line); }
.use-cases li span { font-weight:700; }
.use-cases li i { height:8px; background:#d8d2c7; }
.use-cases li b { display:block; height:100%; background:var(--blue); }
.use-cases li strong { text-align:right; font:900 13px/1 monospace; }
.overlap-note { margin:10px 0 0; color:#5e5b54; font:11px/1.45 monospace; }
.contrast { margin-top:36px; display:grid; grid-template-columns:1fr 1fr; border:2px solid var(--ink); }
.contrast article { padding:22px; }
.contrast article+article { border-left:2px solid var(--ink); background:#fff0e9; }
.contrast span { color:var(--blue); font:900 10px/1 monospace; letter-spacing:.08em; }
.contrast strong { display:block; margin-top:14px; font:700 26px/1 Georgia,serif; }
.contrast p { margin:10px 0 0; line-height:1.4; }
.moves article { display:grid; grid-template-columns:48px 1fr; gap:14px; padding:18px 0; border-bottom:1px solid var(--line); }
.moves article>span { color:var(--red); font:900 20px/1 Georgia,serif; }
.moves strong { font:700 20px/1 Georgia,serif; }
.moves p { margin:6px 0 0; line-height:1.4; }
.ticket footer { margin-top:42px; padding-top:14px; border-top:1px solid var(--line); display:flex; justify-content:space-between; font:800 11px/1 monospace; text-transform:uppercase; }
.actions { max-width:900px; margin:36px auto 0; display:flex; flex-wrap:wrap; gap:10px; }
.actions a,.actions button { border:2px solid var(--ink); padding:14px 18px; color:var(--ink); background:transparent; font:800 13px/1 monospace; text-decoration:none; cursor:pointer; }
.actions button { background:var(--ink); color:white; }
.actions a:hover,.actions button:hover { transform:translate(-2px,-2px); box-shadow:4px 4px 0 var(--red); }
.actions :focus-visible { outline:4px solid var(--blue); outline-offset:3px; }
.share-help { flex-basis:100%; margin:4px 0 0; color:#5e5b54; font:12px/1.5 monospace; }
.post-preview { max-width:900px; margin:18px auto 0; border-top:1px solid var(--line); padding-top:14px; }
.post-preview summary { cursor:pointer; font:800 12px/1 monospace; }
.post-preview pre { white-space:pre-wrap; padding:18px; background:#f8f5ed; border:1px solid var(--line); font:12px/1.55 monospace; }
.privacy { max-width:900px; margin:24px auto 0; color:#5e5b54; font:12px/1.5 monospace; }
@media (max-width:680px) { main{width:min(100% - 20px,1040px)} nav{font-size:9px;letter-spacing:.07em} nav span{white-space:nowrap}.ticket{grid-template-columns:42px minmax(0,1fr);box-shadow:7px 7px 0 var(--blue);transform:none}.ticket-body{min-width:0;padding:22px 16px}h1{font-size:clamp(36px,12vw,52px);line-height:.94;overflow-wrap:anywhere}.headline{font-size:18px;line-height:1.2}.score-row{align-items:flex-start;flex-direction:column}.score strong{font-size:88px}.signals{grid-template-columns:1fr}.signals>div+div{border-left:1px solid var(--ink);border-top:0}.fingerprint{grid-template-columns:1fr 1fr}.fingerprint div:nth-child(2){border-right:0}.fingerprint strong{font-size:17px;overflow-wrap:anywhere}.contrast{grid-template-columns:1fr}.contrast article+article{border-left:0;border-top:2px solid var(--ink)}.use-cases li{grid-template-columns:1fr 60px}.use-cases li i{display:none}.ticket footer{gap:14px;align-items:flex-start;flex-direction:column}.actions a,.actions button{width:100%;text-align:center} }
@media (prefers-reduced-motion:reduce) { *{scroll-behavior:auto!important;transition:none!important} }
`;
}
