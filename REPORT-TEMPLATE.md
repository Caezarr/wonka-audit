# Rapport Client - Wonka AI Usage Audit

Client : `{{client_name}}`  
Equipe : `{{team_name}}`  
Periode : `{{period}}`  
Formation : `{{training_date}}`  
Fenetre analysee : `{{window_start}}` -> `{{window_end}}`

## Executive Summary

La baseline pre-formation montre le niveau actuel d'usage IA. Apres les workshops, l'equipe pourra mesurer une progression de `{{score_delta}}` points sur le AI Practice Score.

Les signaux les plus positifs :

- `{{positive_signal_1}}`
- `{{positive_signal_2}}`
- `{{positive_signal_3}}`

Les points a travailler :

- `{{risk_signal_1}}`
- `{{risk_signal_2}}`
- `{{risk_signal_3}}`

## Score Global

| Dimension | M0 | {{period}} | Evolution |
| --- | ---: | ---: | ---: |
| Adoption durable | {{m0_adoption}} | {{period_adoption}} | {{delta_adoption}} |
| Usage metier reel | {{m0_business_usage}} | {{period_business_usage}} | {{delta_business_usage}} |
| Qualite d'interaction | {{m0_interaction}} | {{period_interaction}} | {{delta_interaction}} |
| Impact verifiable | {{m0_impact}} | {{period_impact}} | {{delta_impact}} |
| Usage juste | {{m0_fair_usage}} | {{period_fair_usage}} | {{delta_fair_usage}} |
| **AI Practice Score** | **{{m0_score}}** | **{{period_score}}** | **{{delta_score}}** |

## Wonka Wrapped Recap

| Signal | Valeur | Lecture |
| --- | ---: | --- |
| Conversations | `{{conversation_count}}` | Volume d'usage detecte |
| Messages | `{{message_count}}` | Intensite des echanges |
| Moy. messages / conversation | `{{avg_messages_per_conversation}}` | Longueur moyenne des sessions |
| Outil principal | `{{top_tool}}` | Outil le plus present |
| Cas d'usage principal | `{{top_use_case}}` | Usage dominant a reprendre en formation |
| Usage libre vs workflow | `{{free_vs_workflow}}` | Part de chat generique vs usage avec contexte/outils |
| Conversation la plus longue | `{{longest_conversation}}` | Risque de boucle longue sans action |

Conseils personnalises :

- `{{personal_tip_1}}`
- `{{personal_tip_2}}`
- `{{personal_tip_3}}`

## KPI Cles

| KPI | M0 | {{period}} | Lecture |
| --- | ---: | ---: | --- |
| Utilisateurs actifs hebdo | {{m0_wau}} | {{period_wau}} | {{wau_comment}} |
| Sessions par utilisateur actif | {{m0_sessions_per_user}} | {{period_sessions_per_user}} | {{sessions_comment}} |
| Sessions avec contexte fichier/projet | {{m0_file_context}} | {{period_file_context}} | {{file_context_comment}} |
| Prompts contextualises | {{m0_contextualized}} | {{period_contextualized}} | {{contextualized_comment}} |
| Prompts vagues | {{m0_vague}} | {{period_vague}} | {{vague_comment}} |
| Sessions avec validation/test | {{m0_validation}} | {{period_validation}} | {{validation_comment}} |
| Longues sessions sans action | {{m0_long_no_action}} | {{period_long_no_action}} | {{long_no_action_comment}} |

## Lecture Wonka

`{{interpretation_paragraph}}`

## Patterns Observes

### Bons patterns

- `{{good_pattern_1}}`
- `{{good_pattern_2}}`
- `{{good_pattern_3}}`

### Patterns a corriger

- `{{bad_pattern_1}}`
- `{{bad_pattern_2}}`
- `{{bad_pattern_3}}`

## Recommandations

### Action 1 - `{{recommendation_1_title}}`

`{{recommendation_1_body}}`

### Action 2 - `{{recommendation_2_title}}`

`{{recommendation_2_body}}`

### Action 3 - `{{recommendation_3_title}}`

`{{recommendation_3_body}}`

## Plan M+1 / M+2 / M+3

| Horizon | Objectif | Mesure attendue |
| --- | --- | --- |
| M+1 | `{{m1_goal}}` | `{{m1_metric}}` |
| M+2 | `{{m2_goal}}` | `{{m2_metric}}` |
| M+3 | `{{m3_goal}}` | `{{m3_metric}}` |

## Note Confidentialite

Ce rapport est base sur des metriques agregees. Les prompts complets, le code source, les secrets et les chemins locaux complets ne sont pas inclus dans l'export transmis a Wonka.
