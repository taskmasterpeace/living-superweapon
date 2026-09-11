// Source candidate clearance check. It reads the actual gunship GLB and native
// patrol/departure functions; it never replaces the production formation list.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {sampleAircraft,FrontlineAircraft,disposeAircraftAsset} from '../src/engine/frontline-aircraft.js';
const layout=JSON.parse(readFileSync('assets-src/frontline-escarpment-study/layout.json'));
const cliffs=layout.formations.map(f=>{
 const geometry=new THREE.CylinderGeometry(.4,.5,f.height,8,1);geometry.scale(f.width,1,f.depth);
 const mesh=new THREE.Mesh(geometry);mesh.position.set(f.x,f.height/2,f.z);mesh.rotation.y=f.yaw;mesh.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(mesh,true);geometry.dispose();mesh.material.dispose();return box;
});
// Optional source-only background study: conservative full rectangular bounds,
// not the narrower cylinder proxy used for landable gameplay formations.
if(process.env.FRONTLINE_BACKGROUND_STUDY){
 for(const f of JSON.parse(readFileSync(process.env.FRONTLINE_BACKGROUND_STUDY)).far){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(f.width,f.height,f.depth));mesh.position.set(f.x,f.height*.5,f.z);mesh.rotation.y=f.yaw;mesh.updateMatrixWorld(true);
  cliffs.push(new THREE.Box3().setFromObject(mesh,true));mesh.geometry.dispose();mesh.material.dispose();
 }
}
globalThis.self??=globalThis;globalThis.createImageBitmap??=async()=>({width:512,height:512,close(){}});
globalThis.ProgressEvent??=class{constructor(type,data){this.type=type;Object.assign(this,data);}};
const bytes=readFileSync('public/models/frontline/attack-helicopter.glb');
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');asset.scene.updateMatrixWorld(true);
const center=new THREE.Box3().setFromObject(asset.scene,true).getCenter(new THREE.Vector3());
const parts=[{box:new THREE.Box3().setFromObject(asset.scene.getObjectByName('hull'),true)}];
for(const [name,axis]of [['main_rotor','y'],['tail_rotor','x']]){
 const rotor=asset.scene.getObjectByName(name),pivot=rotor.getWorldPosition(new THREE.Vector3()),p=new THREE.Vector3();let radius=0,low=Infinity,high=-Infinity;
 rotor.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;
  for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).sub(pivot);radius=Math.max(radius,Math.hypot(...['x','y','z'].filter(k=>k!==axis).map(k=>p[k])));low=Math.min(low,p[axis]);high=Math.max(high,p[axis]);}
 });
 const min=pivot.clone().addScalar(-radius),max=pivot.clone().addScalar(radius);min[axis]=pivot[axis]+low;max[axis]=pivot[axis]+high;
 parts.push({axis,radius:radius*5,box:new THREE.Box3(min,max)});
}
for(const p of parts){p.box.min.sub(center).multiplyScalar(5);p.box.max.sub(center).multiplyScalar(5);}
function boxes(pose){
 const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch,pose.yaw,pose.roll,'YXZ'));
 const m=new THREE.Matrix4().compose(new THREE.Vector3(pose.x,pose.y,pose.z),q,new THREE.Vector3(1,1,1));
 return parts.map(p=>{
  if(!p.axis)return p.box.clone().applyMatrix4(m);
  const c=p.box.getCenter(new THREE.Vector3()).applyMatrix4(m),h=p.box.getSize(new THREE.Vector3()).multiplyScalar(.5),axis=new THREE.Vector3(p.axis==='x'?1:0,p.axis==='y'?1:0,0).applyQuaternion(q),extent=new THREE.Vector3();
  for(const k of ['x','y','z'])extent[k]=p.radius*Math.sqrt(Math.max(0,1-axis[k]**2))+h[p.axis]*Math.abs(axis[k]);
  return new THREE.Box3(c.clone().sub(extent),c.clone().add(extent));
 });
}
function check(current,previous,label){
 let min=Infinity;
 for(let j=0;j<current.length;j++){
  const sweep=current[j].clone();if(previous)sweep.union(previous[j]);sweep.expandByScalar(.25);
  for(const [i,c]of cliffs.entries()){
   const gap=Math.hypot(...['x','y','z'].map(k=>Math.max(0,sweep.min[k]-c.max[k],c.min[k]-sweep.max[k])));
   assert.ok(gap>0,`${label}: part ${j} intersects candidate formation ${i}`);min=Math.min(min,gap);
  }
 }
 return min;
}
test('candidate terrain preserves full gunship rotor envelope clearance throughout native patrol and departure',async t=>{
 const support=new FrontlineAircraft({scene:new THREE.Scene(),running:true},{loader:{loadAsync:async()=>({scene:new THREE.Group(),animations:[]})}});
 await support.loading;t.after(()=>{support.dispose();disposeAircraftAsset(asset.scene);});
 let previous=null,min=Infinity;
 for(let i=0;i<=3600;i++){const current=boxes(sampleAircraft('helicopter',i/30,{x:-40,z:-40}));min=Math.min(min,check(current,previous,`patrol ${i/30}`));previous=current;}
 const actor=support.actors.find(a=>a.kind==='helicopter');
 for(let start=0;start<=120;start+=.5){
  support.departure={time:start,...sampleAircraft('helicopter',start,support.origin)};previous=null;
  for(let i=0;i<=1350;i++){
   support.time=start+i/30;support._pose(actor);const current=boxes(actor.frame);
   min=Math.min(min,check(current,previous,`departure ${start}+${i/30}`));previous=current;
  }
 }
 assert.ok(min>10,`candidate needs >10u full-envelope clearance, got ${min}`);t.diagnostic(`Candidate full-envelope minimum ${min}u`);
});
