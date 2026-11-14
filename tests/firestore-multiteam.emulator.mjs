import test,{before,beforeEach,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc,writeBatch} from 'firebase/firestore';
import {acceptedDepartureGroups} from '../multi-team-journey-core.mjs';

const projectId='demo-teamtool-multiteam',date='2026-11-16';
const A='wm-original',B='team-b';
const users={
  igor:{uid:'uid-igor',teamId:A,memberId:'igor',firstName:'Igor',shortCode:'I',role:'leader'},
  ludo:{uid:'uid-ludo',teamId:A,memberId:'ludo',firstName:'Ludo',shortCode:'L',role:'member'},
  aurelien:{uid:'uid-aurelien',teamId:A,memberId:'aurelien',firstName:'Aurélien',shortCode:'A',role:'member'},
  zoe:{uid:'uid-zoe',teamId:B,memberId:'zoe',firstName:'Zoé',shortCode:'Z',role:'leader'},
  alex:{uid:'uid-alex',teamId:B,memberId:'alex',firstName:'Alex',shortCode:'A',role:'member'},
  ines:{uid:'uid-ines',teamId:B,memberId:'ines',firstName:'Inès',shortCode:'I',role:'member'}
};
let env;
const ctx=(name)=>env.authenticatedContext(users[name].uid).firestore();
const ref=(db,path)=>doc(db,path);
const at=(team,coll,id)=>'teams/'+team+'/'+coll+'/'+id;
const avail=(team,member)=>at(team,'availability',date+'_'+member);
const compat=(team,owner,member)=>at(team,'compatibilities',date+'_'+owner+'_'+member);
const pref=(team,member)=>at(team,'preferences',member);
before(async()=>{
  env=await initializeTestEnvironment({projectId,firestore:{
    host:'127.0.0.1',port:8080,
    rules:readFileSync(new URL('../firestore.rules.multiteam.candidate.txt',import.meta.url),'utf8')
  }});
});
after(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async x=>{
    const db=x.firestore();
    await setDoc(ref(db,'platformAdmins/uid-igor'),{active:true});
    for(const [id,name] of [[A,'Équipe initiale'],[B,'Équipe B']])
      await setDoc(ref(db,'teams/'+id),{name,status:'active',capacity:5});
    for(const person of Object.values(users)){
      const {uid,teamId,memberId,firstName,shortCode,role}=person;
      await setDoc(ref(db,'memberDirectory/'+memberId),{teamId});
      await setDoc(ref(db,at(teamId,'members',memberId)),{
        firstName,displayName:firstName,shortCode,role,active:true
      });
      await setDoc(ref(db,at(teamId,'shortCodes',shortCode)),{memberId});
      await setDoc(ref(db,'teamDeviceLinks/'+uid),{teamId,memberId,inviteToken:'seeded-by-admin'});
    }
    for(const name of ['igor','ludo','aurelien'])
      await setDoc(ref(db,'deviceLinks/'+users[name].uid),{
        profileId:name,inviteToken:'legacy-token'
      });
    await setDoc(ref(db,avail(A,'igor')),{date,memberId:'igor',status:'present'});
    await setDoc(ref(db,avail(A,'ludo')),{date,memberId:'ludo',status:'present'});
    await setDoc(ref(db,avail(B,'zoe')),{date,memberId:'zoe',status:'present'});
    await setDoc(ref(db,avail(B,'alex')),{date,memberId:'alex',status:'present'});
    await setDoc(ref(db,compat(B,'zoe','alex')),{date,ownerId:'zoe',responderId:'alex',response:'yes'});
    await setDoc(ref(db,compat(B,'zoe','ines')),{date,ownerId:'zoe',responderId:'ines',response:'yes'});
    await setDoc(ref(db,at(A,'delleTrips',date)),{
      date,privatePair:'igor_ludo',destination:'Delle',driver:'ludo'
    });
    await setDoc(ref(db,at(A,'tripDays',date)),{date,groups:[{members:['igor','ludo']}]});
    await setDoc(ref(db,at(B,'tripDays',date)),{date,groups:[{members:['zoe','alex']}]});
  });
});

test('Aucun accès aux équipes pour un appareil non associé',async()=>{
  await assertFails(getDoc(ref(env.unauthenticatedContext().firestore(),'teams/'+B)));
  await assertFails(getDoc(ref(env.authenticatedContext('uid-unknown').firestore(),'teams/'+B)));
  await assertFails(getDoc(ref(env.authenticatedContext('uid-unknown').firestore(),avail(B,'zoe'))));
});
test('Un membre ne lit que son équipe, jamais l’autre équipe',async()=>{
  await assertSucceeds(getDoc(ref(ctx('alex'),'teams/'+B)));
  await assertSucceeds(getDoc(ref(ctx('alex'),avail(B,'zoe'))));
  await assertSucceeds(getDocs(collection(ctx('alex'),at(B,'members','').slice(0,-1))));
  await assertFails(getDoc(ref(ctx('alex'),'teams/'+A)));
  await assertFails(getDoc(ref(ctx('alex'),avail(A,'igor'))));
  await assertFails(getDocs(collection(ctx('alex'),'teams/'+A+'/members')));
  await assertFails(getDocs(collection(ctx('alex'),'teams')));
});
test('Le superadministrateur peut inspecter toutes les équipes',async()=>{
  await assertSucceeds(getDocs(collection(ctx('igor'),'teams')));
  await assertSucceeds(getDoc(ref(ctx('igor'),avail(B,'zoe'))));
  await assertSucceeds(getDoc(ref(ctx('igor'),at(B,'members','alex'))));
  await assertSucceeds(getDocs(collection(ctx('igor'),'memberDirectory')));
});
test('Aucun accès croisé en écriture, même en changeant le propriétaire',async()=>{
  await assertFails(updateDoc(ref(ctx('alex'),avail(A,'igor')),{memberId:'alex'}));
  await assertFails(setDoc(ref(ctx('alex'),avail(A,'alex')),{date,memberId:'alex',status:'present'}));
  await assertFails(deleteDoc(ref(ctx('zoe'),at(A,'tripDays',date))));
  await assertFails(setDoc(ref(ctx('ludo'),at(B,'plans',date)),{date,groups:[]}));
});
test('Une disponibilité reste liée au membre et à sa date',async()=>{
  const alex=ctx('alex');
  await assertSucceeds(updateDoc(ref(alex,avail(B,'alex')),{status:'alone'}));
  await assertFails(updateDoc(ref(alex,avail(B,'zoe')),{memberId:'alex'}));
  await assertFails(updateDoc(ref(alex,avail(B,'alex')),{memberId:'zoe'}));
  await assertFails(updateDoc(ref(alex,avail(B,'alex')),{date:'2026-12-01'}));
  await assertFails(setDoc(ref(alex,avail(B,'ines')),{date,memberId:'alex',status:'present'}));
  await assertFails(deleteDoc(ref(alex,avail(B,'zoe'))));
  await assertSucceeds(deleteDoc(ref(alex,avail(B,'alex'))));
});
test('Compatibilité : seul le répondant peut écrire sa réponse',async()=>{
  await assertSucceeds(updateDoc(ref(ctx('alex'),compat(B,'zoe','alex')),{response:'no'}));
  await assertFails(updateDoc(ref(ctx('alex'),compat(B,'zoe','ines')),{responderId:'alex'}));
  await assertFails(updateDoc(ref(ctx('alex'),compat(B,'zoe','alex')),{ownerId:'ines'}));
  await assertFails(setDoc(ref(ctx('alex'),compat(A,'igor','alex')),{date,ownerId:'igor',responderId:'alex',response:'yes'}));
});
test('Plans et trajets : modification limitée à sa propre équipe',async()=>{
  await assertSucceeds(setDoc(ref(ctx('alex'),at(B,'plans',date)),{date,groups:[]}));
  await assertSucceeds(updateDoc(ref(ctx('zoe'),at(B,'tripDays',date)),{groups:[]}));
  await assertFails(updateDoc(ref(ctx('zoe'),at(A,'tripDays',date)),{groups:[]}));
  await assertFails(setDoc(ref(ctx('alex'),at(B,'plans',date)),{date:'2026-12-01',groups:[]}));
});
test('Responsable : peut gérer son calendrier, pas celui des autres',async()=>{
  await assertSucceeds(setDoc(ref(ctx('zoe'),at(B,'config','calendar')),{exceptions:[]}));
  await assertFails(setDoc(ref(ctx('alex'),at(B,'config','calendar')),{exceptions:[]}));
  await assertFails(setDoc(ref(ctx('zoe'),at(A,'config','calendar')),{exceptions:[]}));
  await assertFails(updateDoc(ref(ctx('zoe'),'teams/'+B),{status:'archived'}));
  await assertSucceeds(updateDoc(ref(ctx('zoe'),'teams/'+B),{name:'Équipe B révisée'}));
});
test('Un responsable ne peut pas se donner le rôle de superadministrateur',async()=>{
  await assertFails(setDoc(ref(ctx('zoe'),'platformAdmins/uid-zoe'),{active:true}));
  await assertFails(updateDoc(ref(ctx('zoe'),at(B,'members','zoe')),{role:'leader',active:false}));
  await assertFails(setDoc(ref(ctx('zoe'),'memberDirectory/faux'),{teamId:B}));
  await assertFails(setDoc(ref(ctx('zoe'),at(B,'members','faux')),{role:'leader',active:true}));
  await assertFails(setDoc(ref(ctx('zoe'),'teams/team-c'),{name:'Fraude',status:'active'}));
});
test('Le responsable invite seulement les membres déjà inscrits de son équipe',async()=>{
  const token=at(B,'invitations','jeton-inconnu');
  await assertSucceeds(setDoc(ref(ctx('zoe'),token),{memberId:'alex',active:true}));
  await assertFails(setDoc(ref(ctx('alex'),at(B,'invitations','tentative')),{memberId:'ines',active:true}));
  await assertFails(setDoc(ref(ctx('zoe'),at(A,'invitations','tentative')),{memberId:'igor',active:true}));
  await assertFails(setDoc(ref(ctx('zoe'),at(B,'invitations','faux')),{memberId:'non-membre',active:true}));
  await assertSucceeds(getDoc(ref(env.authenticatedContext('uid-new-device').firestore(),token)));
  await assertFails(getDocs(collection(env.authenticatedContext('uid-new-device').firestore(),at(B,'invitations','').slice(0,-1))));
});
test('Invitation correcte : lien unique, sans rôle injecté ni changement d’équipe',async()=>{
  await assertSucceeds(setDoc(ref(ctx('zoe'),at(B,'invitations','token-personnel')),{memberId:'alex',active:true}));
  const fresh=env.authenticatedContext('uid-new-device').firestore();
  await assertSucceeds(setDoc(ref(fresh,'teamDeviceLinks/uid-new-device'),{
    teamId:B,memberId:'alex',inviteToken:'token-personnel'
  }));
  await assertSucceeds(getDoc(ref(fresh,avail(B,'zoe'))));
  await assertFails(getDoc(ref(fresh,avail(A,'igor'))));
  await assertFails(updateDoc(ref(fresh,'teamDeviceLinks/uid-new-device'),{teamId:A}));
  const second=env.authenticatedContext('uid-second-device').firestore();
  await assertFails(setDoc(ref(second,'teamDeviceLinks/uid-second-device'),{
    teamId:B,memberId:'alex',inviteToken:'token-personnel',role:'superadmin'
  }));
  await assertFails(setDoc(ref(second,'teamDeviceLinks/uid-second-device'),{
    teamId:A,memberId:'alex',inviteToken:'token-personnel'
  }));
});
test('Un appareil déjà lié dans l’ancien système ne peut se réinscrire à une autre équipe',async()=>{
  await env.withSecurityRulesDisabled(async x=>{
    await setDoc(ref(x.firestore(),'deviceLinks/uid-legacy-only'),{profileId:'igor',inviteToken:'old'});
  });
  await assertSucceeds(setDoc(ref(ctx('zoe'),at(B,'invitations','token-alex')),{memberId:'alex',active:true}));
  const old=env.authenticatedContext('uid-legacy-only').firestore();
  await assertFails(setDoc(ref(old,'teamDeviceLinks/uid-legacy-only'),{
    teamId:B,memberId:'alex',inviteToken:'token-alex'
  }));
});
test('Répertoire global : l’équipe est immuable',async()=>{
  await assertFails(updateDoc(ref(ctx('igor'),'memberDirectory/alex'),{teamId:A}));
  await assertFails(deleteDoc(ref(ctx('igor'),'memberDirectory/alex')));
  await assertSucceeds(getDoc(ref(ctx('alex'),'memberDirectory/alex')));
  await assertFails(getDoc(ref(ctx('alex'),'memberDirectory/igor')));
});
test('Codes courts réservés atomiquement et jamais réattribués',async()=>{
  await assertSucceeds(setDoc(ref(ctx('igor'),'memberDirectory/nina'),{teamId:B}));
  const admin=ctx('igor');
  const batch=writeBatch(admin);
  batch.set(ref(admin,at(B,'members','nina')),{
    firstName:'Nina',displayName:'Nina',shortCode:'N',active:true,role:'member'
  });
  batch.set(ref(admin,at(B,'shortCodes','N')),{memberId:'nina'});
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(ref(ctx('igor'),at(B,'shortCodes','N')),{memberId:'alex'}));
  await assertFails(updateDoc(ref(ctx('igor'),at(B,'members','nina')),{shortCode:'Ni'}));
  await assertFails(deleteDoc(ref(ctx('igor'),at(B,'shortCodes','N'))));
  await assertSucceeds(setDoc(ref(ctx('igor'),'memberDirectory/nathan'),{teamId:B}));
  await assertFails(setDoc(ref(ctx('igor'),at(B,'members','nathan')),{
    firstName:'Nathan',displayName:'Nathan',shortCode:'N',active:true,role:'member'
  }));
});
test('Delle demeure privée dans le groupe historique',async()=>{
  await assertSucceeds(getDoc(ref(ctx('igor'),at(A,'delleTrips',date))));
  await assertSucceeds(getDoc(ref(ctx('ludo'),at(A,'delleTrips',date))));
  await assertFails(getDoc(ref(ctx('aurelien'),at(A,'delleTrips',date))));
  await assertFails(getDoc(ref(ctx('zoe'),at(A,'delleTrips',date))));
  await assertFails(setDoc(ref(ctx('zoe'),at(B,'delleTrips',date)),{
    date,privatePair:'igor_ludo',destination:'Delle',driver:'ludo'
  }));
  await assertSucceeds(updateDoc(ref(ctx('ludo'),at(A,'delleTrips',date)),{driver:'igor'}));
  await assertFails(updateDoc(ref(ctx('ludo'),at(A,'delleTrips',date)),{destination:'Belfort'}));
});
test('Personne d’une nouvelle équipe ne lit les anciennes collections à la racine',async()=>{
  await assertFails(getDoc(ref(ctx('zoe'),'availability/'+date+'_igor')));
  await assertFails(getDocs(collection(ctx('alex'),'profiles')));
  await assertSucceeds(getDoc(ref(ctx('igor'),'availability/'+date+'_igor')));
});
test('Préférences et notifications isolées par équipe',async()=>{
  await assertSucceeds(setDoc(ref(ctx('alex'),pref(B,'alex')),{theme:'dark'}));
  await assertFails(setDoc(ref(ctx('alex'),pref(B,'zoe')),{theme:'light'}));
  await assertFails(getDoc(ref(ctx('alex'),pref(A,'igor'))));
  await assertSucceeds(setDoc(ref(ctx('alex'),at(B,'pushTokens','uid-alex')),{memberId:'alex',token:'test'}));
  await assertFails(setDoc(ref(ctx('alex'),at(A,'pushTokens','uid-alex')),{memberId:'alex',token:'test'}));
  await assertFails(setDoc(ref(ctx('alex'),at(B,'notificationRequests','new')),{type:'test'}));
  await assertSucceeds(setDoc(ref(ctx('zoe'),at(B,'notificationRequests','new')),{type:'test'}));
  await assertFails(setDoc(ref(ctx('zoe'),at(A,'notificationRequests','other')),{type:'test'}));
});

test('Le brouillon protège les données migrées même avec un lien existant', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'teams/' + A), {status:'draft'});
  });
  for (const name of ['ludo','aurelien','zoe']) {
    await assertFails(getDoc(doc(ctx(name), 'teams/' + A)));
    await assertFails(getDoc(doc(ctx(name), at(A,'delleTrips',date))));
    await assertFails(getDocs(collection(ctx(name), 'teams/' + A + '/delleTrips')));
  }
  await assertSucceeds(getDoc(doc(ctx('igor'), at(A,'delleTrips',date))));
  await assertSucceeds(getDoc(doc(ctx('ludo'), 'deviceLinks/' + users.ludo.uid)));
});


test('Provisionnement atomique de cinq collègues TEST, sans accès croisé',async()=>{
  const admin=ctx('igor'),teamId='atelier-c';
  const names=['Claire','Chloé','Hugo','Nadia','Alex'];
  const shortCodes=['C','Ch','H','N','A'];
  const teamRef=ref(admin,'teams/'+teamId);
  const batch=writeBatch(admin);
  batch.set(teamRef,{name:'Atelier C',status:'active',capacity:5});
  names.forEach((firstName,i)=>{
    const memberId=teamId+'-m'+(i+1),shortCode=shortCodes[i];
    batch.set(ref(admin,'memberDirectory/'+memberId),{teamId});
    batch.set(ref(admin,at(teamId,'members',memberId)),{
      firstName,displayName:firstName,shortCode,active:true,role:i===0?'leader':'member'
    });
    batch.set(ref(admin,at(teamId,'shortCodes',shortCode)),{memberId});
  });
  await assertSucceeds(batch.commit());
  const leaderId=teamId+'-m1';
  await assertSucceeds(setDoc(ref(admin,at(teamId,'invitations','token-claire')),{
    memberId:leaderId,active:true
  }));
  const device=env.authenticatedContext('uid-claire-new').firestore();
  await assertSucceeds(setDoc(ref(device,'teamDeviceLinks/uid-claire-new'),{
    teamId,memberId:leaderId,inviteToken:'token-claire'
  }));
  await assertSucceeds(getDoc(ref(device,at(teamId,'members',teamId+'-m2'))));
  await assertFails(getDoc(ref(device,at(B,'members','zoe'))));
  await assertFails(getDoc(ref(ctx('alex'),at(teamId,'members',leaderId))));
});

test('Premier lien : le superadministrateur invite le responsable, puis le responsable invite un collègue',async()=>{
  // Le compte du responsable n'est pas encore lié : seul l'administrateur peut amorcer l'équipe.
  const admin=ctx('igor'),leaderToken='leader-initial-invite';
  await assertSucceeds(setDoc(ref(admin,at(B,'invitations',leaderToken)),{memberId:'zoe',active:true}));
  const freshLeader=env.authenticatedContext('uid-zoe-fresh').firestore();
  await assertSucceeds(getDoc(ref(freshLeader,at(B,'invitations',leaderToken))));
  await assertSucceeds(setDoc(ref(freshLeader,'teamDeviceLinks/uid-zoe-fresh'),{
    teamId:B,memberId:'zoe',inviteToken:leaderToken
  }));
  await assertSucceeds(getDoc(ref(freshLeader,at(B,'members','alex'))));
  await assertSucceeds(setDoc(ref(freshLeader,at(B,'invitations','alex-personal')),{
    memberId:'alex',active:true
  }));
  const colleague=env.authenticatedContext('uid-alex-new').firestore();
  await assertSucceeds(setDoc(ref(colleague,'teamDeviceLinks/uid-alex-new'),{
    teamId:B,memberId:'alex',inviteToken:'alex-personal'
  }));
  await assertSucceeds(getDoc(ref(colleague,at(B,'members','zoe'))));
  await assertFails(getDoc(ref(colleague,at(A,'members','igor'))));
  await assertFails(setDoc(ref(colleague,at(B,'invitations','privilege-escalation')),{memberId:'ines',active:true}));
});

test('Parcours réel sur émulateur : impératif accepté par deux collègues, groupe unique et trajets isolés',async()=>{
  const zoe=ctx('zoe'),alex=ctx('alex'),ines=ctx('ines'),ludo=ctx('ludo');
  await assertSucceeds(setDoc(ref(zoe,avail(B,'zoe')),{date,memberId:'zoe',status:'time',time:'16:30'}));
  await assertSucceeds(setDoc(ref(ines,avail(B,'ines')),{date,memberId:'ines',status:'present'}));
  await assertSucceeds(setDoc(ref(alex,compat(B,'zoe','alex')),{date,ownerId:'zoe',responderId:'alex',response:'yes',ownerTime:'16:30'}));
  await assertSucceeds(setDoc(ref(ines,compat(B,'zoe','ines')),{date,ownerId:'zoe',responderId:'ines',response:'yes',ownerTime:'16:30'}));
  const memberSnap=await getDocs(collection(alex,'teams/'+B+'/members'));
  const availabilitySnap=await getDocs(collection(alex,'teams/'+B+'/availability'));
  const compatSnap=await getDocs(collection(alex,'teams/'+B+'/compatibilities'));
  const members=memberSnap.docs.map(d=>({memberId:d.id,...d.data()}));
  const availabilities=Object.fromEntries(availabilitySnap.docs.filter(d=>d.data().date===date).map(d=>[d.data().memberId,d.data()]));
  const responses=Object.fromEntries(compatSnap.docs.filter(d=>d.data().date===date).map(d=>[
    d.data().ownerId+':'+d.data().responderId,d.data()
  ]));
  const workspace={teams:[{teamId:B,name:'Équipe B',members,days:{[date]:{availability:availabilities,responses}}}]};
  const proposal=acceptedDepartureGroups(workspace,B,date);
  assert.equal(proposal.groups.length,1);
  assert.equal(proposal.groups[0].time,'16:30');
  assert.deepEqual([...proposal.groups[0].members].sort(),['alex','ines','zoe']);
  assert.deepEqual(proposal.remaining,[]);
  await assertSucceeds(setDoc(ref(zoe,at(B,'plans',date)),{
    date,groups:[{members:proposal.groups[0].members,driver:'zoe',time:'16:30'}]
  }));
  await assertSucceeds(setDoc(ref(alex,at(B,'tripDays',date)),{
    date,groups:[{members:proposal.groups[0].members,driver:'zoe',time:'16:30'}]
  }));
  await assertSucceeds(setDoc(ref(zoe,at(B,'config','calendar')),{exceptions:[{date:'2026-11-20',type:'off'}]}));
  const tripB=await getDoc(ref(ines,at(B,'tripDays',date)));
  const tripA=await getDoc(ref(ludo,at(A,'tripDays',date)));
  assert.deepEqual([...tripB.data().groups[0].members].sort(),['alex','ines','zoe']);
  assert.deepEqual(tripA.data().groups[0].members,['igor','ludo']);
  assert.equal(tripB.data().groups[0].driver,'zoe');
  await assertFails(getDoc(ref(alex,at(A,'tripDays',date))));
  await assertFails(getDoc(ref(ludo,at(B,'config','calendar'))));
  await assertFails(setDoc(ref(alex,at(A,'tripDays',date)),{date,groups:[]}));
});
