import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {fitRockGeometry,replaceRockSkins} from '../src/engine/frontline-terrain.js';

test('every fitted scan has actual vertex contact with the native hillside, not merely a center-height anchor',async t=>{
 const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
 Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
 const stage=new PowerWorldStage({world,scene,entities:[]}),previous={document:globalThis.document,self:globalThis.self,createImageBitmap:globalThis.createImageBitmap,Image:globalThis.Image};
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
 globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
 globalThis.Image=class{height=1;set src(value){queueMicrotask(()=>this.onload?.());}};
 const material=new THREE.MeshStandardMaterial();let asset;
 try{
  stage.open();const file=readFileSync('public/models/frontline/boulder-04.glb');asset=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');asset.scene.updateMatrixWorld(true);
  let source;asset.scene.traverse(o=>{if(o.isMesh&&!source)source=o;});assert.ok(source);
  const transformed=source.geometry.clone().applyMatrix4(source.matrixWorld);
  const covers=stage._cover.filter(c=>c.mesh.userData.frontlineBoulder&&c.mesh.userData.frontlineTalus===undefined);assert.equal(covers.length,10);
  replaceRockSkins(stage,covers.map(c=>c.mesh),transformed,material,fitRockGeometry);transformed.dispose();
  const report=[];
  for(const c of covers){
   c.mesh.updateWorldMatrix(true,false);const a=c.mesh.geometry.attributes.position,p=new THREE.Vector3();let min=Infinity;
   for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(c.mesh.matrixWorld);min=Math.min(min,p.y-world.heightAt(p.x,p.z));}
   report.push({x:c.x,z:c.z,minimumFootClearance:min});
  }
  t.diagnostic(JSON.stringify(report));
  assert.ok(report.every(r=>r.minimumFootClearance<=.1),'A complete scanned boulder is hovering above its actual supporting ground');
 }finally{
  stage.close();material.dispose();asset?.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
  for(const [k,v]of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;
 }
});
