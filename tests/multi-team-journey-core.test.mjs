import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorkspace,createTeam,teamById,setAvailability,answerImperative,acceptedDepartureGroups} from '../multi-team-journey-core.mjs';
const initial=()=>createTeam(createTeam(newWorkspace(),{
 teamId:'wm-original',name:'Groupe historique',firstNames:['Igor','Ludo','Stéphane','Aurélien','Étienne']
}),{teamId:'autre-equipe',name:'Autre équipe',firstNames:['Claire','Hugo','Léa']});
test('deux équipes de tailles distinctes et codes indépendants',()=>{
 const w=initial();
 assert.equal(w.teams.length,2);
 assert.equal(w.teams[0].members.length,5);
 assert.equal(w.teams[1].members.length,3);
 assert.equal(w.teams[0].members[0].shortCode,'I');
 assert.equal(w.teams[1].members[0].shortCode,'C');
});
test('limite de 2 à 5 membres appliquée',()=>{
 for(const n of [0,1,6])assert.throws(()=>createTeam(newWorkspace(),{teamId:'team-test',name:'Essai',firstNames:Array.from({length:n},(_,i)=>'Personne'+i)}));
});
test('toutes les personnes acceptant la même heure restent ensemble',()=>{
 let w=initial(),t=teamById(w,'wm-original'),[igor,ludo,steph,aurelien]=t.members.map(x=>x.memberId),date='2026-11-16';
 w=setAvailability(w,t.teamId,igor,date,{status:'time',time:'16:30'});
 for(const id of [ludo,steph,aurelien])w=setAvailability(w,t.teamId,id,date,{status:'present'});
 for(const id of [ludo,steph,aurelien])w=answerImperative(w,t.teamId,date,igor,id,'yes');
 assert.deepEqual(acceptedDepartureGroups(w,t.teamId,date).groups,[{time:'16:30',members:[igor,ludo,steph,aurelien]}]);
});
test('une réponse refusée ne rejoint pas le groupe',()=>{
 let w=initial(),t=w.teams[0],[owner,yes,no]=t.members.map(m=>m.memberId),date='2026-11-16';
 w=setAvailability(w,t.teamId,owner,date,{status:'time',time:'16:30'});
 w=setAvailability(w,t.teamId,yes,date,{status:'present'});
 w=setAvailability(w,t.teamId,no,date,{status:'present'});
 w=answerImperative(w,t.teamId,date,owner,yes,'yes');
 w=answerImperative(w,t.teamId,date,owner,no,'no');
 assert.equal(acceptedDepartureGroups(w,t.teamId,date).groups[0].members.length,2);
 assert.deepEqual(acceptedDepartureGroups(w,t.teamId,date).remaining,[no]);
});
test('isolation complète des disponibilités entre les équipes',()=>{
 let w=initial(),t=w.teams[1],member=t.members[0].memberId;
 w=setAvailability(w,t.teamId,member,'2026-11-16',{status:'present'});
 assert.deepEqual(teamById(w,'wm-original').days,{});
 assert.throws(()=>setAvailability(w,'wm-original',member,'2026-11-16',{status:'present'}),/hors équipe/);
});
test('changement de statut invalide les anciennes réponses',()=>{
 let w=initial(),t=w.teams[0],date='2026-11-16',a=t.members[0].memberId,b=t.members[1].memberId;
 w=setAvailability(w,t.teamId,a,date,{status:'time',time:'16:30'});
 w=setAvailability(w,t.teamId,b,date,{status:'present'});
 w=answerImperative(w,t.teamId,date,a,b,'yes');
 w=setAvailability(w,t.teamId,a,date,{status:'absent'});
 assert.deepEqual(acceptedDepartureGroups(w,t.teamId,date).groups,[]);
 assert.deepEqual(teamById(w,t.teamId).days[date].responses,{});
});
test('une heure acceptée incompatible bloque la proposition',()=>{
 let w=initial(),t=w.teams[0],date='2026-11-16',[a,b,c]=t.members.map(m=>m.memberId);
 w=setAvailability(w,t.teamId,a,date,{status:'time',time:'16:30'});
 w=setAvailability(w,t.teamId,b,date,{status:'present'});
 w=setAvailability(w,t.teamId,c,date,{status:'time',time:'17:00'});
 w=answerImperative(w,t.teamId,date,a,b,'yes');
 w=answerImperative(w,t.teamId,date,c,b,'yes');
 assert.throws(()=>acceptedDepartureGroups(w,t.teamId,date),/incompatibles/);
});
