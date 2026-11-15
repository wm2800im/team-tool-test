# Changement d’équipe V1 TEST

## Rattachements

Conserver le lien simple actuel. Pour une adhésion supplémentaire, envisager une entrée `teamDeviceLinks/{uid}/memberships/{teamId}` contenant le `memberId` propre à cette équipe. Le client peut énumérer uniquement ses adhésions. Toute écriture de rattachement doit passer par le mécanisme d’invitation validé ou un provisionnement autorisé. Le choix affiché reste une préférence locale et ne confère aucun droit.

Dans les règles candidates, résoudre l’identité à partir de l’équipe demandée. Vérifier le statut de l’équipe, le membre actif et la correspondance avec l’annuaire. Appliquer la même identité aux contrôles des rôles, des disponibilités, des préférences et des trajets privés. Le lien simple reste utilisable pour son équipe. Une adhésion révoquée ne doit jamais être rétablie par le lien simple. Définir et tester la priorité entre les deux représentations avant de les combiner.

## Changement d’équipe

Avant de charger l’équipe suivante, désabonner les écouteurs et masquer les données courantes. Ignorer les réponses tardives de la session précédente. Recharger le profil, le groupe, le calendrier et les compteurs de la nouvelle équipe. En cas de refus du serveur, présenter le sélecteur sans afficher d’anciennes données sous le nouveau nom.

## Recette sur émulateur

- Un UID autorisé dans A et B passe de A à B puis revient à A. Des valeurs distinctes à la même date prouvent que les données affichées changent.
- Un UID autorisé uniquement dans A peut lire et modifier ses propres données dans A. Les lectures et écritures dans B échouent, même si B est choisi localement.
- Une équipe brouillon, un membre inactif, une entrée avec un annuaire incohérent et une adhésion révoquée sont refusés.
- Un lien simple existant fonctionne encore. Le parcours historique reste couvert par les suites existantes.
- Les rôles de responsable et l’accès aux trajets privés sont évalués dans l’équipe demandée.

Les règles restent candidates. La recette utilise des équipes et des UID fictifs. La publication et toute modification des accès réels suivent le processus d’autorisation TEST.
