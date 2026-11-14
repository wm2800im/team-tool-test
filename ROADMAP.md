# Feuille de route multi-équipes

| État | Lot | Preuve ou prochaine action |
| --- | --- | --- |
| Terminé | Phases 1 à 3 | Architecture, simulation et audit applicatif des appareils dans les documents de phase |
| Terminé | Phase 4, code et émulateur | PR #7 fusionnée, projet de démonstration et plan de déploiement validés |
| Terminé | Atelier fonctionnel multi-équipes TEST | PR #9 fusionnée, équipes fictives de 2–5 membres, engagements horaires et groupes par heure acceptée, aucun Firebase |\n| En cours | Runtime multi-équipes dans l'application | Chemins Firestore isolables, liens d'équipe et membres dynamiques derrière flag OFF ; poursuivre avec administration, gestion invitations, notifications, quotas et recette sur émulateur |\n| Prêt | Recette locale de publication | Tester avec une API simulée les erreurs de sauvegarde, la dérive et le retour arrière |
| Prêt | Parcours multi-équipes isolé | Vérifier invitations, accès Delle, notifications et recalcul des quotas |
| À confirmer | Protection de l’environnement GitHub et IAM | Vérifier réviseurs, branche main et identité distincte avant activation du job |
| Bloqué par les preuves | Préparation des données réelles | Sauvegarde TEST privée restaurée en isolation, rapprochement UID et audit IAM effectif |
| Accord requis | Publication des règles TEST | Accord distinct après vérification de la sauvegarde des règles, du destinataire et du retour arrière |
| Accord requis | Copie TEST | Accord distinct après recette, sauvegarde et validation individuelle des UID |
| Accord requis | Activation multi-équipes | Accord distinct après comparaison de la copie et recette de non-régression |

Le coordinateur reprend la première tâche prête sans PR en cours. Il consigne dans la PR ou le ticket les preuves, l’obstacle éventuel et la prochaine action. Les statuts du présent tableau suivent les preuves observées. Les synthèses périodiques utilisent aussi les PR GitHub et les runs disponibles.
