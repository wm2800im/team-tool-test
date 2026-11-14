import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectProject,inspectDatabase,inspectRules,inspectBackups,inspectAdminDocs,safeApiDiagnostic} from '../scripts/firebase-test-readiness.mjs';

const database='projects/team-tool-test-data/databases/(default)';
const name='projects/team-tool-test-data/rulesets/abc-123';
test('vérifier le projet et la base TEST exactement',()=>{
 assert.equal(inspectProject({projectId:'team-tool-test-data',name:'projects/398960207483'}),true);
 assert.equal(inspectProject({projectId:'team-tool-data',name:'projects/398960207483'}),false);
 // La réponse REST Firestore Database n'a aucun champ state, contrairement aux backups.
 assert.equal(inspectDatabase({name:database,type:'FIRESTORE_NATIVE'}),true);
 assert.equal(inspectDatabase({name:database,type:'FIRESTORE_NATIVE',deleteTime:'2026-11-14T00:00:00Z'}),false);
 assert.equal(inspectDatabase({name:'projects/team-tool-data/databases/(default)',type:'FIRESTORE_NATIVE'}),false);
});
test('rejeter les règles étrangères et les déploiements inattendus',()=>{
 const old="rules_version = '2';\n",next="rules_version = '3';\n";
 const release={rulesetName:name};
 assert.deepEqual(inspectRules(release,{name,source:{files:[{content:old}]}},{legacy:old,candidate:next}),{ok:true,kind:'historical'});
 assert.deepEqual(inspectRules(release,{name,source:{files:[{content:next}]}},{legacy:old,candidate:next}),{ok:true,kind:'candidate'});
 assert.deepEqual(inspectRules(release,{name,source:{files:[{content:'unknown'}]}},{legacy:old,candidate:next}),{ok:false,kind:'unrecognized'});
 assert.deepEqual(inspectRules({...release,rulesetName:'projects/team-tool-data/rulesets/a'},{name,source:{files:[{content:old}]}},{legacy:old,candidate:next}),{ok:false,kind:'unknown'});
 assert.equal(inspectRules(release,{name:'projects/team-tool-test-data/rulesets/different',source:{files:[{content:old}]}},{legacy:old,candidate:next}).ok,false);
});
test('la sauvegarde doit être prête, complète, récente et non expirée',()=>{
 const now=new Date('2026-11-14T15:00:00Z');
 const b={database,state:'READY',snapshotTime:'2026-11-14T12:00:00Z',expireTime:'2026-11-21T00:00:00Z'};
 assert.equal(inspectBackups({backups:[b]},now),true);
 assert.equal(inspectBackups({backups:[{...b,state:'CREATING'}]},now),false);
 assert.equal(inspectBackups({backups:[{...b,database:'projects/team-tool-data/databases/(default)'}]},now),false);
 assert.equal(inspectBackups({backups:[{...b,snapshotTime:'2026-11-01T12:00:00Z'}]},now),false);
 assert.equal(inspectBackups({backups:[{...b,expireTime:'2026-11-14T14:59:00Z'}]},now),false);
 assert.equal(inspectBackups({backups:[b],unreachable:['europe-west1']},now),false);
 assert.equal(inspectBackups({},now),false);
});
test('admin explicitement provisionné par backend seulement',()=>{
 const data={documents:[{name:database+'/documents/platformAdmins/uid-secret',fields:{active:{booleanValue:true}}}]};
 assert.equal(inspectAdminDocs(data),true);
 assert.equal(inspectAdminDocs({documents:[{name:data.documents[0].name,fields:{active:{booleanValue:false}}}]}),false);
 assert.equal(inspectAdminDocs({documents:[{name:'projects/team-tool-data/databases/(default)/documents/platformAdmins/uid',fields:{active:{booleanValue:true}}}]}),false);
});

test('le déclencheur ne lance que le précontrôle TEST depuis main',()=>{
 const dispatcher=readFileSync(new URL('../.github/workflows/firebase-test-readiness-dispatch.yml',import.meta.url),'utf8');
 const access=readFileSync(new URL('../.github/workflows/firebase-test-access.yml',import.meta.url),'utf8');
 assert.match(dispatcher,/github\.repository_id == '1356239565' && github\.ref == 'refs\/heads\/main'/);
 assert.match(dispatcher,/repos\/wm2800im\/team-tool-test\/actions\/workflows\/firebase-test-access\.yml\/dispatches/);
 assert.match(dispatcher,/-f ref=main/);
 assert.doesNotMatch(dispatcher,/pull_request|checkout|id-token/);
 assert.doesNotMatch(access,/testIamPermissions|team-tool-data/);
});

test('le contrôle distant utilise uniquement le workflow manuel déjà autorisé',()=>{
 const live=readFileSync(new URL('../.github/workflows/firebase-test-access.yml',import.meta.url),'utf8');
 const staticWorkflow=readFileSync(new URL('../.github/workflows/firebase-test-readiness.yml',import.meta.url),'utf8');
 assert.match(live,/workflow_dispatch:/);
 assert.match(live,/github\.ref == 'refs\/heads\/main'/);
 assert.match(live,/node scripts\/firebase-test-readiness\.mjs/);
 assert.match(live,/team-tool-test-data/);
 assert.match(live,/persist-credentials: false/);
 assert.doesNotMatch(staticWorkflow,/verify-firebase-test:/);
 assert.doesNotMatch(staticWorkflow,/id-token: write/);
});

test('diagnostics compréhensibles sans divulguer de données',()=>{
 assert.match(safeApiDiagnostic(403),/HTTP 403.*autorisation/);
 assert.match(safeApiDiagnostic(404),/HTTP 404/);
 assert.match(safeApiDiagnostic(429),/HTTP 429/);
 assert.match(safeApiDiagnostic(503),/HTTP 503/);
 assert.equal(safeApiDiagnostic(), 'erreur de lecture ou délai dépassé');
});

test('une sauvegarde d’une autre base TEST ne satisfait pas le précontrôle',()=>{
 const now=new Date('2026-11-14T15:00:00Z');
 const backup={database:'projects/team-tool-test-data/databases/recovery',state:'READY',
   snapshotTime:'2026-11-14T12:00:00Z',expireTime:'2026-11-21T00:00:00Z'};
 assert.equal(inspectBackups({backups:[backup]},now),false);
});
