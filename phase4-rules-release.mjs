import { createHash } from 'node:crypto';

const project = 'team-tool-test-data';
const releaseName = 'projects/' + project + '/releases/cloud.firestore';
const rulesetPattern = /^projects\/team-tool-test-data\/rulesets\/[A-Za-z0-9_-]+$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function backupRules(release, ruleset) {
  if (release?.name !== releaseName || !rulesetPattern.test(release.rulesetName) ||
      ruleset?.name !== release.rulesetName || !Array.isArray(ruleset.source?.files) ||
      !ruleset.source.files.length || ruleset.source.files.some(file =>
        typeof file?.name !== 'string' || typeof file.content !== 'string' || !file.content.trim()))
    throw new Error('Sauvegarde des règles TEST invalide');
  const bytes = JSON.stringify({ release, ruleset });
  return { bytes, sha256: hash(bytes) };
}

export function prepareRulesRollback({ bytes, sha256, current, deployedRuleset }) {
  if (hash(bytes) !== sha256) throw new Error('Empreinte de sauvegarde invalide');
  const { release, ruleset } = JSON.parse(bytes);
  backupRules(release, ruleset);
  if (!rulesetPattern.test(deployedRuleset) || current?.name !== releaseName ||
      current.rulesetName !== deployedRuleset || deployedRuleset === release.rulesetName)
    throw new Error('La release TEST active a changé');
  return { name: releaseName, rulesetName: release.rulesetName };
}
