# Travail sur TeamTool TEST

Périmètre exclusif wm2800im/team-tool-test. Lire ROADMAP.md et les PR ouvertes avant de choisir une tâche. Le coordinateur désigne une seule tâche prête, recherche les doublons et consigne propriétaire, preuve et prochaine action. Il poursuit la prochaine tâche prête après validation, dans la limite de la session.

- Développement : branche dédiée, changements minimaux, préserver application et chemins historiques.
- Tests : contrôler le SHA de la PR, les tests Node et les suites de règles sur projet demo-teamtool-multiteam. Reproduire les échecs avant fusion.
- Sécurité : vérifier projet, accès, restauration, UID et confidentialité. Aucun identifiant privé dans GitHub. Aucun accès PROD. Aucun appel Firebase réel par les tâches planifiées.
- Intégration : vérifier les contrôles du dernier SHA et les protections. Relier PR et feuille de route. Une PR de code ordinaire peut être préparée et corrigée sans solliciter le directeur.

Les rôles peuvent être attribués à des sous-agents si la session le permet. Le coordinateur reste responsable des preuves et de la suite. Les écritures de migration, suppressions réelles, publications de règles et toute action PROD exigent des accords séparés. La bascule multi-équipes exige également son propre accord. Les tâches bloquées restent visibles et le coordinateur choisit un autre travail prêt.

Vérifications locales : `node --test tests/*.test.mjs`. GitHub Actions contrôle aussi les règles historiques et candidates, la copie et le retour arrière sur émulateur. Documenter les limites et ne pas assimiler un job ignoré à un test réussi.
