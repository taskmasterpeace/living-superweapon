import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildRecipe} from '../lib/build.js';
import {checkPackage} from '../lib/package-io.js';
import {REPO_ROOT} from '../lib/paths.js';
import {resolve} from 'node:path';
import {measureGlb,structuralReport,readGlb} from '../lib/measure.js';

const RECIPES={carbine:'authoring/recipes/equipment/carbine/recipe.json',sidearm:'authoring/recipes/equipment/sidearm/recipe.json',crate:'authoring/recipes/props/ammo-crate/recipe.json'};
test('procedural equipment and props bake to deterministic, structurally valid GLBs with the sockets their class requires',async()=>{
 const a=await mkdtemp(join(tmpdir(),'pw-pa-')),b=await mkdtemp(join(tmpdir(),'pw-pb-'));
 try{
  for(const [name,recipe] of Object.entries(RECIPES)){
   const first=await buildRecipe(recipe,{root:a,force:true}),second=await buildRecipe(recipe,{root:b,force:true});
   assert.equal(first.manifest.packageHash,second.manifest.packageHash,`${name}: two clean builds agree`);
   const bytes=await readFile(join(first.dir,'model.glb'));
   assert.equal((await structuralReport(bytes)).errors.length,0,`${name}: Khronos validator errors`);
   const glb=await measureGlb(bytes);
   assert.ok(glb.triangles>0&&glb.triangles===first.manifest.budgets.measured.triangles,`${name}: measured triangles recorded`);
   assert.ok(glb.triangles<=first.manifest.budgets.limits.triangles,`${name}: inside the equipment/prop budget`);
   assert.equal((await checkPackage(first.dir)).ok,true);
   const names=first.manifest.sockets.map(s=>s.name);
   if(first.manifest.kind==='equipment')for(const s of ['grip','support','muzzle','magazine','holster'])assert.ok(names.includes(s),`${name}: socket ${s}`);
   // Sockets are read back from the written file, never copied from the recipe.
   const doc=await readGlb(bytes);const inFile=doc.getRoot().listNodes().filter(n=>n.getName().startsWith('socket-')).map(n=>n.getName().slice(7)).sort();
   assert.deepEqual(inFile,[...names].sort(),`${name}: manifest sockets equal the GLB's socket nodes`);
   assert.ok(first.manifest.bounds&&first.manifest.bounds.min.every(Number.isFinite));
  }
 }finally{await rm(a,{recursive:true,force:true});await rm(b,{recursive:true,force:true});}
});
test('a factory that is not listed as a hashed source is refused',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pw-pc-'));
 try{
  const {ADAPTERS}=await import('../adapters/index.js');
  const recipe=JSON.parse(await readFile(resolve(REPO_ROOT,'authoring/recipes/equipment/sidearm/recipe.json'),'utf8'));
  await assert.rejects(ADAPTERS['procedural-prop'].build({recipe,recipeDir:resolve(REPO_ROOT,'authoring/recipes/equipment/sidearm'),sources:[],log:()=>{}}),/must list its factory module as a source/);
 }finally{await rm(root,{recursive:true,force:true});}
});
