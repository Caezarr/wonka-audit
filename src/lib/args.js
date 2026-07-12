export function parseArgs(argv) {
  const args = {
    preview: false,
    local: false,
    upload: false,
    includeExamples: false,
    noContent: false,
    metadataOnly: false,
    explainPrivacy: false,
    compare: null,
    aggregate: null,
    share: null,
    shareUrl: null,
    signPrivateKey: null,
    verifySignature: null,
    publicKey: null,
    minCohortSize: 5,
    org: "local",
    team: null,
    period: "baseline",
    runLabel: null,
    trainingDate: null,
    since: null,
    until: null,
    out: null,
    outProvided: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--preview") args.preview = true;
    else if (arg === "--local") args.local = true;
    else if (arg === "--upload") args.upload = true;
    else if (arg === "--compare") args.compare = [argv[++i], argv[++i]].filter(Boolean);
    else if (arg === "--aggregate") args.aggregate = argv[++i] ?? null;
    else if (arg === "--share") args.share = argv[++i] ?? null;
    else if (arg === "--share-url") args.shareUrl = argv[++i] ?? null;
    else if (arg === "--sign-private-key") args.signPrivateKey = argv[++i] ?? null;
    else if (arg === "--verify-signature") args.verifySignature = argv[++i] ?? null;
    else if (arg === "--public-key") args.publicKey = argv[++i] ?? null;
    else if (arg === "--min-cohort-size") args.minCohortSize = Number(argv[++i]);
    else if (arg === "--include-examples") args.includeExamples = true;
    else if (arg === "--no-content") args.noContent = true;
    else if (arg === "--metadata-only") {
      args.metadataOnly = true;
      args.noContent = true;
    }
    else if (arg === "--explain-privacy") args.explainPrivacy = true;
    else if (arg === "--org") args.org = argv[++i] ?? args.org;
    else if (arg === "--team") args.team = argv[++i] ?? null;
    else if (arg === "--period") args.period = argv[++i] ?? args.period;
    else if (arg === "--run-label") args.runLabel = argv[++i] ?? null;
    else if (arg === "--training-date") args.trainingDate = argv[++i] ?? null;
    else if (arg === "--since") args.since = argv[++i] ?? null;
    else if (arg === "--until") args.until = argv[++i] ?? null;
    else if (arg === "--out") {
      args.out = argv[++i] ?? args.out;
      args.outProvided = true;
    }
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

export function printHelp() {
  console.log(`Wonka AI Usage Audit

Usage:
  npx wonka-audit
  npx wonka-audit --preview
  npx wonka-audit --explain-privacy
  npx wonka-audit --out ./wonka-audit
  npx wonka-audit --local --since 2026-06-01 --until 2026-06-30 --out ./wonka-audit
  npx wonka-audit --compare baseline.json checkpoint.json --out ./wonka-audit

Options:
  no arguments           Generate a local PDF on your Desktop
  --preview              Show detected sources without full reporting
  --local                Generate local HTML + PDF + JSON + Markdown report
  --upload               Not implemented; this MVP is local-only
  --explain-privacy      Explain local reads, outputs and network behavior
  --compare <a> <b>      Compare two audit JSON exports
  --aggregate <dir>      Aggregate compatible exports with cohort suppression
  --share <audit.json>   Create an opt-in public microsite from an audit export
  --share-url <url>      Canonical public URL used by LinkedIn/Open Graph
  --sign-private-key <p> Sign the audit manifest with an Ed25519 PEM key
  --verify-signature <p> Verify a manifest signature envelope and exit
  --public-key <path>    Ed25519 PEM public key used for verification
  --min-cohort-size <n>  Privacy threshold for aggregation, default: 5, minimum: 3
  --org <slug>           Client slug, default: local
  --team <slug>          Optional team slug
  --period <label>       Optional report label, default: baseline
  --run-label <label>    Optional folder label for the current run
  --training-date <date> Optional date used to derive a collection window
  --since <date>         Explicit window start
  --until <date>         Explicit window end
  --include-examples     Reserved for redacted examples
  --no-content           Disable local prompt/message text classification
  --metadata-only        Alias for --no-content; do not classify prompt/message text
  --out <path>           Output directory, default: Desktop/Wonka AI Audit
`);
}
