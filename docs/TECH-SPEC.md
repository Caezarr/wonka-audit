# Technical Spec

## CLI

Commande cible :

```bash
npx wonka-ai-audit
```

Options :

```bash
--preview              Affiche ce qui serait collecte, sans lire les contenus longs
--local                Genere un rapport local seulement
--upload               Reserve ; non implemente dans le MVP local
--org <slug>           Identifiant client
--team <slug>          Equipe/departement optionnel
--period <m0|m1|m2|m3> Periode de reporting
--training-date <date> Date ISO de formation
--since <date>         Override debut fenetre
--until <date>         Override fin fenetre
--include-examples     Inclut exemples anonymises/redacted
--no-content           Desactive tout extrait textuel
--explain-privacy      Explique les lectures locales, sorties et comportement reseau
--out <path>           Chemin export JSON/Markdown
```

## Architecture Locale

```text
src/
  cli.ts
  collectors/
    claude-code.ts
    codex.ts
    cursor.ts
    git.ts
  normalize/
    schema.ts
    redact.ts
    classify.ts
  metrics/
    adoption.ts
    usage-quality.ts
    interaction.ts
    impact.ts
    fair-usage.ts
    score.ts
  reports/
    markdown.ts
    json.ts
  upload/              reserve ; pas actif dans le MVP local
    client.ts
```

## Schema Normalise

Tous les collecteurs produisent des `AiSession`.

```ts
type ToolName = "claude_code" | "cursor" | "codex";

type AiSession = {
  session_id_hash: string;
  tool: ToolName;
  user_hash: string | null;
  org_slug: string | null;
  team_slug: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  cwd_hash: string | null;
  project_label_hash: string | null;
  model_names: string[];
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  user_turns: number;
  assistant_turns: number;
  tool_calls: number;
  file_refs_count: number;
  file_ext_counts: Record<string, number>;
  shell_commands_count: number;
  test_commands_count: number;
  validation_commands_count: number;
  git_actions_count: number;
  task_categories: string[];
  prompt_quality: {
    vague_prompts: number;
    contextualized_prompts: number;
    constrained_prompts: number;
    correction_prompts: number;
  };
  outcome: {
    has_verifiable_action: boolean;
    has_test_or_validation: boolean;
    likely_abandoned: boolean;
  };
};
```

## Export Agrege

```ts
type AuditExport = {
  schema_version: "2.0";
  generated_at: string;
  org_slug: string;
  team_slug?: string;
  period: "m0" | "m1" | "m2" | "m3";
  training_date?: string;
  collection_window: {
    start: string;
    end: string;
  };
  privacy: {
    content_uploaded: boolean;
    examples_included: boolean;
    hashing: "sha256_with_org_salt";
    local_content_inspection: boolean;
    raw_content_exported: boolean;
  };
  source_coverage: {
    claude_code: CoverageStatus;
    cursor: CoverageStatus;
    codex: CoverageStatus;
    git: CoverageStatus;
  };
  metrics: MetricsSummary;
  score: ScoreSummary;
  wrapped_summary: WrappedSummary;
  sessions_sample?: RedactedExample[];
};
```

## Recap Wonka Wrapped

Le recap CPO doit exister en PDF sans image obligatoire. Le MVP affiche les signaux disponibles localement :

- conversations ;
- messages ;
- moyenne messages / conversation ;
- outil principal ;
- cas d'usage principal ;
- usage libre vs workflow/agentic ;
- conversation la plus longue ;
- 2-3 conseils personnalises.

Hors scope actuel : Wonka Chat. Le MVP se concentre uniquement sur Claude Code, Codex, Cursor et signaux Git locaux.

## Calibration du score

Modele courant : `local_individual_v3_directional`.

Le score est directionnel et non calibre empiriquement. Les signaux non observables sont `null`, exclus puis les poids disponibles sont renormalises. Chaque export contient les versions de schema, methode et scoring ainsi qu'une `comparability_key`.

Le score est concu comme un indicateur directionnel pour un utilisateur qui lance le CLI sur sa propre machine. Il ne suppose aucun acces admin aux donnees locales des employes.

Seuils lisibles :

- 0 : non detecte ;
- 40 : needs work ;
- 70 : healthy ;
- 90 : strong.

Dimensions :

- `adoption_durable` = regularite locale : jours actifs, volume, couverture outils, nombre de contextes/projets ;
- `usage_metier_reel` = usage de travail reel : projet, fichiers/exemples, contexte, workflow ;
- `qualite_interaction` = qualite de collaboration : contexte, contraintes, baisse des prompts vagues ;
- `impact_verifiable` = preuve : actions, validation, tests/checks, review ;
- `usage_juste` = usage juste : peu de longues boucles, bon ratio validation/action, cache reuse quand disponible.

Le JSON exporte `score.calibration` avec les composants et les leviers prioritaires pour expliquer le score sans boite noire.

## Collecteur Claude Code

Chemins :

```text
~/.claude/projects/*.jsonl
```

Lire :

- `timestamp`
- `sessionId`
- `cwd`
- `version`
- `message.model`
- `message.usage`
- user/assistant messages
- `tool_use`
- inputs de tools contenant `file_path`, `path`, `notebook_path`

Ne pas uploader :

- contenu complet des prompts ;
- outputs assistant ;
- contenu de fichier.

## Collecteur Codex

Chemins :

```text
~/.codex/sessions/**/*.jsonl
```

Lire :

- `session_meta`
- `cwd`
- `model`
- `cli_version`
- `event_msg.info.total_token_usage`
- `response_item` user/assistant
- `function_call`
- `local_shell_call`

Actions detectables :

- commandes shell ;
- appels outils ;
- chemins de fichiers dans arguments ;
- tests/lint/typecheck.

## Collecteur Cursor

Chemins :

macOS :

```text
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
```

Linux :

```text
~/.config/Cursor/User/globalStorage/state.vscdb
```

Windows :

```text
%APPDATA%/Cursor/User/globalStorage/state.vscdb
```

Tables/cles :

- `cursorDiskKV`
- `composerData:%`
- `bubbleId:%`

Lire :

- composer id ;
- timestamps ;
- modele selectionne ;
- user/assistant bubbles ;
- fichiers attaches/references ;
- toolFormer data si present.

## Collecteur Git

Commandes read-only :

```bash
git config user.email
git config user.name
git remote -v
git log --since=<start> --until=<end> --format=...
git diff --name-only <range>
```

Mesures :

- commits apres sessions IA ;
- co-authors IA ;
- fichiers tests/docs ;
- taille des commits ;
- presence de PR si GitHub/GitLab active.

## Redaction

Regles minimales :

- remplacer emails par `email_hash`;
- remplacer chemins home par `~`;
- hasher cwd/projet avec salt client ;
- supprimer secrets par regex : `api_key`, `secret`, `token`, `password`, `authorization`, `bearer`;
- tronquer prompts a des features, pas du texte brut ;
- option `--include-examples` seulement avec exemples courts et redacted.

## Classification MVP

Heuristiques suffisantes pour le premier MVP :

- `testing` : prompt/commande contient test, pytest, jest, vitest, unit, coverage.
- `debugging` : error, stacktrace, bug, failing, traceback, exception.
- `review` : review, PR, diff, critique, security, refactor risk.
- `documentation` : README, doc, explain, changelog, guide.
- `refactor` : refactor, cleanup, simplify, restructure.
- `data_analysis` : csv, dataframe, SQL, analyze, chart.
- `business_writing` : email, proposal, deck, offer, client.
- `planning` : plan, roadmap, spec, architecture.

Plus tard : classifieur local ou LLM cote client avec consentement.

## Partage optionnel

Le MVP ne fournit pas d'API ni de dashboard admin. Un administrateur ne peut pas lire les donnees locales des utilisateurs via `wonka-audit`.

Flux autorise :

- l'utilisateur lance le CLI localement ;
- le PDF/JSON est cree sur sa machine ;
- l'utilisateur ou le client partage volontairement le fichier si le cadre de consentement le prevoit ;
- Wonka peut comparer deux exports fournis volontairement avec `--compare`.

Tout upload automatique reste hors scope.

## Rapport

Sorties MVP :

```bash
wonka-ai-audit-report.json
wonka-ai-audit-report.md
```

Sections Markdown :

1. Executive summary.
2. Score global.
3. Evolution vs baseline.
4. Adoption.
5. Usage metier.
6. Qualite d'interaction.
7. Impact verifiable.
8. Usage juste.
9. Recommandations M+1/M+2/M+3.

## Stop Rules

Le CLI doit refuser ou demander confirmation si :

- upload demande sans consentement explicite ;
- exemples textuels actives sans `--include-examples`;
- aucune source locale detectee ;
- fenetre de collecte incoherente ;
- payload contient des patterns de secrets apres redaction.
