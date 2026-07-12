export function buildRecommendations(metrics, score) {
  const out = [];
  const add = (priority, title, body, target_metric) => {
    out.push({ priority, title, body, target_metric });
  };

  if (metrics.verifiable_impact.validation_rate !== null && metrics.verifiable_impact.validation_rate < 0.25) {
    add(
      "high",
      "Construire les reflexes de validation",
      "Former les utilisateurs a terminer les sessions IA par un test, lint, typecheck, revue de diff ou critere d'acceptation concret.",
      "validation_rate"
    );
  }
  if (metrics.interaction_quality.vague_prompt_rate !== null && metrics.interaction_quality.vague_prompt_rate > 0.3) {
    add(
      "high",
      "Reduire les prompts vagues",
      "Introduire des templates de prompts par workflow metier : objectif, contexte, contraintes, resultat attendu.",
      "vague_prompt_rate"
    );
  }
  if ((metrics.business_usage.advanced_workflow_rate || 0) < 0.5) {
    add(
      "medium",
      "Passer du chat au workflow",
      "Encourager les usages avec fichiers, repo, outils et workflows multi-etapes. Le but est plus de travail verifiable, pas plus de messages.",
      "advanced_workflow_rate"
    );
  }
  if ((metrics.business_usage.file_context_rate || 0) < 0.4) {
    add(
      "medium",
      "Augmenter le contexte fourni",
      "Apprendre aux equipes a attacher fichiers, erreurs, specs et contraintes au lieu de poser des demandes generiques.",
      "file_context_rate"
    );
  }
  if (score.ai_practice_score >= 70 && out.length < 2) {
    add(
      "low",
      "Standardiser les meilleurs patterns",
      "Transformer les bons exemples anonymises en playbooks partageables par equipe.",
      "playbook_adoption"
    );
  }

  return out.slice(0, 4);
}
