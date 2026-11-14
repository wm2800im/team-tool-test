import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './phase4-copy-rehearsal.test.mjs';
import { sealRehearsalBackup, prepareRehearsal } from '../phase4-copy-rehearsal.mjs';
import { openCopyEmulator, applyEmulatorPlan } from '../phase4-firestore-emulator.mjs';

test('Firestore : reprise durable, comparaison complète et retour arrière', async () => {
  const { db, close } = openCopyEmulator();
  try {
    const backup = sealRehearsalBackup(fixture());
    const plan = prepareRehearsal(backup.bytes, backup.sha256);
    const target = db.doc('teams/wm-original');
    const legacy = db.doc('deviceLinks/igor-device-0');
    await legacy.create({ profileId: 'igor' });
    await target.create({ status: 'existing' });
    await assert.rejects(applyEmulatorPlan({ db, plan }), /préexistant/);
    assert.equal((await target.get()).data().status, 'existing');
    await target.delete();
    await assert.rejects(applyEmulatorPlan({ db, plan, afterBatch() { throw new Error('Réponse perdue'); } }), /Réponse perdue/);
    await applyEmulatorPlan({ db, plan });
    await applyEmulatorPlan({ db, plan, afterBatch() { assert.fail('Lot inattendu'); } });
    assert.equal(plan.stats.sourceDocuments, 3377);
    assert.equal((await target.collection('delleTrips').get()).size, 3);
    assert.equal((await db.collection('teamDeviceLinks').get()).size, 9);
    assert.equal((await db.collection('platformAdmins').get()).size, 1);
    await applyEmulatorPlan({ db, plan, rollback: true });
    assert.equal((await target.get()).exists, false);
    assert.equal((await target.collection('delleTrips').get()).size, 0);
    assert.deepEqual((await legacy.get()).data(), { profileId: 'igor' });
  } finally {
    await close();
  }
});
