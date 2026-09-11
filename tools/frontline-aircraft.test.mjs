import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FRONTLINE_FORMATIONS} from '../src/engine/frontline-layout.js';
const aircraft=await import('../src/engine/frontline-aircraft.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

test('frontline gunship uses the original attack asset and authored rotor cadence',async()=>{
 assert.match(aircraft.AIRCRAFT_ASSETS.helicopter,/attack-helicopter\.glb$/);
 const game={scene:new THREE.Scene(),time:0,running:true};
 const support=new aircraft.FrontlineAircraft(game,{loader:{loadAsync:async()=>({scene:new THREE.Group(),animations:[new THREE.AnimationClip('RotorLoop',2,[])]})}});
 await support.loading;
 try{assert.equal(support.actors.find(a=>a.kind==='helicopter').mixer.timeScale,1.5);}
 finally{support.dispose();}
});
test('air support has distinct continuous helicopter and jet motion with forward-facing headings',()=>{
 assert.equal(typeof aircraft.sampleAircraft,'function');
 const origin={x:-40,z:-40};
 for(const kind of ['helicopter','jet'])for(const time of [0,1,20,60,120]){
  const a=aircraft.sampleAircraft(kind,time,origin),b=aircraft.sampleAircraft(kind,time+.01,origin);
  const dx=(b.x-a.x)/.01,dz=(b.z-a.z)/.01,speed=Math.hypot(dx,dz),dot=(Math.sin(a.yaw)*dx+Math.cos(a.yaw)*dz)/speed;
  assert.ok(dot>.999); // Actual full-model/cliff clearance is checked below, not an obsolete height guess.
  if(kind==='jet')assert.ok(speed>300&&speed<600,'Jet must fly continuously at jet speed');
  else assert.ok(speed>10&&speed<50,'Helicopter patrol should be slower');
  for(const n of Object.values(a))assert.ok(Number.isFinite(n));
  assert.deepEqual(a,aircraft.sampleAircraft(kind,time,origin));
 }
});

async function gunship(t){
 // Only bitmap decoding is unavailable on CPU; real GLB geometry/pivots/clip are loaded.
 globalThis.self??=globalThis;globalThis.createImageBitmap??=async()=>({width:512,height:512,close(){}});
 globalThis.ProgressEvent??=class{constructor(type,data){this.type=type;Object.assign(this,data);}};
 const bytes=readFileSync('public/models/frontline/attack-helicopter.glb'),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
 t?.after(()=>aircraft.disposeAircraftAsset(asset.scene));asset.scene.updateMatrixWorld(true);return asset;
}
function nativeCliffs(){
 // Same measured eight-sided native volumes as PowerWorldStage.open/_reg.
 return FRONTLINE_FORMATIONS.map(f=>{const geo=new THREE.CylinderGeometry(.4,.5,f.height,8,1);geo.scale(f.width,1,f.depth);const mesh=new THREE.Mesh(geo);mesh.position.set(f.x,f.height/2,f.z);mesh.rotation.y=f.yaw;mesh.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(mesh,true);geo.dispose();mesh.material.dispose();return box;});
}
function fullRotorEnvelopes(model){
 const center=new THREE.Box3().setFromObject(model,true).getCenter(new THREE.Vector3()),parts=[{box:new THREE.Box3().setFromObject(model.getObjectByName('hull'),true)}];
 for(const [name,axis]of [['main_rotor','y'],['tail_rotor','x']]){
  const node=model.getObjectByName(name),pivot=node.getWorldPosition(new THREE.Vector3()),v=new THREE.Vector3();let radius=0,low=Infinity,high=-Infinity;
  node.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).sub(pivot);radius=Math.max(radius,Math.hypot(...['x','y','z'].filter(k=>k!==axis).map(k=>v[k])));low=Math.min(low,v[axis]);high=Math.max(high,v[axis]);}});
  const min=pivot.clone().addScalar(-radius),max=pivot.clone().addScalar(radius);min[axis]=pivot[axis]+low;max[axis]=pivot[axis]+high;
  parts.push({axis,radius:radius*5,box:new THREE.Box3(min,max)});
 }
 for(const part of parts){part.box.min.sub(center).multiplyScalar(5);part.box.max.sub(center).multiplyScalar(5);}return parts;
}
function posedEnvelopes(parts,pose){
 const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch,pose.yaw,pose.roll,'YXZ')),m=new THREE.Matrix4().compose(new THREE.Vector3(pose.x,pose.y,pose.z),q,new THREE.Vector3(1,1,1));
 return parts.map(p=>{
  if(!p.axis)return p.box.clone().applyMatrix4(m);
  // Analytic cylinder AABB includes every rotor phase without rotating a square
  // disk box (which would invent nonexistent diagonal blade reach).
  const center=p.box.getCenter(new THREE.Vector3()).applyMatrix4(m),half=p.box.getSize(new THREE.Vector3()).multiplyScalar(.5),axis=new THREE.Vector3(p.axis==='x'?1:0,p.axis==='y'?1:0,0).applyQuaternion(q),extent=new THREE.Vector3();
  for(const k of ['x','y','z'])extent[k]=p.radius*Math.sqrt(Math.max(0,1-axis[k]**2))+half[p.axis]*Math.abs(axis[k]);
  return new THREE.Box3(center.clone().sub(extent),center.clone().add(extent));
 });
}
test('full-size gunship and complete rotor sweeps clear every native formation across the patrol',async t=>{
 const asset=await gunship(t),parts=fullRotorEnvelopes(asset.scene),cliffs=nativeCliffs();let previous=null,minClearance=Infinity;
 for(let i=0;i<=3600;i++){
  const time=i/30,pose=aircraft.sampleAircraft('helicopter',time,{x:-40,z:-40}),boxes=posedEnvelopes(parts,pose);
  for(let j=0;j<boxes.length;j++){
   const sweep=boxes[j].clone();if(previous)sweep.union(previous[j]);sweep.expandByScalar(.25);
   for(const [k,cliff]of cliffs.entries()){
    const gap=Math.hypot(...['x','y','z'].map(axis=>Math.max(0,sweep.min[axis]-cliff.max[axis],cliff.min[axis]-sweep.max[axis])));
    assert.ok(gap>0,`gunship part${j} intersects cliff${k} at${time.toFixed(3)}s`);minClearance=Math.min(minClearance,gap);
   }
  }
  previous=boxes;
 }
 assert.ok(minClearance>10,`full-size patrol needs clearance margin, got${minClearance}`);
});

test('unscaled gunship makes a close upper-right pass in the reference flight camera',async t=>{
 const asset=await gunship(),game={scene:new THREE.Scene(),time:0,running:true};
 const support=new aircraft.FrontlineAircraft(game,{loader:{loadAsync:async url=>url===aircraft.AIRCRAFT_ASSETS.helicopter?asset:{scene:new THREE.Group(),animations:[]}}});
 await support.loading;t.after(()=>support.dispose());const actor=support.actors.find(a=>a.kind==='helicopter');assert.equal(actor.model.scale.x,5);
 support.time=5;support._pose(actor);actor.mixer.setTime(5);game.scene.updateMatrixWorld(true);
 // Fixed presentation fixture from the approved flight setup, independent of
 // later user camera motion: +Z look, pitch-.156, FOV68, native20u boom.
 const camera=new THREE.PerspectiveCamera(68,1671/941,.1,10000);camera.position.set(-76.52233,159.92835,-26.06882);camera.lookAt(camera.position.clone().add(new THREE.Vector3(0,Math.sin(-.156),Math.cos(-.156))));camera.updateMatrixWorld(true);
 const min=new THREE.Vector2(Infinity,Infinity),max=new THREE.Vector2(-Infinity,-Infinity),p=new THREE.Vector3();
 actor.model.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);const pixel=new THREE.Vector2((p.x+1)*835.5,(1-p.y)*470.5);min.min(pixel);max.max(pixel);}});
 const width=max.x-min.x,x=(min.x+max.x)/2,y=(min.y+max.y)/2;
 assert.ok(width>240&&width<310,`gunship should read near target280px without scaling; got${width}`);
 assert.ok(x>1150&&x<1400&&y>205&&y<270,`upper-right pass misplaced: ${x},${y}`);
});

test('departure clears native formations with full rotor envelopes at every sampled completion phase',async t=>{
 const asset=await gunship(t),parts=fullRotorEnvelopes(asset.scene),cliffs=nativeCliffs();
 const support=new aircraft.FrontlineAircraft({scene:new THREE.Scene(),running:true},{loader:{loadAsync:async()=>({scene:new THREE.Group(),animations:[]})}});
 await support.loading;t.after(()=>support.dispose());const actor=support.actors.find(a=>a.kind==='helicopter');let minimum=Infinity;
 for(let start=0;start<=120;start+=.5){
  support.departure={time:start,...aircraft.sampleAircraft('helicopter',start,support.origin)};let previous=null;
  for(let i=0;i<=1350;i++){
   support.time=start+i/30;support._pose(actor);const boxes=posedEnvelopes(parts,actor.frame);
   for(let j=0;j<boxes.length;j++){
    const sweep=boxes[j].clone();if(previous)sweep.union(previous[j]);sweep.expandByScalar(.25);
    for(const [k,cliff]of cliffs.entries()){
     const gap=Math.hypot(...['x','y','z'].map(axis=>Math.max(0,sweep.min[axis]-cliff.max[axis],cliff.min[axis]-sweep.max[axis])));
     assert.ok(gap>0,`departure ${start}s + ${i/30}s part${j} intersects cliff${k}`);minimum=Math.min(minimum,gap);
    }
   }
   previous=boxes;
  }
 }
 assert.ok(minimum>10,`departure clearance needs margin, got ${minimum}`);t.diagnostic(`Minimum full-envelope departure clearance: ${minimum}u`);
});

test('departure has continuous position and velocity through climb and exit transitions',async t=>{
 const support=new aircraft.FrontlineAircraft({scene:new THREE.Scene(),running:true},{loader:{loadAsync:async()=>({scene:new THREE.Group(),animations:[]})}});
 await support.loading;t.after(()=>support.dispose());const actor=support.actors.find(a=>a.kind==='helicopter'),h=.0001;
 for(const start of [0,10,35,60,95,120]){
  const departure={time:start,...aircraft.sampleAircraft('helicopter',start,support.origin)};
  const pose=elapsed=>{support.departure=elapsed<0?null:departure;support.time=start+elapsed;support._pose(actor);return {...actor.frame};};
  for(const join of [0,14,18]){
   const a=pose(join-h),b=pose(join),c=pose(join+h);
   for(const axis of ['x','y','z'])assert.ok(Math.abs((b[axis]-a[axis])/h-(c[axis]-b[axis])/h)<.01,`${axis} velocity snapped at ${start}+${join}s`);
   for(const axis of ['pitch','roll'])assert.ok(Math.abs(c[axis]-a[axis])<.001,`${axis} snapped`);
   assert.ok(Math.abs(Math.atan2(Math.sin(c.yaw-a.yaw),Math.cos(c.yaw-a.yaw)))<.001,'heading snapped');
  }
  const escaped=pose(45);assert.ok(escaped.y>350,'exit must remain above the tallest formation');
  assert.ok(Math.hypot(escaped.x-support.origin.x,escaped.z-support.origin.z)>1200,'departure must leave the valley');
 }
});
test('aircraft resource disposal releases shared asset geometry/material/textures once',()=>{
 assert.equal(typeof aircraft.disposeAircraftAsset,'function');
 const count={geometry:0,material:0,texture:0},texture={isTexture:true,dispose(){count.texture++;}},material={map:texture,normalMap:texture,dispose(){count.material++;}},geometry={dispose(){count.geometry++;}};
 aircraft.disposeAircraftAsset({traverse(fn){fn({geometry,material});fn({geometry,material:[material]});}});
 assert.deepEqual(count,{geometry:1,material:1,texture:1});
});

test('air support retires late assets, freezes while paused, and departs only once',async()=>{
 const game={scene:new THREE.Scene(),time:0,running:true,paused:false,ms:{frontline:{phase:'squad'}}},resolvers=[];
 const loader={loadAsync:()=>new Promise(resolve=>resolvers.push(resolve))},support=new aircraft.FrontlineAircraft(game,{loader});
 let disposed=0;
 const makeAsset=()=>{const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(10,4,20),new THREE.MeshStandardMaterial());mesh.geometry.addEventListener('dispose',()=>disposed++);scene.add(mesh);return {scene,animations:[]};};
 resolvers.forEach(r=>r(makeAsset()));await support.loading;assert.equal(support.actors.length,2);
 game.paused=true;support.update(.1);assert.equal(support.time,0);game.paused=false;
 support.update(-1);support.update(NaN);assert.equal(support.time,0);support.update(.1);assert.equal(support.time,.1);
 game.ms.frontline.phase='complete';support.update(.1);const departure=support.departure;assert.ok(departure);
 support.update(.1);assert.equal(support.departure,departure);
 support.dispose();support.dispose();assert.equal(disposed,2);assert.equal(game.scene.children.length,0);
 const late=new aircraft.FrontlineAircraft(game,{loader});late.dispose();resolvers.slice(2).forEach(r=>r(makeAsset()));await late.loading;
 assert.equal(late.ready,false);assert.equal(late.actors.length,0);assert.equal(disposed,4);assert.equal(game.scene.children.length,0);
});
