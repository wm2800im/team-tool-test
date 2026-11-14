# Phase 5 — Runtime multi-équipes derrière interrupteur TEST

**État : code de préparation uniquement, flag OFF.** La PWA historique continue à lire et écrire dans les collections anciennes. Les chemins par équipe ne sont utilisés que si `public-config.js` active explicitement `enableMultiTeamRuntime`, **après** recette et autorisation.

## Fonctionnalités intégrées dans app.js

- Un appareil avec `deviceLinks/{uid}` conserve **prioritairement** son identité et les collections historiques, sans changement de comportement.
- Si le runtime est activé, un appareil sans ancien lien peut obtenir son `teamDeviceLinks/{uid}` existant ou recevoir une invitation `?team=<teamId>&invite=<token>` ; les règles Firestore contrôlent le rattachement atomique.
- Contrôle de l'équipe active, du document de membre et de `memberDirectory` après liaison ; composition dynamique de 2–5 membres et codes courts stables.
- Chemins de disponibilités, compatibilités, plans, trajets, préférences, calendriers et Delle désormais isolables via `team-runtime-core.mjs`. Les membres restent séparés par teamId.
- L'ancienne baseline de quotas n'est jamais chargée dans une autre équipe. Les notifications, la simulation d'un autre membre, l'administration historique et les exports/imports globaux sont désactivés pour une session d'équipe expérimentale afin d'éviter les fuites ou effets de bord.
- Les trajets Delle privés sont accessibles seulement aux membres Igor et Ludo de `wm-original`, sous réserve des règles Firebase.

## Ce qui reste avant activation TEST

1. Sur émulateur Firebase, exécuter un parcours complet **avec deux vrais espaces de données** (anonymes distincts, invitations, rôle leader, statuts, impératifs, propositions, quotas, calendrier, trajets, trajets Delle, droits croisés), en particulier les documents copiés de l'équipe historique.
2. Ajouter l'interface de gestion des équipes, des membres et des invitations pour le superadministrateur et le leader, sans donner de droits d'auto-création à des clients non privilégiés.
3. Adapter le travailleur de notifications et le recalcul des quotas pour les nouvelles équipes ; conserver le comportement actuel sur l'équipe historique.
4. Vérifier que les règles candidates ne donnent aucune lecture aux membres d'une équipe draft, hormis les administrateurs explicitement provisionnés. Ne jamais activer les règles sur Firebase réel sans accord.
5. Sauvegarder TEST, vérifier une restauration isolée, auditer les UID Auth réels et publier les règles seulement après autorisation distincte.
6. Activer `enableMultiTeamRuntime` en TEST uniquement après la migration et la recette, avec un plan de retour arrière. **Aucun changement de PROD.**

Les tests Node garantissent le routage et le comportement de la bascule. Ils ne remplacent pas les tests de bout en bout sur navigateur et émulateur avant mise en service.
