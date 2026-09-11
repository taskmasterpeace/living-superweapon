import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
for(const [style,motion]of [['palm','stand'],['two-hand','hover']]){
 const def=structuredClone(ROSTER.find(d=>d.id===(style==='palm'?'sol':'kano')));def.frame={...def.frame,scale:1};
 def.abilities={lmb:{type:'beam',name:'probe',castStyle:style,cost:3,kiPerSec:12,dps:20,steer:0,color:'#ffc54a'}};
 const scene=new THREE.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def),dt=1/60;
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,level:10,flying:motion==='hover',gait:motion==='hover'?'airborne':'grounded'});
 f.pos.set(0,f.flying?50:0,0);f.vel.set(0,0,0);f.ki=100;f.facing=0;f.aim.set(0,0,1);f.aim3.set(0,0,1);f.aimWorld.copy(f.pos).add(new THREE.Vector3(0,8,100));
 const step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);f.obj.updateMatrixWorld(true);g.projectiles.update(dt,g);};
 for(let i=0;i<60;i++)step();const wall={x:0,z:2.4,hx:20,hz:.02};world.interiors.push({...wall,top:100,walls:[wall]});
 runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);const beam=f.slots.lmb.active;
 for(let i=0;i<120;i++){
  step();if(i%6===0||!beam.pendingLaunch){
   const arms=(style==='palm'?[f.parts.armR]:[f.parts.armL,f.parts.armR]).map(a=>{
    const hand=a.children[2],at=hand.getWorldPosition(new THREE.Vector3()),shoulder=a.getWorldPosition(new THREE.Vector3());
    return {point:at.toArray(),alignment:at.sub(shoulder).normalize().dot(beam.dir),open:hand.morphTargetInfluences[0],elbow:-a.children[1].rotation.x};
   });console.log(JSON.stringify({style,motion,i,pending:beam.pendingLaunch,arms}));
  }
  if(!beam.pendingLaunch)break;
 }
 combat.dispose();f.dispose();
}
