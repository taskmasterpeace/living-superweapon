import test from 'node:test';
import assert from 'node:assert/strict';
import {meleeChargeRegions,meleeChargeState,meleeReleaseChoice} from '../src/engine/melee-charge-meter.js';
import {MeleeSystem} from '../src/engine/melee.js';
test('three-tier boxing releases at the actual .18 and .55 boundaries',()=>{
 const def={art:'boxing',meleeTiers:3};
 assert.deepEqual(meleeChargeRegions(def).map(r=>[r.id,r.start,r.end]),[['combo',0,.18],['cross',.18,.55],['power',.55,1.3]]);
 for(const [t,id] of [[.179,'combo'],[.18,'cross'],[.549,'cross'],[.55,'power']])assert.equal(meleeReleaseChoice(def,t),id);
});
test('two-tier and restricted styles do not advertise unavailable straight attacks',()=>{
 assert.deepEqual(meleeChargeRegions({art:'boxing',meleeTiers:2}).map(r=>[r.id,r.start]),[['combo',0],['power',.18]]);
 assert.equal(meleeChargeRegions({art:'wrestling'}).length,1);
});
test('clinch shows body blow and finisher; full charge remains bounded',()=>{
 const state=meleeChargeState({def:{},meleeCharge:2,grabbing:{},grabState:'clinch'});
 assert.equal(state.progress,1);assert.equal(state.active.id,'finish');
 assert.deepEqual(state.regions.map(r=>r.start),[0,.55]);
});
test('native release and advertised region agree across styles and thresholds',()=>{
 const system=Object.create(MeleeSystem.prototype);system._canClinch=()=>false;system.canAct=()=>true;
 let result;system.strike=()=>result='combo';system._beginHeavy=(_f,id,p)=>result=id==='cross'?'cross':p===.5?'slam':'power';
 for(const art of ['boxing','wrestling','judo','cqc','powergrap'])for(const meleeTiers of [1,2,3])for(const t of [.01,.179,.18,.3,.549,.55,1.3]){
  const f={def:{art,meleeTiers},meleeCharge:t};result='none';system.chargeRelease(f);
  assert.equal(result,meleeReleaseChoice(f.def,t),`${art}/${meleeTiers}/${t}`);
 }
});

