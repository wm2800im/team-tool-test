import test from 'node:test';
import assert from 'node:assert/strict';
import { backupRules, prepareRulesRollback } from '../phase4-rules-release.mjs';

const prefix = 'projects/team-tool-test-data/';
const release = { name: prefix + 'releases/cloud.firestore', rulesetName: prefix + 'rulesets/before' };
const ruleset = { name: release.rulesetName, source: { files: [{ name: 'firestore.rules', content: 'service cloud.firestore {}' }] } };
const deployedRuleset = prefix + 'rulesets/after';
const current = { ...release, rulesetName: deployedRuleset };

test('Retour arrière vers la release sauvegardée avec empreinte vérifiée', () => {
  assert.deepEqual(prepareRulesRollback({ ...backupRules(release, ruleset), deployedRuleset, current }), release);
});

test('Refuse une sauvegarde altérée, un autre projet ou une release qui a évolué', () => {
  const backup = backupRules(release, ruleset);
  const args = { ...backup, deployedRuleset, current };
  assert.throws(() => prepareRulesRollback({ ...args, bytes: backup.bytes + ' ' }), /Empreinte/);
  assert.throws(() => prepareRulesRollback({ ...args, current: release }), /a changé/);
  assert.throws(() => backupRules({ ...release, name: release.name.replace('-test', '') }, ruleset), /invalide/);
});
