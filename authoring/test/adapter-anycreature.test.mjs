import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {REPO_ROOT,AUTHORING_ROOT} from '../lib/paths.js';
import {buildRecipe} from '../lib/build.js';
import {checkPackage} from '../lib/package-io.js';
import {measureGlb,structuralReport,readGlb} from '../lib/measure.js';
import {sha256} from '../lib/hash.js';

const RECIPE='authoring/recipes/motion/../creatures/field-hound/recipe.json'.replace('motion/../','');
test('the hound compiles through the vendored anyCreature engine into a distinct-skeleton, game-unit GLB with idle/move/attack',async()=>{
 const a=await mkdtemp(join(tmpdir(),'pw-ac-a-')),b=await mkdtemp(join(tmpdir(),'pw-ac-b-'));
 try{
  const first=await buildRecipe(RECIPE,{root:a,force:true}),second=await buildRecipe(RECIPE,{root:b,force:true});
  assert.equal(first.manifest.packageHash,second.manifest.packageHash,'two clean builds agree byte for byte');
  assert.equal((await checkPackage(first.dir)).ok,true);
  const bytes=await readFile(join(first.dir,'model.glb'));
  assert.equal((await structuralReport(bytes)).errors.length,0,'Khronos validator');
  const glb=await measureGlb(bytes);
  assert.ok(glb.skins>=1&&glb.bones>=15,'skinned with its own skeleton');
  assert.equal(first.manifest.rig.skeleton,'anycreature@1');assert.notEqual(first.manifest.rig.skeleton,'pw-pose-bridge@1');
  assert.deepEqual(first.manifest.clips.map(c=>c.id),['idle','move','attack']);
  assert.ok(glb.animations.includes('idle')&&glb.animations.includes('move')&&glb.animations.includes('attack'));
  // Rescaled to game units: a 0.94 m hound stands about 4.9 u tall.
  const b0=first.manifest.bounds;assert.ok(b0.max[1]-b0.min[1]>3&&b0.max[1]-b0.min[1]<8,`height in game units ${b0.max[1]-b0.min[1]}`);
  assert.ok(first.manifest.budgets.measured.triangles<=first.manifest.budgets.limits.triangles);
  const doc=await readGlb(bytes);assert.ok(doc.getRoot().listNodes().some(n=>n.getName()==='game-units'));
  assert.equal(first.manifest.structural.compiler.revision,'44e1abc2c7fe083f19f989c8437c44a141adc7f3');
 }finally{await rm(a,{recursive:true,force:true});await rm(b,{recursive:true,force:true});}
});
test("the compiler's own gates are real: a recoloured copy of its example is refused, so is a spec that lacks animations",async()=>{
 const {ADAPTERS}=await import('../adapters/index.js');
 const dir=await mkdtemp(join(tmpdir(),'pw-ac-copy-'));
 try{
  const wolf=JSON.parse(await readFile(resolve(AUTHORING_ROOT,'vendor/anycreature/example/wolf.json'),'utf8'));
  wolf.palette.fur_body.color='#224466';
  const spec=Buffer.from(JSON.stringify(wolf));await writeFile(join(dir,'creature.json'),spec);
  const vendor=await readFile(resolve(AUTHORING_ROOT,'vendor/anycreature/VENDOR.json'));
  const sources=[{path:'authoring/recipes/creatures/field-hound/creature.json',abs:join(dir,'creature.json'),sha256:sha256(spec),bytes:spec},{path:'authoring/vendor/anycreature/VENDOR.json',abs:resolve(AUTHORING_ROOT,'vendor/anycreature/VENDOR.json'),sha256:sha256(vendor),bytes:vendor}];
  const recipe={id:'creature.copy',kind:'creature',spec:'creature.json',clips:[{id:'idle',anim:'idle'},{id:'move',anim:'move'},{id:'attack',anim:'attack'}]};
  await assert.rejects(ADAPTERS.anycreature.build({recipe,recipeDir:dir,sources,log:()=>{}}),/example_copy/);
  const bare=Buffer.from(JSON.stringify({height:1,joints:{},chains:{},volumes:[]}));await writeFile(join(dir,'creature.json'),bare);
  await assert.rejects(ADAPTERS.anycreature.build({recipe,recipeDir:dir,sources:[{...sources[0],sha256:sha256(bare),bytes:bare},sources[1]],log:()=>{}}),/lacks "animations"/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
