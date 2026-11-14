# Méthode d'exécution autonome — TeamTool TEST

## Objectif

Accepter une demande métier unique, puis avancer sans solliciter le propriétaire à chaque erreur technique. Périmètre : dépôt `wm2800im/team-tool-test` et émulateurs Firestore. PROD et les documents historiques sont intouchables. Les déploiements Firebase TEST dépendent des contrôles de sécurité explicités dans `ACTIVATION_TEST_GATES.md`.

## Répartition des responsabilités (un orchestrateur, des rôles indépendants)

- **Coordinateur** : lit le besoin, `ROADMAP.md`, les PR et les exécutions. Affecte une tâche sans doublon, tient l'état et reprend la suivante.
- **Développeur** : réalise un changement minimal sur branche dédiée, avec tests de régression et versions cohérentes.
- **Validateur indépendant** : contrôle la correction et reproduit l'échec avant/après ; vérifie que les tests couvrent le cas réel, pas uniquement des stubs.
- **Sécurité / Firebase** : vérifie séparément les frontières TEST/PROD, IAM, règles, sauvegarde et restauration. Refuse toute publication sans preuve.
- **Intégrateur** : inspecte les checks **au dernier SHA**, fusionne si les conditions sont satisfaites, vérifie le site TEST. Ne confond jamais `skipped` et `success`.

Les rôles peuvent être exercés par différents agents ou successivement par un agent, mais le validateur doit vérifier indépendamment les hypothèses du développeur. Définir cinq rôles dans `AGENTS.md` ne fait **pas** tourner cinq agents automatiquement : un moteur d'exécution doté de droits et de déclencheurs est nécessaire.

## Boucle autonome sur code et tests

1. Une issue ou une PR spécifie le besoin, les critères observables et les interdictions.
2. Exécuter les tests, consulter les logs, diagnostiquer la **première cause déterministe**, la reproduire.
3. Faire corriger en branche courte. Ajouter un test qui aurait échoué avant la correction.
4. Lancer CI sur PR, examiner le dernier SHA. En cas d'échec corrigeable, reprendre à l'étape 2 sans demander de clic à l'utilisateur.
5. Après 2 corrections infructueuses **de la même cause**, ouvrir un ticket de blocage avec diagnostic, preuve, décision nécessaire et solution conservatoire ; passer à une tâche indépendante prête.
6. Si les contrôles sont verts et que le lot est réversible et local au dépôt TEST, fusionner en respectant les protections ; vérifier le déploiement GitHub Pages et l'interface.
7. Consigner le commit, les tests, le résultat, et la prochaine tâche. Le coordinateur reprend sans attendre la prochaine réunion.

Ne pas relancer aveuglément un échec déterministe : modifier la cause et lancer une nouvelle exécution au bon commit.

## Classification des incidents

| Type | Décision sans intervention humaine |
| --- | --- |
| Syntaxe, test, code métier, documentation | Corriger, tester, PR, fusion sécurisée |
| Réponse REST 401/403 | Identifier précisément la permission et le principal concernés, proposer le rôle minimal ; **pas d'élévation IAM automatique** |
| Ressource REST 404 | Confirmer endpoint et projet, déterminer absent vs masqué ; ne rien créer par défaut |
| Échec réseau / 429 / 5xx | Réessai borné avec temporisation et journalisation |
| Règles incompatibles / données historiques | Arrêter la publication, démontrer sur émulateur, proposer une correction |
| Sauvegarde absente / restauration non prouvée | Ne pas publier ; préparer une procédure vérifiable |
| Modification des permissions, des règles réelles ou suppression | Étape protégée, accord approprié et preuve de retour arrière |
| PROD | Interdit, hors périmètre |

## Accès requis pour éviter les interventions répétées

Configurer **une seule fois**, puis auditer :
- Un exécutant Codex/Work avec accès au dépôt **TEST** et permission de lire logs, créer branches/PR, relancer les tests, fusionner les PR autorisées.
- Un déclencheur durable (échec CI, ouverture d'une issue, tâche planifiée) qui démarre réellement l'exécutant, pas seulement un tableau de bord.
- Une identité Google Cloud *lecture seule TEST*, liée à une liste blanche de workflows GitHub signés et à `main`, pour les diagnostics.
- Une identité distincte *publication TEST*, limitée au workflow protégé `firebase-test-deploy.yml`, à l'environnement GitHub approprié et à une opération explicitement approuvée.
- Une vraie sauvegarde Firestore complète et un essai de restauration isolé. La sauvegarde des **règles** seule n'est pas une sauvegarde des **données**.

Le connecteur GitHub disponible depuis ce chat **ne permet pas `workflow_dispatch`**. Tant qu'il n'existe pas d'exécutant doté de ce droit, aucune promesse de relance autonome d'un workflow manuel ne doit être faite. Ne pas élargir une condition OIDC par facilité.

## Essai d'acceptation de l'autonomie

Provoquer volontairement un test unitaire défaillant sur une PR TEST. L'exécutant doit retrouver la cause, ajouter un test de non-régression, réparer, faire passer CI, fusionner et faire un rapport **sans demander à l'utilisateur de cliquer dans GitHub**. Ensuite seulement tester l'équivalent en lecture seule Firebase TEST, puis la recette réelle avec sauvegarde et autorisations.

## Situation du 14/11/2026

Sur le run `43613683533`, le jeton OIDC et le contrôle de permissions PROD (deux permissions examinées) ont réussi. Le précontrôle affichait seulement 1/5 : le script rejetait une base Firestore saine lorsqu'elle n'avait pas un champ `state: ACTIVE`, alors que le schéma REST `Database` n'expose pas ce champ. La correction du validateur et la publication de diagnostics HTTP sûrs sont traitées en PR dédiée. Les trois autres vérifications Firebase TEST restent à trier après exécution.
