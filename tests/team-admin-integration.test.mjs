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

test('l’administrateur peut délivrer le premier lien au responsable non encore connecté',()=>{
 assert.match(app,/async function readPlatformTeamLeader\(teamId\)/);
 assert.match(app,/async function issuePlatformLeaderInvite\(teamId\)/);
 assert.match(app,/if\(teamId==='wm-original'\)throw/);
 assert.match(app,/const leaders=active\.filter\(d=>d\.data\(\)\?\.role==='leader'\)/);
 assert.match(app,/batch\.set\(doc\(db,'teams',teamId,'invitations',token\)/);
 assert.match(app,/await issuePlatformLeaderInvite\(createdId\)/);
 assert.match(app,/Copier le lien du responsable/);
});

test('un ancien appareil lié ne peut pas absorber une invitation d’une autre équipe',()=>{
 assert.match(app,/if\(MULTI_TEAM_RUNTIME && params\.get\('team'\) && invite\)/);
 assert.match(app,/Cet appareil est déjà associé à l’équipe historique/);
 assert.match(app,/if\(teamInvite&&await getDoc\(doc\(db,'deviceLinks',authUser\.uid\)\)/);
 assert.match(app,/fenêtre privée ou un autre navigateur/);
});
