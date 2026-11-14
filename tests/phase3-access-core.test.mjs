import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLegacyAccess,combinePhase3Readiness} from '../phase3-access-core.mjs';
const names=['aurelien','etienne','igor','ludo','stephane'];
const fixtures=()=>{
  const deviceLinks=names.map(p=>({id:'uid-'+p,data:{profileId:p,inviteToken:'t-'+p,createdAt:100}}));
  const invitations=names.map(p=>({id:'t-'+p,data:{profileId:p,active:true}}));
  return {projectId:'team-tool-test-data',currentUid:'uid-igor',deviceLinks,invitations};
};
const phase2={simulation:'SIMULATION_CONFORME',teamId:'wm-original',errors:[],
  sourceFileName:'Covoiturage_team-tool-test-data_snapshot_2026-11-14.json',
  firebaseWrites:0,activationPerformed:false,
  stats:{sourceDocuments:3377,mappedSourceDocuments:3377,tripGroups:1140,delleTrips:3}};
test('Audit sain : cinq appareils et cinq invitations connus',()=>{
 const a=auditLegacyAccess(fixtures());
 assert.equal(a.blocked,false);
 assert.equal(a.statistics.totalDevices,5);
 assert.equal(a.statistics.totalInvitations,5);
 assert.equal(a.statistics.linkedIgorDevices,1);
 assert.deepEqual(a.statistics.profiles.map(p=>p.profileId),names);
});
test('Rapport public : aucun UID ni token ni agent utilisateur',()=>{
 const a=auditLegacyAccess(fixtures());
 const out=JSON.stringify(a);
 assert.ok(!out.includes('uid-igor'));assert.ok(!out.includes('t-igor'));
 assert.ok(!out.includes('Mozilla'));assert.equal(a.security.rawUidExported,false);
});
test('Droits administrateur : un appareil non Igor est bloqué',()=>{
 const f=fixtures();f.currentUid='uid-ludo';
 assert.equal(auditLegacyAccess(f).blocked,true);
});
test('L’appareil Igor absent de l’inventaire est bloqué',()=>{
 const f=fixtures();f.deviceLinks=f.deviceLinks.filter(x=>x.id!=='uid-igor');
 assert.equal(auditLegacyAccess(f).blocked,true);
});
test('Profil inconnu dans un deviceLink bloque',()=>{
 const f=fixtures();f.deviceLinks.push({id:'uid-unknown',data:{profileId:'other',inviteToken:'t-other'}});
 assert.equal(auditLegacyAccess(f).blocked,true);
});
test('Invitation d’un profil inconnu bloque',()=>{
 const f=fixtures();f.invitations.push({id:'t-other',data:{profileId:'other',active:true}});
 assert.equal(auditLegacyAccess(f).blocked,true);
});
test('Un appareil associé après révocation de lien est conservé, avertissement non bloquant',()=>{
 const f=fixtures();f.invitations[0].data.active=false;
 const a=auditLegacyAccess(f);
 assert.equal(a.blocked,false);assert.equal(a.statistics.profiles[0].revokedLinkedInvite,1);
 assert.ok(a.warnings.some(x=>x.includes('ancien lien désactivé')));
});
test('Invitation historique manquante : avertissement mais pas suppression',()=>{
 const f=fixtures();f.invitations=f.invitations.filter(x=>x.id!=='t-aurelien');
 const a=auditLegacyAccess(f);
 assert.equal(a.blocked,false);assert.equal(a.statistics.profiles[0].missingLinkedInvite,1);
});
test('Discordance entre invitation et appareil : blocage',()=>{
 const f=fixtures();f.invitations[1].data.profileId='igor';
 const a=auditLegacyAccess(f);
 assert.equal(a.blocked,true);
 assert.ok(a.blockers.some(x=>x.includes('autre profil')));
});
test('Membres sans appareil : visible mais ne perdent pas leur place',()=>{
 const f=fixtures();f.deviceLinks=f.deviceLinks.filter(x=>x.id!=='uid-stephane');
 const a=auditLegacyAccess(f);
 assert.equal(a.blocked,false);
 assert.ok(a.warnings.some(x=>x.includes('Stéphane')));
});
test('Plusieurs appareils Igor signalés',()=>{
 const f=fixtures();f.deviceLinks.push({id:'uid-igor-phone',data:{profileId:'igor',inviteToken:'t-igor'}});
 const a=auditLegacyAccess(f);
 assert.equal(a.statistics.linkedIgorDevices,2);
 assert.ok(a.warnings.some(x=>x.includes('Plusieurs appareils Igor')));
});
test('Un inventaire du mauvais projet Firebase est rejeté',()=>{
 const f=fixtures();f.projectId='team-tool-data';
 assert.throws(()=>auditLegacyAccess(f),/hors du projet/);
});
test('Un même UID dupliqué est refusé',()=>{
 const f=fixtures();f.deviceLinks.push({...f.deviceLinks[0]});
 assert.throws(()=>auditLegacyAccess(f),/double/);
});
test('Phase 2 conforme + accès sans blocage : préparation possible mais jamais migration autorisée',()=>{
 const result=combinePhase3Readiness(auditLegacyAccess(fixtures()),phase2);
 assert.equal(result.status,'PREPARATION_SANS_ANOMALIE_BLOQUANTE');
 assert.equal(result.summary.businessDocuments,3377);
 assert.equal(result.summary.privateDelleTrips,3);
 assert.equal(result.authorizedToMigrate,false);
 assert.equal(result.serverWritesExecuted,0);
});
test('Phase 2 partielle ou étrangère bloquée',()=>{
 const a=auditLegacyAccess(fixtures());
 assert.equal(combinePhase3Readiness(a,{...phase2,stats:{sourceDocuments:3,mappedSourceDocuments:2}}).status,'PREPARATION_BLOQUEE');
 assert.equal(combinePhase3Readiness(a,{...phase2,sourceFileName:'PROD.json'}).status,'PREPARATION_BLOQUEE');
 assert.equal(combinePhase3Readiness(a,null).status,'PREPARATION_BLOQUEE');
});
