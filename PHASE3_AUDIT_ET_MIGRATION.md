# Phase 3 — Audit des accès et plan de migration non destructive (TEST)

## Périmètre réellement réalisé

Préparation sur GitHub TEST uniquement. La version de l'application principale reste 4.8.3-test.2. Les fichiers app.js, index.html, public-config.js, service-worker.js et firestore.rules.test.txt ne sont pas modifiés. Aucune écriture Firebase n'est réalisée. Les règles multi-équipes restent candidates et NON publiées.

Page d'audit : https://wm2800im.github.io/team-tool-test/phase3-access-audit.html

## Audit des associations et invitations

La page autonome utilise exclusivement les lectures Firestore depuis le serveur, avec la session anonyme déjà active dans le même navigateur sur TeamTool TEST :
1. Vérification stricte du projet Firebase : team-tool-test-data.
2. Lecture du seul lien deviceLinks/{auth.uid} et vérification du profil Igor.
3. Lecture de deviceLinks et invitations (ces lectures globales exigent le droit admin Igor dans les règles existantes).
4. Agrégation par profil des appareils et liens actifs/révoqués.
5. Les associations déjà existantes qui référencent des liens désactivés sont CONSERVÉES : l'ancienne régénération d'un lien n'interrompt pas un appareil.
6. Contrôle optionnel du rapport de simulation phase 2 déjà obtenu (3377 documents, 3 trajets privés Delle).
7. Export du rapport d'audit SANS UID, SANS identifiant d'invitation, SANS userAgent.

La page ne connecte pas un appareil non associé : elle ne fait pas de signInAnonymously, ni de setDoc/updateDoc/deleteDoc ni aucune écriture Firestore. Si la session n'est pas disponible, ouvrir l'application principale dans le même navigateur avant de relancer l'audit. La page est destinée à un administrateur, pas à tous les covoitureurs.

## Phase 2 déjà vérifiée (rapport fourni le 14/11/2026)

- Fichier source : Covoiturage_team-tool-test-data_snapshot_2026-11-14.json
- 3377 documents métier analysés et 3377 couverts dans la simulation
- 3389 documents cibles simulés (dont l'équipe, les cinq membres, réservations de codes courts)
- 1268 journées de trajets, 1140 groupes historiques, 2000 anciens statuts
- 51 disponibilités, 36 réponses aux impératifs, 9 plans, 5 préférences
- 3 trajets privés Delle
- firebaseWrites = 0 et activationPerformed = false

Le fichier métier NE contient PAS les liens deviceLinks, les invitations, les UID Firebase, les jetons push ni les caches de quota stockés hors collections exportées. La réussite de phase 2 ne suffit donc pas à migrer.

## Plan technique futur, non exécuté

### 0 — Sauvegarde et inventaire préalable

- Générer au dernier moment une nouvelle sauvegarde métier complète TEST.
- Conserver une sauvegarde PRIVÉE des deviceLinks, invitations et règles Firestore (l'export public anonymisé d'audit ne suffit pas pour restaurer les associations).
- Vérifier le contenu, les volumes et la possibilité de restauration.
- Contrôler le nombre d'appareils Igor, Ludo, Étienne, Aurélien et Stéphane.
- Vérifier les UID utilisés par les appareils réellement autorisés au statut superadministrateur.

### 1 — Préprovisionner sans toucher aux anciens documents

Avec une identité d'administration serveur de confiance (Admin SDK ou console Firebase, jamais une clé privée dans le code client) :
- Créer teams/wm-original avec status = draft.
- Préparer memberDirectory/{memberId}, les cinq membres et leurs codes courts A E I L S.
- Provisionner platformAdmins/{uid} pour les UID d'administration validés.
- Préparer teamDeviceLinks/{uid} pour les appareils existants uniquement après contrôle du lien historique ; conserver deviceLinks/{uid} et invitations à l'identique. Les règles candidates empêchent un appareil déjà lié à l'ancien système de s'auto-rattacher en client.
- Vérifier les contraintes atomiques des créations de membres et de leurs réservations de codes.
- NE PAS rendre l'équipe active tant que l'application ne sait pas utiliser cette structure.

### 2 — Copie contrôlée et vérification

- Copier uniquement dans les nouveaux chemins teams/wm-original/*, en refusant de remplacer un document cible existant non vérifié.
- Convertir les Timestamp avec la même précision.
- Consigner, dans un manifeste local protégé, tous les nouveaux documents effectivement créés ; aucun effacement des anciens documents.
- Comparer les quantités sources/cibles, la composition des trajets, les conducteurs, les compteurs et les 3 trajets privés Delle. Les volumes peuvent augmenter si les données TEST changent entre-temps.
- Recalculer les caches d'historique et les quotas, ne pas recopier des états de cache périmés.
- Contrôler les règles de sécurité sur émulateur, puis en TEST avec des identités distinctes.

### 3 — Bascule seulement après nouvelle autorisation

- Activer de nouvelles règles en sauvegardant d'abord leur version précédente.
- Activer un parcours multi-équipes après tests des notifications, de la validation des impératifs et des calculs de conducteurs.
- Mettre en place un mécanisme explicite de retour au code ancien.
- Prévoir la réconciliation d'éventuelles écritures nouvelles avant retour arrière : un simple rollback de code ne rapatrie pas automatiquement les données.

### Retour arrière

Avant bascule, aucun retour arrière de données n'est nécessaire : les nouveaux documents restent inactifs, l'application existante conserve ses chemins. Ne rien supprimer automatiquement.

Après bascule, restaurer la version précédente du code et des règles si nécessaire, mais vérifier toutes les écritures faites dans le nouveau modèle pour ne pas perdre de trajets. Le nettoyage éventuel des documents préparatoires exige un manifeste exact et une autorisation distincte.

## Contrôles bloquants

- Toute entrée deviceLinks dont le profil est inconnu, ou invitation avec identité étrangère.
- Association d'un appareil à un profil dont le jeton fait référence à une autre personne.
- Absence d'un appareil Igor authentifié pour lancer le contrôle.
- Rapports métier incompatibles ou couverture des historiques incomplète.
- Sauvegarde non vérifiée, absence de mécanisme d'amorçage de confiance ou de retour arrière avant une migration effective.

Les anciens tokens désactivés et l'absence d'appareil chez un membre peuvent être des avertissements, pas des raisons de révoquer les appareils existants.

## Important

Ce dossier ne contient AUCUN identifiant de connexion réel. L'audit réel ne peut être réalisé dans GitHub : il sera lancé par le propriétaire de l'application dans son navigateur sur Firebase TEST, en lecture seule.

Aucun changement PROD (dépôt team-tool, Firebase team-tool-data ou données) et aucune migration réelle.
