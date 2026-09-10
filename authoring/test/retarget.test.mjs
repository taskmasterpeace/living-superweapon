// Parity with the shipped banks: the generic, mapping-driven retarget must reproduce the frames
// tools/lib/quaternius-source.mjs bakes for the same takes. Both run the same pinned source
// through their own copy of three@0.169.0; only numbers cross the boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {REPO_ROOT} from '../lib/paths.js';
import {buildRecipe} from '../lib/build.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const SOURCE_MISSING='Licensed source missing under assets-src/quaternius — see docs/authoring/SOURCES.md';
// The engine consumes these banks as JSON files (src/data/*.json), so the comparison is made
// on the JSON form: that is where a baked -0 becomes 0 and where the numbers actually live.
const viaJson=v=>JSON.parse(JSON.stringify(v));
async function shippedBake(){
 const api=await import('../../tools/lib/quaternius-source.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});
 assert.ok(api,'production ingest module must exist at tools/lib/quaternius-source.mjs');
 const source=await api.loadSource().catch(e=>{throw new Error(SOURCE_MISSING+': '+e.message);});
 return viaJson({locomotion:api.bakeLocomotion(source),strikes:api.bakeStrikes(source),jumps:api.bakeJumps(source),heavy:api.bakeHeavyStrikes(await api.loadHeavySource())});
}
async function builtBank(recipe){
 const root=await mkdtemp(join(tmpdir(),'pw-parity-'));
 try{
  const r=await buildRecipe(recipe,{root,force:true});
  return JSON.parse(await readFile(join(r.dir,'pose-bank.json'),'utf8'));
 }finally{await rm(root,{recursive:true,force:true});}
}
test('generic retarget reproduces the shipped locomotion, strike, jump and heavy banks frame for frame',async()=>{
 const shipped=await shippedBake();
 const ual=await builtBank('authoring/recipes/motion/hero-ual/recipe.json');
 const ual2=await builtBank('authoring/recipes/motion/hero-ual2/recipe.json');
 for(const key of ['idle','walk','jog','sprint']){
  assert.equal(ual.clips[key].frames.length,shipped.locomotion.clips[key].frames.length,key);
  assert.deepEqual(ual.clips[key].frames,shipped.locomotion.clips[key].frames,`${key} frames must match the production bake exactly`);
  assert.deepEqual(ual.clips[key].rawEndpoint,shipped.locomotion.clips[key].rawEndpoint);
 }
 for(const key of ['jab','cross'])assert.deepEqual(ual.clips[key].frames,shipped.strikes.clips[key].frames,`${key} strike frames`);
 assert.deepEqual(ual.clips['jump-start'].frames.map(f=>f.slice(0,44)),shipped.jumps.clips.takeoff.frames.map(f=>f.slice(0,44)),'jump takeoff (the shipped jump bank zeroes support afterwards; anatomy must match)');
 assert.deepEqual(ual.clips['jump-land'].frames.map(f=>f.slice(0,44)),shipped.jumps.clips.landing.frames.map(f=>f.slice(0,44)),'jump landing');
 const hookFrames=shipped.heavy.clips.power.segments[0],n=Math.round(hookFrames.duration*60)+1;
 assert.deepEqual(ual2.clips.power.frames,shipped.heavy.clips.power.frames.slice(0,n),'heavy hook frames');
 assert.deepEqual(ual2.clips['power-recover'].frames.slice(1),shipped.heavy.clips.power.frames.slice(n),'heavy recovery frames');
});
test('every emitted clip is finite, unit-normalised and carries no root motion',async()=>{
 const bank=await builtBank('authoring/recipes/motion/hero-ual/recipe.json');
 for(const [key,clip] of Object.entries(bank.clips)){
  assert.ok(!('rootMotion' in clip),key);
  for(const frame of clip.frames){
   assert.equal(frame.length,45);assert.ok(frame.every(Number.isFinite),key);
   for(let i=0;i<24;i+=3)assert.ok(Math.abs(Math.hypot(...frame.slice(i,i+3))-1)<2e-5,`${key} unit segment`);
   assert.ok(frame[44]>=0&&frame[44]<=3,`${key} support ratio`);
  }
 }
 assert.ok(bank.clips['crouch-idle'].frames.length>60&&bank.clips.reload.frames.length===101,'crouch and reload takes are sampled at 60 Hz');
});
test('a wrong-side mapping is refused by the bind contract, not silently baked',async()=>{
 const recipePath=resolve(REPO_ROOT,'authoring/recipes/motion/hero-ual/recipe.json');
 const recipe=JSON.parse(await readFile(recipePath,'utf8'));
 const swapped={...recipe.mapping};for(const s of ['shoulder','elbow','hand','hip','knee','foot','toe']){[swapped[s+'L'],swapped[s+'R']]=[swapped[s+'R'],swapped[s+'L']];}
 const {ADAPTERS}=await import('../adapters/index.js');
 const {resolveSources,loadRecipe}=await import('../lib/build.js');
 const loaded=await loadRecipe('authoring/recipes/motion/hero-ual/recipe.json');
 const sources=await resolveSources(loaded);
 await assert.rejects(ADAPTERS['quaternius-ual'].build({recipe:{...recipe,mapping:swapped},sources,log:()=>{}}),/bind contract: shoulderL must sit on negative X/);
});
