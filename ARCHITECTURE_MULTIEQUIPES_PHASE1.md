# Phase 1 — Architecture multi-équipes (TEST uniquement)

## État et limites de cette phase

**Préparation architecturale, sans activation.** Les nouveaux modules, règles candidates et tests ne sont pas utilisés par l'application actuellement déployée. Le fichier actif `firestore.rules.test.txt`, le code `app.js`, les données et les invitations actuelles restent inchangés.

- Site TEST : conserve `4.8.3-test.2` jusqu'à la phase d'intégration.
- Production : aucun changement.
- Firebase TEST : aucun changement de règle ni de document.
- Pas de nouveau groupe réel créé, ni de migration exécutée.

## Schéma retenu

Un seul projet Firebase par environnement. Chaque équipe a un identifiant immuable `teamId` et des documents isolés :

| Chemin Firestore | Fonction |
|---|---|
| `teams/{teamId}` | Nom, état, configuration générale |
| `teams/{teamId}/members/{memberId}` | Membre, rôle, activité, code court stable |
| `teams/{teamId}/shortCodes/{code}` | Réservation unique du code affiché |
| `teams/{teamId}/availability/{date_memberId}` | Disponibilités de l'équipe |
| `teams/{teamId}/compatibilities/{date_owner_responder}` | Réponses aux impératifs |
| `teams/{teamId}/plans/{date}` | Plan proposé / confirmé |
| `teams/{teamId}/tripDays/{date}` | Trajet réel et historique |
| `teams/{teamId}/preferences/{memberId}` | Préférences individuelles |
| `teams/{teamId}/config/calendar` | Calendrier de l'équipe |
| `teams/{teamId}/invitations/{token}` | Liens personnels d'accès |
| `teams/{teamId}/pushTokens/{uid}` | Jetons notifications propres à l'équipe |
| `teams/{teamId}/notificationRequests/{id}` | Demandes de notifications propres à l'équipe |
| `teams/wm-original/delleTrips/{date}` | Trajets privés Igor/Ludo après migration |
| `memberDirectory/{memberId}` | Rattachement global et immuable du membre à une équipe |
| `teamDeviceLinks/{uid}` | Rattachement d'un appareil à une seule équipe |
| `platformAdmins/{uid}` | Liste de confiance des superadministrateurs |

### Identité

Le `memberId` est une identité globale stable, indépendante du prénom ou des initiales.
Un membre n'appartient qu'à une équipe, car `memberDirectory/{memberId}.teamId` est immuable.

Les nouvelles associations d'appareil se font via `teamDeviceLinks` et une invitation de l'équipe. Un appareil déjà associé via l'ancien `deviceLinks` ne peut pas rejoindre une seconde équipe par les nouveaux liens. Les associations de l'équipe historique seront préparées lors d'une migration d'administration, sans modifier les anciens liens personnels. Un même individu utilisant plusieurs comptes anonymes distincts ne peut pas être reconnu comme la même personne : l'unicité est garantie par `memberId` et par appareil, pas par identité civile.

### Rôles

- **Superadministrateur** : droits globaux sur les équipes. Son UID Firebase doit être provisionné dans `platformAdmins` par un moyen de confiance hors client ; aucun utilisateur ne peut s'accorder ce rôle.
- **Responsable** : visibilité sur sa seule équipe, gestion du calendrier et des invitations de ses membres, édition du nom de l'équipe et des trajets.
- **Membre** : accès et saisie aux données de son équipe uniquement, sans modifier le profil ou les disponibilités d'autrui.

**Phase 1 :** seuls les superadministrateurs peuvent créer des équipes et des inscriptions de membres. L'autonomie du responsable pour ajouter/supprimer des collègues (limite 5) demandera une opération atomique sécurisée à la phase d'administration. En attendant, il peut gérer les invitations des membres déjà inscrits. Le code métier vérifie la capacité 2 à 5 et l'unicité du responsable, mais ces limites ne constituent pas encore un invariant Firestore pour les créations manuelles par superadministrateur.

### Codes courts dans l'historique

Un seul caractère tant que possible. Si le code est occupé dans la même équipe, le membre suivant reçoit deux lettres, puis davantage si nécessaire, ou un suffixe numérique.

Exemple : **Aurélien = A**, **Antoine = An**, **Alexandre = Al**. Le code déjà réservé ne change jamais, même après le départ d'un membre. Deux équipes peuvent utiliser indépendamment les mêmes codes. L'historique affiche les codes séparés : `A · An · Al`. Les statistiques et calculs utilisent les `memberId`, jamais les codes.

Le module `multi-team-core.mjs` contient ces fonctions pures et neuf scénarios de test, sans dépendre de Firebase.

### Binôme Delle

L'exception privée reste réservée à l'équipe historique `wm-original` et aux membres `igor` et `ludo`. Les documents actuels `/delleTrips/{date}` ne sont pas déplacés par la phase 1. L'accès du superadministrateur demeure possible.

## Sécurité et activation

- `firestore.rules.multiteam.candidate.txt` est une **copie des règles TEST actuelles avec des règles nouvelles ajoutées**, pas un fichier publié.
- Les tests sur émulateur local valident les interdictions entre équipes et vérifient que les droits historiques restent inchangés.
- Ne pas publier directement ce fichier ni supprimer les anciennes règles avant un plan de migration, un inventaire des documents et une sauvegarde de restauration.
- Les règles permettent à un membre d'écrire les plans et trajets **de son équipe** : la validation métier détaillée des groupes et des conducteurs doit être ajoutée avec l'interface multi-équipes.
- Les travailleurs de notification, les quotas, les exports/imports et les statistiques doivent passer aux chemins `teams/{teamId}/...` lors des phases suivantes.

## Ordre de déploiement futur (non exécuté)

1. Vérifier la sauvegarde et les règles effectivement publiées sur Firebase TEST.
2. Provisionner en confiance le compte superadministrateur et les références de l'équipe historique, de façon **non destructive**.
3. Déployer les règles candidates après tests de sécurité ; contrôler les anciens accès.
4. Migrer/copi­er les documents d'une seule équipe sur TEST et contrôler les historiques/Delle.
5. Activer une nouvelle interface et une équipe fictive, puis tester la séparation.
6. Préparer une migration PROD seulement sur autorisation explicite.
