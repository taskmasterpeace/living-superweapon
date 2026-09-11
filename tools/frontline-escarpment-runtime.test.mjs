import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleFrontlineNaturalRelief,sampleFrontlineRelief} from '../src/engine/frontline-ground.js';
import {FRONTLINE_FORMATIONS,FRONTLINE_FAR_BANDS} from '../src/engine/frontline-layout.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {World} from '../src/engine/world.js';
import {FRONTLINE_ASSETS,FRONTLINE_GROUND_RADIUS,fitRockGeometry,replaceRockSkins} from '../src/engine/frontline-terrain.js';
const bytes=readFileSync('assets-src/frontline-convoy-bank-study/native-bed.f32');
const bed=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4),n=257,A=1028,step=2*A/256;
const features=[{x:-245,z:40,rx:255,rz:225,height:10.5},{x:245,z:190,rx:255,rz:245,height:14.5}];
test('reviewed natural interior is authoritative Float32 height, independent of recomposed formation fans',()=>{
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)assert.equal(Math.fround(sampleFrontlineNaturalRelief(-A+c*step,-A+r*step,features)),bed[r*n+c],`source height ${r},${c}`);
});
test('off-grid authored bed uses native triangles and remains continuous at all exterior edges',()=>{
 for(const [c,r,u,v]of [[55,74,.2,.3],[60,90,.8,.7],[190,112,.1,.8]]){
  const i=r*n+c,a=bed[i],b=bed[i+1],d=bed[i+n],e=bed[i+n+1];
  const h=u+v<=1?a+(b-a)*u+(d-a)*v:e+(b-e)*(1-v)+(d-e)*(1-u);
  assert.ok(Math.abs(sampleFrontlineNaturalRelief(-A+(c+u)*step,-A+(r+v)*step,features)-h)<1e-6);
 }
 for(const side of [-1,1])for(const t of [-.93,-.51,0,.37,.89])for(const axis of [0,1]){
  for(const sample of [sampleFrontlineNaturalRelief,sampleFrontlineRelief]){
   const p=[t*A,t*A];p[axis]=side*A;const h=sample(...p,features);p[axis]+=side*.00001;
   assert.ok(Math.abs(sample(...p,features)-h)<.0001,'Natural or graded edge has a vertical crack');
  }
 }
});
test('live formations match the reviewed role/profile composition',()=>{
 assert.deepEqual(FRONTLINE_FORMATIONS,JSON.parse(readFileSync('assets-src/frontline-escarpment-study/layout.json')).formations);
});
test('shipped profiles fit all live crowns and far bands without missing names, bad heights or exposed floor edges',async()=>{
 const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
 Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
 const stage=new PowerWorldStage({world,scene,entities:[]}),prior=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
 let asset;const material=new THREE.MeshStandardMaterial();
 try{
  stage.open();const file=readFileSync('public/'+FRONTLINE_ASSETS.mesa.slice(2));
  asset=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');asset.scene.updateMatrixWorld(true);
  const sources=new Map();asset.scene.traverse(o=>{if(o.isMesh)sources.set(o.name,o);});assert.equal(sources.size,8);
  const targets=stage.group.children.filter(o=>o.userData.frontlineFormation);assert.equal(targets.length,15);
  replaceRockSkins(stage,targets,sources,material,(kit,destination,mesh)=>{
   const source=kit.get(`escarpment-${mesh.userData.frontlineProfile}-lod${mesh.userData.frontlineDistant?1:0}`);assert.ok(source,'Missing shipped profile');
   const transformed=source.geometry.clone().applyMatrix4(source.matrixWorld);try{return fitRockGeometry(transformed,destination);}finally{transformed.dispose();}
  });
  for(const c of stage._cover.filter(c=>c.mesh.userData.frontlineFormation)){
   c.mesh.updateWorldMatrix(true,false);
   for(const [dx,dz]of [[0,0],[5,0],[-5,0],[0,5],[0,-5]]){
    const hit=new THREE.Raycaster(new THREE.Vector3(c.x+dx,c.top+20,c.z+dz),new THREE.Vector3(0,-1,0)).intersectObject(c.mesh)[0];
    assert.ok(hit&&Math.abs(hit.point.y-c.top)<1e-4,`Native crown mismatch ${c.x},${c.z} offset ${dx},${dz}`);
   }
  }
  // Dedicated background asset/profile behavior has its own runtime witness.
  const expected=FRONTLINE_FAR_BANDS;
  const far=stage.group.children.filter(o=>o.userData.frontlineDistant);assert.equal(far.length,18);
  for(let i=0;i<far.length;i++){
   const mesh=far[i],f=expected[i];assert.equal(mesh.position.x,f.x);assert.equal(mesh.position.z,f.z);assert.equal(mesh.userData.frontlineProfile,f.profile);
   assert.ok(Math.hypot(f.x,f.z)+Math.hypot(f.width,f.depth)*.5<FRONTLINE_GROUND_RADIUS,'Far band hangs beyond visible terrain');
  }
  const floor=stage.group.getObjectByName('frontline-distant-ground');assert.ok([...floor.geometry.attributes.position.array].every(Number.isFinite),'Nonfinite exterior seam');
 }finally{stage.close();material.dispose();asset?.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});
