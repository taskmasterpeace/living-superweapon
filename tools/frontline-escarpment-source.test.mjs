import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as THREE from 'three';
import {FRONTLINE_FORMATIONS} from '../src/engine/frontline-layout.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {fitRockGeometry,constrainRockToCover} from '../src/engine/frontline-terrain.js';

const path='assets-src/frontline-escarpment-study/layout.json';
const study=existsSync(path)?JSON.parse(readFileSync(path)):null;
const camera=new THREE.PerspectiveCamera(68,1671/941,.1,10000);
camera.position.set(-83.2903,159.1279,-20.99856);
camera.lookAt(camera.position.clone().add(new THREE.Vector3(0,Math.sin(-.156),Math.cos(-.156))));camera.updateMatrixWorld(true);
const projected=f=>new THREE.Vector3(f.x,f.height,f.z).project(camera);

test('recomposed forward wall reveals the middle valley instead of overlapping three high crowns',()=>{
 const formations=study?.formations??FRONTLINE_FORMATIONS;
 const tops=[1,2,3].map(i=>projected(formations[i]));
 // Three currently overlapping crowns all occupy the upper-right sky at y<200px.
 // At least two must drop below 280px, opening the target's intermediate valley.
 assert.ok(tops.filter(p=>(1-p.y)*470.5>280).length>=2,'forward wall still occupies the high sky');
 assert.equal(formations.length,15);
 for(const f of formations){
  const hx=(Math.abs(Math.cos(f.yaw))*f.width+Math.abs(Math.sin(f.yaw))*f.depth)*.5;
  const hz=(Math.abs(Math.sin(f.yaw))*f.width+Math.abs(Math.cos(f.yaw))*f.depth)*.5;
  assert.ok(Math.hypot(Math.max(0,Math.abs(f.x)-hx),Math.max(0,Math.abs(f.z)-hz))>130,'formation fills clear start pad');
  assert.ok(!(f.x+hx>-290&&f.x-hx<-170&&f.z+hz>180&&f.z-hz<500),'formation fills reserved convoy corridor');
 }
});

test('authored profile source has four closed landable forms and bounded near/far meshes',()=>{
 const file='assets-src/frontline-escarpment-study/mesh-validation.json';
 assert.ok(existsSync(file),'source sculpt has not been generated');
 const report=JSON.parse(readFileSync(file));
 assert.equal(report.meshes.length,8);
 for(const m of report.meshes){
  assert.equal(m.nonManifoldEdges,0,m.name);assert.ok(m.volume>0,m.name);
  assert.ok(m.triangles<=(m.name.endsWith('lod0')?12000:2400),m.name);
  assert.ok(m.crownMaxError<1e-5,`${m.name} landing crown deviates`);
  assert.ok(m.crownHits===9,`${m.name} crown has a hole`);
  assert.ok(m.bounds[0][2]>=-1e-6&&m.bounds[1][2]<=1.000001,m.name);
 }
});

test('source bed preserves pad, central passage, convoy route and native edge exactly',()=>{
 const file='assets-src/frontline-escarpment-study/native-bed.f32';
 assert.ok(existsSync(file),'source bed has not been generated');
 const baseline=readFileSync('assets-src/frontline-heightfield-candidate/native-after.f32');
 const candidate=readFileSync(file);assert.equal(candidate.length,257*257*4);
 let changed=0,maxSlope=0;
 for(let row=0;row<257;row++)for(let col=0;col<257;col++){
  const i=(row*257+col)*4,x=-1028+col*2056/256,z=-1028+row*2056/256;
  const a=baseline.readFloatLE(i),b=candidate.readFloatLE(i);assert.ok(Number.isFinite(b)&&b>=0&&b<175);
  if(Math.hypot(x,z)<=130||Math.abs(x)<=110||Math.max(Math.abs(x),Math.abs(z))>=980||x>=-300&&x<=-160&&z>=150&&z<=550)assert.equal(b,a,`protected bed ${x},${z}`);
  if(Math.abs(a-b)>2)changed++;
  if(col<256)maxSlope=Math.max(maxSlope,Math.abs(b-candidate.readFloatLE(i+4))/(2056/256));
  if(row<256)maxSlope=Math.max(maxSlope,Math.abs(b-candidate.readFloatLE(i+257*4))/(2056/256));
 }
 assert.ok(changed>5000,'bed was not structurally reauthored');
 assert.ok(maxSlope<1.5,`candidate must preserve native safe bank slope, got ${maxSlope}`);
});

test('actual exported candidate fits native rotated cover with a continuous central landing crown',async()=>{
 const file='assets-src/frontline-escarpment-study/tiered-escarpment-kit.glb';assert.ok(existsSync(file));
 const bytes=readFileSync(file),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const source=[],all=[];asset.scene.traverse(o=>{if(o.isMesh){all.push(o);if(o.name.endsWith('lod0'))source.push(o);}});assert.equal(source.length,4);assert.equal(all.length,8);
 for(const mesh of all){
  const a=mesh.geometry.attributes.position,indices=mesh.geometry.index.array,keys=Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)].map(x=>x.toFixed(5)).join(',')),edges=new Map();
  for(let i=0;i<indices.length;i+=3)for(const [x,y]of [[0,1],[1,2],[2,0]]){const first=keys[indices[i+x]],second=keys[indices[i+y]],key=first<second?first+'|'+second:second+'|'+first;edges.set(key,(edges.get(key)||0)+1);}
  assert.ok([...edges.values()].every(n=>n===2),`${mesh.name}: exported watertight two-face edges`);
 }
 for(const original of source)for(const yaw of [-.23,.03,.37]){
  const destination=new THREE.CylinderGeometry(.4,.5,175,8,1);destination.scale(220,1,195);
  const mesh=new THREE.Mesh(destination);mesh.position.set(-245,87.5,-35);mesh.rotation.y=yaw;mesh.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(mesh,true),cover={x:-245,z:-35,hx:(box.max.x-box.min.x)*.5,hz:(box.max.z-box.min.z)*.5,top:175};
  const geometry=original.geometry.clone();geometry.applyMatrix4(original.matrixWorld);
  mesh.geometry=fitRockGeometry(geometry,destination);constrainRockToCover(mesh,cover);mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const [x,z]of [[0,0],[5,0],[-5,0],[0,5],[0,-5]]){
   ray.ray.origin.set(cover.x+x,200,cover.z+z);const hit=ray.intersectObject(mesh)[0];assert.ok(hit,original.name);
   assert.ok(Math.abs(hit.point.y-175)<.0001,`${original.name}: native crown gap ${175-hit.point.y} at ${x},${z}`);
  }
  const fitted=new THREE.Box3().setFromObject(mesh,true);assert.ok(fitted.max.x<=cover.x+cover.hx+.0001&&fitted.min.x>=cover.x-cover.hx-.0001&&fitted.max.z<=cover.z+cover.hz+.0001&&fitted.min.z>=cover.z-cover.hz-.0001);
  destination.dispose();mesh.geometry.dispose();geometry.dispose();mesh.material.dispose();
 }
});
