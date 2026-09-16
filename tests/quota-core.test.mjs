import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HISTORY_LIVE_START,
  makeArchiveBaseline,
  splitBaselineParts,
  combineBaselineParts,
  isValidBaseline,
  applyArchiveBaseline,
  replaceLiveEntries
} from '../quota-core.mjs';

const d=(id,data)=>({id,data});
const maps=()=>({tripDays:new Map(),availability:new Map(),legacyStatus:new Map(),plans:new Map()});

test('archive boundary',()=>{
  const b=makeArchiveBaseline({generation:'g1',generatedAtMs:1,
    tripDaysDocs:[d('2026-08-31',{groups:[{id:'a',members:['ludo','igor'],driver:'igor'}]}),d('2026-09-01',{groups:[]})],
    availabilityDocs:[d('2026-08-31_igor',{date:'2026-08-31',profileId:'igor',status:'present'}),d('2026-09-01_igor',{date:'2026-09-01',profileId:'igor',status:'present'})]
  });
  assert.equal(b.liveStart,HISTORY_LIVE_START);
  assert.equal(b.tripDays.length,1);
  assert.equal(b.availability.length,1);
});

test('round trip keeps useful history data',()=>{
  const b=makeArchiveBaseline({generation:'g2',generatedAtMs:2,
    tripDaysDocs:[d('2026-08-29',{source:'repair',groups:[{id:'g1',participants:['ludo','igor'],driverId:'ludo'}]})],
    availabilityDocs:[d('2026-08-29_igor',{date:'2026-08-29',profileId:'igor',status:'time',time:'16:15'})],
    legacyStatusDocs:[d('2026-08-28_ludo',{date:'2026-08-28',profileId:'ludo',status:'alone'})],
    plansDocs:[d('2026-08-29',{date:'2026-08-29',groups:[{id:'g1',participants:['igor','ludo'],driverId:'ludo'}]})]
  });
  const rebuilt=combineBaselineParts(splitBaselineParts(b));
  assert.equal(isValidBaseline(rebuilt),true);
  const target=maps();
  applyArchiveBaseline(rebuilt,target);
  assert.deepEqual(target.tripDays.get('2026-08-29').groups[0].members,['igor','ludo']);
  assert.equal(target.tripDays.get('2026-08-29').groups[0].driver,'ludo');
  assert.equal(target.tripDays.get('2026-08-29').groups[0].source,'repair');
  assert.equal(target.availability.get('2026-08-29_igor').time,'16:15');
  assert.equal(target.legacyStatus.get('2026-08-28_ludo').status,'alone');
  assert.equal(target.plans.get('2026-08-29').groups[0].driver,'ludo');
});

test('live range replacement preserves archive keys',()=>{
  const m=new Map([['2026-08-31_igor',{v:'archive'}],['2026-09-01_igor',{v:'old'}],['2026-09-02_igor',{v:'stale'}]]);
  replaceLiveEntries(m,[['2026-09-01_igor',{v:'fresh'}],['2026-09-03_igor',{v:'new'}]]);
  assert.equal(m.get('2026-08-31_igor').v,'archive');
  assert.equal(m.get('2026-09-01_igor').v,'fresh');
  assert.equal(m.has('2026-09-02_igor'),false);
  assert.equal(m.get('2026-09-03_igor').v,'new');
});

test('generation mismatch is rejected',()=>{
  const parts=splitBaselineParts(makeArchiveBaseline({generation:'g3',generatedAtMs:3}));
  parts.plans={...parts.plans,generation:'other'};
  assert.throws(()=>combineBaselineParts(parts),/Génération incohérente/);
});
