import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitRockGeometry,FRONTLINE_GROUND_RADIUS} from '../src/engine/frontline-terrain.js';
import * as terrain from '../src/engine/frontline-terrain.js';
import {STAGE,PowerWorldStage} from '../src/engine/powerworld.js';
import {World} from '../src/engine/world.js';

test('scanned render skin preserves the exact local cover envelope without mutating its source',()=>{
 const source=new THREE.SphereGeometry(3,8,6),destination=new THREE.CylinderGeometry(10,15,90,6),before=source.attributes.position.array.slice();
 const fitted=fitRockGeometry(source,destination);
 try{for(const edge of ['min','max'])assert.ok(fitted.boundingBox[edge].distanceTo(destination.boundingBox[edge])<1e-5);assert.deepEqual(source.attributes.position.array,before);}
 finally{source.dispose();destination.dispose();fitted.dispose();}
});

test('yaw-only envelope fitting preserves the native landing crown while tilted rocks stay contained',()=>{
 const material=new THREE.MeshBasicMaterial(),cover={x:0,z:0,hx:6,hz:6,top:100};
 for(const tilted of [false,true]){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(10,100,10),material);mesh.position.y=50;mesh.rotation.set(tilted?.3:0,Math.PI/4,tilted?.1:0);
  terrain.constrainRockToCover(mesh,cover);mesh.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(mesh);
  assert.ok(bounds.min.x>=-6.00001&&bounds.max.x<=6.00001&&bounds.min.z>=-6.00001&&bounds.max.z<=6.00001&&bounds.max.y<=100.00001);
  if(!tilted){
   const hit=new THREE.Raycaster(new THREE.Vector3(0,120,0),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0];
   assert.ok(Math.abs(hit.point.y-100)<.00001,'Horizontal fit must not lower the already-correct landing crown');
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});

test('skin replacement prepares atomically and retains shared old geometry for one stage disposal',()=>{
 const previous=new THREE.BoxGeometry(),source=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();
 const a=new THREE.Mesh(previous,material),b=new THREE.Mesh(previous,material),stage={_cover:[],_geos:[],g:{world:{}}};
 let calls=0,disposed=0;const prepared=new THREE.BoxGeometry();prepared.addEventListener('dispose',()=>disposed++);
 assert.throws(()=>terrain.replaceRockSkins(stage,[a,b],source,material,()=>{if(++calls===2)throw Error('fixture failure');return prepared;}),/fixture failure/);
 assert.equal(disposed,1);assert.equal(a.geometry,previous);assert.equal(b.geometry,previous);
 let oldDisposals=0;previous.addEventListener('dispose',()=>oldDisposals++);
 assert.equal(terrain.replaceRockSkins(stage,[a,b],source,material,fitRockGeometry),2);
 assert.equal(oldDisposals,0);assert.equal(stage._geos.filter(g=>g===previous).length,1);
 for(const g of new Set([...stage._geos,a.geometry,b.geometry,source]))g.dispose();material.dispose();
 assert.equal(oldDisposals,1);
});
test('native cover cutaway fades multi-material scanned rocks and restores all originals',()=>{
 const materials=[new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()],mesh=new THREE.Mesh(new THREE.BoxGeometry(),materials);
 const cover={mesh,top:90},world={camera:{position:new THREE.Vector3()},cover:[cover],interiors:[],_segBox3:()=>true,_updateCanopyCut:()=>{}};
 World.prototype.updateOcclusion.call(world,{x:0,y:0,z:0},1);
 assert.notEqual(mesh.material,materials);assert.ok(mesh.material.every(m=>m.transparent&&m.opacity<1));
 const clones=mesh.material;let disposed=0;clones.forEach(m=>m.addEventListener('dispose',()=>disposed++));world._segBox3=()=>false;
 World.prototype.updateOcclusion.call(world,{x:0,y:0,z:0},2);
 assert.equal(mesh.material,materials);assert.equal(disposed,2);assert.equal(world._fades.size,0);
 mesh.geometry.dispose();materials.forEach(m=>m.dispose());
});

test('cliff formations use several scanned faces and remain inside their authored envelope',()=>{
 const source=new THREE.BoxGeometry(20,7,2),target=new THREE.BoxGeometry(100,160,110),before=source.attributes.position.array.slice();
 let formed;
 try{formed=terrain.buildCliffFormation(source,target);formed.computeBoundingBox();target.computeBoundingBox();
  for(const edge of ['min','max'])assert.ok(formed.boundingBox[edge].distanceTo(target.boundingBox[edge])<1e-4);
  assert.ok(formed.attributes.position.count>=source.attributes.position.count*5);assert.deepEqual(source.attributes.position.array,before);
 }finally{source.dispose();target.dispose();formed?.dispose();}
});
test('cliff tops use a separate closed scan and its own material group',()=>{
 const face=new THREE.BoxGeometry(20,7,2),cap=new THREE.SphereGeometry(4,12,8),target=new THREE.BoxGeometry(100,160,110);
 const formed=terrain.buildCliffFormation(face,target,cap);
 try{assert.ok(formed.groups.some(g=>g.materialIndex===1));assert.ok(formed.groups.some(g=>g.materialIndex===0));
  const mesh=new THREE.Mesh(formed,[new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()]);
  for(const x of [-25,0,25])for(const z of [-25,0,25]){
   const hits=new THREE.Raycaster(new THREE.Vector3(x,200,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh);
   assert.ok(hits.length);assert.equal(hits[0].face.materialIndex,1);
  }
  mesh.material.forEach(m=>m.dispose());
 }finally{face.dispose();cap.dispose();target.dispose();formed.dispose();}
});
test('the visual terrain reaches beyond every distant mesa without extending combat bounds',()=>{
 assert.ok(FRONTLINE_GROUND_RADIUS>STAGE.mesaR[1]+STAGE.mesaH[1]*1.3);assert.equal(STAGE.radius,900);
});

test('photographic sky shares the native altitude uniforms and restores the previous world on exit',()=>{
 const original=new THREE.ShaderMaterial({uniforms:{uSpace:{value:0}},vertexShader:'void main(){}',fragmentShader:'varying vec3 vP; void main(){vec3 c=vec3(0.0);gl_FragColor = vec4(c, 1.0);}'});
 const previousEnvironment=new THREE.Texture(),sky=new THREE.Mesh(new THREE.SphereGeometry(),original),texture=new THREE.Texture();
 const world={scene:new THREE.Scene(),skyMesh:sky};world.scene.environment=previousEnvironment;world.scene.environmentIntensity=.8;
 const stage={g:{world},_mats:[],_texs:[],_cloudMesh:{visible:true}};
 try{
  terrain.applyFrontlineSky(stage,texture);
  assert.notEqual(sky.material,original);assert.equal(sky.material.uniforms.uSpace,original.uniforms.uSpace);
  original.uniforms.uSpace.value=.7;assert.equal(sky.material.uniforms.uSpace.value,.7);
  assert.match(sky.material.fragmentShader,/uFrontlineSky/);assert.equal(world.scene.environment,texture);assert.equal(stage._cloudMesh.visible,false);
  terrain.restoreFrontlineSky(stage);assert.equal(sky.material,original);assert.equal(world.scene.environment,previousEnvironment);assert.equal(world.scene.environmentIntensity,.8);
  terrain.restoreFrontlineSky(stage);assert.equal(sky.material,original);
 }finally{original.dispose();sky.geometry.dispose();for(const m of stage._mats)m.dispose();texture.dispose();previousEnvironment.dispose();}
});

test('native stage lays ground beneath its distant mesas and restores postprocess settings on exit',()=>{
 const noop=()=>{},prior=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
 const scene=new THREE.Scene(),print={settings:{ink:.8,halftone:.5,grain:.3},apply(s){Object.assign(this.settings,s);}};
 const world={scene,cover:[],coverAll:[],interiors:[],ARENA:240,cars:[],planes:[],rocks:[],treeSpots:[],print,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop};
 const stage=new PowerWorldStage({world,scene,entities:[]});
 // The former full circle covered native crater depressions. Verify distant
 // support itself, without requiring that overlapping geometry to return.
 try{stage.open();const floor=stage.group.getObjectByName('frontline-distant-ground');stage.group.updateMatrixWorld(true);
  assert.ok(new THREE.Raycaster(new THREE.Vector3(FRONTLINE_GROUND_RADIUS-50,300,0),new THREE.Vector3(0,-1,0)).intersectObject(floor).length>0);assert.equal(print.settings.ink,0);
  for(const c of stage._cover.slice(0,STAGE.spires))assert.ok(Math.min(c.w,c.d)>=c.h*.55,'Pillars must read as formations, not stretched needles');
  stage.close();assert.equal(print.settings.ink,.8);}
 finally{stage.close();globalThis.document=prior;}
});
