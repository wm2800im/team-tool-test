import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const config=readFileSync(new URL('../public-config.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

test('fichiers de gestion syntaxiquement valides',()=>{
 for(const file of ['app.js','team-admin-core.mjs']){
  const p=spawnSync(process.execPath,['--check',new URL('../'+file,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr);
 }
});
test('administration multi-équipes confinée au projet TEST et au flag OFF',()=>{
 assert.match(config,/enableMultiTeamRuntime:\s*false/);
 assert.match(app,/const TEAM_ADMIN_TEST = MULTI_TEAM_RUNTIME && firebaseConfig\.projectId === 'team-tool-test-data'/);
 assert.match(app,/if\(!TEAM_ADMIN_TEST\|\|activeTeamId\)return/);
 assert.match(app,/platformAdmins/);
 assert.match(app,/async function isProvisionedPlatformAdmin/);
});
test('création atomique annuaire, membres et codes courts',()=>{
 assert.match(app,/await runTransaction\(db,async tx=>\{/);
 assert.match(app,/tx\.set\(directoryRefs\[i\]/);
 assert.match(app,/tx\.set\(doc\(db,'teams',prepared\.teamId,'members',memberId\)/);
 assert.match(app,/tx\.set\(doc\(db,'teams',prepared\.teamId,'shortCodes',shortCode\)/);
 assert.match(app,/if\(prepared\.teamId==='wm-original'\)/);
});
test('responsable de nouvelle équipe peut créer, remplacer et copier ses invitations',()=>{
 assert.match(app,/activeTeamLeaderId!==linkedProfileId/);
 assert.match(app,/getDocs\(dataCollection\('invitations'\)\)/);
 assert.match(app,/batch\.update\(dataDoc\('invitations',x\.token\),\{active:false\}\)/);
 assert.match(app,/batch\.set\(dataDoc\('invitations',token\),\{memberId,active:true/);
 assert.match(html,/id="platformTeamsBlock"/);
 assert.match(html,/id="teamMemberAdminBlock"/);
 assert.match(sw,/team-admin-core\.mjs/);
});
test('affichage du nombre de membres et codes multiples par équipe',()=>{
 assert.match(app,/answered\+'\/'\+PEOPLE\.length\+' renseignés'/);
 assert.match(app,/join\(activeTeamId\?' · ':''\)/);
});
