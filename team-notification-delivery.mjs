// Le transport est fourni par l'appelant. Le runner historique garde son propre parcours.
export async function deliverTeamNotification({ db, teamId, title, body, send }) {
  if (typeof teamId !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(teamId))
    throw new Error('Identifiant équipe invalide');
  const team = db.collection('teams').doc(teamId);
  if ((await team.get()).data()?.status !== 'active')
    throw new Error('Équipe inactive');
  const snapshot = await team.collection('pushTokens').get();
  const tokens = [...new Set(snapshot.docs.map(doc => doc.data())
    .filter(data => data.enabled === true && typeof data.token === 'string' && data.token.trim())
    .map(data => data.token))];
  if (tokens.length) await send({ tokens, title, body });
  return tokens.length;
}

export async function previewPendingTeamNotifications({ db, teamId }) {
  if (typeof teamId !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(teamId))
    throw new Error('Identifiant équipe invalide');
  const team = db.collection('teams').doc(teamId);
  if ((await team.get()).data()?.status !== 'active')
    throw new Error('Équipe inactive');
  const pending = await team.collection('notificationRequests')
    .where('status', '==', 'pending').limit(50).get();
  return pending.docs.map(doc => ({ id: doc.id }));
}
