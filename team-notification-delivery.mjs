// Le transport est fourni par l'appelant. Le runner historique garde son propre parcours.
export async function deliverTeamNotification({ db, teamId, title, body, send }) {
  const team = await activeTeam(db, teamId);
  const tokens = await enabledTokens(team);
  for (let start = 0; start < tokens.length; start += 500) {
    try {
      const result = await send({ tokens: tokens.slice(start, start + 500), title, body });
      if (result?.failureCount > 0 || result?.responses?.some(response => response.success !== true)) {
        throw new Error('Le transport signale un échec individuel');
      }
    } catch (cause) {
      const error = new Error('Livraison interrompue : vérifier le lot incertain avant toute reprise', { cause });
      error.confirmedRecipientCount = start;
      error.uncertainRecipientCount = Math.min(500, tokens.length - start);
      error.remainingRecipientCount = Math.max(0, tokens.length - start - 500);
      throw error;
    }
  }
  return tokens.length;
}

export async function previewPendingTeamNotifications({ db, teamId }) {
  const team = await activeTeam(db, teamId);
  const pending = await team.collection('notificationRequests')
    .where('status', '==', 'pending').limit(50).get();
  return pending.docs.map(doc => ({ id: doc.id }));
}

async function activeTeam(db, teamId) {
  if (typeof teamId !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(teamId))
    throw new Error('Identifiant équipe invalide');
  const team = db.collection('teams').doc(teamId);
  if ((await team.get()).data()?.status !== 'active')
    throw new Error('Équipe inactive');
  return team;
}

async function enabledTokens(team) {
  const snapshot = await team.collection('pushTokens').get();
  const tokens = [...new Set(snapshot.docs.map(doc => doc.data())
    .filter(data => data.enabled === true && typeof data.token === 'string' && data.token.trim())
    .map(data => data.token))];
  return tokens;
}

export async function previewTeamNotificationDelivery({ db, teamId }) {
  const requests = await previewPendingTeamNotifications({ db, teamId });
  if (!requests.length) return { requests, recipientCount: 0 };
  const team = await activeTeam(db, teamId);
  return { requests, recipientCount: (await enabledTokens(team)).length };
}

export async function rehearseTeamNotificationRequest({ db, teamId, requestId }) {
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(requestId))
    throw new Error('Identifiant de demande invalide');
  const team = await activeTeam(db, teamId);
  const request = (await team.collection('notificationRequests').doc(requestId).get()).data();
  if (request?.status !== 'pending') throw new Error('Demande en attente introuvable');
  return { requestId, recipientCount: (await enabledTokens(team)).length };
}
