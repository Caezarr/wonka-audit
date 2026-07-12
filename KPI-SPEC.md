# KPI Spec

## 1. Regularite d'usage locale

Objectif : verifier si l'utilisateur a assez de traces locales Claude Code, Codex et Cursor pour produire une baseline utile.

Important : le CLI ne permet pas a un admin de lire les donnees locales des utilisateurs. Chaque utilisateur lance l'audit localement et garde son PDF/JSON, sauf partage volontaire.

### KPI

| KPI | Definition | Bon signal |
| --- | --- | --- |
| `total_sessions` | conversations IA detectees localement | assez de volume pour lire les habitudes |
| `active_days` | jours avec au moins une session IA | usage regulier |
| `active_project_count` | contextes/projets detectes | usage ancre dans plusieurs travaux |
| `source_mix` | repartition Claude Code / Codex / Cursor | couverture multi-outils |

### Interpretation

Mauvais signal : tres peu de sessions, un seul outil, aucune trace de projet.

Bon signal : plusieurs jours actifs, plusieurs contextes, et au moins deux outils detectes.

## 2. Usage Metier Reel

Objectif : distinguer un usage gadget d'un usage attache a des taches de travail.

### KPI

| KPI | Definition | Bon signal |
| --- | --- | --- |
| `project_bound_session_rate` | sessions avec cwd/repo/projet detecte | usage concret |
| `file_context_rate` | sessions avec fichiers attaches ou lus | contexte reel |
| `repo_context_rate` | sessions dans un repo git | usage dev concret |
| `business_context_rate` | prompts contenant contexte metier, client, process, donnees | meilleure qualite |
| `task_category_mix` | repartition debug/code/review/doc/tests/data/research | maturite des usages |
| `advanced_workflow_rate` | sessions avec outils, multi-fichiers, tests, agents ou terminal | usage avance |
| `template_or_playbook_rate` | prompts suivant des workflows appris en formation | transfert pedagogique |

### Categories de taches

Classification locale par heuristiques au MVP :

- `code_generation`
- `debugging`
- `code_review`
- `refactor`
- `testing`
- `documentation`
- `data_analysis`
- `research`
- `business_writing`
- `planning`
- `prompting_help`
- `other`

## 3. Qualite d'Interaction

Objectif : mesurer si les utilisateurs apprennent a mieux collaborer avec l'IA.

### KPI

| KPI | Definition | Bon signal |
| --- | --- | --- |
| `vague_prompt_rate` | prompts courts sans contexte, objectif ni contrainte | baisse |
| `contextualized_prompt_rate` | prompts avec objectif + contexte + contrainte | hausse |
| `constraint_rate` | prompts mentionnant format, critere, audience, limite | hausse |
| `iteration_count_avg` | tours moyens par session | doit baisser ou rester utile |
| `correction_rate` | prompts contenant "non", "wrong", "not that", "revert", etc. | baisse |
| `abandoned_session_rate` | sessions sans action/tool/resultat apres une demande | baisse |
| `prompt_reuse_rate` | motifs de prompts reutilises de facon saine | hausse si workflows |

### Prompt qualifie

Un prompt est `contextualized` s'il contient au moins 2 des 4 elements :

- objectif explicite ;
- contexte metier/projet ;
- input ou fichier reference ;
- contrainte de sortie/verif.

Un prompt est `vague` s'il est court et ne contient ni contexte, ni contrainte, ni action concrete.

## 4. Impact Verifiable

Objectif : relier l'usage IA a des actions observables.

### KPI

| KPI | Definition | Bon signal |
| --- | --- | --- |
| `tool_action_rate` | sessions avec lecture/ecriture fichier, shell, tests, recherche repo | hausse |
| `test_run_rate` | sessions qui lancent tests/lint/typecheck | hausse |
| `validation_rate` | sessions finissant par commande de verification | hausse |
| `commit_after_ai_rate` | sessions suivies d'un commit dans les 24h | hausse |
| `ai_assisted_commit_rate` | commits avec co-author ou marqueur IA | selon politique client |
| `docs_created_rate` | sessions menant a doc/spec/readme | hausse pour profils non dev |
| `review_workflow_rate` | usage IA pour review, diff, PR, tests | hausse |

### Actions verifiables

Patterns CLI a detecter :

- `npm test`, `pnpm test`, `bun test`, `pytest`, `go test`, `cargo test`
- `npm run lint`, `pnpm lint`, `eslint`, `ruff`, `mypy`
- `tsc --noEmit`, `npm run typecheck`
- `git diff`, `git status`, `git log`
- modifications de fichiers dans un repo

## 5. Usage Juste

Objectif : ne pas pousser au token maxing. Mesurer le rapport usage/resultat.

### KPI

| KPI | Definition | Bon signal |
| --- | --- | --- |
| `tokens_per_action` | tokens / action verifiable | baisse ou stabilite |
| `tokens_per_validated_session` | tokens / session terminee par validation | baisse |
| `long_session_without_action_rate` | longues sessions sans tool/test/fichier | baisse |
| `premium_model_simple_task_rate` | modele cher sur tache simple | baisse |
| `cache_reuse_rate` | cache read / total input si disponible | hausse |
| `repeat_same_prompt_rate` | repetitions proches sans progression | baisse |

### Important

Une baisse de tokens seule n'est pas un bon signal.

Bon usage juste :

- utiliser plus de tokens si la tache est complexe et verifiee ;
- utiliser moins de tokens sur taches simples ;
- reduire les longues conversations sans resultat.

## Score Detaille

```text
adoption_durable / usage_consistency =
  active_days                  35%
+ conversation_volume          25%
+ tool_coverage                20%
+ project_breadth              20%

usage_metier_reel =
  project_bound_session_rate   25%
+ file_context_rate            30%
+ business_context_rate        20%
+ advanced_workflow_rate       20%
+ category_diversity            5%

qualite_interaction =
  contextualized_prompt_rate   30%
+ vague_prompt_rate_inverse    30%
+ constraint_rate              20%
+ correction_rate_inverse      10%
+ abandoned_rate_inverse       10%

impact_verifiable =
  tool_action_rate             25%
+ validation_rate              35%
+ test_run_rate                25%
+ review_workflow_rate         15%

usage_juste =
  long_no_action_inverse       45%
+ validated_action_ratio       35%
+ cache_reuse_rate             20%
```

Modele actuel `local_individual_v3_directional` :

- 40/100 : needs work ;
- 70/100 : healthy ;
- 90/100 : strong.

Le score est une baseline locale individuelle directionnelle, non calibree empiriquement. Une metrique non observable est exclue du calcul et ne vaut jamais zero par defaut. Il ne doit pas etre vendu comme une mesure admin d'equipe, une evaluation de performance ou une preuve causale de l'effet d'une formation.
