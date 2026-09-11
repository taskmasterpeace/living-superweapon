import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {GAIT} from '../src/core/util.js';

const faces=new WeakMap();
function inside(mesh,worldPoint,inverse){
 const point=worldPoint.clone().applyMatrix4(inverse),positions=mesh.geometry.attributes.position,index=mesh.geometry.index;
 if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
 if(!mesh.geometry.boundingBox.containsPoint(point))return false;
 if(!faces.has(mesh.geometry)){
  const triangles=[];
  for(let i=0;i<(index?index.count:positions.count);i+=3)triangles.push([0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,index?index.getX(i+k):i+k)));
  faces.set(mesh.geometry,triangles);
 }
 const ray=new THREE.Ray(point,new THREE.Vector3(.937,.271,.219).normalize()),hits=[];
 for(const triangle of faces.get(mesh.geometry)){
  const hit=ray.intersectTriangle(...triangle,false,new THREE.Vector3());
  if(hit&&hit.distanceTo(point)>1e-5&&!hits.some(p=>p.distanceTo(hit)<1e-5))hits.push(hit);
 }
 return hits.length%2===1;
}

for(const side of [-1,1])test(`moving palm beam entry and exit keep rendered arm volumes clear of the trunk (${side})`,()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano'))),dt=1/60;
 f._openSky=true;f.gait=GAIT.GROUNDED;f.flying=false;f.vel.set(side*14,0,0);
 f.facing=0;f.aim.set(0,0,1);f.aim3.copy(f.aim);f.hasAimWorld=true;f.aimWorld.set(0,7,100);
 const tick=()=>{f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);};
 const slot=Object.values(f.slots).find(s=>s.def.type==='beam'),crossings=[];
 try{
  for(let i=0;i<120;i++)tick();
  for(const stage of ['entry','exit']){
   slot.active=stage==='entry'?{sustaining:true,power:1,emissionAge:1}:null;
   for(let frame=0;frame<90;frame++){
    f.castPose=THREE.MathUtils.damp(f.castPose,stage==='entry'?1:0,12,dt);tick();
    const inverse=f.parts.torso.matrixWorld.clone().invert();
    for(const [armName,arm]of [['left',f.parts.armL],['right',f.parts.armR]])for(const [name,mesh]of [['forearm',arm.children[1]],['hand',arm.children[2]]]){
     const position=mesh.geometry.attributes.position;
     for(let v=0;v<position.count;v++){
      const point=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      if(inside(f.parts.torso,point,inverse)){crossings.push({stage,frame,arm:armName,mesh:name,vertex:v});break;}
     }
    }
   }
  }
  assert.equal(crossings.length,0,JSON.stringify(crossings.slice(0,16)));
 }finally{f.dispose();}
});
