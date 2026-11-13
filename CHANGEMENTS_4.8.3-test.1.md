# TeamTool TEST — synchronisation 4.8.3-test.1

Base de code métier : production 4.8.3 (commit `7802fa59eb3c005a750990ae79e45eacf299846e`).

- Reprise du code métier `app.js` depuis la production (recalcul des plans manuels périmés, conservation du conducteur, contrôle serveur des statuts avant validation).
- Mise à niveau des scénarios d'affichage des impératifs et ajout des tests des plans manuels.
- Configuration Firebase TEST et simulateur de profils conservés.
- Version et cache PWA dédiés à TEST.
- Vérifications automatiques déclenchées aussi sur les pull requests.

## Limites volontaires du Lot B

- Aucune modification des règles, des données, des invitations ou des services Firebase.
- Aucune modification de la production.
- Pas de copie ni d'import des données PROD vers TEST.
- Les tests des règles Firestore et la validation manuelle restent à traiter dans les lots suivants.
