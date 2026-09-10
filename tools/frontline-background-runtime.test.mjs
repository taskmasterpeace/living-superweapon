import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FRONTLINE_FAR_BANDS,FRONTLINE_FORMATIONS} from '../src/engine/frontline-layout.js';
import * as terrain from '../src/engine/frontline-terrain.js';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
test('background runtime adopts only the reviewed far layout, retaining accepted near formations',()=>{
 assert.deepEqual(FRONTLINE_FAR_BANDS,JSON.parse(readFileSync('assets-src/frontline-background-study/layout.json')).far);
 assert.deepEqual(FRONTLINE_FORMATIONS,JSON.parse(readFileSync('assets-src/frontline-escarpment-study/layout.json')).formations);
});
test('production background profile adapter uses all three shipped ridge forms without modifying the accepted bed or exterior',async()=>{
 assert.equal(typeof terrain.fitFrontlineFormation,'function','Missing independent background profile adapter');
 const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
 Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
 const stage=new PowerWorldStage({world,scene,entities:[]}),prior=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
 let asset;const material=new THREE.MeshStandardMaterial();
 try{
  stage.open();const file=readFileSync('public/'+terrain.FRONTLINE_ASSETS.background.slice(2));asset=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');asset.scene.updateMatrixWorld(true);
  const sources=new Map();asset.scene.traverse(o=>{if(o.isMesh)sources.set(o.name,o);});const targets=stage.group.children.filter(o=>o.userData.frontlineDistant);assert.equal(targets.length,18);
  terrain.replaceRockSkins(stage,targets,sources,material,(kit,destination,mesh)=>terrain.fitFrontlineFormation(kit,destination,mesh,true));
  const variants=new Set();for(const m of targets){assert.equal(m.geometry.userData.frontlineMesa.background,true);variants.add(m.geometry.userData.frontlineMesa.variant);}assert.equal(variants.size,3);
  const baseline=JSON.parse(readFileSync('assets-src/frontline-background-study/current-far-floor.json'));
  assert.deepEqual([...stage.group.getObjectByName('frontline-distant-ground').geometry.attributes.position.array],baseline.position,'Changing backdrop moved accepted exterior ground');
  const raw=readFileSync('assets-src/frontline-convoy-bank-study/native-bed.f32'),bed=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);assert.deepEqual(world._ghBase,bed,'Background changed reviewed native physical bed');
 }finally{stage.close();material.dispose();asset?.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});
