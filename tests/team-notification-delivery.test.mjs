import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverTeamNotification, previewPendingTeamNotifications, previewTeamNotificationDelivery } from '../team-notification-delivery.mjs';

test('Seuls les jetons actifs de l’équipe demandée sont transmis', async () => {
  const reads = [];
  const messages = [];
  const db = { collection(root) {
    assert.equal(root, 'teams');
    return { doc(team) {
      reads.push(team);
      return {
        get: async () => ({ data: () => ({ status: team === 'draft' ? 'draft' : 'active' }) }),
        collection(name) {
          assert.equal(name, 'pushTokens');
          return { get: async () => ({ docs: [
            { token: team + '-enabled', enabled: true },
            { token: team + '-enabled', enabled: true },
            { token: team + '-disabled', enabled: false }
          ].map(data => ({ data: () => data })) }) };
        }
      };
    } };
  } };
  const input = { db, title: 'Planning', body: 'Test', send: message => messages.push(message) };
  assert.equal(await deliverTeamNotification({ ...input, teamId: 'team-b' }), 1);
  assert.deepEqual(messages, [{ tokens: ['team-b-enabled'], title: 'Planning', body: 'Test' }]);
  await assert.rejects(deliverTeamNotification({ ...input, teamId: '../team-a' }), /invalide/);
  await assert.rejects(deliverTeamNotification({ ...input, teamId: 'draft' }), /inactive/);
  assert.deepEqual(reads, ['team-b', 'draft']);
  assert.equal(messages.length, 1);
});

test('La prévisualisation lit uniquement les demandes en attente de l’équipe active', async () => {
  const db = { collection(root) {
    assert.equal(root, 'teams');
    return { doc(team) {
      assert.equal(team, 'team-b');
      return {
        get: async () => ({ data: () => ({ status: 'active' }) }),
        collection(name) {
          if (name === 'pushTokens') return { get: async () => ({ docs: [{ data: () => ({ enabled: true, token: 'synthetic-b' }) }] }) };
          assert.equal(name, 'notificationRequests');
          return { where(...filter) {
            assert.deepEqual(filter, ['status', '==', 'pending']);
            return { limit(max) {
              assert.equal(max, 50);
              return { get: async () => ({ docs: [{ id: 'request-b' }] }) };
            } };
          } };
        }
      };
    } };
  } };
  assert.deepEqual(await previewPendingTeamNotifications({ db, teamId: 'team-b' }), [{ id: 'request-b' }]);
  assert.deepEqual(await previewTeamNotificationDelivery({ db, teamId: 'team-b' }), {
    requests: [{ id: 'request-b' }], recipientCount: 1
  });
});
