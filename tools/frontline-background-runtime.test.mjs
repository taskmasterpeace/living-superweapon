import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FRONTLINE_FAR_BANDS,FRONTLINE_FORMATIONS} from '../src/engine/frontline-layout.js';
import * as terrain from '../src/engine/frontline-terrain.js';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {sampleFrontlineNaturalRelief} from '../src/engine/frontline-ground.js';
import {gradeOutpostHeight} from '../src/engine/frontline-outpost-layout.js';
test('background runtime adopts only the reviewed far layout, retaining accepted near formations',()=>{
 assert.deepEqual(FRONTLINE_FAR_BANDS,JSON.parse(readFileSync('assets-src/frontline-background-study/layout.json')).far);
 assert.deepEqual(FRONTLINE_FORMATIONS,JSON.parse(readFileSync('assets-src/frontline-escarpment-study/layout.json')).formations);
});
test('production background profile adapter preserves graded ground, accepted exterior and appended flight rings',async()=>{
 assert.equal(typeof terrain.fitFrontlineFormation,'function','Missing independent background profile adapter');
 const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
 Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
 const stage=new PowerWorldStage({world,scene,entities:[]}),prior=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
 let asset;const material=new THREE.MeshStandardMaterial();
 try{
  stage.open();const file=readFileSync('public/'+terrain.FRONTLINE_ASSETS.background.slice(2));asset=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');asset.scene.updateMatrixWorld(true);
  const sources=new Map();asset.scene.traverse(o=>{if(o.isMesh)sources.set(o.name,o);});const targets=stage.group.children.filter(o=>o.userData.frontlineDistant);assert.equal(targets.length,18);
  const floor=stage.group.getObjectByName('frontline-distant-ground'),beforeExterior=floor.geometry.attributes.position.array.slice(),beforeBed=world._ghBase.slice();
  terrain.replaceRockSkins(stage,targets,sources,material,(kit,destination,mesh)=>terrain.fitFrontlineFormation(kit,destination,mesh,true));
  const variants=new Set();for(const m of targets){assert.equal(m.geometry.userData.frontlineMesa.background,true);variants.add(m.geometry.userData.frontlineMesa.variant);}assert.equal(variants.size,3);
  const baseline=JSON.parse(readFileSync('assets-src/frontline-background-study/current-far-floor.json'));
  const positions=floor.geometry.attributes.position.array;
  assert.deepEqual(positions,beforeExterior,'Changing backdrop moved exterior or flight ground');
  assert.deepEqual(world._ghBase,beforeBed,'Changing backdrop moved the graded physical bed');
  assert.deepEqual([...positions.slice(0,baseline.position.length)],baseline.position,'Flight extension resampled the accepted exterior');
  assert.deepEqual([...floor.geometry.index.array.slice(0,baseline.index.length)],baseline.index,'Flight extension changed accepted exterior triangles');
  const {spokes}=floor.geometry.userData.ringGrid,oldCount=baseline.position.length/3,extraCount=positions.length/3-oldCount;
  assert.ok(extraCount>0&&extraCount<oldCount/4,'Flight space must append coarse rings beyond the accepted apron');
  assert.equal(extraCount%spokes,0,'Flight extension must append complete rings');
  const p=floor.geometry.attributes.position,uv=floor.geometry.attributes.uv;
  for(let i=oldCount;i<p.count;i++){
   assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
   const radius=Math.hypot(p.getX(i),p.getY(i));assert.ok(radius>terrain.FRONTLINE_GROUND_RADIUS&&radius<=50000.003);
   assert.ok(Math.abs(uv.getX(i)-(.5+p.getX(i)/(2*terrain.FRONTLINE_GROUND_RADIUS)))<1e-6);
   assert.ok(Math.abs(uv.getY(i)-(.5+p.getY(i)/(2*terrain.FRONTLINE_GROUND_RADIUS)))<1e-6);
  }
  for(let i=p.count-spokes;i<p.count;i++)assert.ok(Math.abs(Math.hypot(p.getX(i),p.getY(i))-50000)<.003,'Flight ground must reach its full 50,000u radius');
  const join=oldCount-spokes;
  assert.deepEqual([...floor.geometry.index.array.slice(baseline.index.length,baseline.index.length+6)],[join,join+spokes+1,join+1,join,join+spokes,join+spokes+1],'First flight ring must join the last accepted ring');
  const raw=readFileSync('assets-src/frontline-convoy-bank-study/native-bed.f32'),bed=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
  let graded=0,unchanged=0;
  for(let i=0;i<bed.length;i++){
   const x=world._gvx[i],z=world._gvz[i];
   assert.equal(Math.fround(sampleFrontlineNaturalRelief(x,z,stage.frontlineRelief)),bed[i],`Natural bed source changed at ${i}`);
   const expected=Math.fround(gradeOutpostHeight(x,z,bed[i]));assert.equal(world._ghBase[i],expected,`Outpost grading differs at ${i}`);
   if(expected===bed[i])unchanged++;else graded++;
  }
  assert.ok(graded>0&&unchanged>bed.length*.9,'Grading must make a bounded real cut while preserving most of the canyon');
 }finally{stage.close();material.dispose();asset?.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});
