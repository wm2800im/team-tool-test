# Covoiturage 4.4.0-beta.1 — environnement TEST

## Ce que cette beta contient
- navigation simplifiée : Prochain / Planning / Groupes / Historique ;
- en-tête minimal avec prénom + menu ☰ ;
- Paramètres : thème Auto / Clair / Sombre, mémorisé dans Firebase ;
- notifications désactivées par défaut, rappel fixe à 20h ;
- calendrier : week-ends + jours fériés officiels du canton du Jura + exceptions entreprise ;
- onglet Historique fusionné avec Mon bilan ;
- bilan à 4 cases : Conducteur / Passager / Jours covoiturés / Jours renseignés ;
- historique : compteurs de la combinaison après chaque trajet, export CSV, modifier / supprimer ;
- contrôle qualité dynamique « Points à vérifier », sinon « Tout est OK » ;
- page Prochain : groupe(s) proposé(s) automatiquement, conducteur suggéré, choix du conducteur et validation directe ;
- page Groupes conservée pour les cas avancés et les corrections a posteriori ;
- Admin : suppression de l’ancien import Excel, gestion des jours non travaillés exceptionnels ;
- mode TEST avec bandeau visible et switch Aurélien / Étienne / Igor / Ludo / Stéphane ;
- version : 4.4.0-beta.1.

## Architecture TEST / PROD
- PROD : dépôt GitHub `team-tool` + Firebase actuel `team-tool-data`.
- TEST : nouveau dépôt GitHub `team-tool-test` + nouveau projet Firebase TEST.
- Le code métier est identique. Seul `public-config.js` change selon l’environnement.
- La production ne doit jamais pointer vers le Firebase TEST, et inversement.

## 1. Créer le projet Firebase TEST
1. Firebase Console → Créer un projet, par exemple `team-tool-test-data`.
2. Google Analytics : inutile, tu peux le désactiver.
3. Créer Firestore en mode Production, région Europe.
4. Authentication → activer uniquement « Anonyme ».
5. Ajouter une application Web, par exemple `team-tool-test-web`.
6. Copier les valeurs `firebaseConfig` dans `public-config.js`.
7. Paramètres du projet → Cloud Messaging → Web Push certificates → générer une paire de clés.
8. Copier la clé publique VAPID dans `public-config.js` à la place de `REMPLACER_PAR_LA_CLE_VAPID_TEST`.

## 2. Créer le dépôt GitHub TEST
1. Créer un dépôt public neutre `team-tool-test`.
2. Envoyer tous les fichiers de ce dossier à la racine du dépôt.
3. Settings → Pages → Deploy from a branch → `main` → `/(root)`.
4. L’URL sera normalement `https://wm2800im.github.io/team-tool-test/`.

## 3. Initialiser ton accès TEST
1. Dans Firebase TEST → Firestore → Règles : publier temporairement `firestore.rules.test-bootstrap.txt`.
2. Ouvrir `https://wm2800im.github.io/team-tool-test/setup-test.html`.
3. Cliquer « Initialiser mon accès Igor » et conserver le lien TEST généré.
4. Immédiatement après : remplacer les règles par `firestore.rules.test.txt` et publier.
5. Supprimer `setup-test.html` du dépôt GitHub TEST après initialisation.

## 4. Copier les données de PROD vers TEST
Cette étape ne modifie pas la production.
1. Dans le dépôt PROD actuel `team-tool`, ajouter temporairement le fichier `export-test-snapshot.html` fourni séparément.
2. Ouvrir ce fichier dans le même navigateur où Igor est déjà lié à la production.
3. Télécharger `Covoiturage_TEST_snapshot_....json`.
4. Supprimer ensuite `export-test-snapshot.html` du dépôt PROD.
5. Dans l’application TEST → ☰ → Administration → Environnement de test.
6. Choisir le JSON puis « Importer dans TEST ».
7. Tu peux refaire cette opération chaque fois que tu veux rafraîchir la base TEST.

## 5. Tester le switch utilisateur
Dans TEST seulement : ☰ → Utilisateur simulé.
Tu peux passer librement entre les 5 personnes. L’identité Firebase réelle reste Igor ; toutes les écritures vont uniquement dans le Firebase TEST.

## 6. Mettre en place les notifications TEST
### Côté Firebase TEST
1. Paramètres du projet → Comptes de service.
2. Générer une nouvelle clé privée et télécharger le JSON.
3. Ne jamais mettre ce JSON dans GitHub ni l’envoyer à quelqu’un.

### Côté GitHub TEST
1. Repo → Settings → Secrets and variables → Actions.
2. New repository secret.
3. Nom : `FIREBASE_SERVICE_ACCOUNT_TEST`.
4. Valeur : coller le contenu complet du JSON du compte de service.
5. Dans l’application TEST, rester sur le profil réel Igor et activer ☰ → Notifications.
6. GitHub → Actions → « Tester le rappel Covoiturage » → Run workflow.
7. Choisir une date travaillée où Igor est « Non renseigné ». Commencer avec `dry_run=true`, puis `false` pour tester l’envoi réel.

## 7. Logique du rappel
- heure de production : 20h07 Europe/Paris (présenté comme « rappel à 20h » dans l’app) ;
- envoi uniquement si le lendemain est un jour travaillé ;
- aucun rappel vendredi pour samedi ni samedi pour dimanche ;
- rappel dimanche soir si lundi est travaillé ;
- aucun rappel la veille d’un jour férié jurassien ;
- les exceptions entreprise définies dans Admin sont prioritaires ;
- aucune notification si le statut est déjà renseigné ;
- notification uniquement pour les profils qui l’ont activée.

## 8. Passage en production après validation
Ne pas recopier manuellement des changements un par un.
1. Valider une beta, par exemple `4.4.0-beta.4`.
2. Prendre exactement le même code validé.
3. Remplacer uniquement `public-config.js` par la configuration PROD.
4. Version : passer de `4.4.0-beta.x` à `4.4.0`.
5. Publier `firestore.rules.prod.txt` dans Firebase PROD.
6. Dans GitHub PROD, créer le secret `FIREBASE_SERVICE_ACCOUNT_PROD`.
7. Copier `reminder-production.yml.example` vers `.github/workflows/reminder-production.yml`.
8. Déployer les fichiers sur `team-tool`.

## Versionnage retenu
- `4.4.0-beta.1`, `.2`, `.3`… : versions TEST successives ;
- `4.4.0` : version mise en production ;
- `4.4.1` : correction de bug sans nouvelle fonction ;
- `4.5.0` : prochaine évolution fonctionnelle importante.
