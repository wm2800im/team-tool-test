import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const cfg=readFileSync(new URL('../public-config.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
test('le runtime multi-équipes reste désactivé par défaut',()=>{
 assert.match(cfg,/enableMultiTeamRuntime:\s*false/);
 assert.match(app,/IS_TEST && ENV\.enableMultiTeamRuntime === true/);
});
test('les scripts runtime sont syntaxiquement valides',()=>{
 for(const filename of ['app.js','team-runtime-core.mjs','multi-team-core.mjs']){
  const result=spawnSync(process.execPath,['--check',new URL('../'+filename,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(result.status,0,filename+': '+result.stderr);
 }
});
test('les collections métier passent par un routage isolable',()=>{
 assert.match(app,/const dataCollection=name=>collection\(db,\.\.\.collectionSegments\(activeTeamId,name\)\)/);
 assert.match(app,/watch\('profiles',dataCollection\('profiles'\)/);
 assert.match(app,/watch\('preferences',dataCollection\('preferences'\)/);
 assert.match(app,/onSnapshot\(dataDoc\('config','calendar'\)/);
 assert.match(app,/activeTeamId\?\{memberId:profileId\}:\{\}/);
});
test('les liaisons historiques et les liens de la nouvelle équipe sont séparés',()=>{
 assert.match(app,/doc\(db,'deviceLinks',uid\)/);
 assert.match(app,/doc\(db,'teamDeviceLinks',uid\)/);
 assert.match(app,/if\(linkSnap\.exists\(\)\)/);
 assert.match(app,/if\(MULTI_TEAM_RUNTIME\)/);
});
test('aucun partage de cache historique ou de jeton FCM entre équipes',()=>{
 assert.match(app,/if\(activeTeamId\)\{[\s\S]*?quotaBaselineReady=false/);
 assert.match(app,/function scheduleQuotaBaselineRebuild\(date\)\{\s*if\(activeTeamId\|\|/);
 assert.match(app,/async function initMessaging\(\)\{\s*if\(activeTeamId\)return false/);
 assert.match(sw,/team-runtime-core\.mjs/);
});

test('Le chargement V1 n’utilise que les équipes accessibles au serveur',async()=>{
 const start=app.indexOf('async function resolveSwitchableTeam(');
 const end=app.indexOf('function renderTeamSwitcher(',start);
 assert.ok(start>=0&&end>start);
 const check=(requested,allowed)=>new Function('allowed','location',`
   const db={};
   const doc=(_, ...parts)=>parts;
   const collection=doc;
   const getDocFromServer=async ([root,id,child,member])=>{
     if(root==='teamDeviceLinks')return {exists:()=>true,data:()=>({teamId:'team-a',memberId:'alex'})};
     if(!allowed.includes(id))throw Object.assign(new Error('refus'),{code:'permission-denied'});
     return {data:()=>child?{active:true}:{status:'active',name:id}};
   };
   const getDocsFromServer=async ([root,id,child])=>root==='teamDeviceLinks'
     ? {docs:[{id:'team-b',data:()=>({active:true,memberId:'zoe'})}]}
     : {docs:[{id:id==='team-a'?'alex':'zoe',data:()=>({active:true})}]};
   let activeTeamId,activeTeamName,profileId,linkedProfileId,teamSwitchChoices,roster;
   const useTeamRoster=rows=>{roster=rows;};
   ${app.slice(start,end)}
   return resolveSwitchableTeam('uid').then(()=>({
     activeTeamId,profileId,roster:roster[0].memberId,choices:teamSwitchChoices.length
   }));
 `)(allowed,{href:'https://example.test/?selectedTeam='+requested});
 assert.deepEqual(await check('team-b',['team-a','team-b']),{
   activeTeamId:'team-b',profileId:'zoe',roster:'zoe',choices:2
 });
 assert.deepEqual(await check('team-b',['team-a']),{
   activeTeamId:'team-a',profileId:'alex',roster:'alex',choices:1
 });
});
