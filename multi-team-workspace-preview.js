import {newWorkspace,createTeam,teamById,setAvailability,answerImperative,acceptedDepartureGroups} from './multi-team-journey-core.mjs';
const $=id=>document.getElementById(id);
const safe=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let workspace=createTeam(createTeam(newWorkspace(),{
  teamId:'wm-original',name:'Équipe historique (fictive)',firstNames:['Igor','Ludo','Stéphane','Aurélien','Étienne']
}),{teamId:'seconde-equipe',name:'Équipe 2 (fictive)',firstNames:['Claire','Hugo','Léa']});
let selected='wm-original';
const memberName=(team,id)=>team.members.find(m=>m.memberId===id)?.firstName||id;
const error=msg=>{$('error').innerHTML=msg?'<div class="error">'+safe(msg)+'</div>':'';};
function render(){
  error('');
  const team=teamById(workspace,selected),date=$('day').value;
  $('teams').innerHTML=workspace.teams.map(t=>
    '<button type="button" class="team-choice" data-team="'+safe(t.teamId)+'" aria-pressed="'+String(t.teamId===selected)+'">'+
    '<strong>'+safe(t.name)+'</strong><small>'+t.members.length+' membres · '+safe(t.teamId)+'</small></button>'
  ).join('');
  $('teamTitle').textContent=team.name;
  $('teamInfo').textContent=team.members.length+' membres, responsable : '+team.members[0].firstName;
  const day=team.days[date]||{availability:{},responses:{}};
  $('members').innerHTML=team.members.map(m=>{
    const v=day.availability[m.memberId]||{status:'absent'};
    return '<div class="member-row" data-member="'+safe(m.memberId)+'">'+
      '<span class="avatar">'+safe(m.shortCode)+'</span><strong>'+safe(m.firstName)+'</strong>'+
      '<select data-status aria-label="Statut de '+safe(m.firstName)+'">'+
      [['absent','Absent'],['present','Présent'],['alone','Seul'],['time','Impératif']].map(([key,name])=>
        '<option value="'+key+'"'+(v.status===key?' selected':'')+'>'+name+'</option>').join('')+'</select>'+
      (v.status==='time'?'<input type="time" data-time class="departure" value="'+safe(v.time||'16:30')+'" aria-label="Heure de '+safe(m.firstName)+'">':
      '<span class="muted departure">'+(m.role==='leader'?'Responsable':'Membre')+'</span>')+
    '</div>';
  }).join('');
  const owners=team.members.filter(m=>day.availability[m.memberId]?.status==='time');
  const responses=[];
  for(const owner of owners){
    for(const responder of team.members){
      if(owner.memberId===responder.memberId||!['present','time'].includes(day.availability[responder.memberId]?.status))continue;
      const key=owner.memberId+':'+responder.memberId;
      const chosen=day.responses[key]?.response||'';
      responses.push('<label class="answer-row">'+safe(responder.firstName)+' accepte le départ '+safe(owner.firstName)+
        ' à '+safe(day.availability[owner.memberId].time)+
        '<select data-owner="'+safe(owner.memberId)+'" data-responder="'+safe(responder.memberId)+'">'+
        [['','Non répondu'],['yes','Oui'],['no','Non']].map(([v,txt])=>'<option value="'+v+'"'+(chosen===v?' selected':'')+'>'+txt+'</option>').join('')+
        '</select></label>');
    }
  }
  $('answers').innerHTML=responses.length?responses.join(''):'<p class="muted">Saisis un impératif pour afficher les réponses possibles.</p>';
  try{
    const result=acceptedDepartureGroups(workspace,selected,date);
    $('groups').innerHTML=(result.groups.length?result.groups.map(g=>'<div class="group-item"><strong>Départ '+safe(g.time)+'</strong><div>'+g.members.map(m=>safe(memberName(team,m))).join(' · ')+'</div></div>').join(''):'<p class="muted">Aucun groupe d’impératif confirmé.</p>')+
    (result.remaining.length?'<p class="muted">Autres participants (à répartir par la logique générale) : '+result.remaining.map(m=>safe(memberName(team,m))).join(', ')+'</p>':'');
  }catch(err){$('groups').innerHTML='';error(err.message);}
}
$('teams').addEventListener('click',ev=>{const b=ev.target.closest('button[data-team]');if(b){selected=b.dataset.team;render();}});
$('day').addEventListener('change',render);
$('members').addEventListener('change',ev=>{
  const row=ev.target.closest('[data-member]');if(!row)return;
  const memberId=row.dataset.member,status=row.querySelector('[data-status]').value;
  const time=status==='time'?(row.querySelector('[data-time]')?.value||'16:30'):null;
  try{workspace=setAvailability(workspace,selected,memberId,$('day').value,{status,time});render();}
  catch(err){error(err.message);}
});
$('answers').addEventListener('change',ev=>{
  const sel=ev.target.closest('select[data-owner]');if(!sel||!sel.value)return;
  try{workspace=answerImperative(workspace,selected,$('day').value,sel.dataset.owner,sel.dataset.responder,sel.value);render();}
  catch(err){error(err.message);}
});
$('createTeam').addEventListener('submit',ev=>{
  ev.preventDefault();
  const name=$('teamName').value.trim(),firstNames=$('teamMembers').value.split(',').map(x=>x.trim());
  const suffix=workspace.teams.length+1,id='equipe-'+suffix;
  try{workspace=createTeam(workspace,{teamId:id,name,firstNames});selected=id;$('createTeam').reset();render();}
  catch(err){error(err.message);}
});
render();
