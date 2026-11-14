import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTeamCreation,parseTeamNames,teamInvitationUrl} from '../team-admin-core.mjs';

test('composition de deux à cinq membres avec responsable unique',()=>{
  for(const n of [2,3,5]){
    const created=prepareTeamCreation({teamId:'covoit-test',name:'  Collègues B  ',firstNames:Array(n).fill('Alex')});
    assert.equal(created.name,'Collègues B');
    assert.equal(created.members.length,n);
    assert.equal(created.members.filter(m=>m.role==='leader').length,1);
    assert.equal(new Set(created.members.map(m=>m.shortCode)).size,n);
    assert.equal(new Set(created.members.map(m=>m.memberId)).size,n);
  }
  assert.throws(()=>prepareTeamCreation({teamId:'x',name:'Test',firstNames:['A','B']}),/prénom|Identifiant/);
  assert.throws(()=>prepareTeamCreation({teamId:'team-b',name:'Test',firstNames:['Anna']}),/2 et 5/);
  assert.throws(()=>prepareTeamCreation({teamId:'team-b',name:'Test',firstNames:Array(6).fill('Anna')}),/2 et 5/);
});
test('identifiants globaux stables, indépendants des prénoms',()=>{
 const team=prepareTeamCreation({teamId:'team-b',name:'Collègues',firstNames:['Zoé','Zoé','Inès']});
 assert.deepEqual(team.members.map(m=>m.memberId),['team-b-m1','team-b-m2','team-b-m3']);
 assert.deepEqual(team.members.map(m=>m.shortCode),['Z','Zo','I']);
 assert.throws(()=>prepareTeamCreation({teamId:'../prod',name:'Test',firstNames:['Zoé','Inès']}),/invalide/);
});
test('saisie depuis textarea, pas de membre vide',()=>{
 assert.deepEqual(parseTeamNames(' Zoé\n Inès ; Alex, Hugo\n'),['Zoé','Inès','Alex','Hugo']);
});
test('lien personnel avec équipe et jeton, jamais l’ancien lien',()=>{
 const token='AB'.repeat(24),url=teamInvitationUrl('https://example.test/team-tool-test/?invite=legacy&team=old','team-b',token);
 assert.equal(new URL(url).searchParams.get('team'),'team-b');
 assert.equal(new URL(url).searchParams.get('invite'),token.toLowerCase());
 assert.throws(()=>teamInvitationUrl('https://example.test/','team-b','foo'),/Jeton/);
});
