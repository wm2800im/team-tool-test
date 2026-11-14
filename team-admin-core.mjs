// Préparation pure des équipes et des invitations, sans écriture Firestore.
import {assignStableShortCodes,validateTeamId,validateRoster} from './multi-team-core.mjs';

const ensure=(ok,message)=>{if(!ok)throw new Error(message);};
export function prepareTeamCreation({teamId,name,firstNames}){
  validateTeamId(teamId);
  const displayName=String(name||'').trim();
  ensure(displayName.length>=2&&displayName.length<=80,'Nom d’équipe : entre 2 et 80 caractères');
  ensure(Array.isArray(firstNames)&&firstNames.length>=2&&firstNames.length<=5,
    'Une équipe active comprend entre 2 et 5 membres');
  const names=firstNames.map(s=>String(s||'').trim());
  ensure(names.every(n=>n.length>=2&&n.length<=60),'Chaque prénom doit contenir 2 à 60 caractères');
  const members=assignStableShortCodes([],names.map((firstName,i)=>({
    memberId:teamId+'-m'+(i+1),firstName,displayName:firstName,
    active:true,role:i===0?'leader':'member'
  })));
  validateRoster(members);
  return {teamId,name:displayName,members};
}
export function parseTeamNames(raw){
  return String(raw||'').split(/[\n,;]/).map(x=>x.trim()).filter(Boolean);
}
export function teamInvitationUrl(baseUrl,teamId,token){
  validateTeamId(teamId);
  ensure(/^[a-f0-9]{48}$/i.test(String(token||'')),'Jeton d’invitation invalide');
  const url=new URL(baseUrl);
  ensure(['https:','http:'].includes(url.protocol),'Adresse invalide');
  url.searchParams.delete('invite');
  url.searchParams.delete('team');
  url.searchParams.set('team',teamId);
  url.searchParams.set('invite',token.toLowerCase());
  return url.toString();
}
