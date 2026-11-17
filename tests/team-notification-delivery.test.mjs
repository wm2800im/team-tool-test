import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverTeamNotification, previewPendingTeamNotifications, previewTeamNotificationDelivery, rehearseTeamNotificationRequest } from '../team-notification-delivery.mjs';

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

test('Une équipe active sans destinataire valide ne déclenche aucun transport', async () => {
  const db = { collection: () => ({ doc: () => ({
    get: async () => ({ data: () => ({ status: 'active' }) }),
    collection: name => {
      assert.equal(name, 'pushTokens');
      return { get: async () => ({ docs: [
        { data: () => ({ enabled: false, token: 'disabled' }) },
        { data: () => ({ enabled: true, token: ' ' }) },
        { data: () => ({ enabled: true, token: null }) }
      ] }) };
    }
  }) }) };
  assert.equal(await deliverTeamNotification({
    db, teamId: 'team-b', title: 'Planning', body: 'Test',
    send: () => assert.fail('Le transport ne doit pas être appelé')
  }), 0);
});

test('Une demande est vérifiée dans le même espace que ses destinataires', async () => {
  const reads = [];
  const db = { collection(root) {
    assert.equal(root, 'teams');
    return { doc(team) {
      assert.equal(team, 'team-b');
      return {
        get: async () => ({ data: () => ({ status: 'active' }) }),
        collection(name) {
          reads.push(name);
          if (name === 'notificationRequests') return { doc: id => ({
            get: async () => ({ data: () => id === 'b-1' ? { status: 'pending' } : undefined })
          }) };
          assert.equal(name, 'pushTokens');
          return { get: async () => ({ docs: [{ data: () => ({ enabled: true, token: 'synthetic-b' }) }] }) };
        }
      };
    } };
  } };
  await assert.rejects(rehearseTeamNotificationRequest({ db, teamId: 'team-b', requestId: 'a-1' }), /introuvable/);
  assert.deepEqual(reads, ['notificationRequests']);
  assert.deepEqual(await rehearseTeamNotificationRequest({ db, teamId: 'team-b', requestId: 'b-1' }),
    { requestId: 'b-1', recipientCount: 1 });
  assert.deepEqual(reads, ['notificationRequests', 'notificationRequests', 'pushTokens']);
});
