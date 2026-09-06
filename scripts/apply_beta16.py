from pathlib import Path

p=Path('app.js')
s=p.read_text()

def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count:
        raise SystemExit(f'Expected {count} occurrence(s), got {n}: {old[:120]!r}')
    s=s.replace(old,new,count)

rep("const APP_VERSION = ENV.version || '4.4.0-beta.15';", "const APP_VERSION = ENV.version || '4.4.0-beta.16';")

marker="function renderTomorrow(){\n"
helpers="""function acceptedImperativeTimes(date,responder){
  const times=[];
  PEOPLE.filter(owner=>owner!==responder).forEach(owner=>{
    const ov=getAvail(date,owner); if(ov?.status!=='time')return;
    const c=getCompat(date,owner,responder);
    if(c?.ownerTime===ov.time&&c.response==='yes')times.push(timeLabel(ov.time));
  });
  return [...new Set(times)].sort();
}
function collectiveStatusMeta(date,pid,v){
  const base=statusMeta(v);
  if(v?.status!=='present')return base;
  const times=acceptedImperativeTimes(date,pid);
  return times.length?{label:`Présent · OK ${times.join(' / ')}`,cls:'present'}:base;
}

"""
if helpers.strip() in s:
    raise SystemExit('Collective helpers already present')
rep(marker,helpers+marker)
rep("PEOPLE.forEach(p=>{const v=getAvail(ds,p);if(v)answered++;const m=statusMeta(v);", "PEOPLE.forEach(p=>{const v=getAvail(ds,p);if(v)answered++;const m=collectiveStatusMeta(ds,p,v);")

old="""function globalCompatibilityState(date,people){
  const unknown=unknownCompatibilities(date,people);
  const rejected=explicitIncompatibilities(date,people);
  return {unknown,rejected,pending:unknown.length>0};
}
function autoSuggestedGroups(date){"""
new="""function globalCompatibilityState(date,people){
  const unknown=unknownCompatibilities(date,people);
  const rejected=explicitIncompatibilities(date,people);
  return {unknown,rejected,pending:unknown.length>0};
}
// PENDING_GROUPS_LOGIC_BEGIN
function pairCompatibilityState(date,a,b){
  let unknown=false,hasConstraint=false;
  for(const [owner,responder] of [[a,b],[b,a]]){
    const ov=getAvail(date,owner),rv=getAvail(date,responder);
    if(ov?.status!=='time'||!isAvailable(rv))continue;
    hasConstraint=true;
    const c=getCompat(date,owner,responder);
    if(!c||c.ownerTime!==ov.time){unknown=true;continue;}
    if(c.response==='no')return {state:'rejected',hasConstraint:true};
    if(c.response!=='yes')unknown=true;
  }
  return {state:unknown?'unknown':'confirmed',hasConstraint};
}
function fullyConfirmedPendingGroup(date,members){
  if(members.length<2||!members.some(p=>getAvail(date,p)?.status==='time'))return false;
  for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
    if(pairCompatibilityState(date,members[i],members[j]).state!=='confirmed')return false;
  }
  return true;
}
function pendingConfirmedGroups(date,availablePeople){
  let bestGroups=[],bestAssigned=-1,bestImperatives=-1,bestGroupCount=Infinity,bestKey='';
  for(const part of partitionPeople(availablePeople)){
    const groups=part.filter(g=>fullyConfirmedPendingGroup(date,g));
    const assigned=canonical(groups.flat());
    const imperativeCount=assigned.filter(p=>getAvail(date,p)?.status==='time').length;
    const key=groups.map(g=>canonical(g).join('|')).sort().join('||');
    const better=assigned.length>bestAssigned ||
      (assigned.length===bestAssigned&&imperativeCount>bestImperatives) ||
      (assigned.length===bestAssigned&&imperativeCount===bestImperatives&&groups.length<bestGroupCount) ||
      (assigned.length===bestAssigned&&imperativeCount===bestImperatives&&groups.length===bestGroupCount&&(!bestKey||key<bestKey));
    if(better){bestGroups=groups.map(g=>canonical(g));bestAssigned=assigned.length;bestImperatives=imperativeCount;bestGroupCount=groups.length;bestKey=key;}
  }
  const assigned=new Set(bestGroups.flat());
  const groups=bestGroups.map(g=>{const sug=driverSuggestion(date,g);return{id:`auto-${groupCode(g)}`,members:g,driver:sug.candidates[0]||g[0]};});
  return {groups,singles:availablePeople.filter(p=>!assigned.has(p))};
}
// PENDING_GROUPS_LOGIC_END
function autoSuggestedGroups(date){"""
rep(old,new)

old="""  // Tant qu'une compatibilité liée à un impératif n'est pas renseignée, on ne répartit personne.
  // On conserve le groupe naturel complet comme aperçu, mais sa validation est bloquée.
  if(state.pending){
    const sug=driverSuggestion(date,availablePeople);
    return {groups:[{id:`auto-${groupCode(availablePeople)}`,members:canonical(availablePeople),driver:sug.candidates[0]||canonical(availablePeople)[0]}],singles:[],pending:true,unknown:state.unknown,rejected:state.rejected};
  }"""
new="""  // Tant qu'il manque des réponses, on n'affiche que les noyaux dont toutes les compatibilités sont déjà confirmées.
  // Les personnes refusées ou encore en attente restent hors de ces groupes provisoires.
  if(state.pending){
    const confirmed=pendingConfirmedGroups(date,availablePeople);
    return {groups:confirmed.groups,singles:confirmed.singles,pending:true,unknown:state.unknown,rejected:state.rejected};
  }"""
rep(old,new)

rep("if(!gs.length){box.innerHTML=validatedSummaryHTML(ds)||'<div class=\"empty compact-empty\">Pas encore de groupe proposé.</div>';return;}", "if(!gs.length&&!proposal.pending){box.innerHTML=validatedSummaryHTML(ds)||'<div class=\"empty compact-empty\">Pas encore de groupe proposé.</div>';return;}")

old="""  const groupsHtml=gs.map((g,i)=>{
    const sug=driverSuggestion(ds,g.members),suggested=sug.candidates.length>1?`Égalité : ${sug.candidates.map(label).join(' / ')}`:`Suggéré : ${label(sug.candidates[0])}`;
    return `<div class=\"proposal-group-simple ${i?'with-separator':''}\">
      <div class=\"proposal-main-line\"><strong>${gs.length>1?`Groupe ${i+1} · `:''}${g.members.map(label).join(' · ')}</strong><span class=\"proposal-suggested\">${suggested}</span></div>
      <div class=\"proposal-counter-line\">Compteurs : ${canonical(g.members).map(p=>`${label(p)} ${sug.counts[p]}`).join(' · ')}</div>
      <div class=\"proposal-driver-row\"><label>Conducteur réel</label><select class=\"quick-driver input\" data-id=\"${g.id}\">${canonical(g.members).map(p=>`<option value=\"${p}\" ${g.driver===p?'selected':''}>${label(p)}</option>`).join('')}</select></div>
    </div>`;
  }).join('');"""
new="""  const groupsHtml=gs.length?gs.map((g,i)=>{
    const sug=driverSuggestion(ds,g.members),suggested=sug.candidates.length>1?`Égalité : ${sug.candidates.map(label).join(' / ')}`:`Suggéré : ${label(sug.candidates[0])}`;
    return `<div class=\"proposal-group-simple ${i?'with-separator':''}\">
      <div class=\"proposal-main-line\"><strong>${gs.length>1?`Groupe ${i+1} · `:''}${g.members.map(label).join(' · ')}</strong><span class=\"proposal-suggested\">${suggested}</span></div>
      <div class=\"proposal-counter-line\">Compteurs : ${canonical(g.members).map(p=>`${label(p)} ${sug.counts[p]}`).join(' · ')}</div>
      <div class=\"proposal-driver-row\"><label>Conducteur réel</label><select class=\"quick-driver input\" data-id=\"${g.id}\" ${proposal.pending&&!proposal.saved?'disabled':''}>${canonical(g.members).map(p=>`<option value=\"${p}\" ${g.driver===p?'selected':''}>${label(p)}</option>`).join('')}</select></div>
    </div>`;
  }).join(''):'<div class=\"empty compact-empty\">Aucun groupe confirmé pour l’instant.</div>';"""
rep(old,new)

old="""  const pendingHtml=proposal.pending?`<div class=\"proposal-pending\"><strong>⏳ Répartition en attente</strong>${proposal.rejected?.length?`${proposal.rejected.map(x=>`${label(x.responder)} ne peut pas partir avec ${label(x.owner)} · ${timeLabel(x.time)}`).join(' · ')}<br>`:''}${proposal.unknown.length} réponse(s) de compatibilité encore attendue(s). Aucun groupe n’est réparti automatiquement avant ces réponses.</div>`:'';"""
new="""  const rejectedHtml=proposal.rejected?.length?proposal.rejected.map(x=>`<div>❌ ${label(x.responder)} ne peut pas partir avec ${label(x.owner)} · ${timeLabel(x.time)}</div>`).join(''):'';
  const unknownHtml=proposal.unknown?.length?proposal.unknown.map(x=>`<div>⏳ <strong>${label(x.responder)}</strong> doit répondre à l’impératif de <strong>${label(x.owner)}</strong> · ${timeLabel(x.time)}</div>`).join(''):'';
  const pendingHtml=proposal.pending?`<div class=\"proposal-pending\"><strong>⏳ Répartition en attente</strong>${rejectedHtml}${unknownHtml}<div class=\"small\">La proposition finale sera recalculée après les réponses.</div></div>`:'';"""
rep(old,new)

old="""  box.innerHTML=`<div class=\"proposal-shell ${sameAsValidated?'is-validated':''}\"><div class=\"proposal-head\"><h3>Covoiturage proposé</h3>${proposal.saved?'<span class=\"small muted\">modifié manuellement</span>':''}</div>${groupsHtml}${pendingHtml}${proposal.singles.length?`<div class=\"group-warning\">Sans groupe : ${proposal.singles.map(label).join(', ')}</div>`:''}${validatedSummaryHTML(ds)}<div class=\"quick-actions\"><button id=\"quickValidate\" class=\"btn\" ${(sameAsValidated||proposal.pending)?'disabled':''}>${proposal.pending?'En attente des réponses':sameAsValidated?'✓ Trajet validé':validated.length?'↻ Mettre à jour le trajet':`✓ Valider le${gs.length>1?'s':''} trajet${gs.length>1?'s':''}`}</button><button id=\"quickModify\" class=\"btn secondary\">Modifier</button></div>${IS_TEST&&validated.length?'<button id=\"quickResetTest\" class=\"test-reset-link\" type=\"button\">↺ Réinitialiser ce trajet TEST</button>':''}<div id=\"quickSaveState\" class=\"small muted quick-save-state\"></div></div>`;"""
new="""  const proposalTitle=proposal.pending?'Covoiturage provisoire':'Covoiturage proposé';
  const singlesLabel=proposal.pending?'Non placés pour l’instant':'Sans groupe';
  box.innerHTML=`<div class=\"proposal-shell ${sameAsValidated?'is-validated':''}\"><div class=\"proposal-head\"><h3>${proposalTitle}</h3>${proposal.saved?'<span class=\"small muted\">modifié manuellement</span>':''}</div>${groupsHtml}${pendingHtml}${proposal.singles.length?`<div class=\"group-warning\">${singlesLabel} : ${proposal.singles.map(label).join(', ')}</div>`:''}${validatedSummaryHTML(ds)}<div class=\"quick-actions\"><button id=\"quickValidate\" class=\"btn\" ${(sameAsValidated||proposal.pending)?'disabled':''}>${proposal.pending?'En attente des réponses':sameAsValidated?'✓ Trajet validé':validated.length?'↻ Mettre à jour le trajet':`✓ Valider le${gs.length>1?'s':''} trajet${gs.length>1?'s':''}`}</button><button id=\"quickModify\" class=\"btn secondary\">Modifier</button></div>${IS_TEST&&validated.length?'<button id=\"quickResetTest\" class=\"test-reset-link\" type=\"button\">↺ Réinitialiser ce trajet TEST</button>':''}<div id=\"quickSaveState\" class=\"small muted quick-save-state\"></div></div>`;"""
rep(old,new)

rep("if(proposal.groups?.length)await savePlan(ds,proposal.groups);", "if(proposal.groups?.length&&!proposal.pending)await savePlan(ds,proposal.groups);")

old="""async function validateGroupsForDate(ds,groups){
  if(!groups.length)return;const overlap=groupsHaveOverlap(groups);if(overlap){alert(`${label(overlap)} apparaît dans plusieurs groupes.`);return;}for(const g of groups){if(g.members.length<2||!g.members.includes(g.driver)){alert('Un groupe est invalide.');return;}if(!isPastDate(ds)&&explicitIncompatibilities(ds,g.members).length){alert('Un groupe contient une incompatibilité horaire.');return;}}"""
new="""async function validateGroupsForDate(ds,groups){
  if(!groups.length)return;const overlap=groupsHaveOverlap(groups);if(overlap){alert(`${label(overlap)} apparaît dans plusieurs groupes.`);return;}for(const g of groups){
    if(g.members.length<2||!g.members.includes(g.driver)){alert('Un groupe est invalide.');return;}
    if(!isPastDate(ds)){
      if(explicitIncompatibilities(ds,g.members).length){alert('Un groupe contient une incompatibilité horaire.');return;}
      if(unknownCompatibilities(ds,g.members).length){alert('Une ou plusieurs réponses aux impératifs sont encore attendues pour ce groupe.');return;}
    }
  }"""
rep(old,new)

p.write_text(s)

p=Path('public-config.js')
s=p.read_text()
if s.count('version: "4.4.0-beta.15"')!=1:
    raise SystemExit('Unexpected TEST config version')
s=s.replace('version: "4.4.0-beta.15"','version: "4.4.0-beta.16"')
p.write_text(s)

p=Path('service-worker.js')
s=p.read_text()
if s.count("const CACHE='covoiturage-4.4.0-beta.15';")!=1:
    raise SystemExit('Unexpected SW cache')
s=s.replace("const CACHE='covoiturage-4.4.0-beta.15';","const CACHE='covoiturage-4.4.0-beta.16';")
p.write_text(s)
