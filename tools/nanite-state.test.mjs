import test from 'node:test';
import assert from 'node:assert/strict';

const api=await import('../src/engine/nanite-state.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const cannon={type:'charge',naniteForm:'cannon',naniteAttachment:'right-forearm'};
const shield={type:'naniteShield',naniteForm:'shield',naniteAttachment:'left-forearm'};
function create(abilities={lmb:cannon,q:shield}){
 assert.equal(typeof api.createNaniteState,'function','source-bound nanite state is not implemented');
 return api.createNaniteState(abilities);
}
const unlocked=new Set(['lmb','q']);
function ready(abilities){const s=create(abilities);api.advanceNanites(s,.65,unlocked);return s;}
const hit=(m,cell=4)=>({slot:m.slot,epoch:m.epoch,cell,point:{x:1,y:2,z:3},normal:{x:0,y:0,z:-1}});

test('untagged loadouts allocate no controller',()=>assert.equal(create({q:{type:'shield'}}),null));
test('locked source has no active cells; first unlock consumes exactly assembly duration',()=>{
 const s=create();api.advanceNanites(s,10,new Set());const m=s.modules.get('q');
 assert.equal(m.unlocked,false);assert.equal(m.assemblyT,0);
 api.advanceNanites(s,.64,unlocked);assert.equal(m.ready,false);
 api.advanceNanites(s,0,unlocked);assert.equal(m.assemblyT,.64);
 api.advanceNanites(s,.01,unlocked);assert.equal(m.ready,true);assert.equal(m.cells.length,9);
 assert.equal(s.modules.get('lmb').cells.length,6);
});
for(const density of [0,.75,1])test(`density ${density} cannot alter cell or assembly readiness`,()=>{
 const s=ready({q:{...shield,naniteDensity:density}}),m=s.modules.get('q');assert.equal(m.ready,true);assert.equal(m.cells.length,9);
 assert.ok(m.cells.every(c=>c.hp===12));
});
test('shield local absorption conserves damage and repairs only at the exact quiet+reform boundary',()=>{
 const s=ready(),m=s.modules.get('q'),contact=hit(m);
 assert.deepEqual(api.damageNanite(s,contact,20,true),{remaining:8,absorbed:12,disabledSlot:null});
 assert.equal(m.cells.filter(c=>c.broken).length,1);assert.equal(m.cells[4].hp,0);
 contact.point.x=999;assert.equal(m.cells[4].hitPoint.x,1,'contact metadata must be copied');
 api.advanceNanites(s,1.14,unlocked);assert.equal(m.cells[4].broken,true);
 api.advanceNanites(s,.01,unlocked);assert.equal(m.cells[4].broken,false);assert.equal(m.cells[4].hp,12);
});
test('large and subdivided elapsed intervals repair identically without consuming quiet twice',()=>{
 const a=ready(),b=ready();for(const s of [a,b])api.damageNanite(s,hit(s.modules.get('q')),20,true);
 api.advanceNanites(a,.9,unlocked);for(let i=0;i<90;i++)api.advanceNanites(b,.01,unlocked);
 for(const key of ['quietT','reformT','hp'])assert.ok(Math.abs(a.modules.get('q').cells[4][key]-b.modules.get('q').cells[4][key])<1e-10,key);
 assert.equal(a.modules.get('q').cells[4].broken,true);
});
test('a new dent resets only that cell quiet/reform while intact cells remain functional',()=>{
 const s=ready(),m=s.modules.get('q');api.damageNanite(s,hit(m,0),3,true);api.damageNanite(s,hit(m,1),3,true);
 api.advanceNanites(s,.7,unlocked);api.damageNanite(s,hit(m,0),2,true);
 assert.equal(m.cells[0].hp,7);assert.equal(m.cells[0].broken,false);assert.equal(m.cells[0].quietT,0);assert.equal(m.cells[0].reformT,0);
 assert.ok(m.cells[1].reformT>.29);api.advanceNanites(s,.45,unlocked);assert.equal(m.cells[1].hp,12);assert.equal(m.cells[0].hp,7);
});
test('toggle cannot heal or reset repair; retracted and assembling modules cannot absorb',()=>{
 const s=ready(),m=s.modules.get('q');api.damageNanite(s,hit(m),20,true);api.advanceNanites(s,.7,unlocked);
 const progress=m.cells[4].reformT;assert.equal(api.toggleNanite(s,'q'),false);assert.equal(m.cells[4].reformT,progress);
 assert.deepEqual(api.damageNanite(s,hit(m,0),8,true),{remaining:8,absorbed:0,disabledSlot:null});
 assert.equal(api.toggleNanite(s,'q'),true);assert.equal(m.cells[4].hp,0);assert.equal(m.assemblyT,0);assert.equal(m.cells[4].reformT,progress);
 assert.deepEqual(api.damageNanite(s,hit(m,0),8,true),{remaining:8,absorbed:0,disabledSlot:null});
});
test('cannon structural failure disables only its slot without providing armor',()=>{
 const s=ready(),m=s.modules.get('lmb');assert.deepEqual(api.damageNanite(s,hit(m,2),20,true),{remaining:20,absorbed:0,disabledSlot:'lmb'});
 assert.equal(s.modules.get('q').ready,true);assert.equal(s.modules.get('q').cells[2].hp,12);
});
test('ineligible shield contact can damage metal but cannot absorb body damage',()=>{
 const s=ready(),m=s.modules.get('q');assert.deepEqual(api.damageNanite(s,hit(m),5,false),{remaining:5,absorbed:0,disabledSlot:null});assert.equal(m.cells[4].hp,7);
});
test('stale, malformed, absent and broken cells cannot consume a second hit',()=>{
 const s=ready(),m=s.modules.get('q');for(const contact of [null,{},hit({...m,epoch:m.epoch+1}),hit(m,10),{...hit(m),point:{x:NaN,y:0,z:0}}])
 assert.deepEqual(api.damageNanite(s,contact,20,true),{remaining:20,absorbed:0,disabledSlot:null});
 api.damageNanite(s,hit(m),20,true);assert.deepEqual(api.damageNanite(s,hit(m),20,true),{remaining:20,absorbed:0,disabledSlot:null});
});
test('retirement is idempotent, invalidates epochs, and new life creates undamaged initial assembly',()=>{
 const s=ready(),m=s.modules.get('q'),epoch=m.epoch;api.damageNanite(s,hit(m),20,true);api.retireNanites(s,'q');
 const retired=m.epoch;assert.ok(retired>epoch);assert.equal(m.ready,false);api.retireNanites(s,'q');assert.equal(m.epoch,retired);
 api.advanceNanites(s,10,unlocked);assert.equal(m.ready,false);api.resetNanites(s);assert.ok(m.epoch>retired);assert.equal(m.assemblyT,0);assert.equal(m.cells[4].hp,12);
 api.advanceNanites(s,.65,unlocked);assert.equal(m.ready,true);api.retireNanites(s);api.retireNanites(s);assert.equal(s.disposed,true);
});
