import { buildWrappedRecap, pct } from "./wrapped.js";
import { renderLinkedInPost } from "./linkedin.js";

export function buildPublicSharePayload(audit) {
  const wrapped = buildWrappedRecap(audit);
  return {
    share_schema_version: "1.0",
    generated_at: audit.generated_at,
    period: {
      start: audit.collection_window.start.slice(0, 10),
      end: audit.collection_window.end.slice(0, 10)
    },
    score: audit.score.ai_practice_score,
    score_status: audit.score.status || "directional_uncalibrated",
    confidence: audit.score.confidence || "low",
    profile: wrapped.profile.name,
    headline: wrapped.headline,
    top_use_case: wrapped.top_use_case,
    signals: {
      context: audit.metrics.interaction_quality?.contextualized_prompt_rate ?? null,
      workflow: audit.metrics.business_usage?.advanced_workflow_rate ?? null,
      validation: audit.metrics.verifiable_impact?.validation_rate ?? null
    },
    next_move: wrapped.next_moves[0] || null,
    disclosure: "Directional, uncalibrated coaching indicator. No prompts, code, secrets, raw conversations, local paths, organization, team or participant identifier included."
  };
}

export function renderPublicSharePage(audit, { shareUrl = "" } = {}) {
  const p = buildPublicSharePayload(audit);
  const post = renderLinkedInPost(audit);
  const canonical = safeHttpUrl(shareUrl);
  const linkedInUrl = canonical
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`
    : "https://www.linkedin.com/feed/";
  const imageUrl = canonical ? shareAssetUrl(canonical) : "share-card.svg";
  const title = `${p.profile} · AI Practice ${p.score}/100`;
  const description = `${p.headline} Directional local audit, shared by explicit choice.`;

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
          <p class="kicker">AI practice receipt · ${esc(p.confidence)} confidence</p>
          <h1 id="share-title">${esc(p.profile)}</h1>
          <p class="headline">${esc(p.headline)}</p>
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

        <div class="next">
          <span>NEXT PRACTICE</span>
          <strong>${esc(p.next_move?.title || "Keep measuring")}</strong>
          <p>${esc(p.next_move?.body || "Run the same local audit on a comparable window.")}</p>
        </div>

        <footer>
          <span>Top use case · ${esc(p.top_use_case)}</span>
          <span>wonka-ai.com</span>
        </footer>
      </section>
    </article>

    <section class="actions" aria-label="Share this recap">
      <button type="button" data-copy aria-live="polite">Copy LinkedIn post</button>
      <a href="${esc(linkedInUrl)}" target="_blank" rel="noreferrer">Share on LinkedIn ↗</a>
      <a href="share-card.svg" download>Download card</a>
    </section>

    <p class="privacy">${esc(p.disclosure)}</p>
  </main>
  <script>
    const post = ${safeJson(post)};
    document.querySelector('[data-copy]').addEventListener('click', (event) => {
      try {
        fallbackCopy(post);
        event.currentTarget.textContent = 'Copied';
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
.ticket { margin:clamp(34px,7vw,86px) auto 28px; display:grid; grid-template-columns:72px 1fr; max-width:900px; background:#f8f5ed; border:2px solid var(--ink); box-shadow:14px 14px 0 var(--blue); transform:rotate(-.45deg); }
.ticket-stub { padding:22px 0; border-right:2px dashed var(--ink); display:flex; flex-direction:column; align-items:center; justify-content:space-between; background:var(--mint); font:900 10px/1 monospace; letter-spacing:.12em; }
.ticket-stub span { writing-mode:vertical-rl; transform:rotate(180deg); }
.ticket-body { padding:clamp(24px,5vw,58px); }
.kicker { margin:0 0 12px; color:var(--blue); font:900 12px/1 monospace; letter-spacing:.09em; text-transform:uppercase; }
h1 { max-width:760px; margin:0; font-family:Georgia, "Times New Roman", serif; font-size:clamp(56px,10vw,118px); font-weight:400; line-height:.82; letter-spacing:-.075em; }
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
.next { margin-top:32px; display:grid; grid-template-columns:130px 1fr; gap:8px 24px; align-items:start; }
.next span { grid-row:span 2; color:var(--red); font:900 11px/1 monospace; letter-spacing:.08em; }
.next strong { font:700 24px/1 Georgia,serif; }
.next p { margin:0; line-height:1.45; }
.ticket footer { margin-top:42px; padding-top:14px; border-top:1px solid var(--line); display:flex; justify-content:space-between; font:800 11px/1 monospace; text-transform:uppercase; }
.actions { max-width:900px; margin:36px auto 0; display:flex; flex-wrap:wrap; gap:10px; }
.actions a,.actions button { border:2px solid var(--ink); padding:14px 18px; color:var(--ink); background:transparent; font:800 13px/1 monospace; text-decoration:none; cursor:pointer; }
.actions button { background:var(--ink); color:white; }
.actions a:hover,.actions button:hover { transform:translate(-2px,-2px); box-shadow:4px 4px 0 var(--red); }
.actions :focus-visible { outline:4px solid var(--blue); outline-offset:3px; }
.privacy { max-width:900px; margin:24px auto 0; color:#5e5b54; font:12px/1.5 monospace; }
@media (max-width:680px) { main{width:min(100% - 20px,1040px)} nav{font-size:9px;letter-spacing:.07em} nav span{white-space:nowrap}.ticket{grid-template-columns:42px 1fr;box-shadow:7px 7px 0 var(--blue)} .ticket-body{padding:22px 16px} .score-row{align-items:flex-start;flex-direction:column} .signals{grid-template-columns:1fr}.signals>div+div{border-left:1px solid var(--ink);border-top:0}.next{grid-template-columns:1fr}.next span{grid-row:auto}.ticket footer{gap:14px;align-items:flex-start;flex-direction:column} }
@media (prefers-reduced-motion:reduce) { *{scroll-behavior:auto!important;transition:none!important} }
`;
}
