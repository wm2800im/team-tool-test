import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {getFirestore,collection,doc,getDocFromServer,getDocsFromServer} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {auditLegacyAccess,combinePhase3Readiness} from './phase3-access-core.mjs';

const $=id=>document.getElementById(id);
const config=globalThis.COVOIT_ENV;
let auth=null,db=null,liveAudit=null,phase2Report=null,lastReport=null;
function setText(id,text){$(id).textContent=String(text);}
function list(id,items){
 const host=$(id);host.replaceChildren();
 if(!items.length)items=['Aucun.'];
 for(const item of items){const el=document.createElement('li');el.textContent=item;host.appendChild(el);}
}
function render(audit,readiness){
 const stats=audit.statistics;
 setText('countDevices',stats.totalDevices);setText('countInvites',stats.totalInvitations);
 setText('countActive',stats.activeInvitations);$('profileRows').replaceChildren();
 for(const p of stats.profiles){
   const row=document.createElement('tr');
   for(const value of [p.firstName,p.devices,p.activeInvitations,p.inactiveInvitations]){
     const cell=document.createElement('td');cell.textContent=String(value);row.appendChild(cell);
   }
   $('profileRows').appendChild(row);
 }
 const status=readiness?.status??audit.status;
 setText('statusText',status==='PREPARATION_SANS_ANOMALIE_BLOQUANTE'?
   'Inventaire et rapport métier cohérents. Préparation possible ; migration NON autorisée.':
   status==='AUDIT_SANS_ANOMALIE_BLOQUANTE'?
   'Inventaire sans anomalie bloquante. Ajouter le rapport de phase 2.':
   'Des vérifications complémentaires sont nécessaires avant de poursuivre.');
 $('statusText').className=readiness?.blockers?.length||audit.blockers.length?'bad':'good';
 list('blockers',readiness?.blockers??audit.blockers);
 list('warnings',readiness?.warnings??audit.warnings);
 list('remaining',readiness?.remainingValidation??audit.outstanding);
 $('reportSection').hidden=false;
 lastReport={kind:'TeamTool_PHASE3_AUDIT_ANONYMISE',generatedAt:new Date().toISOString(),
   accessAudit:audit,preflight:readiness||null};
 $('exportReport').disabled=false;
}
function refreshReport(){
 if(!liveAudit)return;
 const readiness=phase2Report?combinePhase3Readiness(liveAudit,phase2Report):null;
 render(liveAudit,readiness);
}
$('exportReport').addEventListener('click',()=>{
 if(!lastReport)return;
 const blob=new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.download='TeamTool_TEST_rapport_audit_acces_phase3.json';a.href=url;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
});
$('phase2Report').addEventListener('change',async()=>{
 const file=$('phase2Report').files?.[0];
 phase2Report=null;
 if(!file){setText('phase2Status','Aucun rapport sélectionné.');refreshReport();return;}
 if(file.size>1_000_000){setText('phase2Status','Fichier trop volumineux (>1 Mo).');refreshReport();return;}
 try{
   const v=JSON.parse(await file.text());
   if(v?.simulation!=='SIMULATION_CONFORME'||v?.teamId!=='wm-original'||
     v?.firebaseWrites!==0||v?.activationPerformed!==false)
     throw new Error('Fichier non conforme à la simulation de phase 2.');
   phase2Report=v;
   setText('phase2Status','Rapport de phase 2 lu localement.');
 }catch(e){setText('phase2Status','Rapport invalide : '+(e?.message||String(e)));}
 refreshReport();
});
$('auditButton').addEventListener('click',async()=>{
 $('auditButton').disabled=true;
 setText('authStatus','Lecture des associations et invitations TEST…');
 try{
   if(config?.environment!=='test'||config?.firebaseConfig?.projectId!=='team-tool-test-data')
     throw new Error('Configuration TEST non reconnue.');
   const current=auth?.currentUser;
   if(!current)throw new Error('Session absente : ouvre TeamTool TEST dans ce navigateur.');
   const currentLink=await getDocFromServer(doc(db,'deviceLinks',current.uid));
   if(!currentLink.exists()||currentLink.data()?.profileId!=='igor')
     throw new Error('Cet appareil n’est pas lié au profil Igor dans Firebase TEST.');
   const [deviceSnap,inviteSnap]=await Promise.all([
     getDocsFromServer(collection(db,'deviceLinks')),
     getDocsFromServer(collection(db,'invitations'))
   ]);
   liveAudit=auditLegacyAccess({
     projectId:'team-tool-test-data',currentUid:current.uid,
     deviceLinks:deviceSnap.docs.map(x=>({id:x.id,data:{
       profileId:x.data().profileId,inviteToken:x.data().inviteToken
     }})),
     invitations:inviteSnap.docs.map(x=>({id:x.id,data:{
       profileId:x.data().profileId,active:x.data().active
     }}))
   });
   setText('authStatus','Inventaire Firebase TEST effectué. Aucune écriture.');
   refreshReport();
 }catch(e){
   liveAudit=null;lastReport=null;$('reportSection').hidden=true;
   setText('authStatus','Audit indisponible : '+(e?.message||String(e)));
 }finally{$('auditButton').disabled=!auth?.currentUser;}
});
try{
 if(config?.environment!=='test'||config?.firebaseConfig?.projectId!=='team-tool-test-data')
   throw new Error('Page réservée à TeamTool TEST.');
 const app=initializeApp(config.firebaseConfig);
 auth=getAuth(app);db=getFirestore(app);
 onAuthStateChanged(auth,user=>{
   if(user){setText('authStatus','Session TEST détectée. Tu peux lancer la lecture seule.');
     $('auditButton').disabled=false;
   }else{setText('authStatus','Aucune session TEST. Ouvre TeamTool TEST puis reviens ici.');
     $('auditButton').disabled=true;}
 },e=>setText('authStatus','Erreur d’authentification : '+(e?.message||String(e))));
}catch(e){setText('authStatus','Erreur : '+(e?.message||String(e)));}
