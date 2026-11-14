# Phase 2 — Simulation de migration, sans accès Firebase

## Objectif et réalisation

La phase 2 ajoute un analyseur local, sans modifier l'application courante :
- `migration-preview-core.mjs` convertit *en mémoire* une sauvegarde JSON v2 de TeamTool TEST vers un plan de documents hypothétiques de l'équipe `wm-original`.
- `migration-preview.html` fournit une page autonome sur GitHub Pages, qui laisse sélectionner un fichier local.
- `migration-preview-ui.js` n'importe aucun SDK Firebase, ne fait aucune requête réseau et ne contient aucune opération Firestore.
- `tests/migration-preview-core.test.mjs` couvre les cas nominaux et les erreurs.

Ouvrir : https://wm2800im.github.io/team-tool-test/migration-preview.html

Depuis TeamTool TEST, utiliser **Administration → Exporter une copie JSON**, puis choisir ce fichier sur la page de simulation. Le fichier n'est pas envoyé à GitHub ni à Firebase. Le rapport téléchargé ne contient que des compteurs, avertissements et références de documents en erreur, mais peut contenir des informations déduites du nom du fichier.

## Transformation prévue, sans exécution

| Actuel | Cible prévue |
|---|---|
| `profiles/{pid}` | `teams/wm-original/members/{pid}.legacyProfile` |
| `availability/{date_pid}` | `teams/wm-original/availability/{date_pid}` (+ `memberId`) |
| `compatibilities/{date_owner_responder}` | `teams/wm-original/compatibilities/{date_owner_responder}` |
| `legacyStatus/{date_pid}` | `teams/wm-original/legacyStatus/{date_pid}` |
| `plans/{date}` | `teams/wm-original/plans/{date}` |
| `tripDays/{date}` | `teams/wm-original/tripDays/{date}` |
| `preferences/{pid}` | `teams/wm-original/preferences/{pid}` |
| `delleTrips/{date}` | `teams/wm-original/delleTrips/{date}` (privé) |
| `config/calendar` | `teams/wm-original/config/calendar` |
| `plans/_quotaBaselineDirtyV1` | `teams/wm-original/config/_quotaBaselineDirtyV1` |

La simulation prépare aussi `teams/wm-original`, cinq `members`, cinq `shortCodes` et cinq `memberDirectory`. Les identifiants actuels sont conservés : aurelien, etienne, igor, ludo, stephane. Les codes restent A/E/I/L/S. Igor est responsable d'équipe et le superadministrateur restera distinct par un UID Firebase de confiance.

L'équipe proposée est *draft*, non active.

## Invariants vérifiés

1. Le JSON provient de `team-tool-test-data` et respecte la version 2.
2. Les huit collections du snapshot sont présentes, y compris `delleTrips`.
3. Aucun document existant ne reste sans destination prévue ; aucune suppression n'est préparée.
4. Les clés date/profil/répondant restent cohérentes avec les champs.
5. Aucun membre étranger n'est présent dans les historiques, plans ou disponibilités.
6. Les groupes historiques conservent la composition, le conducteur et les horodatages.
7. Les trajets Delle appartiennent au binôme Igor/Ludo, avec destination Delle.
8. Les historiques ne sont pas confondus avec le marqueur de maintenance des quotas.
9. Le calendrier et les préférences sont prévus sans perdre leurs données.
10. La construction n'exécute aucune écriture, et le plan n'est pas directement exploitable pour déployer.

Une anomalie bloquante empêche la production d'un plan complet, mais le rapport l'explique.

## Limites restantes

- Pas de validation sur les **données réelles** tant que l'utilisateur n'a pas sélectionné son export JSON dans la page. Les tests utilisent des fixtures fictives.
- L'export JSON ne contient ni `deviceLinks`, ni `invitations`, ni `platformAdmins`, ni les UID Firebase. Leur migration/rattachement est une étape séparée, obligatoire.
- Les caches de quota hébergés dans d'autres documents `config` ne sont pas exportés. Leur recalcul sera nécessaire lors d'une activation future.
- Aucun accès à la console Firebase, aucune règle publiée, aucune migration exécutée.
- Les horodatages du JSON devront être reconvertis en `Timestamp` Firebase lors d'une migration réelle ; la simulation les conserve tels quels.
- Cette phase ne change ni `app.js`, ni `public-config.js`, ni `index.html`, ni `service-worker.js`. La version 4.8.3-test.2 reste identique.

## Prochain jalon

L'utilisateur exécute une simulation locale, inspecte les anomalies et transmet seulement le rapport si besoin. Toute **migration réelle**, même dans TEST, exigera une nouvelle autorisation explicite et une procédure de retour arrière avec sauvegarde vérifiée.
