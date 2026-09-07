# Covoiturage 4.6.0-beta.1

- Module privé Igor/Ludo pour le trajet jusqu’au point de ralliement de Delle.
- Visible uniquement pour Igor et Ludo sur la page Prochain.
- Si Igor et Ludo sont dans des groupes différents : aucun trajet Delle commun.
- Le conducteur du groupe principal a priorité : s’il s’agit d’Igor ou Ludo, il doit aussi conduire jusqu’à Delle.
- Sinon, rotation indépendante Delle avec compteurs Igor/Ludo et validation du conducteur réel.
- Données Delle stockées séparément et exclues des groupes, de l’historique et des compteurs principaux.
