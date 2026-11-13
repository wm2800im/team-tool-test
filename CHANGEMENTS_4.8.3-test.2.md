# Lot D — Export / import sécurisé (4.8.3-test.2)

- Export TEST v2 incluant \`profiles\`, \`availability\`, \`legacyStatus\`, \`compatibilities\`, \`plans\`, \`tripDays\`, \`preferences\`, \`delleTrips\` et le calendrier.
- Conservation des horodatages Firestore en format typé (secondes et nanosecondes).
- Fichier vérifié avant toute écriture : schéma, collections, identifiants, doublons, données et calendrier.
- Compatibilité en lecture avec les exports v1 de PROD (6 ou 7 collections) : les collections absentes sont ignorées, **jamais vidées**.
- Import TEST en **fusion (upsert)**. Les documents absents du fichier sont conservés ; même identifiant = contenu remplacé.
- Export automatique d'une copie de secours locale du TEST juste avant la fusion et confirmation utilisateur supplémentaire.
- Aucun effacement de collection et aucun import exécuté durant le développement.
- Aucune copie des invitations, associations d'appareils, jetons push, demandes de notifications ou secrets.
- Les exports PROD v1 existants **n'incluent pas Delle** : les documents Delle TEST sont conservés si le fichier ne les contient pas. Un export PROD complet nécessitera une procédure distincte, sans toucher à la production.
- Attention : une fusion partielle reste possible si Firestore refuse une écriture en cours d'import ; la copie de secours locale permet de préparer une restauration.
- La sauvegarde n'est pas vérifiable automatiquement par l'application : confirmer sa présence dans les téléchargements.
- Aucun fichier, règle ou donnée PROD modifié.
