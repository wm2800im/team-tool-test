// Répétition hors ligne. Aucun SDK Firebase, identifiant cloud ou accès réseau.
import { createHash } from 'node:crypto';
import { simulateLegacyMigration, LEGACY_MEMBERS } from './migration-preview-core.mjs';
import { auditLegacyAccess, TEST_PROJECT } from './phase3-access-core.mjs';
import { decodeSnapshotValue } from './snapshot-core.mjs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function sealRehearsalBackup(input) {
  // Le décodage valide également les marqueurs d'horodatage des accès.
  decodeSnapshotValue(input, (seconds, nanoseconds) => ({ seconds, nanoseconds }));
  const bytes = JSON.stringify(input);
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

function restoreBackup(bytes, expectedSha256) {
  if (createHash('sha256').update(bytes).digest('hex') !== expectedSha256)
    throw new Error('Empreinte de sauvegarde incorrecte');
  const input = JSON.parse(bytes);
  const { snapshot, access, authUsers, approvedAdminUids, activeRules } = input;
  if (access?.projectId !== TEST_PROJECT || snapshot?.sourceProjectId !== TEST_PROJECT ||
      typeof activeRules?.source !== 'string' || !activeRules.source.trim() ||
      typeof activeRules.ruleset !== 'string' || !activeRules.ruleset.trim())
    throw new Error('Sauvegarde TEST incomplète');
  decodeSnapshotValue(input, (seconds, nanoseconds) => ({ seconds, nanoseconds }));
  return { snapshot, access, authUsers, approvedAdminUids };
}

function safeUid(uid) {
  return typeof uid === 'string' && uid.length > 0 && uid.length <= 128 &&
    !uid.includes('/') && uid !== '.' && uid !== '..' && !/^__.*__$/.test(uid);
}

export function prepareRehearsal(bytes, expectedSha256) {
  const { snapshot, access, authUsers, approvedAdminUids } = restoreBackup(bytes, expectedSha256);
  const preview = simulateLegacyMigration(snapshot);
  if (!preview.valid || !preview.stats.sourceDocuments || preview.stats.calendar !== 'exporté' ||
      snapshot.collections.profiles.length !== LEGACY_MEMBERS.length ||
      !Number.isFinite(Date.parse(snapshot.exportedAt)))
    throw new Error('Inventaire métier incomplet ou incohérent');
  const audit = auditLegacyAccess(access);
  if (audit.blocked) throw new Error('Associations historiques incohérentes');
  if (!Array.isArray(authUsers) || authUsers.some(user => !safeUid(user?.uid) ||
        typeof user.disabled !== 'boolean') ||
      !Array.isArray(approvedAdminUids) || approvedAdminUids.length === 0 ||
      approvedAdminUids.some(uid => !safeUid(uid)) ||
      new Set(approvedAdminUids).size !== approvedAdminUids.length)
    throw new Error('Inventaire Auth ou validation des UID administrateurs incomplets');
  const users = new Map(authUsers.map(({ uid, disabled }) => [uid, disabled]));
  if (users.size !== authUsers.length) throw new Error('UID Auth en double');
  const devices = new Map(access.deviceLinks.map(({ id, data }) => [id, data.profileId]));
  for (const uid of devices.keys()) {
    if (!safeUid(uid) || users.get(uid) !== false)
      throw new Error('Appareil sans UID Auth actif');
  }
  for (const uid of approvedAdminUids) {
    if (devices.get(uid) !== 'igor') throw new Error('UID administrateur hors profil Igor');
  }

  const documents = new Map(preview.documents.map(({ path, data }) => [path, data]));
  for (const [uid, memberId] of devices)
    documents.set('teamDeviceLinks/' + uid, { teamId: preview.teamId, memberId });
  for (const uid of approvedAdminUids)
    documents.set('platformAdmins/' + uid, { active: true });
  return { backupSha256: expectedSha256, documents, stats: preview.stats, access: audit.statistics };
}

function planDigest(plan) {
  return digest([plan.backupSha256, [...plan.documents]]);
}

// La cible et son journal sont simulés. Une transaction remplace les deux cartes
// ensemble, ce qui permet de représenter une réponse perdue après validation.
export function openRehearsal(plan, preexisting = new Map()) {
  return { target: structuredClone(preexisting), created: new Map(), planSha256: planDigest(plan) };
}

function verifyRunPlan(plan, run) {
  if (run.planSha256 !== planDigest(plan)) throw new Error('Plan différent de celui du journal');
}

export function compareRehearsal(plan, run) {
  verifyRunPlan(plan, run);
  let missing = 0;
  let conflicting = 0;
  let untracked = 0;
  for (const [path, data] of plan.documents) {
    if (!run.target.has(path)) missing++;
    else if (digest(run.target.get(path)) !== digest(data)) conflicting++;
    else if (run.created.get(path) !== digest(data)) untracked++;
  }
  let extra = 0;
  for (const path of run.target.keys()) {
    if (path.startsWith('teams/wm-original/') && !plan.documents.has(path)) extra++;
  }
  return { expected: plan.documents.size, missing, conflicting, untracked, extra,
    matches: missing + conflicting + untracked + extra === 0 };
}

export function copyRehearsal(plan, run, { afterBatch = () => {} } = {}) {
  const comparison = compareRehearsal(plan, run);
  if (comparison.extra || comparison.conflicting || comparison.untracked)
    throw new Error('Conflit cible : copie interrompue');
  const pending = [...plan.documents].filter(([path]) => !run.created.has(path));
  if (pending.length !== comparison.missing)
    throw new Error('Un document journalisé a disparu de la cible');
  const partitions = [[], [], []];
  for (const entry of pending) {
    const [path] = entry;
    if (path.startsWith('platformAdmins/') || path.startsWith('teamDeviceLinks/'))
      partitions[2].push(entry);
    else if (path.startsWith('memberDirectory/') || /^teams\/wm-original\/(members|shortCodes)\//.test(path) ||
             path === 'teams/wm-original')
      partitions[0].push(entry);
    else partitions[1].push(entry);
  }
  const batches = partitions.flatMap(entries =>
    Array.from({ length: Math.ceil(entries.length / 100) }, (_, i) => entries.slice(i * 100, (i + 1) * 100))
  );
  for (const batch of batches) {
    const target = new Map(run.target);
    const created = new Map(run.created);
    for (const [path, data] of batch) {
      if (target.has(path) || created.has(path)) throw new Error('Conflit concurrent dans un lot');
      target.set(path, structuredClone(data));
      created.set(path, digest(data));
    }
    Object.assign(run, { target, created });
    afterBatch(batch.length);
  }
  const result = compareRehearsal(plan, run);
  if (!result.matches) throw new Error('Comparaison finale en échec');
  return result;
}

export function rollbackRehearsal(plan, run) {
  verifyRunPlan(plan, run);
  const target = new Map(run.target);
  for (const [path, fingerprint] of run.created) {
    if (!plan.documents.has(path) || digest(plan.documents.get(path)) !== fingerprint ||
        !target.has(path) || digest(target.get(path)) !== fingerprint)
      throw new Error('Cible modifiée depuis la copie : retour arrière interrompu');
    target.delete(path);
  }
  const removed = run.created.size;
  Object.assign(run, { target, created: new Map() });
  return removed;
}
