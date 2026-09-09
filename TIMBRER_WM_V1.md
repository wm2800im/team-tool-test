# TIMBRER WM — V1 iOS

Prototype natif iOS 26 pour éviter de dépasser une durée maximale de travail à partir des valeurs du portail Vysual.

## Fonctions incluses

- réglages personnels : heure du contrôle, durée maxi (9:00 par défaut), rappel (5 min par défaut) ;
- connexion à `time.willemin-macodel.com` dans une WebView ; le mot de passe n'est jamais enregistré par l'app ;
- Apple Passwords / Bitwarden peuvent remplir le formulaire avec Face ID ;
- conservation locale des seuls cookies de session Vysual dans le trousseau iOS ;
- bouton **Tester Vysual** affichant Dues / Effectuées / Restant / Absence quand elles sont détectées ;
- calcul de l'heure de limite ;
- une seule alarme AlarmKit **TIMBRER WM** est maintenue ;
- bouton **Tester l'alarme dans 1 minute** ;
- action App Shortcuts **Contrôler TIMBRER WM** pour l'automatisation quotidienne ;
- notification locale si la session Vysual a expiré.

## Source

Le paquet `timbrer-wm-v1-source.zip` contient le projet complet et un `README.md` détaillé. La CI de cette branche décompresse le projet, génère le projet Xcode avec XcodeGen puis tente une compilation iOS Simulator sans signature.

## Installation sur iPhone

Un Mac avec Xcode 26 est nécessaire pour installer cette V1 directement sur un iPhone. Une fois la compilation validée, ouvrir le projet, choisir une Personal Team dans Signing & Capabilities, sélectionner l'iPhone et lancer Run.

Aucun identifiant ni mot de passe WM n'est stocké dans GitHub.
