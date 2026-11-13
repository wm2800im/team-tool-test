# Lot C — règles Firebase TEST

Les règles GitHub ont été comparées au contenu de Firebase TEST transmis par l'utilisateur.

## Correctifs
- `deviceLinks` : création d'appareil validée (champs connus, types et token).
- `availability` : écriture limitée au propriétaire, identifiant cohérent avec date/profil, champs d'identification immuables.
- `compatibilities` : même protection sur date, propriétaire de l'impératif et répondant.
- Administrateur Igor : possibilité de simuler les profils conservée **en TEST uniquement**.
- `delleTrips` : règles Igor/Ludo déjà déployées, mais absentes du fichier GitHub, réintégrées à l'identique.
- `notificationRequests`, `preferences`, `pushTokens` : alignement ciblé avec la logique PROD.
- Pas de modification des autorisations `plans` et `tripDays` pour ce lot.

## Validation
Tests de permissions via l'émulateur Firestore sous le faux projet `demo-teamtool-rules`. Le workflow de test n'accède à aucun projet Firebase réel.

## Limites
Le changement du fichier GitHub **ne déploie pas** les règles dans la console Firebase TEST.
Publier dans Firebase TEST exige un accès autorisé distinct. Ne pas déployer vers PROD.
Avant publication, vérifier que les documents historiques encore modifiables possèdent `date`, `profileId`, `ownerId`, `responderId` selon la collection.
Les droits globaux sur `plans` et `tripDays`, ainsi que l'administration fondée sur `profileId == 'igor'`, devront être refondus pour le multi-groupe.
Aucune donnée Firebase n'a été modifiée.
