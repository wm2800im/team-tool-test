// Parcours multi-équipe de démonstration — fonctions pures, sans Firebase.
import {assignStableShortCodes, validateRoster, validateTeamId, validateMemberId} from './multi-team-core.mjs';

const DAY=/^\d{4}-\d{2}-\d{2}$/;
const TIME=/^\d{2}:\d{2}$/;
const ensure=(value,message)=>{if(!value)throw new Error(message);};
const clone=obj=>structuredClone(obj);

export function newWorkspace(){return {teams:[]};}
export function createTeam(workspace,{teamId,name,firstNames}){
  validateTeamId(teamId);
  ensure(!workspace.teams.some(t=>t.teamId===teamId),'Cette équipe existe déjà');
  ensure(typeof name==='string'&&name.trim().length>=2,'Nom d’équipe requis');
  ensure(Array.isArray(firstNames)&&firstNames.length>=2&&firstNames.length<=5,'Prévoir de 2 à 5 membres');
  const normalized=firstNames.map(v=>String(v).trim());
  ensure(normalized.every(Boolean),'Prénom manquant');
  // Les identifiants sont globaux et stables, indépendants des prénoms affichés.
  const members=assignStableShortCodes([],normalized.map((firstName,i)=>({
    memberId:teamId+'-m'+(i+1),firstName,displayName:firstName,active:true,
    role:i===0?'leader':'member'
  })));
  members.forEach(m=>validateMemberId(m.memberId));
  validateRoster(members);
  return {...workspace,teams:[...workspace.teams,{teamId,name:name.trim(),members,days:{}}]};
}
export function teamById(workspace,teamId){
  validateTeamId(teamId);
  const team=workspace.teams.find(t=>t.teamId===teamId);
  ensure(team,'Équipe inconnue');
  return team;
}
export function setAvailability(workspace,teamId,memberId,date,{status,time=null}){
  const team=teamById(workspace,teamId);
  ensure(DAY.test(date),'Date invalide');
  ensure(team.members.some(m=>m.memberId===memberId&&m.active),'Membre hors équipe');
  ensure(['present','absent','alone','time'].includes(status),'Statut invalide');
  ensure(status!=='time'||(typeof time==='string'&&TIME.test(time)),'Heure d’impératif requise');
  const next=clone(workspace),dest=teamById(next,teamId);
  const day=dest.days[date]||{availability:{},responses:{}};
  day.availability[memberId]={status,time:status==='time'?time:null};
  // Ne conserver aucune réponse sur les anciens impératifs d'un membre qui change de statut.
  for(const key of Object.keys(day.responses)){if(key.startsWith(memberId+':'))delete day.responses[key];}
  dest.days[date]=day;
  return next;
}
export function answerImperative(workspace,teamId,date,ownerId,responderId,response){
  const team=teamById(workspace,teamId);
  ensure(DAY.test(date),'Date invalide');
  ensure(['yes','no'].includes(response),'Réponse invalide');
  ensure(ownerId!==responderId,'Réponse à soi-même interdite');
  ensure(team.members.some(m=>m.memberId===responderId),'Répondant hors équipe');
  const day=team.days[date];
  ensure(day?.availability[ownerId]?.status==='time','Aucun impératif pour ce membre');
  ensure(['present','time'].includes(day?.availability[responderId]?.status),'Répondant non disponible');
  const next=clone(workspace),target=teamById(next,teamId).days[date];
  target.responses[ownerId+':'+responderId]={response,ownerTime:day.availability[ownerId].time};
  return next;
}
export function acceptedDepartureGroups(workspace,teamId,date){
  const team=teamById(workspace,teamId),day=team.days[date]||{availability:{},responses:{}};
  const byTime=new Map(),memberTime=new Map();
  for(const owner of team.members){
    const ownerAvailability=day.availability[owner.memberId];
    if(ownerAvailability?.status!=='time')continue;
    const group=new Set([owner.memberId]);
    for(const member of team.members){
      if(member.memberId===owner.memberId)continue;
      const r=day.responses[owner.memberId+':'+member.memberId];
      if(r?.response==='yes'&&r.ownerTime===ownerAvailability.time&&
         ['present','time'].includes(day.availability[member.memberId]?.status))group.add(member.memberId);
    }
    if(group.size<2)continue;
    const at=ownerAvailability.time;
    if(!byTime.has(at))byTime.set(at,new Set());
    for(const id of group){
      if(memberTime.has(id)&&memberTime.get(id)!==at)throw new Error('Un membre a accepté deux heures incompatibles');
      memberTime.set(id,at);byTime.get(at).add(id);
    }
  }
  const groups=[...byTime.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([time,ids])=>({
    time,members:team.members.filter(m=>ids.has(m.memberId)).map(m=>m.memberId)
  }));
  const participants=team.members.filter(m=>['present','time'].includes(day.availability[m.memberId]?.status));
  const grouped=new Set(groups.flatMap(g=>g.members));
  return {groups,remaining:participants.filter(m=>!grouped.has(m.memberId)).map(m=>m.memberId)};
}
