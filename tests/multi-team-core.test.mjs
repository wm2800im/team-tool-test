import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_TEAM_ID,TEAM_CAPACITY,validateTeamId,teamPath,availabilityPath,
  compatibilityPath,nextShortCode,assignStableShortCodes,validateRoster,historyGroupCodes
} from '../multi-team-core.mjs';
const date='2026-11-16';
test('Chemins distincts par équipe, même date et même prénom',()=>{
  assert.equal(LEGACY_TEAM_ID,'wm-original');
  assert.notEqual(availabilityPath('wm-original',date,'igor'),availabilityPath('team-b',date,'igor'));
  assert.equal(compatibilityPath('team-b',date,'zoe','alex'),
    'teams/team-b/compatibilities/'+date+'_zoe_alex');
  assert.equal(teamPath('team-b','tripDays',date),'teams/team-b/tripDays/'+date);
});
test('Les identifiants et collections ne peuvent pas sortir du périmètre équipe',()=>{
  assert.throws(()=>validateTeamId('../other'),/invalide/);
  assert.throws(()=>teamPath('team-b','deviceLinks','id'),/inconnue/);
  assert.throws(()=>teamPath('team-b','plans','../secrets'),/invalide/);
});
test('Nouveaux codes courts : A, An, Al, sans modifier A déjà attribué',()=>{
  const existing=[{memberId:'aurelien',firstName:'Aurélien',shortCode:'A',role:'leader'}];
  const roster=assignStableShortCodes(existing,[
    {memberId:'antoine',firstName:'Antoine',role:'member'},
    {memberId:'alexandre',firstName:'Alexandre',role:'member'}
  ]);
  assert.deepEqual(roster.map(x=>x.shortCode),['A','An','Al']);
  assert.equal(existing[0].shortCode,'A');
  assert.equal(historyGroupCodes(['aurelien','antoine','alexandre'],roster),'A · An · Al');
});
test('Même prénom : un suffixe si toutes les lettres sont déjà utilisées',()=>{
  const x=assignStableShortCodes([],[
    {memberId:'alex1',firstName:'Alex',role:'leader'},
    {memberId:'alex2',firstName:'Alex',role:'member'},
    {memberId:'alex3',firstName:'Alex',role:'member'},
    {memberId:'alex4',firstName:'Alex',role:'member'},
    {memberId:'alex5',firstName:'Alex',role:'member'}
  ]);
  assert.deepEqual(x.map(y=>y.shortCode),['A','Al','Ale','Alex','Alex2']);
});
test('Deux équipes différentes peuvent chacune utiliser I ou A',()=>{
  const base=[{memberId:'igor',firstName:'Igor',role:'leader'},
              {memberId:'aurelien',firstName:'Aurélien',role:'member'}];
  const a=assignStableShortCodes([],base);
  const b=assignStableShortCodes([],
    [{memberId:'ines',firstName:'Inès',role:'leader'},
     {memberId:'antoine',firstName:'Antoine',role:'member'}]);
  assert.deepEqual(a.map(x=>x.shortCode),['I','A']);
  assert.deepEqual(b.map(x=>x.shortCode),['I','A']);
});
test('Accents retirés uniquement dans le code et lettres visibles',()=>{
  assert.equal(nextShortCode('Émilie',[]),'E');
  assert.equal(nextShortCode('Léo',['L']),'Le');
  assert.equal(nextShortCode('Émilie',['E','Em']),'Emi');
});
test('La limite et le responsable unique sont vérifiés',()=>{
  const five=assignStableShortCodes([],[
    {memberId:'ig',firstName:'Igor',role:'leader'},
    {memberId:'lu',firstName:'Ludo',role:'member'},
    {memberId:'st',firstName:'Stéphane',role:'member'},
    {memberId:'au',firstName:'Aurélien',role:'member'},
    {memberId:'et',firstName:'Étienne',role:'member'}
  ]);
  assert.equal(TEAM_CAPACITY,5);
  assert.equal(validateRoster(five),true);
  assert.throws(()=>validateRoster([...five,{memberId:'jean',firstName:'Jean',shortCode:'J',role:'member'}]),/5 personnes/);
  assert.throws(()=>validateRoster(five.map(m=>({...m,role:'member'}))),/responsable/);
  assert.throws(()=>validateRoster(five.slice(0,1)),/au moins 2/);
});
test('Historique : codes réservés à conserver même quand un membre devient inactif',()=>{
  const persons=[
    {memberId:'igor',firstName:'Igor',shortCode:'I',role:'leader'},
    {memberId:'ludo',firstName:'Ludo',shortCode:'L',role:'member',active:false}
  ];
  assert.equal(historyGroupCodes(['ludo','igor'],persons),'L · I');
  const next=assignStableShortCodes(persons,[{memberId:'lea',firstName:'Léa',role:'member'}]);
  assert.equal(next[1].shortCode,'L');
  assert.equal(next[2].shortCode,'Le');
});
test('Réutiliser un code, un identifiant ou forcer un code nouveau est refusé',()=>{
  const prior=[{memberId:'igor',firstName:'Igor',shortCode:'I',role:'leader'}];
  assert.throws(()=>assignStableShortCodes(prior,[{memberId:'igor',firstName:'Igor'}]),/double/);
  assert.throws(()=>assignStableShortCodes([...prior,{memberId:'ines',shortCode:'I',firstName:'Inès'}],[]),/attribué/);
  assert.throws(()=>assignStableShortCodes(prior,[{memberId:'lea',firstName:'Léa',shortCode:'I'}]),/imposé/);
});
