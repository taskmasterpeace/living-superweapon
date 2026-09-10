import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildRecipe} from '../lib/build.js';
import {checkPackage} from '../lib/package-io.js';
import {REPO_ROOT} from '../lib/paths.js';
import {resolve} from 'node:path';

test('three proportion recipes build measured body packages from the production rig; sockets scale with the frame',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pw-body-'));
 try{
  const built={};
  for(const id of ['hero-standard','hero-heavy','hero-lean']){
   const r=await buildRecipe(`authoring/recipes/bodies/${id}/recipe.json`,{root,force:true});
   assert.equal((await checkPackage(r.dir)).ok,true,id);
   built[id]={manifest:r.manifest,body:JSON.parse(await readFile(join(r.dir,'body.json'),'utf8'))};
  }
  const std=built['hero-standard'],heavy=built['hero-heavy'],lean=built['hero-lean'];
  assert.equal(std.body.measured.pivotHeight,+(4.6*std.body.frame.scale).toFixed(4));
  assert.ok(heavy.body.measured.height>std.body.measured.height*1.1&&lean.body.measured.height<std.body.measured.height*.8,'heights follow the frame');
  assert.ok(heavy.body.measured.shoulderSpan>std.body.measured.shoulderSpan,'the heavy frame is broader');
  const holster=m=>m.sockets.find(s=>s.name==='holster.hip');
  assert.ok(holster(heavy.manifest).worldOffset[0]>holster(std.manifest).worldOffset[0]&&holster(lean.manifest).worldOffset[0]<holster(std.manifest).worldOffset[0],'holster world offset follows the frame (parent-local values divide out the pelvis scale)');
  for(const m of [std,heavy,lean])assert.ok(holster(m.manifest).worldOffset[0]>m.body.measured.hipX+m.body.measured.thighHalfWidth,'holster sits outside the thigh');
  for(const m of [std,heavy,lean])for(const s of ['hand.right','hand.left','holster.hip','sling.back'])assert.ok(m.manifest.sockets.some(x=>x.name===s),s);
  assert.equal(lean.manifest.rig.catalogBody,'superhero-female');assert.equal(lean.manifest.rig.bones,65);
  assert.ok(std.manifest.budgets.measured.triangles>10000,'body budget is the catalog mesh, measured');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('an unknown catalog body or an out-of-range frame is refused by the same validation Studio applies',async()=>{
 const {ADAPTERS}=await import('../adapters/index.js');
 const recipe=JSON.parse(await readFile(resolve(REPO_ROOT,'authoring/recipes/bodies/hero-standard/recipe.json'),'utf8'));
 await assert.rejects(ADAPTERS['humanoid-body'].build({recipe:{...recipe,catalogBody:'not-a-body'},log:()=>{}}),/not bundled/);
 await assert.rejects(ADAPTERS['humanoid-body'].build({recipe:{...recipe,frame:{scale:3}},log:()=>{}}),/Frame\.scale must be between/);
});
