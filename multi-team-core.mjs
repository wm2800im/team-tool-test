// Préparation multi-équipes : aucun accès Firebase, aucun effet sur l'app existante.
export const LEGACY_TEAM_ID='wm-original';
export const TEAM_CAPACITY=5;
export const TEAM_COLLECTIONS=Object.freeze([
  'members','availability','compatibilities','plans','tripDays','preferences',
  'legacyStatus','config','delleTrips','shortCodes','invitations','pushTokens','notificationRequests'
]);
const teamIdPattern=/^[a-z0-9][a-z0-9-]{1,39}$/;
const memberIdPattern=/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/;
const codePattern=/^[A-Z][a-z0-9]{0,7}$/;
function ensure(test,message){if(!test)throw new Error(message);}
export function validateTeamId(id){
  ensure(typeof id==='string'&&teamIdPattern.test(id),'Identifiant d’équipe invalide');
  return id;
}
export function validateMemberId(id){
  ensure(typeof id==='string'&&memberIdPattern.test(id),'Identifiant de membre invalide');
  return id;
}
export function validateShortCode(code){
  ensure(typeof code==='string'&&codePattern.test(code),'Code court invalide');
  return code;
}
export function teamPath(teamId,collection,id){
  validateTeamId(teamId);
  ensure(TEAM_COLLECTIONS.includes(collection),'Collection d’équipe inconnue');
  ensure(typeof id==='string'&&id.length>0&&!id.includes('/')&&id!=='.'&&id!=='..',
    'Identifiant de document invalide');
  return 'teams/'+teamId+'/'+collection+'/'+id;
}
export function availabilityPath(teamId,date,memberId){
  validateMemberId(memberId);
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(date),'Date invalide');
  return teamPath(teamId,'availability',date+'_'+memberId);
}
export function compatibilityPath(teamId,date,ownerId,responderId){
  validateMemberId(ownerId);validateMemberId(responderId);
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(date),'Date invalide');
  return teamPath(teamId,'compatibilities',date+'_'+ownerId+'_'+responderId);
}
function nameStem(name){
  ensure(typeof name==='string'&&name.trim().length>0,'Prénom manquant');
  const ascii=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9]/g,'');
  ensure(/^[a-zA-Z]/.test(ascii),'Prénom sans lettre');
  return (ascii[0].toUpperCase()+ascii.slice(1).toLowerCase()).slice(0,8);
}
export function nextShortCode(firstName,usedCodes){
  const stem=nameStem(firstName);
  const used=new Set([...usedCodes].map(code=>{
    ensure(typeof code==='string'&&/^[a-z][a-z0-9]{0,7}$/i.test(code),'Code réservé invalide');
    return code.toLowerCase();
  }));
  for(let length=1;length<=stem.length;length++){
    const code=stem.slice(0,length);
    if(!used.has(code.toLowerCase()))return code;
  }
  for(let suffix=2;suffix<1000;suffix++){
    const digits=String(suffix),code=stem.slice(0,8-digits.length)+digits;
    if(codePattern.test(code)&&!used.has(code.toLowerCase()))return code;
  }
  throw new Error('Impossible de générer un code court disponible');
}
export function assignStableShortCodes(existing,newMembers){
  ensure(Array.isArray(existing)&&Array.isArray(newMembers),'Liste de membres invalide');
  const ids=new Set(),codes=new Set();
  const result=[];
  for(const member of existing){
    validateMemberId(member.memberId);validateShortCode(member.shortCode);
    ensure(!ids.has(member.memberId),'Identifiant de membre en double');
    ensure(!codes.has(member.shortCode.toLowerCase()),'Code court déjà attribué');
    ids.add(member.memberId);codes.add(member.shortCode.toLowerCase());
    result.push({...member});
  }
  for(const member of newMembers){
    validateMemberId(member.memberId);
    ensure(!ids.has(member.memberId),'Identifiant de membre en double');
    ensure(!Object.hasOwn(member,'shortCode'),'Code court nouveau imposé : non autorisé');
    const shortCode=nextShortCode(member.firstName,codes);
    ids.add(member.memberId);codes.add(shortCode.toLowerCase());
    result.push({...member,shortCode});
  }
  return result;
}
export function validateRoster(members,{status='active'}={}){
  ensure(Array.isArray(members),'Composition d’équipe invalide');
  ensure(['active','draft'].includes(status),'Statut d’équipe inconnu');
  assignStableShortCodes(members,[]);
  const active=members.filter(m=>m.active!==false);
  ensure(active.length<=TEAM_CAPACITY,'Équipe limitée à 5 personnes');
  if(status==='active')ensure(active.length>=2,'Équipe active : au moins 2 personnes');
  ensure(active.filter(m=>m.role==='leader').length===1,'Un seul responsable actif par équipe');
  ensure(members.every(m=>['member','leader'].includes(m.role)),'Rôle de membre inconnu');
  return true;
}
export function historyGroupCodes(memberIds,members){
  const directory=new Map(members.map(m=>[m.memberId,validateShortCode(m.shortCode)]));
  ensure(new Set(memberIds).size===memberIds.length,'Membre en double dans le groupe');
  return memberIds.map(id=>{
    validateMemberId(id);
    ensure(directory.has(id),'Membre historique inconnu : '+id);
    return directory.get(id);
  }).join(' · ');
}
