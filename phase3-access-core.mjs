// Phase 3 : audit purement descriptif. Aucune dépendance Firebase, aucun accès réseau.
import {LEGACY_MEMBERS} from './migration-preview-core.mjs';

export const AUDIT_SCHEMA=1;
export const TEST_PROJECT='team-tool-test-data';
const PEOPLE=LEGACY_MEMBERS.map(x=>({id:x.memberId,name:x.firstName}));
const known=new Set(PEOPLE.map(x=>x.id));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=x=>typeof x==='string'&&x.length>0;
function uniqueDocs(rows,collection){
  if(!Array.isArray(rows))throw new Error(collection+' : inventaire absent');
  const seen=new Set();
  for(const row of rows){
    if(!object(row)||!str(row.id)||!object(row.data))
      throw new Error(collection+' : document non conforme');
    if(seen.has(row.id))throw new Error(collection+' : identifiant en double');
    seen.add(row.id);
  }
  return rows;
}
function countsTemplate(){
  return Object.fromEntries(PEOPLE.map(p=>[p.id,{
    profileId:p.id,firstName:p.name,devices:0,activeInvitations:0,
    inactiveInvitations:0,missingLinkedInvite:0,revokedLinkedInvite:0
  }]));
}
export function auditLegacyAccess({projectId,currentUid,deviceLinks,invitations}){
  const blocking=[],warnings=[];
  if(projectId!==TEST_PROJECT)throw new Error('Audit impossible hors du projet Firebase TEST');
  if(!str(currentUid))throw new Error('Appareil administrateur non identifié');
  const devices=uniqueDocs(deviceLinks,'deviceLinks');
  const invites=uniqueDocs(invitations,'invitations');
  const invMap=new Map(invites.map(row=>[row.id,row.data]));
  const counters=countsTemplate(),unknownDevices=[],unknownInvitations=[];
  const own=devices.find(d=>d.id===currentUid);
  if(!own||own.data.profileId!=='igor')
    blocking.push('Cet appareil n’est pas lié au profil administrateur Igor dans deviceLinks.');
  for(const {id,data} of invites){
    if(!known.has(data.profileId)){
      unknownInvitations.push(data.profileId);
      continue;
    }
    if(data.active===true)counters[data.profileId].activeInvitations++;
    else counters[data.profileId].inactiveInvitations++;
  }
  for(const {data} of devices){
    const pid=data.profileId;
    if(!known.has(pid)){
      unknownDevices.push(pid);
      continue;
    }
    const c=counters[pid];
    c.devices++;
    if(!str(data.inviteToken)){
      c.missingLinkedInvite++;
      continue;
    }
    const inv=invMap.get(data.inviteToken);
    if(!inv){
      c.missingLinkedInvite++;
      continue;
    }
    if(inv.profileId!==pid)
      blocking.push('Un appareil rattaché à '+c.firstName+' possède une invitation attribuée à un autre profil.');
    if(inv.active!==true)c.revokedLinkedInvite++;
  }
  if(unknownDevices.length)
    blocking.push(unknownDevices.length+' appareil(s) liés à des profils inconnus.');
  if(unknownInvitations.length)
    blocking.push(unknownInvitations.length+' invitation(s) référencent des profils inconnus.');
  const profiles=PEOPLE.map(p=>counters[p.id]);
  for(const p of profiles){
    if(!p.devices)warnings.push(p.firstName+' : aucun appareil associé dans TEST.');
    if(!p.activeInvitations)warnings.push(p.firstName+' : aucun lien actif pour associer un nouvel appareil.');
    if(p.missingLinkedInvite)
      warnings.push(p.firstName+' : '+p.missingLinkedInvite+
        ' association(s) sans invitation historique retrouvée ; association actuelle à préserver.');
    if(p.revokedLinkedInvite)
      warnings.push(p.firstName+' : '+p.revokedLinkedInvite+
        ' association(s) issues d’un ancien lien désactivé ; appareil toujours associé.');
  }
  if(counters.igor.devices>1)
    warnings.push('Plusieurs appareils Igor : provisionner individuellement les UID administrateur nécessaires.');
  if(!invites.length)
    warnings.push('Aucune invitation dans TEST ; aucun nouvel appareil ne pourra se lier avec l’ancien parcours.');
  return {
    schema:AUDIT_SCHEMA,projectId:TEST_PROJECT,teamId:'wm-original',
    status:blocking.length?'AUDIT_BLOQUE':'AUDIT_SANS_ANOMALIE_BLOQUANTE',
    checkedOnline:true,blocked:blocking.length>0,
    blockers:blocking,warnings,
    statistics:{
      totalDevices:devices.length,totalInvitations:invites.length,
      activeInvitations:invites.filter(row=>row.data.active===true).length,
      linkedIgorDevices:counters.igor.devices,
      profiles
    },
    security:{
      rawUidExported:false,invitationTokenExported:false,userAgentExported:false,
      externalDatabaseWrite:false
    },
    outstanding:[
      'Les UID réels doivent rester accessibles dans Firebase aux outils administrateurs de confiance.',
      'La copie JSON métier ne contient pas les invitations ni les appareils.',
      'La liaison des appareils historiques devra être provisionnée sans supprimer deviceLinks.',
      'Le superadministrateur devra être activé côté serveur via platformAdmins, jamais via le navigateur.',
      'Confirmer les notifications, les caches de quotas, la sauvegarde et le retour arrière avant bascule.'
    ]
  };
}
export function combinePhase3Readiness(audit,phase2){
  if(!object(audit)||audit.schema!==AUDIT_SCHEMA||audit.projectId!==TEST_PROJECT)
    throw new Error('Rapport d’accès incompatible');
  const blockers=[...(audit.blockers||[])],warnings=[...(audit.warnings||[])];
  if(!object(phase2)){
    blockers.push('Rapport de phase 2 non chargé ou invalide.');
  }else{
    if(phase2.simulation!=='SIMULATION_CONFORME'||phase2.teamId!=='wm-original'||
       !Array.isArray(phase2.errors)||phase2.errors.length)
      blockers.push('La simulation métier de phase 2 n’est pas conforme.');
    if(!object(phase2.stats)||!Number.isInteger(phase2.stats.sourceDocuments)||
       phase2.stats.sourceDocuments<1||
       phase2.stats.sourceDocuments!==phase2.stats.mappedSourceDocuments)
      blockers.push('La couverture intégrale des documents historiques n’est pas confirmée.');
    if(!str(phase2.sourceFileName)||
       !phase2.sourceFileName.includes('team-tool-test-data'))
      blockers.push('Le projet source du rapport métier n’est pas reconnu comme TEST.');
    if(phase2.firebaseWrites!==0||phase2.activationPerformed!==false)
      blockers.push('Le rapport de phase 2 doit provenir d’une simulation sans écriture.');
  }
  const summary={
    teamId:'wm-original',businessDocuments:phase2?.stats?.sourceDocuments??null,
    mappedBusinessDocuments:phase2?.stats?.mappedSourceDocuments??null,
    deviceCount:audit.statistics.totalDevices,invitationCount:audit.statistics.totalInvitations,
    groupsInHistory:phase2?.stats?.tripGroups??null,
    privateDelleTrips:phase2?.stats?.delleTrips??null
  };
  return {
    schema:1,environment:TEST_PROJECT,
    status:blockers.length?'PREPARATION_BLOQUEE':'PREPARATION_SANS_ANOMALIE_BLOQUANTE',
    blockers,warnings,summary,
    authorizedToMigrate:false,serverWritesExecuted:0,rollbackExecuted:false,
    activationExecuted:false,
    remainingValidation:[
      'Sauvegarde métier fraîche (TEST) + inventaire hors GitHub des liens et UID.',
      'Provisionnement administrateur de confiance et vérification des droits du responsable.',
      'Copie idempotente, sans suppression, par lots limités après nouvelle autorisation.',
      'Comparaison des documents source/cible avant bascule.',
      'Publication contrôlée des règles candidates, puis test de permissions.',
      'Bascule de l’interface derrière un interrupteur de déploiement ; retour arrière possible.',
      'Reconstruction des quotas, notifications, historique et trajets Delle.'
    ]
  };
}
