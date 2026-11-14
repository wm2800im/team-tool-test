# Phase 6 — Gestion des équipes et invitations (TEST seulement)

## Ce qui a été développé
- Écran de création d'équipe de 2 à 5 membres avec un responsable et des codes courts stables, limité à `team-tool-test-data`.
- Vérification du rôle de superadministrateur stocké dans `platformAdmins/{uid}`, dont l'inscription doit être faite **hors client** par un administrateur de confiance.
- Création transactionnelle des documents `teams`, `memberDirectory`, `members` et `shortCodes`. La règle candidate `memberDirectory.create` contrôle l'équipe dans l'état final de la transaction (`getAfter`).
- Écran de création et renouvellement des invitations pour le responsable de la seule équipe active, avec mise hors service des anciens liens en lot atomique.
- Correctifs d'affichage des effectifs dynamiques et des codes courts à plusieurs caractères.

## Ce qui n'est PAS activé
- `enableMultiTeamRuntime` reste **false** dans la configuration du site TEST.
- Aucune publication de règles, aucun appel à Firebase réel et aucune modification des collections historiques par cette PR.
- Aucun provisioning de superadministrateur ni création d'équipe réelle n'est effectué depuis GitHub.
- Le parcours sur navigateur avec Firebase TEST réel n'est pas validé.

## Recette avant activation séparée
1. Exécuter la CI Node et l'émulateur candidat, avec le nouveau scénario de création atomique de cinq membres, lien personnel et refus d'accès croisé.
2. Vérifier la sauvegarde/restauration privée de TEST, le projet IAM et les comptes historiques ; vérifier l'absence d'accès à PROD.
3. Obtenir un accord distinct pour publier les règles candidates sur TEST, selon PHASE4_PREPARATION_TEST.md, avec sauvegarde et retour arrière.
4. Provisionner de façon sûre le superadministrateur TEST ; confirmer l'identité UID et la séparation des permissions.
5. Préparer une équipe fictive et ses comptes, tester sur de vrais appareils toutes les fonctions : planning, impératifs, groupes, historique, quotas, calendrier, Delle et invitations.
6. Adapter les notifications multi-équipes avant leur activation, puis autoriser séparément la bascule `enableMultiTeamRuntime` sur TEST uniquement.

**Production strictement inchangée.**
