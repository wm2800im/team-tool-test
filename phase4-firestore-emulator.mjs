import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createHash, randomUUID } from 'node:crypto';
import { decodeSnapshotValue, encodeSnapshotValue } from './snapshot-core.mjs';

export function openCopyEmulator() {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? ''))
    throw new Error('Émulateur Firestore local obligatoire');
  const app = initializeApp({ projectId: 'demo-teamtool-multiteam' }, randomUUID());
  return { db: getFirestore(app), close: () => deleteApp(app) };
}

function signature(value) {
  return JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

export async function applyEmulatorPlan({ db, plan, rollback = false, afterBatch = () => {} }) {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '') ||
      db.projectId !== 'demo-teamtool-multiteam')
    throw new Error('Projet émulateur obligatoire');
  const entries = [...plan.documents];
  const id = createHash('sha256').update(signature([plan.backupSha256, entries])).digest('hex');
  const ordered = [
    entries.filter(([path]) => /^(memberDirectory\/|teams\/wm-original($|\/(members|shortCodes)\/))/.test(path)),
    entries.filter(([path]) => /^teams\/wm-original\/(?!members\/|shortCodes\/)/.test(path)),
    entries.filter(([path]) => /^(platformAdmins|teamDeviceLinks)\//.test(path))
  ];
  if (ordered.flat().length !== entries.length) throw new Error('Chemin hors périmètre');
  const batches = ordered.flatMap(group => Array.from({ length: Math.ceil(group.length / 100) },
    (_, index) => group.slice(index * 100, (index + 1) * 100)));
  const indexes = batches.map((_, index) => index);
  if (rollback) indexes.reverse();
  for (const index of indexes) {
    const batch = batches[index];
    const journal = db.doc('_phase4Copy/' + id + '/batches/' + index);
    const refs = batch.map(([path]) => db.doc(path));
    const changed = await db.runTransaction(async transaction => {
      const [receipt, ...documents] = await transaction.getAll(journal, ...refs);
      if (receipt.exists) {
        for (const [offset, doc] of documents.entries()) {
          if (!doc.exists || !doc.updateTime.isEqual(receipt.createTime) ||
              signature(encodeSnapshotValue(doc.data())) !== signature(batch[offset][1]))
            throw new Error('Cible modifiée depuis la copie');
        }
        if (!rollback) return false;
        refs.forEach(ref => transaction.delete(ref));
        transaction.delete(journal);
        return true;
      }
      if (rollback) return false;
      if (documents.some(doc => doc.exists)) throw new Error('Document cible préexistant');
      refs.forEach((ref, offset) => transaction.create(ref,
        decodeSnapshotValue(batch[offset][1], (seconds, nanos) => new Timestamp(seconds, nanos))));
      transaction.create(journal, { paths: refs.map(ref => ref.path) });
      return true;
    });
    if (changed) await afterBatch(index);
  }
}
