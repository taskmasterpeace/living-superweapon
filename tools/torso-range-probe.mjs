import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import assert from 'node:assert/strict';

// Diagnostic, not an acceptance test. Measures the final torso in the final
// pelvis frame, including every pose layer; local correction caps are not proof.
const label=process.argv[2]||'current';assert.match(label,/^[a-z-]+$/);
const rows=[],dt=1/60;
for(const motion of ['stand','strafe','hover','fly','descend'])for(const origin of ['eyes','chest','palm','cofire']){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol')),common={type:'beam',cost:1,kiPerSec:1,dps:1,color:'#ffc54a',steer:8};
 def.abilities={lmb:{...common,name:origin,...(origin==='palm'?{castStyle:'palm'}:origin==='chest'?{chest:true}:{faceOrigin:true})}};
 if(origin==='cofire')def.abilities.rmb={...common,name:'Chest',chest:true,steer:1};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}},combat=new StudioCombat(scene,world),g=combat.game;
 scene.add(f.obj);g.entities=[f];f._game=g;
 const ground=['stand','strafe'].includes(motion);
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:!ground,gait:ground?'grounded':'airborne'});
 f.pos.set(0,ground?0:50,0);f.vel.set(motion==='strafe'?14:0,motion==='descend'?-25:0,motion==='fly'?45:0);
 const aim=(yaw,height)=>{f.facing=yaw*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
 const step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
 const pq=new THREE.Quaternion(),tq=new THREE.Quaternion(),rel=new THREE.Quaternion(),axis=new THREE.Vector3();
 const result={motion,origin,maxTurn:0,maxYaw:0,maxBend:0,peak:null};
 try{
  aim(0,0);for(let i=0;i<60;i++)step();for(const k in f.slots)runSlot(f,k,{pressed:true,held:true,released:false,dt},g);for(let i=0;i<60;i++)step();
  for(let i=0;i<360;i++){
   if(i%60===0){const [yaw,h]=[[170,25],[-100,-30],[5,60],[-170,-80],[90,80],[180,0]][i/60];aim(yaw,h);}
   step();f.parts.pelvis.getWorldQuaternion(pq);f.parts.torso.getWorldQuaternion(tq);rel.copy(pq).invert().multiply(tq);axis.set(0,0,1).applyQuaternion(rel);
   const turn=rel.angleTo(new THREE.Quaternion())*180/Math.PI,yaw=Math.abs(Math.atan2(axis.x,axis.z))*180/Math.PI,bend=Math.abs(Math.asin(THREE.MathUtils.clamp(axis.y,-1,1)))*180/Math.PI;
   if(turn>result.maxTurn){result.maxTurn=turn;result.peak={frame:i,time:i*dt,aim:f.aimWorld.toArray(),root:f.parts.g.rotation.toArray(),body:f.parts.body.rotation.toArray(),torso:rel.toArray(),pelvis:pq.toArray(),yaw,bend,pending:Object.values(f.slots).some(s=>s.active?.pendingLaunch)};}
   result.maxYaw=Math.max(result.maxYaw,yaw);result.maxBend=Math.max(result.maxBend,bend);
  }
  rows.push(result);
 }finally{combat.dispose();f.dispose();}
}
await mkdir('artifacts/torso-range',{recursive:true});await writeFile(`artifacts/torso-range/${label}.json`,JSON.stringify({scope:'Final articulation, fixed velocity; not integrated travel or an anatomical certification',rows},null,2));
console.log(JSON.stringify(rows.map(({motion,origin,maxTurn,maxYaw,maxBend,peak})=>({motion,origin,maxTurn,maxYaw,maxBend,peakFrame:peak.frame})),null,2));
