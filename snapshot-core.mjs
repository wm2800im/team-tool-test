// Format de sauvegarde portable, sans dépendance Firebase pour la validation.
export const SNAPSHOT_SCHEMA = 2;
export const SNAPSHOT_COLLECTIONS = Object.freeze([
  'profiles','availability','legacyStatus','compatibilities',
  'plans','tripDays','preferences','delleTrips'
]);
const STAMP = '__teamtoolSnapshotType';
const has = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
const record = value => value!==null && typeof value==='object' && !Array.isArray(value) && !(value instanceof Date);
function fail(message){ throw new Error('Copie invalide : '+message); }
function stamp(seconds,nanoseconds){
  if(!Number.isInteger(seconds)||!Number.isInteger(nanoseconds)||nanoseconds<0||nanoseconds>=1000000000) fail('horodatage incorrect');
  return {[STAMP]:'timestamp',seconds,nanoseconds};
}
export function encodeSnapshotValue(value,depth=0){
  if(depth>40) fail('imbrication excessive');
  if(value instanceof Date){
    if(!Number.isFinite(value.getTime()))fail('date invalide');
    const ms=value.getTime(),seconds=Math.floor(ms/1000);
    return stamp(seconds,(ms-seconds*1000)*1000000);
  }
  if(value && typeof value.toDate==='function' && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds))
    return stamp(value.seconds,value.nanoseconds);
  if(Array.isArray(value))return value.map(item=>encodeSnapshotValue(item,depth+1));
  if(record(value)){
    const result={};
    for(const [key,item] of Object.entries(value)){
      if(key==='__proto__'||key==='constructor'||key==='prototype')fail('clé interdite');
      if(item===undefined)fail('valeur indéfinie');
      result[key]=encodeSnapshotValue(item,depth+1);
    }
    return result;
  }
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'&&Number.isFinite(value))return value;
  fail('type de donnée non pris en charge');
}
export function decodeSnapshotValue(value,asTimestamp,schema=SNAPSHOT_SCHEMA,key='',depth=0){
  if(depth>40)fail('imbrication excessive');
  if(schema===1 && typeof value==='string' && /(?:At|Timestamp)$/.test(key) &&
     /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)){
    const ms=Date.parse(value);
    if(Number.isFinite(ms)){const s=Math.floor(ms/1000);return asTimestamp(s,(ms-s*1000)*1000000);}
  }
  if(Array.isArray(value))return value.map(v=>decodeSnapshotValue(v,asTimestamp,schema,'',depth+1));
  if(record(value)){
    if(has(value,STAMP)){
      if(value[STAMP]!=='timestamp'||Object.keys(value).length!==3)fail('marqueur d’horodatage non reconnu');
      return asTimestamp(stamp(value.seconds,value.nanoseconds).seconds,value.nanoseconds);
    }
    // Compatibilité avec certains exports Firebase v1 où Timestamp devient {seconds,nanoseconds}.
    if(schema===1 && /(?:At|Timestamp)$/.test(key) && Number.isInteger(value.seconds) &&
       Number.isInteger(value.nanoseconds) && Object.keys(value).every(k=>['seconds','nanoseconds'].includes(k)))
      return asTimestamp(stamp(value.seconds,value.nanoseconds).seconds,value.nanoseconds);
    const result={};
    for(const [name,item] of Object.entries(value)){
      if(name==='__proto__'||name==='constructor'||name==='prototype')fail('clé interdite');
      result[name]=decodeSnapshotValue(item,asTimestamp,schema,name,depth+1);
    }
    return result;
  }
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'&&Number.isFinite(value))return value;
  fail('type invalide dans les données');
}
function validateDocId(id){
  if(typeof id!=='string'||!id||id==='.'||id==='..'||id.includes('/')||
     id.length>1200||/^__.*__$/.test(id))fail('identifiant de document interdit');
}
export function validateSnapshot(payload){
  if(!record(payload)||![1,SNAPSHOT_SCHEMA].includes(payload.schema))fail('version de schéma inconnue');
  if(!record(payload.collections))fail('collections absentes');
  if(payload.sourceProjectId!==undefined &&
     !['team-tool-data','team-tool-test-data'].includes(payload.sourceProjectId))
    fail('projet source non reconnu');
  for(const name of Object.keys(payload.collections))
    if(!SNAPSHOT_COLLECTIONS.includes(name))fail('collection non autorisée : '+name);
  const collections={};const counts={};const warnings=[];let total=0;
  for(const name of SNAPSHOT_COLLECTIONS){
    const entries=payload.collections[name];
    if(entries===undefined){
      if(payload.schema===SNAPSHOT_SCHEMA)fail('collection manquante : '+name);
      collections[name]=null;counts[name]=null;
      warnings.push(name+' absent de l’ancien export : aucune modification de cette collection');
      continue;
    }
    if(!Array.isArray(entries))fail('collection non valide : '+name);
    const seen=new Set();
    collections[name]=entries.map(entry=>{
      if(!record(entry)||!has(entry,'id')||!has(entry,'data')||!record(entry.data))
        fail('document mal formé dans '+name);
      validateDocId(entry.id);
      if(seen.has(entry.id))fail('doublon : '+name+'/'+entry.id);
      seen.add(entry.id);
      // Vérifie tout le contenu avant la moindre écriture.
      decodeSnapshotValue(entry.data,(s,n)=>stamp(s,n),payload.schema);
      return {id:entry.id,data:entry.data};
    });
    counts[name]=entries.length;
    total+=entries.length;
    if(total>50000)fail('trop de documents');
  }
  const hasCalendar=has(payload,'calendar');
  if(hasCalendar){
    if(!record(payload.calendar))fail('calendrier invalide');
    decodeSnapshotValue(payload.calendar,(s,n)=>stamp(s,n),payload.schema);
    if(has(payload.calendar,'exceptions')&&!Array.isArray(payload.calendar.exceptions))
      fail('exceptions du calendrier invalides');
  }else warnings.push('calendrier absent : calendrier TEST conservé');
  if(payload.schema===1)warnings.push('ancien format v1 : vérifier les dates après import');
  if(!payload.sourceProjectId)warnings.push('origine du fichier non certifiée');
  warnings.push('import sans suppression : les documents absents du fichier resteront présents');
  return {schema:payload.schema,sourceProjectId:payload.sourceProjectId||'non précisé',
    collections,counts,total,calendar:hasCalendar?payload.calendar:null,hasCalendar,warnings};
}
