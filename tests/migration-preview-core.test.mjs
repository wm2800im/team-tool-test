import test from 'node:test';
import assert from 'node:assert/strict';
import {SNAPSHOT_COLLECTIONS} from '../snapshot-core.mjs';
import {simulateLegacyMigration,LEGACY_MEMBERS,MIGRATION_TECHNICAL_PLAN_ID} from '../migration-preview-core.mjs';
const date='2026-11-16';
const stamp={__teamtoolSnapshotType:'timestamp',seconds:1794787200,nanoseconds:123456789};
function fixture(){
 const collections=Object.fromEntries(SNAPSHOT_COLLECTIONS.map(n=>[n,[]]));
 collections.profiles=[{id:'igor',data:{name:'Igor',legacyColor:'cyan'}}];
 collections.availability=[
  {id:date+'_igor',data:{date,profileId:'igor',status:'present',updatedAt:stamp}},
  {id:date+'_ludo',data:{date,profileId:'ludo',status:'present'}}
 ];
 collections.compatibilities=[{id:date+'_etienne_igor',data:{
  date,ownerId:'etienne',responderId:'igor',response:'yes',updatedAt:stamp
 }}];
 collections.legacyStatus=[{id:'2023-01-12_ludo',data:{date:'2023-01-12',profileId:'ludo',status:'present'}}];
 collections.tripDays=[{id:date,data:{
  date,groups:[{id:'grp',members:['igor','ludo'],driver:'igor',validatedAt:stamp}],
  updatedBy:'igor',updatedAt:stamp
 }}];
 collections.plans=[
   {id:date,data:{date,groups:[{id:'plan',members:['igor','etienne'],driver:'etienne'}]}},
   {id:MIGRATION_TECHNICAL_PLAN_ID,data:{quotaBaselineDirty:true,dirtyAtMs:1000}}
 ];
 collections.preferences=[{id:'ludo',data:{theme:'dark'}}];
 collections.delleTrips=[{id:date,data:{
  date,destination:'Delle',privatePair:'igor_ludo',members:['igor','ludo'],
  driver:'ludo',mainDriver:'igor',mainGroupMembers:['igor','ludo'],validatedAt:stamp
 }}];
 return {schema:2,sourceProjectId:'team-tool-test-data',
   exportedAt:'2026-11-14T07:00:00.000Z',collections,calendar:{exceptions:[{date:'2026-12-24',type:'off'}]}};
}
const locate=(result,path)=>result.documents.find(x=>x.path===path);
test('Copie complète : couverture 100 % et équipe historique en brouillon',()=>{
 const payload=fixture(),original=structuredClone(payload),p=simulateLegacyMigration(payload);
 assert.equal(p.valid,true,p.errors.join('; '));assert.equal(p.activated,false);
 assert.equal(p.stats.sourceDocuments,10);
 assert.equal(p.stats.mappedSourceDocuments,10);
 assert.deepEqual(payload,original,'le fichier source reste inchangé');
 assert.equal(locate(p,'teams/wm-original').data.status,'draft');
 assert.equal(locate(p,'teams/wm-original/members/igor').data.role,'leader');
 assert.equal(locate(p,'teams/wm-original/members/igor').data.legacyProfile.legacyColor,'cyan');
 assert.equal(locate(p,'teams/wm-original/config/calendar').data.exceptions[0].date,'2026-12-24');
});
test('Cinq membres, codes A E I L S et rôles conservés',()=>{
 const p=simulateLegacyMigration(fixture());
 assert.deepEqual(p.stats.members.map(m=>m.shortCode),['A','E','I','L','S']);
 assert.equal(p.stats.members.length,5);
 for(const m of LEGACY_MEMBERS){
  assert.equal(locate(p,'teams/wm-original/shortCodes/'+m.shortCode).data.memberId,m.memberId);
  assert.equal(locate(p,'memberDirectory/'+m.memberId).data.teamId,'wm-original');
 }
});
test('Disponibilité : ancien profileId conservé, nouveau memberId ajouté',()=>{
 const p=simulateLegacyMigration(fixture());
 const a=locate(p,'teams/wm-original/availability/'+date+'_igor');
 assert.equal(a.data.profileId,'igor');assert.equal(a.data.memberId,'igor');
 assert.deepEqual(a.data.updatedAt,stamp);
});
test('Historique : groupes, conducteur et horodatages inchangés',()=>{
 const src=fixture(),p=simulateLegacyMigration(src);
 assert.deepEqual(locate(p,'teams/wm-original/tripDays/'+date).data,
   src.collections.tripDays[0].data);
 assert.deepEqual(locate(p,'teams/wm-original/plans/'+date).data,
   src.collections.plans[0].data);
 assert.equal(p.stats.tripGroups,1);
 assert.equal(p.stats.planGroups,1);
});
test('Delle : données privées recopiées à l’identique, pas dans une autre équipe',()=>{
 const src=fixture(),p=simulateLegacyMigration(src);
 assert.equal(p.stats.delleTrips,1);
 assert.deepEqual(locate(p,'teams/wm-original/delleTrips/'+date).data,
   src.collections.delleTrips[0].data);
 assert.equal(p.documents.filter(x=>x.path.includes('/delleTrips/')).length,1);
});
test('Le marqueur technique n’est pas traité comme un jour de covoiturage',()=>{
 const p=simulateLegacyMigration(fixture());
 assert.equal(p.stats.technicalMarkers,1);
 assert.equal(locate(p,'teams/wm-original/plans/'+MIGRATION_TECHNICAL_PLAN_ID),undefined);
 assert.deepEqual(locate(p,'teams/wm-original/config/'+MIGRATION_TECHNICAL_PLAN_ID).data,
   {quotaBaselineDirty:true,dirtyAtMs:1000});
});
test('Fichier v1 ou extrait non TEST : simulation bloquée',()=>{
 const p=fixture();p.schema=1;
 assert.equal(simulateLegacyMigration(p).valid,false);
 const q=fixture();q.sourceProjectId='team-tool-data';
 assert.equal(simulateLegacyMigration(q).valid,false);
});
test('Collection Delle absente en v2 : blocage sans plan exécutable',()=>{
 const p=fixture();delete p.collections.delleTrips;
 const x=simulateLegacyMigration(p);
 assert.equal(x.valid,false);assert.equal(x.documents.length,0);
 assert.match(x.errors.join(' '),/delleTrips/);
});
test('Participant inconnu dans un historique : blocage sans perte silencieuse',()=>{
 const p=fixture();p.collections.tripDays[0].data.groups[0].members.push('autre_equipe');
 const x=simulateLegacyMigration(p);
 assert.equal(x.valid,false);
 assert.equal(x.documents.length,0);
 assert.match(x.errors.join(' '),/membre inconnu/);
});
test('Date ou identité incohérente : blocage',()=>{
 const p=fixture();p.collections.availability[0].data.profileId='ludo';
 const x=simulateLegacyMigration(p);
 assert.equal(x.valid,false);
 assert.match(x.errors.join(' '),/profileId incohérent/);
});
test('Trajet Delle corrompu : blocage',()=>{
 const p=fixture();p.collections.delleTrips[0].data.privatePair='autre';
 assert.equal(simulateLegacyMigration(p).valid,false);
});
test('Profil supplémentaire : document non supprimé silencieusement',()=>{
 const p=fixture();p.collections.profiles.push({id:'inconnu',data:{name:'Inconnu'}});
 const x=simulateLegacyMigration(p);
 assert.equal(x.valid,false);
 assert.match(x.errors.join(' '),/Profil inattendu/);
});
test('Absence du document calendrier : avertissement et défaut vide',()=>{
 const p=fixture();delete p.calendar;
 const x=simulateLegacyMigration(p);
 assert.equal(x.valid,true);
 assert.deepEqual(locate(x,'teams/wm-original/config/calendar').data,{exceptions:[]});
 assert.ok(x.warnings.some(w=>w.includes('calendrier')));
});
test('Plan sans conducteur proposé autorisé, trajet sans conducteur refusé',()=>{
 const p=fixture();delete p.collections.plans[0].data.groups[0].driver;
 assert.equal(simulateLegacyMigration(p).valid,true);
 delete p.collections.tripDays[0].data.groups[0].driver;
 assert.equal(simulateLegacyMigration(p).valid,false);
});
test('Aucune exécution, aucun statut activé ni droits Firebase dans le module',()=>{
 const x=simulateLegacyMigration(fixture());
 assert.equal(x.activated,false);
 assert.equal(x.stats.preparedTargetDocuments>0,true);
 assert.ok(x.prerequisites.some(v=>v.includes('deviceLinks')));
 assert.ok(x.prerequisites.some(v=>v.includes('sauvegarde')));
});

test('Identité memberId discordante dans un ancien statut : migration refusée',()=>{
 const p=fixture();p.collections.legacyStatus[0].data.memberId='autre';
 const x=simulateLegacyMigration(p);
 assert.equal(x.valid,false);
 assert.match(x.errors.join(' '),/memberId incohérent/);
});
test('La page navigateur n’utilise aucun SDK Firebase ni écriture',async()=>{
 const {readFileSync}=await import('node:fs');
 const ui=readFileSync(new URL('../migration-preview-ui.js',import.meta.url),'utf8');
 const page=readFileSync(new URL('../migration-preview.html',import.meta.url),'utf8');
 assert.match(page,/migration-preview-ui\.js/);
 assert.doesNotMatch(ui,/https?:\/\/|fetch\s*\(|getFirestore|setDoc|updateDoc|deleteDoc|writeBatch/);
 assert.match(ui,/file\.text\(\)/);
});
