import * as THREE from 'three';
import {Fighter} from '../../src/engine/entity.js';
import {ROSTER} from '../../src/data/characters.js';
import {StudioCombat} from '../../src/tool/studio-combat.js';
import {runSlot} from '../../src/engine/abilities.js';

// Real channels/rig, deterministic articulation clock; no claim of integrated
// entity travel. Used by the entry probe and matching browser inspection.
export function pairedCombatFixture({motion='fly',hz=60,inputHz=hz,phase=0,scene=new THREE.Scene(),world,frame}={}){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 if(frame)def.frame={...def.frame,...frame};
 def.abilities={lmb:{type:'beam',name:'Optic channel',faceOrigin:true,castStyle:'optic-focus',cost:1,dps:1,kiPerSec:1,steer:4,color:'#ff6249'},
  rmb:{type:'beam',name:'Paired channel',castStyle:'two-hand',cost:1,dps:1,kiPerSec:1,steer:12,color:'#ffd64a'}};
 const f=new Fighter(def),w=world||{scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}},combat=new StudioCombat(scene,w),g=combat.game;
 g.entities=[f];f._game=g;f._openSky=true;f.energyInfinite=true;f.animT=phase;f.hasAimWorld=true;
 f.pos.set(0,motion==='strafe'?0:50,0);f.obj.position.copy(f.pos);scene.add(f.obj);
 f.flying=motion!=='strafe';f.gait=f.flying?'airborne':'grounded';f.facing=0;f.aim.set(0,0,1);
 f.vel.set(motion==='hover'?0:14,0,motion==='fly'?36:0);f.aimWorld.set(0,motion==='strafe'?18:68,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 const dt=1/hz;
 const step=()=>{f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);g.projectiles.update(dt,g);};
 const trigger=(key,held)=>runSlot(f,key,{pressed:held,held,released:!held,dt:1/inputHz},g);
 const sequence=i=>{if(i===Math.round(hz*.2)){trigger('lmb',true);trigger('rmb',true);}if(i===Math.round(hz*100/60))trigger('rmb',false);if(i===Math.round(hz*155/60))trigger('lmb',false);step();};
 return {f,g,dt,step,sequence,close(){combat.dispose();scene.remove(f.obj);f.dispose();}};
}
