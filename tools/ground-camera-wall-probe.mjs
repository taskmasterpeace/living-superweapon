// Diagnostic alternatives only. Does not author a profile or modify the game.
import * as T from 'three';
import {World} from '../src/engine/world.js';
import {traceCameraGround} from '../src/engine/camera-ground.js';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';
globalThis.innerWidth=1280;globalThis.innerHeight=800;
for(const pitch of [45,60,79]){
 const x=spineCombatFixture({source:'eye',motion:'jog'}),{f}=x,c=new T.PerspectiveCamera(73.74,1.6,.6,4200),w=Object.create(World.prototype);
 const wall={x:-10.87012740102363,z:-1.62572936057744,hx:8.670127401023638,hz:8.670127401023638,top:14.672523294040003},pad=1.4035490833866233;
 Object.assign(w,{camera:c,camChase:c,camMode:'chase',camPos:new T.Vector3(),camTarget:new T.Vector3(),camBasis:new T.Vector3(),sun:new T.DirectionalLight(),sunOff:new T.Vector3(40,60,20),cover:[wall],interiors:[],_lookActive:true,_lookYaw:0,_lookPitch:pitch*Math.PI/180,_shake:0,_shakeT:0});
 const rows=[0,.25,.5,.75,1].map(k=>({k,blocked:0,lostHead:0,minY:Infinity,maxY:-Infinity}));
 try{
  f.vel.set(-32,0,0);x.aim(0,Math.tan(pitch*Math.PI/180)*100);for(let i=0;i<60;i++)x.step();x.start('lmb');
  for(let i=0;i<120;i++){
   x.step();w.chase(f,null,1/60);c.updateMatrixWorld(true);const base=c.position.clone(),direction=c.getWorldDirection(new T.Vector3()),up=new T.Vector3(0,1,0).applyQuaternion(c.quaternion);
   w.cover=[];w.chase(f,null,1/60);const lost=Math.abs(c.position.x-base.x);w.cover=[wall];
   const anchor=new T.Vector3(0,5.4,0);
   for(const row of rows){
    c.position.copy(base).addScaledVector(up,lost*row.k);
    const t=Math.min(traceCameraGround(w,anchor,c.position,pad),w._camNearestT(...anchor.toArray(),...c.position.toArray(),pad));c.position.lerp(anchor,1-t);
    c.lookAt(c.position.clone().add(direction));c.updateMatrixWorld(true);
    if(i<30)continue;
    const hits=new T.Raycaster(c.position,direction,c.near,30).intersectObject(f.parts.body,true).filter(h=>{
     for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return [].concat(h.object.material).some(m=>!m.transparent);
    });
    if(hits.length)row.blocked++;
    const head=f.parts.head.getWorldPosition(new T.Vector3()).project(c);row.minY=Math.min(row.minY,head.y);row.maxY=Math.max(row.maxY,head.y);
    if(Math.abs(head.x)>=1||Math.abs(head.y)>=1||head.z>=1)row.lostHead++;
   }
  }
  console.log(JSON.stringify({pitch,rows}));
 }finally{x.close();}
}
