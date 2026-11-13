import test from 'node:test';
import assert from 'node:assert/strict';
import {SNAPSHOT_COLLECTIONS,SNAPSHOT_SCHEMA,encodeSnapshotValue,decodeSnapshotValue,validateSnapshot} from '../snapshot-core.mjs';
const date='2026-11-13';
const timestamp=(s,n)=>({s,n});
function fixture(){
  const collections=Object.fromEntries(SNAPSHOT_COLLECTIONS.map(n=>[n,[]]));
  collections.availability=[{id:date+'_igor',data:{date,profileId:'igor',status:'present',
    updatedAt:encodeSnapshotValue({seconds:1794528000,nanoseconds:250000000,toDate(){return new Date(1794528000250);}})}}];
  collections.delleTrips=[{id:date,data:{date,privatePair:'igor_ludo',destination:'Delle',driver:'ludo'}}];
  return {schema:SNAPSHOT_SCHEMA,sourceProjectId:'team-tool-test-data',
    exportedAt:new Date().toISOString(),collections,calendar:{exceptions:[]}};
}
test('format v2 : toutes les collections dont Delle et les préférences',()=>{
  const x=validateSnapshot(fixture());
  assert.equal(x.total,2);
  assert.equal(x.counts.delleTrips,1);
  assert.equal(x.counts.preferences,0);
  assert.equal(x.hasCalendar,true);
});
test('timestamp Firebase et Date : précision et décodage conservés',()=>{
  const input={updatedAt:{seconds:1794528000,nanoseconds:123456789,toDate(){return new Date();}},
    nested:[{createdAt:new Date('2026-11-13T12:34:56.789Z')}]};
  const encoded=encodeSnapshotValue(input);
  const decoded=decodeSnapshotValue(encoded,timestamp);
  assert.deepEqual(decoded.updatedAt,{s:1794528000,n:123456789});
  assert.equal(decoded.nested[0].createdAt.n,789000000);
  assert.equal(decoded.nested[0].createdAt.s,Math.floor(Date.parse('2026-11-13T12:34:56.789Z')/1000)); 
});
test('v2 : collection obligatoire manquante refusée',()=>{
  const x=fixture();delete x.collections.preferences;
  assert.throws(()=>validateSnapshot(x),/collection manquante : preferences/);
});
test('v2 : documents illégitimes ou doublons refusés',()=>{
  const x=fixture();x.collections.profiles=[{id:'../p',data:{a:1}}];
  assert.throws(()=>validateSnapshot(x),/identifiant/);
  const y=fixture();y.collections.profiles=[{id:'igor',data:{}},{id:'igor',data:{}}];
  assert.throws(()=>validateSnapshot(y),/doublon/);
});
test('collection interdite rejetée (invitations et jetons)',()=>{
  const x=fixture();x.collections.pushTokens=[];
  assert.throws(()=>validateSnapshot(x),/collection non autorisée/);
});
test('marqueur d’horodatage malformé rejeté avant écriture',()=>{
  const x=fixture();x.collections.profiles=[{id:'igor',data:{createdAt:{__teamtoolSnapshotType:'timestamp',seconds:5,nanoseconds:1000000000}}}];
  assert.throws(()=>validateSnapshot(x),/horodatage incorrect/);
});
test('ancien export v1 avec six collections : absent ne signifie pas vider',()=>{
  const x=fixture();x.schema=1;delete x.sourceProjectId;
  delete x.collections.preferences;delete x.collections.delleTrips;
  const y=validateSnapshot(x);
  assert.equal(y.collections.preferences,null);
  assert.equal(y.collections.delleTrips,null);
  assert.equal(y.total,1);
  assert.ok(y.warnings.some(s=>s.includes('delleTrips absent')));
});
test('conversion des anciennes dates ISO uniquement sur les champs horodatés',()=>{
  const v=decodeSnapshotValue({date:'2026-11-13',updatedAt:'2026-11-13T00:00:01.200Z',time:'16:30'},timestamp,1);
  assert.equal(v.date,'2026-11-13');
  assert.equal(v.time,'16:30');
  assert.equal(v.updatedAt.n,200000000);
});
test('les champs de données atypiques sont refusés',()=>{
  const x=fixture();x.collections.profiles=[{id:'igor',data:{bad:Infinity}}];
  assert.throws(()=>validateSnapshot(x),/type invalide/);
});
