# Phase 7 — Première recette multi-équipes utilisable sur TEST

## But

Faire tester **une nouvelle équipe de 2 à 5 collègues fictifs** sur la PWA TEST réelle, sans copier ni déplacer les données de l'équipe historique. Les appareils déjà associés via `deviceLinks` restent prioritaires et utilisent les collections anciennes ; les appareils neufs rejoignent `teams/{teamId}` via une invitation.

## Parcours préparé et vérifié sur émulateur

1. Un superadministrateur TEST provisionné crée l'équipe avec 2 à 5 prénoms (le premier devient responsable).
2. La création atomique conserve identifiants, annuaire et codes courts. Aucun UID d'appareil n'est publié dans GitHub.
3. L'administrateur génère immédiatement le **premier lien du responsable**, ou le régénère depuis la liste des équipes si la première création échoue.
4. Le responsable ouvre ce lien dans **un nouveau navigateur / une fenêtre privée** (l'ancien appareil Igor reste lié à l'historique), se connecte et invite ses collègues.
5. Les membres renseignent leurs disponibilités, acceptent/refusent les impératifs, composent et valident les groupes ; les compteurs et calendriers sont isolés par équipe.
6. Vérifier qu'un membre de l'équipe B n'a aucun accès aux trajets et aux calendriers de l'équipe A.
7. Tester la correction de l'historique et les suggestions de conducteurs, puis la restitution des droits après révocation d'une invitation.

La suite `tests/firestore-multiteam.emulator.mjs` contient un scénario avec un responsable invité, un collègue associé, plusieurs impératifs acceptés, groupe unique de 3, plan, trajet, calendrier et refus des accès croisés. Les tests Node de l'interface ne remplacent pas un essai navigateur réel.

## Prérequis de sécurité avant le premier essai réel

- Vérifier le projet Firebase **TEST `team-tool-test-data`**, sa sauvegarde et une restauration isolée ; ne pas toucher PROD.
- Vérifier les identités et droits IAM, et provisionner **hors client** `platformAdmins/{uid}` pour le seul administrateur TEST explicitement autorisé.
- Faire approuver séparément la publication des **règles candidates** sur TEST ; enregistrer la release active, son empreinte et un chemin de retour arrière.
- Vérifier dans TEST que les liens historiques marchent encore, puis autoriser séparément l'activation `enableMultiTeamRuntime: true` dans `public-config.js` de TEST seulement.
- Les notifications push nouvelles équipes restent volontairement désactivées : ne pas activer les rappels avant le traitement isolé par équipe.

## Critères observables de l'essai

- L'équipe historique de cinq personnes reste accessible et inchangée.
- Une nouvelle équipe de trois personnes peut être créée puis rejointe avec des navigateurs distincts.
- Si deux collègues acceptent le même impératif à 16h30, ils forment un seul groupe avec la personne concernée.
- Un trajet validé dans B n'apparaît jamais dans A ; les accès croisés sont refusés par les règles, pas seulement masqués.
- Les informations de la nouvelle équipe sont persistées dans les vrais chemins `teams/{teamId}` de Firebase TEST.

## Ce que cette étape n'autorise pas

Aucune migration de `wm-original`, aucune publication de règles réelles, aucun changement de flag et aucun accès PROD. Le consentement de développement n'autorise pas implicitement les opérations ci-dessus.
