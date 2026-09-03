# Cahier des modifications — 4.4.0-beta.1

## Prochain
- bascule du jour à 09h ;
- saute les jours non travaillés ;
- affiche la situation des 5 personnes ;
- propose automatiquement le ou les groupes possibles ;
- affiche les compteurs de chaque combinaison ;
- propose le conducteur selon l’historique ;
- permet de changer le conducteur et de valider directement ;
- bouton Modifier les groupes pour les cas particuliers.

## Planning / Groupes
- jours travaillés uniquement dans le planning ;
- impératifs par quarts d’heure ;
- saisie a posteriori libre dans Groupes ;
- 2+2, 2+3 et plusieurs groupes le même jour conservés ;
- anti-chevauchement d’une personne entre deux groupes.

## Historique + bilan
- fusion en un seul onglet ;
- 4 KPI : Conducteur, Passager, Jours covoiturés, Jours renseignés ;
- suppression Voiture économisée / détail des statuts / lecture du bilan ;
- export CSV ;
- compteurs de la combinaison affichés après chaque trajet ;
- Modifier / Supprimer conservés ;
- points de vigilance calculés dynamiquement ; si aucun : Tout est OK.

## Paramètres
- menu ☰ ;
- thème Auto / Clair / Sombre enregistré par utilisateur ;
- notifications OFF par défaut ;
- rappel fixe à 20h si lendemain travaillé et non renseigné ;
- version déplacée dans À propos.

## Admin
- suppression du complément historique Excel ;
- calendrier Jura intégré ;
- exceptions entreprise modifiables ;
- export de copie TEST ;
- liens personnels et appareils conservés.

## Environnement TEST
- Firebase et GitHub séparés de la production ;
- bandeau MODE TEST ;
- switch des 5 utilisateurs ;
- possibilité d’importer une copie de la production ;
- notifications testables manuellement via GitHub Actions.
