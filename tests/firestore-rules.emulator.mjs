import test,{before,beforeEach,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc} from 'firebase/firestore';
let env;
const date='2026-11-14',projectId=process.env.TEAM_RULES_PROJECT || 'demo-teamtool-rules';
const rulesFile=process.env.TEAM_RULES_FILE || 'firestore.rules.test.txt';
const uuids={igor:'uid-igor',ludo:'uid-ludo',aurelien:'uid-aurelien',etienne:'uid-etienne'};
const client=(who)=>env.authenticatedContext(uuids[who]).firestore();
const ref=(db,path)=>doc(db,path);
const avail=(pid)=>'availability/'+date+'_'+pid;
const compat=(owner,pid)=>'compatibilities/'+date+'_'+owner+'_'+pid;
before(async()=>{
  env=await initializeTestEnvironment({projectId,firestore:{
    host:'127.0.0.1',port:8080,
    rules:readFileSync(new URL('../'+rulesFile,import.meta.url),'utf8')
  }});
});
after(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const seed=ctx.firestore();
    for(const [pid,uid] of Object.entries(uuids))
      await setDoc(ref(seed,'deviceLinks/'+uid),{profileId:pid,inviteToken:'token-'+pid});
    await setDoc(ref(seed,'invitations/invite-stephane'),{active:true,profileId:'stephane'});
    await setDoc(ref(seed,avail('aurelien')),{date,profileId:'aurelien',status:'present'});
    await setDoc(ref(seed,avail('etienne')),{date,profileId:'etienne',status:'present'});
    await setDoc(ref(seed,compat('etienne','aurelien')),{date,ownerId:'etienne',responderId:'aurelien',response:'yes'});
    await setDoc(ref(seed,compat('etienne','ludo')),{date,ownerId:'etienne',responderId:'ludo',response:'yes'});
    await setDoc(ref(seed,'delleTrips/'+date),{date,privatePair:'igor_ludo',destination:'Delle',driver:'igor'});
  });
});
test('Accès non lié ou non signé refusé',async()=>{
  await assertFails(getDoc(ref(env.unauthenticatedContext().firestore(),'profiles/aurelien')));
  await assertFails(getDoc(ref(env.authenticatedContext('unknown').firestore(),'profiles/aurelien')));
  await assertSucceeds(getDoc(ref(client('aurelien'),'profiles/aurelien')));
});
test('Association par invitation : création légitime acceptée',async()=>{
  const db=env.authenticatedContext('new-device').firestore();
  await assertSucceeds(getDoc(ref(db,'invitations/invite-stephane')));
  await assertFails(getDocs(collection(db,'invitations')));
  await assertSucceeds(setDoc(ref(db,'deviceLinks/new-device'),{
    profileId:'stephane',inviteToken:'invite-stephane',createdAt:123,userAgent:'test'
  }));
  await assertFails(updateDoc(ref(db,'deviceLinks/new-device'),{profileId:'igor'}));
});
test('Association frauduleuse refusée',async()=>{
  const db=env.authenticatedContext('new-device').firestore();
  await assertFails(setDoc(ref(db,'deviceLinks/new-device'),{profileId:'igor',inviteToken:'invite-stephane'}));
  await assertFails(setDoc(ref(db,'deviceLinks/someone-else'),{profileId:'stephane',inviteToken:'invite-stephane'}));
  await assertFails(setDoc(ref(db,'deviceLinks/new-device'),{profileId:'stephane',inviteToken:'invite-stephane',role:'admin'}));
});
test('Disponibilités : seul le propriétaire peut éditer ses documents',async()=>{
  const db=client('aurelien');
  await assertSucceeds(updateDoc(ref(db,avail('aurelien')),{status:'alone'}));
  await assertFails(updateDoc(ref(db,avail('etienne')),{profileId:'aurelien'}));
  await assertFails(updateDoc(ref(db,avail('aurelien')),{profileId:'etienne'}));
  await assertFails(updateDoc(ref(db,avail('aurelien')),{date:'2026-11-15'}));
  await assertFails(deleteDoc(ref(db,avail('etienne'))));
  await assertFails(setDoc(ref(db,'availability/'+date+'_stephane'),{date,profileId:'aurelien',status:'present'}));
});
test('Simulation des disponibilités conservée pour l’administrateur TEST',async()=>{
  const db=client('igor');
  await assertSucceeds(updateDoc(ref(db,avail('etienne')),{status:'alone'}));
  await assertSucceeds(setDoc(ref(db,avail('ludo')),{date,profileId:'ludo',status:'time',time:'16:30'}));
  await assertFails(updateDoc(ref(db,avail('etienne')),{profileId:'igor'}));
});
test('Compatibilités : personne ne peut modifier la réponse d’un autre',async()=>{
  const db=client('aurelien');
  await assertSucceeds(updateDoc(ref(db,compat('etienne','aurelien')),{response:'no'}));
  await assertFails(updateDoc(ref(db,compat('etienne','ludo')),{responderId:'aurelien'}));
  await assertFails(updateDoc(ref(db,compat('etienne','aurelien')),{ownerId:'ludo'}));
  await assertFails(setDoc(ref(db,compat('etienne','ludo')),{date,ownerId:'etienne',responderId:'aurelien',response:'yes'}));
  await assertSucceeds(updateDoc(ref(client('igor'),compat('etienne','ludo')),{response:'no'}));
});
test('Trajets Delle : réservés exclusivement à Igor et Ludo',async()=>{
  await assertSucceeds(getDoc(ref(client('igor'),'delleTrips/'+date)));
  await assertSucceeds(getDoc(ref(client('ludo'),'delleTrips/'+date)));
  await assertFails(getDoc(ref(client('aurelien'),'delleTrips/'+date)));
  await assertSucceeds(updateDoc(ref(client('ludo'),'delleTrips/'+date),{driver:'ludo'}));
  await assertFails(updateDoc(ref(client('igor'),'delleTrips/'+date),{destination:'Autre'}));
});
test('Jetons personnels et demandes de notification administratives',async()=>{
  await assertSucceeds(setDoc(ref(client('aurelien'),'pushTokens/uid-aurelien'),{profileId:'aurelien',token:'mock'}));
  await assertFails(getDoc(ref(client('etienne'),'pushTokens/uid-aurelien')));
  await assertSucceeds(getDoc(ref(client('igor'),'pushTokens/uid-aurelien')));
  await assertFails(setDoc(ref(client('aurelien'),'notificationRequests/request'),{type:'test'}));
  await assertSucceeds(setDoc(ref(client('igor'),'notificationRequests/request'),{type:'test'}));
  await assertFails(updateDoc(ref(client('igor'),'notificationRequests/request'),{type:'changed'}));
});
test('Administration et refus par défaut',async()=>{
  await assertFails(setDoc(ref(client('aurelien'),'config/calendar'),{exceptions:[]}));
  await assertSucceeds(setDoc(ref(client('igor'),'config/calendar'),{exceptions:[]}));
  await assertSucceeds(setDoc(ref(client('aurelien'),'plans/'+date),{groups:[]}));
  await assertFails(setDoc(ref(client('igor'),'unknownCollection/a'),{test:true}));
});
