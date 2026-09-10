// Throwaway constant-radius clearance hypothesis. No runtime import.
import * as T from 'three';
import {World} from '../src/engine/world.js';
import {resolveGroundCamera,traceCameraGround} from '../src/engine/camera-ground.js';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';
globalThis.innerWidth=1280;globalThis.innerHeight=800;
for(const yaw of [-30,0,30])for(const pitch of [45,60,79,89]){
 const x=spineCombatFixture({source:'eye',motion:'jog'}),{f}=x,c=new T.PerspectiveCamera(73.74,1.6,.6,4200),w=Object.create(World.prototype);
 const pad=1.4035490833866233,py=pitch*Math.PI/180,ya=yaw*Math.PI/180,forward=new T.Vector3(Math.sin(ya)*Math.cos(py),Math.sin(py),Math.cos(ya)*Math.cos(py)),up=new T.Vector3(-Math.sin(ya)*Math.sin(py),Math.cos(py),-Math.cos(ya)*Math.sin(py));
 Object.assign(w,{camera:c,_lookYaw:ya,cover:[],interiors:[]});
 const cover=[{x:-10.87012740102363,z:-1.62572936057744,hx:8.670127401023638,hz:8.670127401023638,top:14.672523294040003}],row={blocked:0,lost:0,coverCrossed:0,minY:Infinity,maxY:-Infinity,eye:[]};
 try{
  f.vel.set(-32,0,0);x.aim(yaw,Math.tan(py)*100);for(let i=0;i<60;i++)x.step();x.start('lmb');
  for(let i=0;i<120;i++){
   x.step();if(i<30)continue;
   const a=new T.Vector3(0,5.4,0),raw=a.clone().addScaledVector(forward,-25.5).addScaledVector(up,9);
   w.cover=[];resolveGroundCamera(w,f,a,raw,pad);w.cover=cover;
   const eye=raw.clone(),r=Math.hypot(raw.x,raw.z),theta=Math.atan2(raw.x,raw.z);
   const clear=angle=>{eye.set(Math.sin(theta-angle)*r,raw.y,Math.cos(theta-angle)*r);return w._camNearestT(...a.toArray(),...eye.toArray(),pad)>=1&&traceCameraGround(w,a,eye,pad)>=1;};
   if(!clear(0))for(let angle=Math.PI/24;angle<=Math.PI;angle+=Math.PI/24)if(clear(angle)){
    let low=angle-Math.PI/24,hi=angle;
    for(let j=0;j<18;j++){const m=(low+hi)/2;if(clear(m))hi=m;else low=m;}clear(hi+1e-6);break;
   }
   c.position.copy(eye);c.lookAt(eye.clone().add(forward));c.updateMatrixWorld(true);
   if(w._camNearestT(...a.toArray(),...eye.toArray(),pad)<1-1e-5)row.coverCrossed++;
   const hits=new T.Raycaster(eye,forward,.6,30).intersectObject(f.parts.body,true).filter(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return[].concat(h.object.material).some(m=>!m.transparent);});
   if(hits.length)row.blocked++;
   const h=f.parts.head.getWorldPosition(new T.Vector3()).project(c);
   if(Math.abs(h.x)>=1||Math.abs(h.y)>=1||h.z>=1)row.lost++;
   row.minY=Math.min(row.minY,h.y);row.maxY=Math.max(row.maxY,h.y);row.eye=eye.toArray();
  }
  console.log(JSON.stringify({yaw,pitch,...row}));
 }finally{x.close();}
}
