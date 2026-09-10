import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {REPO_ROOT} from '../lib/paths.js';
import {buildRecipe} from '../lib/build.js';
import {checkPackage} from '../lib/package-io.js';
import {parseAsf,parseAmc,poseSkeleton} from '../adapters/cmu-asfamc.js';

const RECIPE='authoring/recipes/motion/cmu-walk-02/recipe.json';
const MISSING='CMU source missing under assets-src/cmu — see docs/authoring/SOURCES.md for the fetch commands';

test('the ASF parser rebuilds the CMU skeleton and the rest pose faces +Z with the left side on +X',async()=>{
 const text=await readFile(resolve(REPO_ROOT,'assets-src/cmu/02.asf'),'utf8').catch(()=>{throw new Error(MISSING);});
 const asf=parseAsf(text);
 assert.equal(asf.order.length,30);assert.equal(asf.bones.get('lfemur').parent,'lhipjoint');assert.equal(asf.units.length,.45);
 const {end}=poseSkeleton(asf,null);
 assert.ok(end.get('ltoes').z>end.get('ltibia').z,'toes ahead of the ankle: the rest pose faces +Z');
 assert.ok(end.get('lhipjoint').x>0&&end.get('rhipjoint').x<0,'CMU left is +X, so l* bones must feed the R slots');
 assert.ok(end.get('head').y>end.get('root').y+10,'head above root');
 const frames=parseAmc(await readFile(resolve(REPO_ROOT,'assets-src/cmu/02_01.amc'),'utf8'));
 assert.equal(frames.length,343);assert.equal(frames[0].root.length,6);
 const moved=poseSkeleton(asf,frames[100]);
 assert.ok(moved.end.get('lfemur').distanceTo(end.get('lfemur'))>.5,'a walking frame moves the knee');
 assert.deepEqual(moved.end.get('root').toArray(),[0,0,0],'root translation is discarded, never carried');
});
test('the CMU clip retargets through the shared bridge: finite, unit-normalised, no root motion, deterministic',async()=>{
 const a=await mkdtemp(join(tmpdir(),'pw-cmu-a-')),b=await mkdtemp(join(tmpdir(),'pw-cmu-b-'));
 try{
  const first=await buildRecipe(RECIPE,{root:a,force:true}),second=await buildRecipe(RECIPE,{root:b,force:true});
  assert.equal(first.manifest.packageHash,second.manifest.packageHash);
  assert.equal((await checkPackage(first.dir)).ok,true);
  const bank=JSON.parse(await readFile(join(first.dir,'pose-bank.json'),'utf8')),clip=bank.clips['cmu-walk'];
  assert.equal(clip.frames.length,172);assert.ok(!('rootMotion' in clip));
  for(const frame of clip.frames){assert.equal(frame.length,45);assert.ok(frame.every(Number.isFinite));for(let i=0;i<24;i+=3)assert.ok(Math.abs(Math.hypot(...frame.slice(i,i+3))-1)<2e-5);}
  const steps=first.manifest.clips[0].events.filter(e=>e.type==='footstep');
  assert.ok(steps.length>=2&&steps.some(e=>e.side==='L')&&steps.some(e=>e.side==='R'),'derived footsteps on both feet');
  assert.equal(first.manifest.provenance.redistribution,'runtime-embed-only');
  assert.equal(first.manifest.rig.skeleton,'pw-pose-bridge@1');
  // Legs actually swing: the knee direction changes across the clip.
  const knee=i=>clip.frames[i].slice(12,15);
  assert.ok(Math.hypot(...knee(20).map((v,k)=>v-knee(80)[k]))>.2,'left thigh direction changes between frames 20 and 80');
 }finally{await rm(a,{recursive:true,force:true});await rm(b,{recursive:true,force:true});}
});
