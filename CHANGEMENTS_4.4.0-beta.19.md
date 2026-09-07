# 4.4.0-beta.19

- TEST uniquement : lorsqu’une journée comporte plusieurs groupes, chaque groupe possède son propre bouton de validation.
- Une validation partielle s’ajoute aux groupes déjà validés sans les écraser.
- Utilisation d’une transaction Firestore pour éviter qu’une validation simultanée de deux groupes fasse perdre l’autre.
- Un seul groupe conserve le fonctionnement historique avec un bouton unique.
