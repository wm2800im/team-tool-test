import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../phase3-access-ui.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../phase3-access-audit.html',import.meta.url),'utf8');
test('L’audit est explicitement limité au projet Firebase TEST',()=>{
 assert.match(ui,/config\?\.environment!=='test'/);
 assert.match(ui,/team-tool-test-data/);
 assert.match(ui,/getDocFromServer\(doc\(db,'deviceLinks',current\.uid\)\)/);
 assert.match(ui,/currentLink\.data\(\)\?\.profileId!=='igor'/);
});
test('L’interface n’écrit rien dans Firebase et ne crée pas de compte',()=>{
 assert.doesNotMatch(ui,/\b(setDoc|deleteDoc|updateDoc|writeBatch|runTransaction|signInAnonymously|firebase-admin)\b|\bfetch\s*\(/);
 assert.match(ui,/getDocsFromServer\(collection\(db,'deviceLinks'\)\)/);
 assert.match(ui,/getDocsFromServer\(collection\(db,'invitations'\)\)/);
 assert.match(html,/phase3-access-ui\.js/);
});
test('Le rapport exporté repose uniquement sur les données anonymisées',()=>{
 assert.match(ui,/accessAudit:audit,preflight:readiness/);
 assert.doesNotMatch(ui,/uid:current\.uid.*lastReport|inviteToken.*lastReport|userAgent.*lastReport/);
});
test('Un fichier de simulation reste local et limité en taille',()=>{
 assert.match(ui,/file\.text\(\)/);
 assert.match(ui,/file\.size>1_000_000/);
 assert.match(html,/noindex,nofollow/);
});
