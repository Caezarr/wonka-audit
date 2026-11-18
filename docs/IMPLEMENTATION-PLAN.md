# Implementation Plan

## MVP 0 - Spec vendable

Statut : pret dans ce dossier.

Livrables :

- `README.md` : positionnement produit.
- `KPI-SPEC.md` : definitions KPI.
- `TECH-SPEC.md` : architecture CLI/pipeline.
- `REPORT-TEMPLATE.md` : structure rapport client.
- `sample-export.json` : exemple de payload anonymise.

## MVP 1 - CLI local

Statut : prototype fonctionnel.

Objectif : generer un rapport local sans upload pour une baseline pre-formation puis une re-mesure post-formation.

Scope :

- TypeScript CLI `wonka-ai-audit`.
- Collecteurs Claude Code, Codex, Cursor.
- Redaction/anonymisation locale.
- Calcul KPI sur une fenetre donnee.
- Export `JSON` + `Markdown`.

Commande :

```bash
npx wonka-ai-audit --local --training-date 2026-06-01 --period m1
```

Definition of done :

- fonctionne sur macOS ;
- aucune donnee brute dans l'export par defaut ;
- detecte au moins Claude Code et Codex ;
- Cursor parse via `sqlite3` local en mode agrege safe ;
- rapport lisible en moins de 2 minutes.

## MVP 2 - Baseline + comparaison

Statut : prototype fonctionnel pour comparer deux exports JSON.

Objectif : comparer la baseline pre-formation et un checkpoint post-formation.

Scope :

- stockage local des exports precedents ;
- comparaison automatique `m1 vs m0` ;
- deltas de score ;
- recommandations simples par regles.

Commande :

```bash
npx wonka-ai-audit --compare m0.json m1.json --out report.md
```

Definition of done :

- tableau comparatif ;
- score global + dimensions ;
- 3 recommandations actionnables.

## MVP 3 - Partage volontaire des exports

Objectif : permettre a un utilisateur de partager volontairement son JSON/PDF si le client et Wonka le demandent.

Scope :

- pas d'acces admin aux machines locales ;
- pas de collecte silencieuse ;
- instructions de partage manuel du PDF/JSON ;
- validation schema locale avant partage ;
- message clair de consentement.

Commande :

```bash
npx wonka-ai-audit --local --org acme --period baseline
```

Definition of done :

- aucun upload automatique ;
- validation schema ;
- rejet si secret detecte dans un export volontaire ;
- guide client pour collecter les exports avec consentement.

## MVP 4 - Rapport client PDF

Objectif : livrable commercial pre-formation puis M+1/M+2/M+3.

Scope :

- rendu PDF brand Wonka ;
- executive summary ;
- recap type "Wonka Wrapped" en PDF sans image obligatoire : conversations, messages, outil principal, usage libre vs workflow, top cas d'usage, 2-3 conseils ;
- KPI et evolution ;
- recommandations ;
- annexe privacy.

Definition of done :

- PDF envoyable a un client ;
- generation depuis exports JSON ;
- pas de donnees sensibles.

## Questions a trancher

1. Est-ce que chaque personne lance le CLI elle-meme ou via un script IT qui reste local ?
2. Est-ce que Wonka demande seulement le PDF employe ou aussi le JSON volontaire ?
3. Comment le client recueille le consentement si les exports sont partages ?
4. Quelle granularite commerciale : rapport inclus dans formation ou upsell mensuel ?
5. Quel nom produit final ?

## Recommandation

Commencer par MVP 1 + rapport local pre-formation. Cela permet de tester chez Wonka en interne, d'ajuster les workshops sur les vrais usages, puis de vendre la re-mesure post-formation.
