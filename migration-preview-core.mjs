// Phase 2: simulation pure d'une migration de l'équipe historique.
// Ce module ne charge ni Firebase, ni réseau, ne réalise aucune écriture.
import {validateSnapshot,SNAPSHOT_COLLECTIONS,SNAPSHOT_SCHEMA} from './snapshot-core.mjs';
import {LEGACY_TEAM_ID,teamPath,validateRoster} from './multi-team-core.mjs';

export const LEGACY_MEMBERS=Object.freeze([
  {memberId:'aurelien',firstName:'Aurélien',shortCode:'A',role:'member'},
  {memberId:'etienne',firstName:'Étienne',shortCode:'E',role:'member'},
  {memberId:'igor',firstName:'Igor',shortCode:'I',role:'leader'},
  {memberId:'ludo',firstName:'Ludo',shortCode:'L',role:'member'},
  {memberId:'stephane',firstName:'Stéphane',shortCode:'S',role:'member'}
]);
export const MIGRATION_TECHNICAL_PLAN_ID='_quotaBaselineDirtyV1';
const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
const expected=new Set(LEGACY_MEMBERS.map(m=>m.memberId));
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const has=(v,key)=>Object.prototype.hasOwnProperty.call(v,key);

function blank(error){
  return {valid:false,status:'BLOQUEE',teamId:LEGACY_TEAM_ID,
    errors:[error],warnings:[],documents:[],stats:null,
    prerequisites:['Exporter une copie JSON v2 depuis TeamTool TEST.',
      'Contrôler séparément les UID et les anciens liens personnels avant activation.'],
    activated:false};
}
function normalizeIdentity(value,property,expectedValue,src,errors){
  if(has(value,property) && value[property]!==expectedValue){
    errors.push(src+' : champ '+property+' incohérent');
    return;
  }
  value[property]=expectedValue;
}
function dateFromDoc(id){
  return ISO_DATE.test(id)?id:null;
}
function cloneObject(data){return {...data};}

export function simulateLegacyMigration(snapshot){
  let v;
  try{v=validateSnapshot(snapshot);}
  catch(e){return blank(e?.message||'Format JSON inconnu');}
  const errors=[],warnings=[],prerequisites=[
    'Lire séparément les anciens deviceLinks et invitations (absents du JSON).',
    'Provisionner le superadministrateur par un outil de confiance, avec son UID Firebase réel.',
    'Préparer le rattachement des appareils actuels sans remplacer leurs anciens liens.',
    'Reconstituer les index d’historique et de quotas après migration, sans importer de cache obsolète.',
    'Réaliser une sauvegarde vérifiable juste avant toute migration réelle.',
    'Tester les règles Firebase candidates et la nouvelle interface avant activation.'
  ];
  if(snapshot.schema!==SNAPSHOT_SCHEMA)
    errors.push('La simulation complète exige un export JSON v2. Les anciens exports peuvent omettre des collections.');
  if(snapshot.sourceProjectId!=='team-tool-test-data')
    errors.push('Source non certifiée comme Firebase TEST (team-tool-test-data).');
  if(snapshot.exportedAt===undefined || !Number.isFinite(Date.parse(snapshot.exportedAt)))
    warnings.push('Date d’export absente ou non reconnue : vérifier la fraîcheur du fichier.');
  if(!v.hasCalendar)
    warnings.push('Document calendrier absent : prévoir un calendrier vide, puis vérifier les exceptions.');
  const plan=[],byPath=new Set(),covered=new Set();
  const counts={},mappedCounts={};
  let recordedTripGroups=0,recordedPlanGroups=0,legacyDirtyMarkers=0;
  const add=(path,data,kind,source=null)=>{
    if(byPath.has(path))errors.push('Conflit de chemin cible : '+path);
    else {byPath.add(path);plan.push({path,data,kind,source});}
    if(source) covered.add(source);
  };
  const source=(collection,id)=>collection+'/'+id;
  const rows=(collection)=>{
    const out=v.collections[collection];
    if(out===null){errors.push('Collection absente du fichier : '+collection);return [];}
    counts[collection]=out.length;
    return out;
  };
  const profileRows=rows('profiles');
  const profileMap=new Map(profileRows.map(x=>[x.id,x.data]));
  for(const row of profileRows){
    if(!expected.has(row.id))errors.push('Profil inattendu dans le fichier : '+row.id);
    else covered.add(source('profiles',row.id));
  }
  add('teams/'+LEGACY_TEAM_ID,{
    name:'Équipe 1',description:'Équipe historique',status:'draft',capacity:5
  },'team');
  for(const member of LEGACY_MEMBERS){
    // memberId est déjà la clé du document ; la règle candidate n'autorise pas ce champ en doublon.
    const {memberId, ...fields}=member;
    const doc={...fields,displayName:member.firstName,active:true};
    if(profileMap.has(member.memberId)) doc.legacyProfile=profileMap.get(member.memberId);
    add(teamPath(LEGACY_TEAM_ID,'members',member.memberId),doc,'member');
    add(teamPath(LEGACY_TEAM_ID,'shortCodes',member.shortCode),{memberId:member.memberId},'short-code');
    add('memberDirectory/'+member.memberId,{teamId:LEGACY_TEAM_ID},'directory');
  }
  try{validateRoster(LEGACY_MEMBERS.map(m=>({...m,active:true})));}catch(e){errors.push(e.message);}

  const assertMember=(id,src)=>{
    if(typeof id!=='string'||!expected.has(id)){
      errors.push(src+' : membre inconnu '+String(id));
      return false;
    }
    return true;
  };
  const parseDatedMember=(id,src)=>{
    const match=/^(\d{4}-\d{2}-\d{2})_([a-z0-9_-]+)$/.exec(id);
    if(!match){errors.push(src+' : identifiant date/membre invalide');return null;}
    assertMember(match[2],src);
    return {date:match[1],memberId:match[2]};
  };
  const validateGroups=(document,src,strict)=>{
    const groups=document.groups;
    if(groups===undefined){warnings.push(src+' : groupes absents, vérifier cet enregistrement.');return;}
    if(!Array.isArray(groups)){errors.push(src+' : groupes non valides');return;}
    if(strict)recordedTripGroups+=groups.length;
    else recordedPlanGroups+=groups.length;
    for(let i=0;i<groups.length;i++){
      const group=groups[i];
      if(!isObject(group)){errors.push(src+' groupe '+i+' : valeur invalide');continue;}
      const members=group.members??group.participants;
      if(!Array.isArray(members)){errors.push(src+' groupe '+i+' : participants absents');continue;}
      const seen=new Set();
      for(const mid of members){
        assertMember(mid,src+' groupe '+i);
        if(seen.has(mid))errors.push(src+' groupe '+i+' : membre en double '+mid);
        seen.add(mid);
      }
      const driver=group.driver??group.driverId;
      if(driver!==undefined&&driver!==null&&driver!==''){
        assertMember(driver,src+' groupe '+i);
        if(!seen.has(driver))errors.push(src+' groupe '+i+' : conducteur hors groupe');
      }else if(strict && members.length>0){
        errors.push(src+' groupe '+i+' : conducteur manquant dans un trajet réel');
      }
    }
  };
  for(const row of rows('availability')){
    const src=source('availability',row.id);
    const info=parseDatedMember(row.id,src);
    if(!info)continue;
    const data=cloneObject(row.data);
    normalizeIdentity(data,'date',info.date,src,errors);
    normalizeIdentity(data,'profileId',info.memberId,src,errors);
    normalizeIdentity(data,'memberId',info.memberId,src,errors);
    add(teamPath(LEGACY_TEAM_ID,'availability',row.id),data,'availability',src);
  }
  for(const row of rows('compatibilities')){
    const src=source('compatibilities',row.id);
    const match=/^(\d{4}-\d{2}-\d{2})_([a-z0-9_-]+)_([a-z0-9_-]+)$/.exec(row.id);
    if(!match){errors.push(src+' : identifiant date/propriétaire/répondant invalide');continue;}
    assertMember(match[2],src);assertMember(match[3],src);
    const data=cloneObject(row.data);
    normalizeIdentity(data,'date',match[1],src,errors);
    normalizeIdentity(data,'ownerId',match[2],src,errors);
    normalizeIdentity(data,'responderId',match[3],src,errors);
    add(teamPath(LEGACY_TEAM_ID,'compatibilities',row.id),data,'compatibility',src);
  }
  for(const row of rows('legacyStatus')){
    const src=source('legacyStatus',row.id);
    const info=parseDatedMember(row.id,src);
    if(!info)continue;
    const data=cloneObject(row.data);
    normalizeIdentity(data,'date',info.date,src,errors);
    normalizeIdentity(data,'profileId',info.memberId,src,errors);
    // Conserver aussi profileId pour la compatibilité historique.
    normalizeIdentity(data,'memberId',info.memberId,src,errors);
    add(teamPath(LEGACY_TEAM_ID,'legacyStatus',row.id),data,'legacy-status',src);
  }
  for(const collection of ['plans','tripDays']){
    for(const row of rows(collection)){
      const src=source(collection,row.id);
      if(collection==='plans'&&row.id===MIGRATION_TECHNICAL_PLAN_ID){
        add(teamPath(LEGACY_TEAM_ID,'config',MIGRATION_TECHNICAL_PLAN_ID),
            cloneObject(row.data),'technical-marker',src);
        legacyDirtyMarkers++;
        continue;
      }
      const d=dateFromDoc(row.id);
      if(!d){errors.push(src+' : clé non datée, migration non définie');continue;}
      const data=cloneObject(row.data);
      normalizeIdentity(data,'date',d,src,errors);
      validateGroups(data,src,collection==='tripDays');
      if(typeof data.updatedBy==='string'&&data.updatedBy.length>0)
        assertMember(data.updatedBy,src+' modifié par');
      add(teamPath(LEGACY_TEAM_ID,collection,row.id),data,collection,src);
    }
  }
  for(const row of rows('preferences')){
    const src=source('preferences',row.id);
    if(!assertMember(row.id,src))continue;
    add(teamPath(LEGACY_TEAM_ID,'preferences',row.id),cloneObject(row.data),'preferences',src);
  }
  const delle=rows('delleTrips');
  for(const row of delle){
    const src=source('delleTrips',row.id);
    const d=dateFromDoc(row.id);
    if(!d){errors.push(src+' : date invalide');continue;}
    const data=cloneObject(row.data);
    normalizeIdentity(data,'date',d,src,errors);
    if(data.privatePair!=='igor_ludo')errors.push(src+' : binôme privé inattendu');
    if(data.destination!=='Delle')errors.push(src+' : destination différente de Delle');
    if(!['igor','ludo'].includes(data.driver))errors.push(src+' : conducteur Delle invalide');
    if(data.members!==undefined &&
      (!Array.isArray(data.members)||data.members.length!==2||
       !data.members.includes('igor')||!data.members.includes('ludo')))
      errors.push(src+' : participants Delle inattendus');
    if(data.mainGroupMembers!==undefined){
      if(!Array.isArray(data.mainGroupMembers))
        errors.push(src+' : groupe principal non valide');
      else for(const mid of data.mainGroupMembers)assertMember(mid,src+' groupe principal');
    }
    if(data.mainDriver!==undefined && data.mainDriver!==null)
      assertMember(data.mainDriver,src+' conducteur principal');
    add(teamPath(LEGACY_TEAM_ID,'delleTrips',row.id),data,'delle',src);
  }
  const calendar=v.hasCalendar?cloneObject(v.calendar):{exceptions:[]};
  add(teamPath(LEGACY_TEAM_ID,'config','calendar'),calendar,'calendar');

  const expectedPaths=SNAPSHOT_COLLECTIONS.flatMap(name=>
    (v.collections[name]||[]).map(row=>source(name,row.id)));
  const unmapped=expectedPaths.filter(path=>!covered.has(path));
  for(const path of unmapped)errors.push('Document source sans destination : '+path);
  const countsTotal=Object.values(counts).reduce((s,n)=>s+n,0);
  for(const name of SNAPSHOT_COLLECTIONS)
    mappedCounts[name]=expectedPaths.filter(path=>path.startsWith(name+'/')&&covered.has(path)).length;
  if(covered.size!==countsTotal)
    errors.push('Couverture incomplète : '+covered.size+' documents sur '+countsTotal);
  warnings.push('Les caches de quota stockés dans /config ne figurent pas dans cet export ; prévoir leur recalcul.');
  warnings.push('Aucune donnée d’authentification ou invitation n’est fournie dans ce fichier.');
  if(legacyDirtyMarkers)
    warnings.push(legacyDirtyMarkers+' marqueur(s) technique(s) déplacé(s) de plans vers config dans le plan simulé.');
  return {
    valid:errors.length===0,status:errors.length?'BLOQUEE':'SIMULATION_CONFORME',
    teamId:LEGACY_TEAM_ID,errors,warnings,prerequisites,
    stats:{
      sourceDocuments:countsTotal,mappedSourceDocuments:covered.size,
      preparedTargetDocuments:plan.length,
      counts,mappedCounts,
      members:LEGACY_MEMBERS.map(m=>({name:m.firstName,id:m.memberId,shortCode:m.shortCode,role:m.role})),
      tripGroups:recordedTripGroups,planGroups:recordedPlanGroups,
      delleTrips:delle.length,calendar:v.hasCalendar?'exporté':'absent',
      technicalMarkers:legacyDirtyMarkers
    },
    // Ce plan n'est jamais exécuté. Horodatages JSON à reconvertir lors d'une phase ultérieure.
    documents:errors.length===0?plan:[],
    activated:false
  };
}
