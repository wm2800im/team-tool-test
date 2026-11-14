# Phase 4 — Préparation Firebase TEST

Le workflow manuel `firebase-test-deploy.yml` contrôle le commit et calcule l’empreinte des règles candidates après les tests applicatifs et Firestore sur émulateur. La cible prévue est la base `(default)` de `team-tool-test-data` (398960207483). L’application web est publiée via GitHub Pages. Cette procédure Firebase concerne les règles Firestore uniquement.

## Avant publication

1. Vérifier les droits effectifs dans PROD, y compris les liaisons héritées et les délégations à des comptes de service. Le contrôle Resource Manager de GitHub Actions porte sur deux permissions du projet, indépendamment des droits propres aux ressources.
2. Créer un environnement GitHub `firebase-test-rules` avec branche `main` exclusivement et approbation d’un réviseur si le forfait le permet. Créer une identité OIDC distincte de l’identité de vérification et conditionner son accès au dépôt numérique 1356239565, à la branche, à cet environnement, au fichier de workflow et à `workflow_dispatch`. Attribuer uniquement sur TEST les permissions `firebaserules.releases.get`, `firebaserules.rulesets.get`, `firebaserules.rulesets.create` et `firebaserules.releases.update`, après validation de leur compatibilité avec la fédération directe.
3. Avant tout changement, lire la release `cloud.firestore` et conserver dans un stockage privé son identifiant de ruleset, sa source complète, l’horodatage et l’empreinte. Vérifier la lisibilité de la copie et comparer la release active avec la version attendue. Le déploiement doit s’arrêter si cette sauvegarde ou cette comparaison échoue.
4. Avant toute opération sur les documents, préparer une sauvegarde Firestore complète dans un emplacement privé TEST. Valider la facturation et le mode de sauvegarde, conserver les associations et invitations, puis vérifier la restauration dans une base isolée. L’export métier de phase 2 et le rapport anonymisé de phase 3 ne couvrent pas cette restauration.

## Publication et retour arrière

Après autorisation, ajouter un job manuel protégé par l’environnement, dépendant des tests, avec concurrence exclusive et confirmation du projet et de la release de référence. Par l’API Firebase Rules, créer un ruleset depuis le fichier candidat contrôlé, revérifier la release active, puis mettre à jour uniquement son pointeur `rulesetName`. Lire à nouveau la release et vérifier le pointeur. Contrôler les accès historiques et multi-équipes avec des identités distinctes avant activation de l’application.

En cas d’échec des contrôles après publication, suspendre la bascule. Une opération manuelle de retour arrière doit repointer la release vers le ruleset TEST sauvegardé, après avoir confirmé que la release active correspond toujours au déploiement à annuler. Vérifier ensuite le pointeur et les accès historiques. Si le ruleset historique a été supprimé, le recréer depuis la copie privée vérifiée. Toute restauration de documents est une opération distincte.

Références : [API Firebase Rules](https://firebase.google.com/docs/reference/rules/rest), [tests sur émulateur](https://firebase.google.com/docs/firestore/security/test-rules-emulator), [sauvegarde et restauration Firestore](https://cloud.google.com/firestore/docs/backups).
