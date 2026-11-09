# Covoiturage 4.8.1-test.1 — TEST uniquement

Base : fichiers applicatifs de la production 4.8.1 (`app.js`, `index.html`, `styles.css` et `service-worker.js`).
Conservé : `public-config.js` du dépôt TEST avec Firebase `team-tool-test-data`, commutateur de profil et validation libre TEST.
Ne pas recopier la configuration Firebase PROD ni les workflows de notifications PROD.

- Suivi des réponses aux impératifs de **tous les collègues présents**, y compris ceux absents du groupe manuel.
- Affichage `⏳ Ludo doit répondre à Étienne · 16:30` et `❌ Aurélien · 16:30 refusé` dans l'encart existant, sans bouton.
- Un refus persiste dans l'encart lorsque toutes les réponses sont reçues.
- Un impératif non confirmé ou refusé dans un groupe bloque sa validation ; une réponse extérieure au groupe ne la bloque pas.
- Le message de recalcul automatique n'apparaît plus pour une répartition modifiée manuellement.
- Aucune modification du dépôt de production ni des données de production.

Tests : `node --test tests/*.test.mjs` et GitHub Actions `Vérifications application TEST`.
