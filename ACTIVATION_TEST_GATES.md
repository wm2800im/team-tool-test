# Activation Firebase TEST — contrôles réels de préparation

Autorisation de mise en service TEST donnée le 14/11/2026, **conditionnée** à la vérification des sauvegardes, des droits et du retour arrière. Les cinq utilisateurs historiques et PROD sont exclus de toute opération de migration.

## Premier contrôle non destructif

Le script `scripts/firebase-test-readiness.mjs` est validé automatiquement hors réseau par le workflow `firebase-test-readiness.yml`. Sa vérification **réelle** est exécutée uniquement dans le workflow manuel existant `.github/workflows/firebase-test-access.yml` (« Vérifier l’accès Google Cloud TEST »), sous le fournisseur OIDC déjà restreint à ce workflow. Celui-ci contrôle le projet `team-tool-test-data` (numéro `398960207483`) et effectue en plus son contrôle historique des permissions de PROD, **sans écriture ni modification de PROD**. Le nouveau script ne cible que TEST.

Il vérifie :
- l'identité du projet et le statut de la base `(default)` ;
- la release de règles actuellement active et sa concordance exacte avec les règles historiques ou candidates du dépôt ;
- l'existence d'une **sauvegarde Firestore complète, prête, non expirée et vieille de moins de 72 h** (pas un export métier) ;
- l'existence d'au moins un `platformAdmins/{uid}` actif provisionné hors navigateur.

Une permission manquante ou une réponse ambiguë fait échouer le workflow. Les règles actives, jetons et UID ne sont pas imprimés. Les API appelées utilisent exclusivement `GET` sur Firebase TEST.

## Ce contrôle ne suffit pas à publier

La présence d'une sauvegarde ne prouve **pas sa restauration**. Avant activation réelle, il reste impératif de :
1. valider une restauration isolée de la sauvegarde TEST complète, incluant invitations et identités (les exports JSON partiels ne suffisent pas) ;
2. confirmer le contrôle IAM effectif : identité GitHub de publication distincte, portée à TEST, environnement protégé `firebase-test-rules` prêt, aucun droit d'écriture sur PROD ;
3. vérifier la sauvegarde **chiffrée des règles actives** et sa capacité de déchiffrement via le workflow de publication ; noter l'ID du ruleset initial ;
4. publier les règles par le workflow manuel protégé `firebase-test-deploy.yml` avec opération `publish` et `expected_ruleset` de l'état réellement vérifié, puis relire la release et tester les accès historiques ;
5. mettre en place le superadministrateur TEST de confiance si absent, sans autoriser l'auto-promotion du compte Igor ;
6. seulement après les tests de non-régression, mettre `enableMultiTeamRuntime: true` sur le **site TEST**, avec retour arrière par remise à `false` et restauration de l'ancien ruleset en cas de problème.

Le connecteur GitHub utilisé ici ne permet pas de déclencher `workflow_dispatch` ni de provisionner un compte Firebase Admin : aucune opération de publication n'est assimilée à un simple succès de tests CI.

**Interdiction :** aucun changement dans `wm2800im/team-tool`, `team-tool-data`, les collections historiques `/deviceLinks`, `/tripDays` ou les autres documents historiques. Aucun job de migration/copie en réel dans ce lot.

## Constat du 14 novembre 2026

Le premier essai de contrôle réel automatique par le nouveau workflow a été refusé par l'authentification fédérée Google Cloud : `unauthorized_client` / rejet par condition d'attribut. **Aucun accès Firebase n'a été accordé et aucune écriture n'a eu lieu**. Ce refus n'est pas contourné en élargissant les conditions OIDC ; la vérification réelle doit utiliser le workflow manuel de confiance, sur `main`. Aucun droit de publication n'est supposé actif en l'absence de ses preuves.
