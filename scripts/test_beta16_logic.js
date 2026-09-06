const fs=require('fs');
const src=fs.readFileSync('app.js','utf8');
const a=src.indexOf('// PENDING_GROUPS_LOGIC_BEGIN');
const b=src.indexOf('// PENDING_GROUPS_LOGIC_END');
if(a<0||b<a)throw new Error('logic markers missing');
const logic=src.slice(a,b);
const PEOPLE=['aurelien','etienne','igor','ludo','stephane'];
let availability=new Map(),compatibilities=new Map();
const availKey=(d,p)=>`${d}_${p}`,compatKey=(d,o,r)=>`${d}_${o}_${r}`;
const getAvail=(d,p)=>availability.get(availKey(d,p))||null;
const getCompat=(d,o,r)=>compatibilities.get(compatKey(d,o,r))||null;
const isAvailable=v=>!!v&&(v.status==='present'||v.status==='time');
const label=p=>p;
const canonical=arr=>[...new Set(arr)].sort();
const groupCode=arr=>canonical(arr).join('-');
function partitionPeople(items){const out=[];function rec(i,groups){if(i===items.length){out.push(groups.map(g=>[...g]));return;}const p=items[i];for(let g=0;g<groups.length;g++){groups[g].push(p);rec(i+1,groups);groups[g].pop();}groups.push([p]);rec(i+1,groups);groups.pop();}rec(0,[]);return out;}
const driverSuggestion=(d,g)=>({counts:Object.fromEntries(g.map(p=>[p,0])),candidates:canonical(g),key:groupCode(g)});
eval(logic);
const D='2026-09-07';
function setAvail(p,status,time=null){availability.set(availKey(D,p),{status,time});}
function yes(owner,responder){const ov=getAvail(D,owner);compatibilities.set(compatKey(D,owner,responder),{ownerTime:ov.time,response:'yes'});}
function no(owner,responder){const ov=getAvail(D,owner);compatibilities.set(compatKey(D,owner,responder),{ownerTime:ov.time,response:'no'});}
function reset(){availability=new Map();compatibilities=new Map();}
function members(result){return result.groups.map(g=>canonical(g.members).join('+')).sort();}
function assert(cond,msg){if(!cond)throw new Error(msg);}

reset(); setAvail('igor','time','16:00'); setAvail('etienne','present'); setAvail('ludo','present'); setAvail('stephane','present');
yes('igor','etienne'); no('igor','ludo');
let r=pendingConfirmedGroups(D,['etienne','igor','ludo','stephane']);
assert(JSON.stringify(members(r))===JSON.stringify(['etienne+igor']),'expected only Igor+Etienne core');
assert(r.singles.includes('ludo')&&r.singles.includes('stephane'),'Ludo and Stéphane must remain unplaced');

reset(); setAvail('igor','time','16:00'); setAvail('etienne','present'); setAvail('ludo','present'); setAvail('stephane','present');
yes('igor','etienne'); yes('igor','ludo');
r=pendingConfirmedGroups(D,['etienne','igor','ludo','stephane']);
assert(JSON.stringify(members(r))===JSON.stringify(['etienne+igor+ludo']),'confirmed yes responders should form the core');
assert(r.singles.length===1&&r.singles[0]==='stephane','only pending Stéphane should remain out');

reset(); setAvail('igor','time','16:00'); setAvail('stephane','time','16:30'); setAvail('etienne','present'); setAvail('ludo','present');
yes('igor','etienne'); yes('stephane','ludo');
r=pendingConfirmedGroups(D,['etienne','igor','ludo','stephane']);
assert(JSON.stringify(members(r))===JSON.stringify(['etienne+igor','ludo+stephane']),'two imperative cores should be supported');

reset(); setAvail('igor','time','16:00'); ['aurelien','etienne','ludo','stephane'].forEach(p=>setAvail(p,'present'));
['aurelien','etienne','ludo','stephane'].forEach(p=>yes('igor',p));
r=pendingConfirmedGroups(D,['aurelien','etienne','igor','ludo','stephane']);
assert(r.groups.length===1&&r.groups[0].members.length===5,'confirmed group of five must remain possible');

console.log('Compatibility logic tests: OK');
