import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';

// CPU isolation only: actual articulation and 16 traveling hoses. No renderer,
// AI, target damage, integrated movement, HUD or gameplay-FPS certification.
const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
const combat=new StudioCombat(scene,world),g=combat.game,dt=1/60,frames=[];
const common={type:'beam',cost:1,kiPerSec:1,dps:1,color:'#ffc54a'};
for(let i=0;i<8;i++){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 def.abilities={lmb:{...common,name:'Eye',faceOrigin:true,steer:8},rmb:{...common,name:'Chest',chest:true,steer:1}};
 const f=new Fighter(def);scene.add(f.obj);g.entities.push(f);f._game=g;
 Object.assign(f,{animT:0,team:1,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:true,gait:'airborne'});
 f.pos.set(i*30,50,0);f.vel.set(0,i%2?-25:0,0);f.aimWorld.copy(f.pos).add(new THREE.Vector3(0,8,100));f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 for(const key of ['lmb','rmb'])runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
}
try{
 for(let frame=0;frame<780;frame++){
  const start=performance.now(),yaw=(Math.floor(frame/90)%2?170:-100)*Math.PI/180;
  for(const f of g.entities){
   f.facing=yaw;f.aim.set(Math.sin(yaw),0,Math.cos(yaw));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=Math.floor(frame/90)%2?33:-22;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
   f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);
  }
  g.projectiles.update(dt,g);
  if(frame>=180)frames.push(performance.now()-start);
 }
 const sorted=[...frames].sort((a,b)=>a-b),result={scope:'CPU-only: 8 posed fighters + 16 live beams, fixed velocity; no rendering/AI/contacts/HUD',cpu:cpus()[0].model,node:process.version,hz:60,samples:frames.length,meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1)};
 await mkdir('artifacts/axial-cofire',{recursive:true});await writeFile('artifacts/axial-cofire/cpu.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{const fighters=[...g.entities];combat.dispose();for(const f of fighters)f.dispose();}
