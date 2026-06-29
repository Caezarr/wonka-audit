# Wonka AI Usage Audit

## Objectif

Mesurer l'usage reel de l'IA avant les formations Wonka, puis verifier l'amelioration apres les workshops.

Le produit commence par une baseline pre-formation. Cette baseline sert a calibrer les formations sur les usages reels des personnes en face de nous : outils utilises, types de demandes, niveau de contexte, reflexes de verification, usages libres vs workflows plus avances.

Il ne cherche pas a montrer que les equipes consomment plus de tokens. Il cherche a prouver qu'elles utilisent mieux Claude, Cursor et Codex :

- plus de cas d'usage metier reels ;
- plus de contexte fourni a l'IA ;
- plus d'actions verifiables ;
- moins de conversations vagues ou abandonnees ;
- meilleur choix d'outil/modele selon la tache.

## Positionnement

> Wonka ne vend pas seulement une formation IA. Wonka mesure le niveau de depart, adapte la formation aux usages reels, puis prouve si les equipes deviennent vraiment meilleures avec l'IA.

Livrable client :

- baseline pre-formation avant ou au moment de la formation ;
- recap "Wonka Wrapped" sans image obligatoire : conversations, messages, top outil, top usage, usage libre vs workflow, conseils ;
- nouvelle mesure 3 mois apres les workshops ;
- recap employes en une page ;
- actions concretes en une page ;
- incitation aux workshops Wonka quand l'usage reste fragile ;
- restitution sponsor avec progression et recommandations de coaching ciblees.

## Produit

Nom de travail :

- Wonka AI Usage Audit
- Wonka AI Practice Review
- AI Enablement Score

Commande cible :

```bash
npx wonka-audit
```

Le CLI scanne localement les traces de Claude Code, Cursor et Codex, anonymise les donnees, calcule des KPI, puis cree un PDF sur le Bureau. Un admin ne peut pas lire les donnees locales des utilisateurs via ce CLI. Le partage du PDF/JSON doit rester volontaire. Le premier usage recommande est pre-formation : comprendre les habitudes actuelles avant de construire l'atelier.

## Usage client via npx

Le parcours client minimal :

```bash
npx wonka-audit
```

Le client obtient :

- macOS / Windows / Linux : un dossier `Wonka AI Audit` sur le Bureau quand le dossier Desktop existe.
- PDF principal : `wonka-ai-usage-audit.pdf`
- Export technique : `wonka-ai-audit-report.json`
- Export lisible : `wonka-ai-audit-report.md`

Le PDF est le livrable principal pour l'utilisateur. Le JSON peut etre transmis a Wonka si le client veut une restitution consolidee ou une comparaison apres formation.

Communication client recommandee :

```text
Run this command from your terminal:

npx wonka-audit

The audit runs locally on your computer. It does not upload prompts, source code,
secrets or raw conversations. It creates a PDF in a "Wonka AI Audit" folder on
your Desktop.

Website: https://wonka-ai.com
Terms: https://wonka-ai.com/cgv
```

Pour une fenetre precise :

```bash
npx wonka-audit --since 2026-06-01 --until 2026-06-30
```

Pour choisir un dossier de sortie :

```bash
npx wonka-audit --out ./wonka-audit
```

## Cadence de mesure

Le dispositif client commence par une baseline pre-formation maintenant, puis relance le meme audit 3 mois apres les formations/workshops.

Comparaison principale :

```text
post-training 90-day checkpoint vs pre-training baseline
```

## Score

Score final sur 100 :

```text
AI Practice Score =
  adoption_durable       20 pts
+ usage_metier_reel      25 pts
+ qualite_interaction    20 pts
+ impact_verifiable      25 pts
+ usage_juste            10 pts
```

Ce score doit toujours etre decomposable. Pas de boite noire.

## Sources

Claude Code :

- `~/.claude/projects/*.jsonl`
- sessions, prompts, tool use, fichiers, cwd, modeles, tokens si presents.

Codex :

- `~/.codex/sessions/**/*.jsonl`
- sessions, cwd, shell calls, tool calls, fichiers, usage tokens si present.

Cursor :

- base locale `state.vscdb`
- composer sessions, messages, fichiers attaches, modeles.

Git local :

- commits depuis la formation ;
- co-authors IA ;
- fichiers modifies ;
- tests/docs ajoutes ;
- PR/review si integration GitHub/GitLab disponible.

## Principes de confidentialite

Par defaut, le CLI ne doit jamais uploader de contenu brut :

- pas de prompt complet ;
- pas de code source ;
- pas de chemin absolu complet ;
- pas de secret/env/token ;
- pas de message assistant complet.

Il envoie seulement :

- metriques numeriques ;
- categories de taches ;
- fingerprints anonymises ;
- extraits courts rediges localement si explicitement actives ;
- exemples anonymises et redacted.

## Premier MVP

1. CLI local TypeScript.
2. Scan Claude Code + Codex + Cursor.
3. Export JSON agrege.
4. Calcul KPI de baseline actuelle.
5. Rapport Markdown et PDF employes avec recap type Wrapped sans image obligatoire.
6. Upload API Wonka optionnel.

## Etat actuel du prototype

Un MVP local sans dependance npm est disponible dans ce dossier.

Commandes :

```bash
npm run preview
npm run audit:local
npm run report:client
npm run go-live:check
node src/cli.js --local --org acme --team engineering --out ./out
```

Ce qui fonctionne :

- detection et aggregation Claude Code ;
- detection et aggregation Codex ;
- detection et aggregation Cursor via `sqlite3` local ;
- detection Git locale basique ;
- export JSON anonymise ;
- rapport Markdown ;
- rapport PDF employes brand Wonka : couverture, one page recap, one page actions ;
- score AI Practice Score.
- readiness baseline pre-formation maintenant puis checkpoint post-formation a 3 mois.
- checklist go-live dans `GO-LIVE.md`.
- verification go-live automatisee avec `npm run go-live:check`.

Limites actuelles :

- Cursor est parse en mode agrege safe : le CLI n'extrait pas les blobs complets ni les chemins de fichiers ;
- pas d'upload API Wonka ; le partage reste manuel/volontaire ;
- comparaison 3-month checkpoint vs baseline encore manuelle via exports JSON.

## Go live client

Voir `GO-LIVE.md`.

Le lancement client doit inclure :

- un message de transparence aux employes ;
- une baseline actuelle ;
- une nouvelle mesure 3 mois apres les formations/workshops ;
- un PDF oriente employes ;
- une invitation aux workshops si le score est sous 60/100, si la validation est faible, ou si les prompts vagues restent eleves.

Commande de readiness :

```bash
npm run go-live:check
```

## Valeur commerciale

La baseline pre-formation rend les workshops plus precis. Le checkpoint a 3 mois devient ensuite une preuve de transformation :

> Apres la formation, les equipes ne font pas seulement plus d'IA. Elles font plus de travail utile avec l'IA, avec moins de frictions et plus de verification.
