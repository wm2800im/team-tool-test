from pathlib import Path
import re

VERSION='4.6.0-beta.2'
p=Path('app.js')
s=p.read_text(encoding='utf-8')

s=s.replace("const APP_VERSION = ENV.version || '4.6.0-beta.1';",f"const APP_VERSION = ENV.version || '{VERSION}';",1)

old="""function driverSuggestion(ds,members){
  const target=canonical(members).join('|'); const counts=Object.fromEntries(members.map(p=>[p,0]));
  flattenTrips().filter(t=>t.date<ds&&canonical(t.participants).join('|')===target).forEach(t=>{if(t.driver in counts)counts[t.driver]++;});
  const min=Math.min(...members.map(p=>counts[p]));let candidates=canonical(members.filter(p=>counts[p]===min));
  if(candidates.length>1){const prev=iso(addDays(fromISO(ds),-1));const drovePrev=new Set(flattenTrips().filter(t=>t.date===prev).map(t=>t.driver));const notPrev=candidates.filter(p=>!drovePrev.has(p));if(notPrev.length)candidates=notPrev;}
  return {counts,candidates,key:groupCode(members)};
}"""
new="""function lastDrivingDateBefore(ds,pid){
  let last='';
  flattenTrips().forEach(t=>{if(t.date<ds&&t.driver===pid&&t.date>last)last=t.date;});
  const scan=v=>{if(v?.profileId===pid&&v?.status==='alone'&&v?.date<ds&&v.date>last)last=v.date;};
  availability.forEach(scan);legacyStatus.forEach(scan);
  return last;
}
function driverSuggestion(ds,members){
  const target=canonical(members).join('|'); const counts=Object.fromEntries(members.map(p=>[p,0]));
  flattenTrips().filter(t=>t.date<ds&&canonical(t.participants).join('|')===target).forEach(t=>{if(t.driver in counts)counts[t.driver]++;});
  const min=Math.min(...members.map(p=>counts[p]));let candidates=canonical(members.filter(p=>counts[p]===min));
  const lastDriving=Object.fromEntries(candidates.map(p=>[p,lastDrivingDateBefore(ds,p)]));
  if(candidates.length>1){
    const oldest=[...candidates].sort((a,b)=>(lastDriving[a]||'').localeCompare(lastDriving[b]||''))[0];
    const oldestDate=lastDriving[oldest]||'';
    candidates=candidates.filter(p=>(lastDriving[p]||'')===oldestDate);
  }
  return {counts,candidates,key:groupCode(members),lastDriving};
}"""
if old not in s:
    raise SystemExit('driverSuggestion block not found')
s=s.replace(old,new,1)

old="if(name==='legacyStatus'){ if(activePage('history'))renderSummary(); return; }"
new="if(name==='legacyStatus'){ if(activePage('tomorrow'))renderTomorrow(); if(activePage('groups'))renderGroups(); if(activePage('history'))renderSummary(); return; }"
if old not in s:
    raise SystemExit('legacy refresh marker not found')
s=s.replace(old,new,1)

start=s.find('// DELLE_PRIVATE_START')
end=s.find('// DELLE_PRIVATE_END',start)
if start<0 or end<0:
    raise SystemExit('Delle block markers not found')
end=end+len('// DELLE_PRIVATE_END')
block=r'''// DELLE_PRIVATE_START
const DELLE_PAIR=['igor','ludo'];
function isDelleViewer(){return DELLE_PAIR.includes(profileId);}
function isDelleLinkedUser(){return DELLE_PAIR.includes(linkedProfileId);}
function subscribeDellePrivate(){
  if(!isDelleLinkedUser()||delleUnsubscribe)return;
  delleTripsReady=false;delleTripsError='';
  try{
    delleUnsubscribe=onSnapshot(collection(db,'delleTrips'),snap=>{
      delleTrips=new Map(snap.docs.map(d=>[d.id,{...d.data(),date:d.data().date||d.id}]));
      delleTripsReady=true;delleTripsError='';
      if(activePage('tomorrow'))renderDellePrivate(nextCarpoolISO());
    },err=>{
      console.warn('Delle private',err);delleTripsReady=true;delleTripsError=friendlyError(err);
      if(activePage('tomorrow'))renderDellePrivate(nextCarpoolISO());
    });
  }catch(e){delleTripsReady=true;delleTripsError=friendlyError(e);}
}
function delleRotation(beforeDate=null){
  const rows=[...delleTrips.values()].filter(x=>DELLE_PAIR.includes(x.driver)&&(!beforeDate||x.date<beforeDate)).sort((a,b)=>a.date.localeCompare(b.date));
  const counts={igor:0,ludo:0};rows.forEach(x=>counts[x.driver]++);
  let suggested='igor';
  if(counts.igor<counts.ludo)suggested='igor';
  else if(counts.ludo<counts.igor)suggested='ludo';
  else if(rows.length)suggested=rows[rows.length-1].driver==='igor'?'ludo':'igor';
  return{counts,suggested,last:rows.length?rows[rows.length-1]:null};
}
function historicalDelleMainState(ds){
  const groups=tripGroupsForDate(ds);
  const ig=groups.filter(g=>(g.members||g.participants||[]).includes('igor'));
  const lu=groups.filter(g=>(g.members||g.participants||[]).includes('ludo'));
  const shared=ig.find(g=>(g.members||g.participants||[]).includes('ludo'));
  if(shared)return{kind:'same',group:shared,mainDriver:shared.driver||shared.driverId||null};
  if(ig.length&&lu.length)return{kind:'separate'};
  return{kind:'missing'};
}
function delleMainState(ds){
  const proposal=proposalForDate(ds),groups=proposal.groups||[];
  if(proposal.pending)return{kind:'pending',proposal};
  const ig=groups.find(g=>(g.members||g.participants||[]).includes('igor'));
  const lu=groups.find(g=>(g.members||g.participants||[]).includes('ludo'));
  if(!ig||!lu)return{kind:'missing',proposal};
  if(groupMembersKey(ig)!==groupMembersKey(lu))return{kind:'separate',proposal};
  const validated=validatedGroupForPlan(ds,ig),plannedDriver=ig.driver||ig.driverId||null;
  const validatedDriver=validated?.driver||validated?.driverId||null;
  const mainValidated=!!validated&&validatedDriver===plannedDriver;
  return{kind:'same',proposal,group:ig,validated,mainValidated,mainDriver:validatedDriver||plannedDriver};
}
function dellePrivateHeader(){return `<div class="delle-head"><div><span class="delle-lock">🔒 Privé Igor · Ludo</span><h3>🚗 Jusqu’à Delle</h3></div><span class="delle-place">Point de ralliement</span></div>`;}
function delleHistoryHtml(){
  if(!delleTripsReady)return '<details class="delle-history-shell"><summary>Historique Delle</summary><div class="small muted delle-history-loading">Chargement…</div></details>';
  if(delleTripsError)return `<details class="delle-history-shell" open><summary>Historique Delle</summary><div class="delle-warning">Historique indisponible : ${delleTripsError}</div></details>`;
  const rotation=delleRotation(),rows=[...delleTrips.values()].filter(x=>DELLE_PAIR.includes(x.driver)).sort((a,b)=>b.date.localeCompare(a.date));
  const list=rows.length?rows.slice(0,80).map(x=>{
    const st=historicalDelleMainState(x.date),forced=st.kind==='same'&&DELLE_PAIR.includes(st.mainDriver)?st.mainDriver:null;
    return `<div class="delle-history-row"><div class="delle-history-date"><strong>${fmtDate(x.date,{day:'2-digit',month:'2-digit',year:'numeric'})}</strong><span>${forced?'conducteur imposé par le groupe':'trajet privé'}</span></div><select class="input delle-history-select" data-date="${x.date}" ${forced?'disabled':''}><option value="igor" ${x.driver==='igor'?'selected':''}>Igor</option><option value="ludo" ${x.driver==='ludo'?'selected':''}>Ludo</option></select><button class="btn secondary smallbtn delle-history-save" data-date="${x.date}" ${forced?'disabled':''}>Modifier</button><button class="btn danger smallbtn delle-history-delete" data-date="${x.date}">Suppr.</button></div>`;
  }).join(''):'<div class="small muted">Aucun trajet Delle enregistré.</div>';
  return `<details class="delle-history-shell"><summary>Historique Delle · Igor ${rotation.counts.igor} / Ludo ${rotation.counts.ludo}</summary><div class="delle-history-body"><div class="delle-history-add"><div class="field"><label>Ajouter un ancien trajet</label><input id="delleHistoryDate" class="input" type="date" max="${todayISO()}"></div><div class="field"><label>Conducteur réel</label><select id="delleHistoryNewDriver" class="input"><option value="igor">Igor</option><option value="ludo">Ludo</option></select></div><button id="delleHistoryAdd" class="btn smallbtn" type="button">Ajouter</button></div><div id="delleHistoryState" class="small muted">Un trajet passé peut être ajouté si Igor et Ludo étaient dans le même groupe principal ce jour-là.</div><div class="delle-history-list">${list}</div></div></details>`;
}
function bindDelleHistoryActions(){
  $('delleHistoryAdd')?.addEventListener('click',async()=>{
    const ds=$('delleHistoryDate')?.value,driver=$('delleHistoryNewDriver')?.value,state=$('delleHistoryState');
    if(!ds){if(state)state.textContent='Choisis une date.';return;}
    try{await saveHistoricalDelleTrip(ds,driver);if(state)state.textContent='✓ Trajet ajouté / mis à jour.';}catch(e){if(state)state.textContent=friendlyError(e);}
  });
  qsa('.delle-history-save').forEach(btn=>btn.addEventListener('click',async()=>{
    const ds=btn.dataset.date,sel=document.querySelector(`.delle-history-select[data-date="${ds}"]`);btn.disabled=true;
    try{await saveHistoricalDelleTrip(ds,sel?.value);toast('✓ Historique Delle modifié');}catch(e){alert(friendlyError(e));btn.disabled=false;}
  }));
  qsa('.delle-history-delete').forEach(btn=>btn.addEventListener('click',()=>deleteDelleTrip(btn.dataset.date)));
}
function renderDellePrivate(ds){
  const host=$('dellePrivate');if(!host)return;
  host.style.display='none';host.innerHTML='';
  if(!isDelleViewer())return;
  host.style.display='block';
  const history=delleHistoryHtml();
  if(delleTripsError){host.innerHTML=`${dellePrivateHeader()}<div class="delle-warning">Données Delle indisponibles : ${delleTripsError}</div>${history}`;bindDelleHistoryActions();return;}
  const both=isAvailable(getAvail(ds,'igor'))&&isAvailable(getAvail(ds,'ludo'));
  if(!both){host.innerHTML=`${dellePrivateHeader()}<div class="small muted delle-no-live">Pas de trajet commun Delle prévu pour le prochain jour.</div>${history}`;bindDelleHistoryActions();return;}
  const state=delleMainState(ds);
  if(state.kind==='separate'){host.innerHTML=`${dellePrivateHeader()}<div class="delle-warning">Igor et Ludo sont dans des groupes différents : pas de trajet commun jusqu’à Delle.</div>${history}`;bindDelleHistoryActions();return;}
  if(state.kind!=='same'){host.innerHTML=`${dellePrivateHeader()}<div class="small muted delle-no-live">La répartition principale doit être définie avant le trajet jusqu’à Delle.</div>${history}`;bindDelleHistoryActions();return;}
  const rotation=delleRotation(ds),existing=delleTrips.get(ds),mainDriver=state.mainDriver,forced=DELLE_PAIR.includes(mainDriver)?mainDriver:null;
  const selected=forced||existing?.driver||rotation.suggested,ready=state.mainValidated;
  const mismatch=existing&&forced&&existing.driver!==forced;
  host.innerHTML=`${dellePrivateHeader()}<div class="delle-body"><div class="delle-counters">Rotation Delle : Igor <strong>${rotation.counts.igor}</strong> · Ludo <strong>${rotation.counts.ludo}</strong></div><div class="delle-suggest">${forced?'🚘 Conducteur imposé par le groupe':'🔁 Tour conseillé'} : <strong>${label(forced||rotation.suggested)}</strong></div><div class="delle-driver-row"><label>Conducteur réel jusqu’à Delle</label><select id="delleDriver" class="input" ${(forced||!ready)?'disabled':''}><option value="igor" ${selected==='igor'?'selected':''}>Igor</option><option value="ludo" ${selected==='ludo'?'selected':''}>Ludo</option></select></div>${!ready?'<div class="small muted">Valide d’abord le groupe principal. La priorité du trajet principal est ainsi garantie.</div>':''}${mismatch?'<div class="delle-warning">Le trajet Delle enregistré ne correspond plus au conducteur du groupe principal. Mets-le à jour.</div>':''}${existing&&!mismatch?`<div class="delle-validated">✓ Delle validé : <strong>${label(existing.driver)}</strong></div>`:''}<div class="delle-actions"><button id="saveDelleTrip" class="btn smallbtn" type="button" ${!ready?'disabled':''}>${existing?'↻ Mettre à jour':'✓ Valider Delle'}</button>${existing?'<button id="deleteDelleTrip" class="btn secondary smallbtn" type="button">Annuler</button>':''}</div></div>${history}`;
  $('saveDelleTrip')?.addEventListener('click',async()=>{const btn=$('saveDelleTrip');btn.disabled=true;try{await saveDelleTrip(ds,$('delleDriver').value);}catch(e){alert(friendlyError(e));btn.disabled=false;}});
  $('deleteDelleTrip')?.addEventListener('click',()=>deleteDelleTrip(ds));
  bindDelleHistoryActions();
}
async function writeDelleTrip(ds,driver,state,source){
  const mainDriver=state.mainDriver,forced=DELLE_PAIR.includes(mainDriver)?mainDriver:null;
  if(!DELLE_PAIR.includes(driver))throw new Error('Conducteur Delle invalide.');
  if(forced&&driver!==forced)throw new Error(`${label(forced)} doit conduire jusqu’à Delle car il conduit le groupe principal.`);
  const existing=delleTrips.get(ds),g=state.group;
  await setDoc(doc(db,'delleTrips',ds),{date:ds,destination:'Delle',members:DELLE_PAIR,driver,mainGroupId:g?.id||null,mainGroupMembers:canonical(g?.members||g?.participants||[]),mainDriver,privatePair:'igor_ludo',source,validatedAt:existing?.validatedAt||serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:profileId},{merge:true});
}
async function saveDelleTrip(ds,driver){
  if(!isDelleViewer()||!isDelleLinkedUser())throw new Error('Accès réservé à Igor et Ludo.');
  const state=delleMainState(ds);if(state.kind!=='same'||!state.mainValidated)throw new Error('Valide d’abord le groupe principal.');
  await writeDelleTrip(ds,driver,state,IS_TEST?'test':'app');toast(`✓ Delle : ${label(driver)} conducteur`);
}
async function saveHistoricalDelleTrip(ds,driver){
  if(!isDelleViewer()||!isDelleLinkedUser())throw new Error('Accès réservé à Igor et Ludo.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ds)||ds>todayISO())throw new Error('Choisis une date passée ou aujourd’hui.');
  const state=historicalDelleMainState(ds);
  if(state.kind==='separate')throw new Error('Igor et Ludo étaient dans des groupes différents ce jour-là : aucun trajet Delle commun possible.');
  if(state.kind!=='same')throw new Error('Aucun groupe principal validé avec Igor et Ludo ensemble pour cette date.');
  await writeDelleTrip(ds,driver,state,IS_TEST?'test-history':'history');
}
async function deleteDelleTrip(ds){
  if(!isDelleViewer()||!isDelleLinkedUser())return;
  if(!confirm(`Supprimer le trajet privé jusqu’à Delle du ${fmtDate(ds)} ?`))return;
  try{await deleteDoc(doc(db,'delleTrips',ds));toast('Trajet Delle supprimé.');}catch(e){alert(friendlyError(e));}
}
// DELLE_PRIVATE_END'''
s=s[:start]+block+s[end:]
p.write_text(s,encoding='utf-8')

p=Path('public-config.js')
cfg=p.read_text(encoding='utf-8')
if 'version: "4.6.0-beta.1"' not in cfg:
    raise SystemExit('public-config version marker missing')
cfg=cfg.replace('version: "4.6.0-beta.1"',f'version: "{VERSION}"',1)
cfg=cfg.replace('// 4.6 beta — rotation privée Igor/Ludo jusqu’à Delle','// 4.6 beta.2 — historique Delle privé + départage dernière conduite',1)
p.write_text(cfg,encoding='utf-8')

p=Path('service-worker.js')
sw=p.read_text(encoding='utf-8')
sw=re.sub(r"const CACHE='[^']+';",f"const CACHE='covoiturage-{VERSION}';",sw,count=1)
p.write_text(sw,encoding='utf-8')

p=Path('styles.css')
css=p.read_text(encoding='utf-8')
if '/* 4.6 beta.2 — historique Delle privé */' not in css:
    css += r'''

/* 4.6 beta.2 — historique Delle privé */
.delle-history-shell{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}
.delle-history-shell>summary{cursor:pointer;font-weight:800;color:var(--brand);list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
.delle-history-shell>summary::-webkit-details-marker{display:none}
.delle-history-shell>summary:after{content:'›';font-size:22px;transition:transform .18s ease}
.delle-history-shell[open]>summary:after{transform:rotate(90deg)}
.delle-history-body{display:grid;gap:10px;margin-top:10px}
.delle-history-add{display:grid;grid-template-columns:1.2fr 1fr auto;gap:8px;align-items:end;padding:10px;border-radius:12px;background:var(--soft);border:1px solid var(--line)}
.delle-history-list{display:grid;gap:7px}
.delle-history-row{display:grid;grid-template-columns:minmax(130px,1fr) 110px auto auto;gap:7px;align-items:center;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--card)}
.delle-history-date{display:flex;flex-direction:column;gap:2px}.delle-history-date span{font-size:10.5px;color:var(--muted)}
.delle-history-select{min-height:36px;padding:6px 8px}.delle-no-live{padding:8px 0}
@media(max-width:680px){.delle-history-add{grid-template-columns:1fr 1fr}.delle-history-add .btn{grid-column:1/-1}.delle-history-row{grid-template-columns:1fr 100px}.delle-history-row .delle-history-save,.delle-history-row .delle-history-delete{width:100%}}
'''
p.write_text(css,encoding='utf-8')

Path('CHANGEMENTS_4.6.0-beta.2.md').write_text('''# Covoiturage 4.6.0-beta.2\n\n- Historique Delle privé pour Igor et Ludo.\n- Ajout rétroactif d’un trajet Delle sur une date passée lorsque le trajet principal contient Igor et Ludo dans le même groupe.\n- Modification ou suppression d’un ancien conducteur Delle.\n- Le trajet Delle reste absent de l’historique général et invisible aux autres utilisateurs.\n- En cas d’égalité de compteur d’un groupe, départage selon la dernière date où chaque candidat a conduit, tous groupes confondus, avec les jours « Seul » inclus.\n''',encoding='utf-8')

src=Path('app.js').read_text(encoding='utf-8')
for token in ['lastDrivingDateBefore','saveHistoricalDelleTrip','Historique Delle','test-history',f"ENV.version || '{VERSION}'"]:
    if token not in src:
        raise SystemExit('missing '+token)
if src.count('// DELLE_PRIVATE_START')!=1 or src.count('// DELLE_PRIVATE_END')!=1:
    raise SystemExit('bad Delle markers')
print('beta.2 patched')
