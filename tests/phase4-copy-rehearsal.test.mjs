import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LEGACY_MEMBERS } from '../migration-preview-core.mjs';
import {
  sealRehearsalBackup, prepareRehearsal, openRehearsal,
  copyRehearsal, compareRehearsal, rollbackRehearsal
} from '../phase4-copy-rehearsal.mjs';

const projectId = 'team-tool-test-data';
const timestamp = { __teamtoolSnapshotType: 'timestamp', seconds: 1794787200, nanoseconds: 123456000 };
const day = index => new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10);
const rows = (count, id, data) => Array.from({ length: count }, (_, i) => ({ id: id(i), data: data(i) }));
const datedMember = i => day(i) + '_igor';

export function fixture() {
  return {
    snapshot: {
      schema: 2, sourceProjectId: projectId, exportedAt: '2026-11-14T07:00:00Z',
      calendar: { exceptions: [] },
      collections: {
        profiles: LEGACY_MEMBERS.map(({ memberId, firstName }) => ({ id: memberId, data: { firstName } })),
        availability: rows(51, datedMember, () => ({ status: 'present' })),
        compatibilities: rows(36, i => day(i) + '_etienne_igor', () => ({ response: 'yes' })),
        legacyStatus: rows(2000, datedMember, () => ({ status: 'present' })),
        plans: rows(9, day, () => ({ groups: [] })),
        tripDays: rows(1268, day, i => ({
          groups: i < 1140 ? [{ members: ['igor', 'ludo'], driver: 'igor', validatedAt: timestamp }] : []
        })),
        preferences: LEGACY_MEMBERS.map(({ memberId }) => ({ id: memberId, data: { theme: 'dark' } })),
        delleTrips: rows(3, day, () => ({
          destination: 'Delle', privatePair: 'igor_ludo', members: ['igor', 'ludo'],
          driver: 'ludo', validatedAt: timestamp
        }))
      }
    },
    access: {
      projectId, currentUid: 'igor-device-0',
      deviceLinks: rows(9, i => 'igor-device-' + i, i => ({
        profileId: 'igor', inviteToken: i === 0 ? 'current-test-invite' : 'revoked-test-invite'
      })),
      invitations: [
        { id: 'current-test-invite', data: { profileId: 'igor', active: true } },
        { id: 'revoked-test-invite', data: { profileId: 'igor', active: false } }
      ]
    },
    authUsers: Array.from({ length: 9 }, (_, i) => ({ uid: 'igor-device-' + i, disabled: false })),
    approvedAdminUids: ['igor-device-0'],
    activeRules: { ruleset: 'fixture', source: 'service cloud.firestore {}' }
  };
}

function prepare(input = fixture()) {
  const { bytes, sha256 } = sealRehearsalBackup(input);
  return prepareRehearsal(bytes, sha256);
}

test('Sauvegarde vérifiable et intégrité des 3 377 documents et trois trajets Delle', async t => {
  const input = fixture();
  const original = structuredClone(input);
  const { bytes, sha256 } = sealRehearsalBackup(input);
  const directory = await mkdtemp(join(tmpdir(), 'teamtool-phase4-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const backup = join(directory, 'backup.json');
  await writeFile(backup, bytes, { flag: 'wx' });
  const restored = await readFile(backup, 'utf8');
  assert.throws(() => prepareRehearsal(restored + ' ', sha256), /Empreinte/);
  assert.deepEqual(JSON.parse(restored), original);
  const plan = prepareRehearsal(restored, sha256);
  const run = openRehearsal(plan);
  assert.equal(plan.stats.sourceDocuments, 3377);
  assert.equal(plan.stats.mappedSourceDocuments, 3377);
  assert.equal(plan.stats.preparedTargetDocuments, 3389);
  assert.equal(plan.stats.tripGroups, 1140);
  assert.equal(plan.access.totalDevices, 9);
  assert.equal(plan.access.activeInvitations, 1);
  assert.equal(copyRehearsal(plan, run).expected, 3399);
  assert.equal(run.target.get('teams/wm-original').status, 'draft');
  assert.equal(run.target.get('platformAdmins/igor-device-0').active, true);
  assert.equal(run.target.has('platformAdmins/igor-device-1'), false);
  assert.deepEqual(run.target.get('teamDeviceLinks/igor-device-1'), { teamId: 'wm-original', memberId: 'igor' });
  assert.equal(plan.stats.delleTrips, 3);
  for (const { id, data } of original.snapshot.collections.delleTrips)
    assert.deepEqual(run.target.get('teams/wm-original/delleTrips/' + id), { ...data, date: id });
  assert.equal(run.target.get('teams/wm-original/tripDays/' + day(0)).groups[0].driver, 'igor');
  assert.deepEqual(input, original);
});

test('Reprise après réponse perdue, lots bornés, relance idempotente et retour arrière', () => {
  const plan = prepare();
  const existing = new Map([['teams/other', { status: 'active' }], ['tripDays/' + day(0), { legacy: true }]]);
  const run = openRehearsal(plan, existing);
  assert.throws(() => copyRehearsal(plan, run, {
    afterBatch: count => { assert.equal(count, 16); throw new Error('Réponse perdue'); }
  }), /Réponse perdue/);
  assert.equal(run.created.size, 16);
  assert.deepEqual(run.target.get('teams/wm-original/shortCodes/I'), { memberId: 'igor' });
  assert.equal(run.target.has('platformAdmins/igor-device-0'), false);
  const recovered = structuredClone(run);
  const sizes = [];
  assert.equal(copyRehearsal(plan, recovered, { afterBatch: count => sizes.push(count) }).matches, true);
  assert.equal(sizes.reduce((sum, size) => sum + size, 0), 3383);
  assert.equal(sizes.at(-1), 10);
  assert.ok(sizes.every(size => size <= 100));
  assert.equal(copyRehearsal(plan, recovered, { afterBatch: () => assert.fail('Lot inattendu') }).matches, true);
  assert.equal(rollbackRehearsal(plan, recovered), 3399);
  assert.deepEqual(recovered.target, existing);
  assert.equal(rollbackRehearsal(plan, recovered), 0);
});

test('Un document préexistant, même identique, ou un document hors plan bloque la copie', () => {
  const plan = prepare();
  for (const existing of [
    new Map([['teams/wm-original', plan.documents.get('teams/wm-original')]]),
    new Map([['memberDirectory/igor', { teamId: 'other' }]]),
    new Map([['teams/wm-original/delleTrips/unexpected', {}]])
  ]) {
    const run = openRehearsal(plan, existing);
    assert.throws(() => copyRehearsal(plan, run), /Conflit cible/);
    assert.equal(run.created.size, 0);
    assert.deepEqual(run.target, existing);
  }
});

test('Une dérive de contenu ou de plan empêche la reprise et protège le retour arrière', () => {
  const plan = prepare();
  const run = openRehearsal(plan);
  copyRehearsal(plan, run);
  const path = 'teams/wm-original/delleTrips/' + day(0);
  run.target.get(path).driver = 'igor';
  assert.equal(compareRehearsal(plan, run).conflicting, 1);
  assert.throws(() => rollbackRehearsal(plan, run), /Cible modifiée/);
  assert.equal(run.target.size, plan.documents.size);
  run.target.set(path, structuredClone(plan.documents.get(path)));
  run.target.delete(path);
  assert.throws(() => copyRehearsal(plan, run), /journalisé a disparu/);
  const newer = fixture();
  newer.snapshot.exportedAt = '2026-11-15T07:00:00Z';
  assert.throws(() => copyRehearsal(prepare(newer), run), /Plan différent/);
});

test('Blocage des UID orphelins ou désactivés, des invitations croisées et de PROD', () => {
  for (const [change, reason] of [
    [input => input.authUsers.pop(), /UID Auth actif/],
    [input => { input.authUsers[1].disabled = true; }, /UID Auth actif/],
    [input => input.approvedAdminUids.push('unapproved-user'), /hors profil Igor/],
    [input => { input.access.invitations[1].data.profileId = 'ludo'; }, /Associations historiques/],
    [input => { input.snapshot.sourceProjectId = 'team-tool-data'; }, /Sauvegarde TEST/],
    [input => { delete input.activeRules; }, /Sauvegarde TEST/]
  ]) {
    const input = fixture();
    change(input);
    assert.throws(() => prepare(input), reason);
  }
});

