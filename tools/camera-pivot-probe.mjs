// Throwaway pivot hypothesis, not a production camera override.
import * as T from 'three';
import {World} from '../src/engine/world.js';
import {resolveGroundCamera} from '../src/engine/camera-ground.js';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';
globalThis.innerWidth=1280;globalThis.innerHeight=800;
for(const yaw of [-30,0,30])for(const pitch of [45,60,79]){
 const x=spineCombatFixture({source:'eye',motion:'jog'}),{f}=x,c=new T.PerspectiveCamera(73.74,1.6,.6,4200),w=Object.create(World.prototype);
 const pad=1.4035490833866233,py=pitch*Math.PI/180,ya=yaw*Math.PI/180,forward=new T.Vector3(Math.sin(ya)*Math.cos(py),Math.sin(py),Math.cos(ya)*Math.cos(py)),up=new T.Vector3(-Math.sin(ya)*Math.sin(py),Math.cos(py),-Math.cos(ya)*Math.sin(py));
 Object.assign(w,{camera:c,_lookYaw:ya,cover:[{x:-10.87012740102363,z:-1.62572936057744,hx:8.670127401023638,hz:8.670127401023638,top:14.672523294040003}],interiors:[]});
 const rows=[5.4,8,10,12,14].map(height=>({height,blocked:0,lost:0,minY:Infinity,maxY:-Infinity,head:[],eye:[]}));
 try{
  f.vel.set(-32,0,0);x.aim(yaw,Math.tan(py)*100);for(let i=0;i<60;i++)x.step();x.start('lmb');
  for(let i=0;i<120;i++){
   x.step();if(i<30)continue;
   for(const row of rows){
    const a=new T.Vector3(0,row.height,0),eye=new T.Vector3(0,5.4,0).addScaledVector(forward,-25.5).addScaledVector(up,9);
    resolveGroundCamera(w,f,a,eye,pad);c.position.copy(eye);c.lookAt(eye.clone().add(forward));c.updateMatrixWorld(true);
    const hits=new T.Raycaster(eye,forward,.6,30).intersectObject(f.parts.body,true).filter(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return[].concat(h.object.material).some(m=>!m.transparent);});
    if(hits.length)row.blocked++;
    const h=f.parts.head.getWorldPosition(new T.Vector3());row.head=h.toArray();h.project(c);
    if(Math.abs(h.x)>=1||Math.abs(h.y)>=1||h.z>=1)row.lost++;
    row.minY=Math.min(row.minY,h.y);row.maxY=Math.max(row.maxY,h.y);row.eye=eye.toArray();
   }
  }
  console.log(JSON.stringify({yaw,pitch,rows}));
 }finally{x.close();}
}
