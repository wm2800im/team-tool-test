import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    // Simule un échec RPC avant que Firestore n'ait commencé la transaction.
    const disconnected = {
      projectId: db.projectId,
      doc: db.doc.bind(db),
      runTransaction: async () => { throw Object.assign(new Error('Transport indisponible'), { code: 14 }); }
    };
    await assert.rejects(applyEmulatorPlan({ db: disconnected, plan }), { code: 14 });
    assert.equal((await target.get()).exists, false);
    await assert.rejects(applyEmulatorPlan({ db, plan, afterBatch() { throw new Error('Réponse perdue'); } }), /Réponse perdue/);
    await applyEmulatorPlan({ db, plan });
    await applyEmulatorPlan({ db, plan, afterBatch() { assert.fail('Lot inattendu'); } });
    assert.equal(plan.stats.sourceDocuments, 3377);
    assert.equal((await target.collection('delleTrips').get()).size, 3);
    assert.equal((await db.collection('teamDeviceLinks').get()).size, 9);
    assert.equal((await db.collection('platformAdmins').get()).size, 1);
    const env = await initializeTestEnvironment({ projectId: db.projectId });
    try {
      const client = env.authenticatedContext('igor-device-1').firestore();
      const journal = (await db.collectionGroup('batches').get()).docs[0];
      await assertFails(getDoc(doc(client, journal.ref.path)));
      await assertFails(setDoc(doc(client, journal.ref.path), { paths: [] }));
      await assertFails(setDoc(doc(client, 'teams/wm-original/tripDays/2030-01-01'), { date: '2030-01-01' }));
    } finally {
      await env.cleanup();
    }
    await applyEmulatorPlan({ db, plan, rollback: true });
    assert.equal((await target.get()).exists, false);
    assert.equal((await target.collection('delleTrips').get()).size, 0);
    assert.deepEqual((await legacy.get()).data(), { profileId: 'igor' });
  } finally {
    await close();
  }
});
