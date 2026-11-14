// Vérifications en lecture seule. Ce module n'a aucune permission d'écriture Firebase.
// Les réponses de l'API (règles, UIDs et jetons) ne doivent jamais être imprimées.
import {createHash} from 'node:crypto';
import {readFileSync,appendFileSync} from 'node:fs';

const PROJECT='team-tool-test-data';
const DATABASE='projects/team-tool-test-data/databases/(default)';
const RULESET_PREFIX='projects/team-tool-test-data/rulesets/';
const digest=value=>createHash('sha256').update(String(value).replace(/\r\n/g,'\n').trimEnd()+'\n').digest('hex');

export function inspectProject(project){
 return project?.projectId===PROJECT && project?.name==='projects/398960207483';
}
export function inspectDatabase(database){
 return database?.name===DATABASE && database?.type==='FIRESTORE_NATIVE' && !database?.deleteTime;
}
export function inspectRules(release,ruleset,{legacy,candidate}){
 const name=release?.rulesetName;
 if(typeof name!=='string'||!name.startsWith(RULESET_PREFIX)||ruleset?.name!==name)
   return {ok:false,kind:'unknown'};
 const files=ruleset?.source?.files;
 if(!Array.isArray(files)||files.length!==1||typeof files[0]?.content!=='string')
   return {ok:false,kind:'unknown'};
 const hash=digest(files[0].content);
 if(hash===digest(legacy))return {ok:true,kind:'historical'};
 if(hash===digest(candidate))return {ok:true,kind:'candidate'};
 return {ok:false,kind:'unrecognized'};
}
export function inspectBackups(data,now=new Date()){
 if(!Array.isArray(data?.backups)||data?.unreachable?.length)return false;
 const timestamp=now.getTime();
 return data.backups.some(b=>{
   const at=Date.parse(b.snapshotTime||'');
   const expiry=Date.parse(b.expireTime||'');
   return b.database===DATABASE && b.state==='READY'
     && Number.isFinite(at) && at<=timestamp && timestamp-at<=72*3600e3
     && Number.isFinite(expiry) && expiry>timestamp;
 });
}
export function inspectAdminDocs(data){
 return Array.isArray(data?.documents)&&data.documents.some(d=>
   d.name?.startsWith(DATABASE+'/documents/platformAdmins/')
   && d.fields?.active?.booleanValue===true);
}

// Les codes de diagnostic sont volontairement génériques : jamais de réponse brute, UID ni jeton.
export function safeApiDiagnostic(status){
 if(status===401||status===403)return 'HTTP '+status+' — autorisation insuffisante';
 if(status===404)return 'HTTP 404 — ressource absente ou accès masqué';
 if(status===429)return 'HTTP 429 — limite API';
 if(Number.isInteger(status) && status>=500 && status<600)return 'HTTP '+status+' — service indisponible';
 if(Number.isInteger(status) && status>=400 && status<500)return 'HTTP '+status+' — requête refusée';
 return 'erreur de lecture ou délai dépassé';
}
class RemoteReadError extends Error{
 constructor(status){super('Accès REST refusé');this.httpStatus=status;}
}

async function main(){
 if(!process.env.TEST_FIREBASE_AUTH_TOKEN)throw Error('Identité Google Cloud TEST non disponible');
 const key=process.env.TEST_FIREBASE_AUTH_TOKEN;
 const base='https://firebaserules.googleapis.com/v1/projects/'+PROJECT;
 const firestore='https://firestore.googleapis.com/v1/';
 const observations=[];
 const probe=async (label,url,validate)=>{
   try{
     const res=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});
     if(!res.ok)throw new RemoteReadError(res.status);
     const json=await res.json();
     const result=await validate(json);
     const ok=Boolean(result);
     observations.push({label,ok,detail:ok?(typeof result==='string'?result:''):
       'réponse non conforme, ressource absente ou condition non satisfaite'});
   }catch(e){
     // Les détails du jeton, de l'URL et du corps HTTP ne quittent jamais le processus.
     observations.push({label,ok:false,detail:safeApiDiagnostic(e?.httpStatus)});
   }
 };
 await probe('Identité du projet Firebase TEST',
   'https://cloudresourcemanager.googleapis.com/v3/projects/398960207483',inspectProject);
 await probe('Base Firestore TEST active',firestore+DATABASE,inspectDatabase);

 let release=null, ruleset=null;
 await probe('Règles Firebase actives sur TEST',base+'/releases/cloud.firestore',async data=>{
   release=data;
   if(!String(data?.rulesetName||'').startsWith(RULESET_PREFIX))return false;
   const id=data.rulesetName.slice(RULESET_PREFIX.length);
   if(!/^[a-zA-Z0-9_-]+$/.test(id))return false;
   const res=await fetch(base+'/rulesets/'+id,
      {method:'GET',headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});
   if(!res.ok)throw new RemoteReadError(res.status);
   ruleset=await res.json();
   const outcome=inspectRules(release,ruleset,{
     legacy:readFileSync('firestore.rules.test.txt','utf8'),
     candidate:readFileSync('firestore.rules.multiteam.candidate.txt','utf8')
   });
   return outcome.ok?outcome.kind:false;
 });
 await probe('Sauvegarde complète TEST récente (moins de 72 h)',
   firestore+'projects/'+PROJECT+'/locations/-/backups',inspectBackups);
 await probe('Superadministrateur TEST provisionné',
   firestore+DATABASE+'/documents/platformAdmins?pageSize=20',inspectAdminDocs);
 const lines=[
   '### Précontrôle Firebase TEST en lecture seule',
   '',
   '| Vérification | Résultat |',
   '|---|---|',
   ...observations.map(x=>'| '+x.label+' | '+(x.ok?'OK'+(x.detail?' ('+x.detail+')':''):'NON VÉRIFIÉ / BLOQUANT — '+x.detail)+' |'),
   '',
   'Aucune modification de Firebase, aucune interrogation de PROD.',
   '**Ce contrôle ne prouve pas une restauration de sauvegarde, ni les protections de l’environnement de publication.**',
   'Ne pas déployer les règles ni activer le runtime sans ces deux preuves supplémentaires.',
   ''
 ];
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n'));
 console.log('Précontrôle Firebase TEST : '+observations.filter(x=>x.ok).length+'/'+observations.length+' vérifications confirmées.');
 for(const x of observations)console.log((x.ok?'OK ':'BLOCKED ')+x.label+(x.detail?' — '+x.detail:''));
 if(observations.some(x=>!x.ok))process.exitCode=1;
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href)
 main().catch(()=>{console.error('Précontrôle Firebase TEST interrompu sans aucune écriture.');process.exitCode=1;});
