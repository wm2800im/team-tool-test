import test from 'node:test';
import assert from 'node:assert/strict';
import { backupRules, prepareRulesRollback, rehearseRulesRollback } from '../phase4-rules-release.mjs';

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

test('La recette relit la sauvegarde et détecte les erreurs et changements côté API', async () => {
  function mock(overrides = {}) {
    const responses = [release, current];
    return {
      readRelease: async () => responses.shift(),
      readRuleset: async name => { assert.equal(name, release.rulesetName); return ruleset; },
      expectedRuleset: release.rulesetName,
      deployedRuleset,
      storeBackup: async ({ bytes }) => bytes,
      ...overrides
    };
  }
  assert.deepEqual(await rehearseRulesRollback(mock()), release);
  await assert.rejects(rehearseRulesRollback(mock({ storeBackup: async () => { throw new Error('Stockage indisponible'); } })), /Stockage indisponible/);
  await assert.rejects(rehearseRulesRollback(mock({ storeBackup: async ({ bytes }) => bytes + ' ' })), /Empreinte/);
  await assert.rejects(rehearseRulesRollback(mock({ readRelease: async () => release })), /a changé/);
});
