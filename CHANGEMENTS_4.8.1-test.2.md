# Covoiturage 4.8.1-test.2

Sur la base de 4.8.1-test.1, environnement TEST exclusivement.

- Les personnes ayant répondu **Oui** à l'impératif d'un collègue sont prioritaires dans **son** groupe.
- La recherche des répartitions minimise d'abord la séparation des accords « Oui », puis les personnes seules et le nombre de véhicules.
- Un refus « Non » reste une incompatibilité explicite et n'est jamais contourné pour réunir le groupe.
- Le même principe de priorité aux « Oui » est appliqué aux propositions provisoires, sous réserve des réponses encore inconnues.
- Les groupes manuellement enregistrés restent manuels ; l'affichage des réponses en attente et des refus reste inchangé.
- Aucune nouvelle commande ni modification de la production ou des données Firebase.
- Cas de régression : quatre Oui / un Non, passage Non vers Oui, attente, deux impératifs et refus contradictoire, aucun impératif.

Contrôles : `node --check app.js`, `node --test tests/*.test.mjs`, GitHub Actions TEST.
