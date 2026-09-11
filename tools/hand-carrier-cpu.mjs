import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';

// Optional in-memory counterfactual to isolate this constraint's CPU cost. It
// deliberately permits clipping and is neither a runtime toggle nor an older
// production revision. No source file is edited by the diagnostic.
const bypass=process.argv.includes('--without-constraint');
if(bypass)registerHooks({load(url,context,next){
 const result=next(url,context);
 if(url.endsWith('/src/engine/arm-torso.js')){
  const source=Buffer.from(result.source).toString(),signature='export function constrainArmTorso(f,arm,side){';assert.ok(source.includes(signature));
  return {...result,source:source.replace(signature,signature+'return false;')};
 }
 return result;
}});
const {Fighter}=await import('../src/engine/entity.js'),{ROSTER}=await import('../src/data/characters.js');
const {StudioCombat}=await import('../src/tool/studio-combat.js'),{runSlot}=await import('../src/engine/abilities.js');

// CPU isolation only. No renderer, AI, integrated travel, damage or HUD.
const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
const combat=new StudioCombat(scene,world),g=combat.game,dt=1/60,samples=[],common={type:'beam',cost:1,kiPerSec:1,dps:1,color:'#ffc54a',steer:8};
for(let i=0;i<8;i++){
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));def.frame={...def.frame,scale:[.65,1,1.5][i%3]};
 def.abilities={lmb:{...common,castStyle:'two-hand',name:'Paired'},rmb:{...common,faceOrigin:true,name:'Eyes'}};
 const f=new Fighter(def);scene.add(f.obj);g.entities.push(f);f._game=g;
 Object.assign(f,{animT:0,team:1,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:!!(i%2),gait:i%2?'airborne':'grounded'});
 f.pos.set(i*30,i%2?50:0,0);f.vel.set(i%2?0:14*def.frame.scale,0,i%2?45:0);f.aimWorld.copy(f.pos).add(new THREE.Vector3(0,8,100));f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 for(const key of ['lmb','rmb'])runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
}
try{
 for(let frame=0;frame<780;frame++){
  const start=performance.now(),yaw=(Math.floor(frame/90)%2?170:-100)*Math.PI/180;
  for(const f of g.entities){
   f.facing=yaw;f.aim.set(Math.sin(yaw),0,Math.cos(yaw));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=Math.floor(frame/90)%2?33:-22;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
   f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);
  }
  g.projectiles.update(dt,g);if(frame>=180)samples.push(performance.now()-start);
 }
 const sorted=[...samples].sort((a,b)=>a-b),result={scope:'CPU isolation: eight varied-height posed KANO rigs, eight paired-hand and eight optic hoses; no render/AI/physics/contact/HUD',constraint:bypass?'disabled in-memory counterfactual':'production',cpu:cpus()[0].model,node:process.version,hz:60,samples:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1)};
 await mkdir('artifacts/torso-range',{recursive:true});await writeFile(`artifacts/torso-range/${bypass?'cpu-disabled':'cpu'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{const fighters=[...g.entities];combat.dispose();for(const f of fighters)f.dispose();}
