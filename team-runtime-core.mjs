// Adaptation de la PWA à des espaces de données par équipe. Aucun accès réseau.
import {validateTeamId,validateMemberId,validateRoster} from './multi-team-core.mjs';
const TEAM_SCOPED=new Set([
 'profiles','availability','compatibilities','plans','tripDays','preferences',
 'legacyStatus','config','delleTrips','pushTokens','notificationRequests','invitations'
]);
const ensure=(test,msg)=>{if(!test)throw new Error(msg);};
export function collectionSegments(teamId,name){
 ensure(TEAM_SCOPED.has(name),'Collection métier non autorisée');
 if(teamId===null || teamId===undefined)return [name];
 validateTeamId(teamId);
 return ['teams',teamId,name==='profiles'?'members':name];
}
export function documentSegments(teamId,name,id){
 ensure(typeof id==='string'&&id.length>0&&!id.includes('/')&&id!=='.'&&id!=='..','Document invalide');
 return [...collectionSegments(teamId,name),id];
}
export function normalizeTeamRoster(rows){
 ensure(Array.isArray(rows),'Membres invalides');
 const members=rows.filter(x=>x.active!==false).map(x=>({
   memberId:validateMemberId(x.memberId),firstName:x.firstName||x.displayName||x.memberId,
   shortCode:x.shortCode,role:x.role,active:true
 }));
 validateRoster(members,{status:'active'});
 return {
  members:members.map(m=>m.memberId),
  labels:Object.fromEntries(members.map(m=>[m.memberId,m.firstName])),
  initials:Object.fromEntries(members.map(m=>[m.memberId,m.shortCode])),
  leaderId:members.find(m=>m.role==='leader').memberId
 };
}
export function validateLinkedTeam({teamId,memberId,teamStatus,directoryTeamId,memberActive}){
 validateTeamId(teamId);validateMemberId(memberId);
 ensure(teamStatus==='active','L’équipe n’est pas encore activée');
 ensure(directoryTeamId===teamId,'Annuaire du membre incohérent');
 ensure(memberActive===true,'Le membre n’est pas actif');
 return {teamId,memberId};
}
export function parseTeamInvite(raw){
 if(typeof raw!=='string'||!raw.trim())return null;
 try{
  const u=new URL(raw);
  const teamId=u.searchParams.get('team'),token=u.searchParams.get('invite');
  if(!teamId||!token)return null;
  validateTeamId(teamId);
  if(!/^[a-f0-9]{48}$/i.test(token))return null;
  return {teamId,token:token.toLowerCase()};
 }catch{return null;}
}

export function selectLinkedTeam(verifiedLinks, teamId) {
 validateTeamId(teamId);
 const matches=verifiedLinks.filter(link=>link.teamId===teamId);
 ensure(matches.length===1,'Rattachement à cette équipe absent ou ambigu');
 return validateLinkedTeam(matches[0]);
}

export function listLinkedTeamChoices(explicitLinks, legacyLink = null) {
 const choices=new Map();
 const seen=new Set();
 for(const link of explicitLinks){
   const teamId=validateTeamId(link.teamId);
   ensure(!seen.has(teamId),'Rattachement à cette équipe ambigu');
   seen.add(teamId);
   if(link.active===true)choices.set(teamId,validateLinkedTeam(link));
 }
 if(legacyLink&&!seen.has(validateTeamId(legacyLink.teamId))){
   const link=validateLinkedTeam(legacyLink);
   choices.set(link.teamId,link);
 }
 return [...choices.values()];
}

export async function loadLinkedTeamChoices({ readExplicitLinks, readLegacyLink, verifyLink }) {
 const [explicitLinks, legacyLink]=await Promise.all([readExplicitLinks(),readLegacyLink()]);
 const explicit=await Promise.all(explicitLinks.map(async link=>{
   const teamId=validateTeamId(link.teamId);
   if(link.active!==true)return {teamId,active:false};
   const memberId=validateMemberId(link.memberId);
   const verified=await verifyLink(teamId,memberId);
   return {...verified,teamId,memberId,active:true};
 }));
 let legacy=null;
 if(legacyLink && !explicit.some(link=>link.teamId===legacyLink.teamId)){
   const teamId=validateTeamId(legacyLink.teamId), memberId=validateMemberId(legacyLink.memberId);
   legacy={...await verifyLink(teamId,memberId),teamId,memberId};
 }
 return listLinkedTeamChoices(explicit,legacy);
}
