# Feuille de route multi-équipes

| État | Lot | Preuve ou prochaine action |
| --- | --- | --- |
| Terminé | Phases 1 à 3 | Architecture, simulation et audit applicatif des appareils dans les documents de phase |
| Terminé | Phase 4, code et émulateur | PR #7 fusionnée, projet de démonstration et plan de déploiement validés |
| Terminé | Atelier fonctionnel multi-équipes TEST | PR #9 fusionnée, équipes fictives de 2–5 membres, engagements horaires et groupes par heure acceptée, aucun Firebase |
| Terminé (préparation) | Runtime multi-équipes dans l'application | PR #10 : chemins Firestore isolables, liens d'équipe et membres dynamiques, toujours derrière flag OFF |
| En cours | Administration multi-équipes TEST | PR #11 fusionnée : administration et invitations par équipe en place ; PR #12 : invitation initiale du responsable + tests de bout en bout ; flag OFF sur TEST |
| Terminé (simulation) | Recette locale de publication | PR #18 fusionnée : erreurs de stockage, corruption et dérive testées avec une API simulée. La restauration réelle reste à prouver. |
| Prêt | Parcours multi-équipes isolé | Étendre la recette du recalcul des quotas. Les tests émulateur couvrent déjà le parcours d’une équipe fictive, les accès Delle et les permissions sur les demandes de notification. |
| À développer | Livraison des notifications multi-équipes | `notify-runner.mjs` consomme les demandes et les jetons des collections racines. Préparer un envoi par équipe avec transport simulé et vérifier qu’une demande de l’équipe B sélectionne uniquement les jetons de B, tout en préservant le parcours historique. |
| À confirmer | Protection de l’environnement GitHub et IAM | Vérifier réviseurs, branche main et identité distincte avant activation du job |
| Non nécessaire au premier essai d'une nouvelle équipe | Copie de l'équipe historique | L'application historique garde ses collections racines : ne pas la migrer pour tester une nouvelle équipe fictive ; migration future après sauvegarde et validation UID |
| Accord requis | Publication des règles TEST | Accord distinct après vérification de la sauvegarde des règles, du destinataire et du retour arrière |
| Accord requis uniquement si migration historique | Copie TEST | Ne pas lancer pour le premier essai sur une nouvelle équipe ; accord ultérieur après recette et sauvegarde |
| Accord requis | Activation multi-équipes | Accord distinct après comparaison de la copie et recette de non-régression |

Le coordinateur reprend la première tâche prête sans PR en cours. Il consigne dans la PR ou le ticket les preuves, l’obstacle éventuel et la prochaine action. Les statuts du présent tableau suivent les preuves observées. Les synthèses périodiques utilisent aussi les PR GitHub et les runs disponibles.
