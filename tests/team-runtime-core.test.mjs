import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionSegments,documentSegments,normalizeTeamRoster,parseTeamInvite,validateLinkedTeam} from '../team-runtime-core.mjs';
test('les chemins historiques ne sont pas modifiés sans équipe',()=>{
 assert.deepEqual(collectionSegments(null,'availability'),['availability']);
 assert.deepEqual(documentSegments(null,'config','calendar'),['config','calendar']);
});
test('chaque équipe reçoit ses propres chemins',()=>{
 assert.deepEqual(collectionSegments('equipe-2','availability'),['teams','equipe-2','availability']);
 assert.deepEqual(collectionSegments('wm-original','profiles'),['teams','wm-original','members']);
 assert.deepEqual(documentSegments('equipe-2','tripDays','2026-11-16'),['teams','equipe-2','tripDays','2026-11-16']);
 assert.throws(()=>collectionSegments('equipe-2','deviceLinks'),/non autorisée/);
 assert.throws(()=>documentSegments('equipe-2','plans','../autre'),/invalide/);
});
test('composition dynamique de 2 à 5 membres',()=>{
 const roster=normalizeTeamRoster([
 {memberId:'claire',firstName:'Claire',shortCode:'C',role:'leader',active:true},
 {memberId:'hugo',firstName:'Hugo',shortCode:'H',role:'member',active:true}
 ]);
 assert.deepEqual(roster.members,['claire','hugo']);
 assert.equal(roster.initials.hugo,'H');
 assert.equal(roster.leaderId,'claire');
 assert.throws(()=>normalizeTeamRoster([{memberId:'claire',shortCode:'C',role:'leader',active:true}]),/au moins 2/);
});
test('l annuaire et le statut empêchent un rattachement arbitraire',()=>{
 assert.deepEqual(validateLinkedTeam({teamId:'equipe-2',memberId:'hugo',teamStatus:'active',directoryTeamId:'equipe-2',memberActive:true}),{teamId:'equipe-2',memberId:'hugo'});
 assert.throws(()=>validateLinkedTeam({teamId:'equipe-2',memberId:'hugo',teamStatus:'draft',directoryTeamId:'equipe-2',memberActive:true}),/pas encore activée/);
 assert.throws(()=>validateLinkedTeam({teamId:'equipe-2',memberId:'hugo',teamStatus:'active',directoryTeamId:'equipe-3',memberActive:true}),/incohérent/);
});
test('invitation porte obligatoirement l équipe',()=>{
 assert.deepEqual(parseTeamInvite('https://example.test/team-tool-test/?team=equipe-2&invite='+('a'.repeat(48))),{teamId:'equipe-2',token:'a'.repeat(48)});
 assert.equal(parseTeamInvite('https://example.test/?invite='+('a'.repeat(48))),null);
 assert.equal(parseTeamInvite('https://example.test/?team=../secret&invite='+('a'.repeat(48))),null);
});
