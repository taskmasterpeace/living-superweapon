import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildRecipe} from '../lib/build.js';
import {checkPackage} from '../lib/package-io.js';

test('two clean builds of the same recipe produce identical output hashes and package hash; a rebuild keeps its version',async()=>{
 const a=await mkdtemp(join(tmpdir(),'pw-a-')),b=await mkdtemp(join(tmpdir(),'pw-b-'));
 try{
  const first=await buildRecipe('authoring/recipes/motion/hero-ual/recipe.json',{root:a,force:true});
  const second=await buildRecipe('authoring/recipes/motion/hero-ual/recipe.json',{root:b,force:true});
  assert.equal(first.manifest.packageHash,second.manifest.packageHash);
  assert.deepEqual(first.manifest.outputs,second.manifest.outputs);
  assert.equal(await readFile(join(first.dir,'pose-bank.json'),'utf8'),await readFile(join(second.dir,'pose-bank.json'),'utf8'));
  const again=await buildRecipe('authoring/recipes/motion/hero-ual/recipe.json',{root:a});
  assert.equal(again.unchanged,true);assert.equal(again.version,1);
  assert.equal((await checkPackage(first.dir)).ok,true);
 }finally{await rm(a,{recursive:true,force:true});await rm(b,{recursive:true,force:true});}
});
test('the manifest carries the takes the brief asked for, with derived events in sensible order',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pw-ev-'));
 try{
  const ual=(await buildRecipe('authoring/recipes/motion/hero-ual/recipe.json',{root,force:true})).manifest;
  const ual2=(await buildRecipe('authoring/recipes/motion/hero-ual2/recipe.json',{root,force:true})).manifest;
  const ids=new Set([...ual.clips,...ual2.clips].map(c=>c.id));
  for(const need of ['idle','walk','jog','sprint','crouch-idle','crouch-walk','aim-neutral','aim-up','aim-down','pistol-idle','reload','grenade-throw','prone-rise'])assert.ok(ids.has(need),need);
  const walk=ual.clips.find(c=>c.id==='walk').events.filter(e=>e.type==='footstep');
  assert.ok(walk.length>=2,'a walk cycle has at least two footsteps');
  assert.ok(walk.some(e=>e.side==='L')&&walk.some(e=>e.side==='R'),'footsteps on both sides');
  const reload=ual.clips.find(c=>c.id==='reload');
  const out=reload.events.find(e=>e.type==='mag-out'),back=reload.events.find(e=>e.type==='mag-in');
  assert.ok(out&&back&&out.t<back.t&&back.t<=reload.duration,`mag-out ${out?.t} before mag-in ${back?.t}`);
  const grenade=ual2.clips.find(c=>c.id==='grenade-throw'),release=grenade.events.find(e=>e.type==='grenade-release');
  assert.ok(release.t>grenade.duration*.15&&release.t<grenade.duration*.95,`release at ${release.t} of ${grenade.duration}`);
  assert.equal(ual.rig.skeleton,'pw-pose-bridge@1');assert.equal(ual.compatibility.poseBridge.frameLength,45);
  assert.equal(ual.provenance.license,'CC0-1.0');assert.equal(ual.source.files.length,2);
 }finally{await rm(root,{recursive:true,force:true});}
});
