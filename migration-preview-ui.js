import {simulateLegacyMigration} from './migration-preview-core.mjs';
import {SNAPSHOT_COLLECTIONS} from './snapshot-core.mjs';
const $=id=>document.getElementById(id);
let lastReport=null;
function setText(id,value){$(id).textContent=String(value);}
function renderItems(id,items){
  const host=$(id);host.replaceChildren();
  for(const item of items){const li=document.createElement('li');li.textContent=item;host.appendChild(li);}
}
function renderReport(p,file){
  $('errorPanel').hidden=true;$('summary').hidden=false;
  $('errorsContainer').hidden=p.errors.length===0;
  setText('resultPill',p.valid?'SIMULATION CONFORME':'SIMULATION BLOQUÉE');
  $('resultPill').className='pill '+(p.valid?'ok':'bad');
  setText('resultSubtext','Fichier : '+file.name+' · Aucune écriture Firebase');
  setText('totalDocs',p.stats?.sourceDocuments??'—');
  setText('mappedDocs',p.stats?.mappedSourceDocuments??'—');
  setText('tripGroups',p.stats?.tripGroups??'—');
  setText('delleTrips',p.stats?.delleTrips??'—');
  const counts=p.stats?.counts||{},covered=p.stats?.mappedCounts||{};
  $('collectionRows').replaceChildren();
  for(const name of SNAPSHOT_COLLECTIONS){
    const row=document.createElement('tr');
    for(const value of [name,counts[name]??'—',covered[name]??'—']){
      const td=document.createElement('td');td.textContent=String(value);row.appendChild(td);
    }
    $('collectionRows').appendChild(row);
  }
  setText('members',(p.stats?.members||[]).map(m=>m.name+' : '+m.shortCode+
    (m.role==='leader'?' (responsable)':'')).join(' · ')||'—');
  renderItems('errors',p.errors);
  renderItems('warnings',p.warnings);
  renderItems('prerequisites',p.prerequisites);
  lastReport={
    simulation:p.status,sourceFileName:file.name,teamId:p.teamId,
    errors:p.errors,warnings:p.warnings,stats:p.stats,prerequisites:p.prerequisites,
    firebaseWrites:0,activationPerformed:false
  };
  $('reportDownload').disabled=false;
}
$('migrationFile').addEventListener('change',async()=>{
  lastReport=null;$('reportDownload').disabled=true;
  $('summary').hidden=true;$('errorPanel').hidden=true;
  const file=$('migrationFile').files?.[0];
  if(!file)return;
  if(file.size>50_000_000){
    $('errorPanel').hidden=false;setText('errorText','Fichier trop volumineux (plus de 50 Mo).');return;
  }
  try{
    const payload=JSON.parse(await file.text());
    const report=simulateLegacyMigration(payload);
    renderReport(report,file);
  }catch(e){
    $('errorPanel').hidden=false;
    setText('errorText',e?.message||'Fichier JSON illisible');
  }
});
$('reportDownload').addEventListener('click',()=>{
  if(!lastReport)return;
  const blob=new Blob([JSON.stringify(lastReport,null,2)],
    {type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='TeamTool_TEST_rapport_simulation_phase2.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
});
