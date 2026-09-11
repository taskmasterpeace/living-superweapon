import * as THREE from 'three';
import {Fighter} from '../../src/engine/entity.js';
import {ROSTER} from '../../src/data/characters.js';
import {StudioCombat} from '../../src/tool/studio-combat.js';
import {runSlot} from '../../src/engine/abilities.js';

// Disclosed fixed-position production articulation fixture. No travel, AI,
// imported clip or gameplay-camera claim; actual paid launch/readiness runs.
export function handStartupFixture({style='two-hand',motion='strafe',scale=1,hz=60,yaw=0,pitch=0,charge=false,scene=new THREE.Scene()}={}){
 const def=structuredClone(ROSTER.find(d=>d.id===(style==='two-hand'?'kano':'sol')));
 def.frame={...def.frame,scale};
 def.abilities={lmb:{type:'beam',name:'Palm startup',castStyle:style,cost:3,kiPerSec:12,dps:20,steer:0,charge,maxCharge:2,color:'#ffc54a'}};
 const feedback=[],world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(power){feedback.push(['shake',power]);},punch(power){feedback.push(['punch',power]);}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def),dt=1/hz,voices=[];
 g.audio={...g.audio,beamVoice:()=>{const v={set(){},stop(){}};voices.push(v);return v;}};
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,level:10,flying:!['stand','strafe'].includes(motion),gait:['stand','strafe'].includes(motion)?'grounded':'airborne'});
 f.pos.set(0,f.flying?50:0,0);f.vel.set(motion==='strafe'?14*scale:0,motion==='rise'?12:motion==='descend'?-12:0,motion==='fly'?45:0);f.ki=100;
 const aim=(a,b)=>{f.facing=a*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aim3.copy(f.aim).multiplyScalar(Math.cos(b*Math.PI/180));f.aim3.y=Math.sin(b*Math.PI/180);f.aimWorld.copy(f.pos).add(new THREE.Vector3(0,8*scale,0)).addScaledVector(f.aim3,100);};
 const animate=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);f.obj.updateMatrixWorld(true);};
 const step=()=>{animate();g.projectiles.update(dt,g);};
 const input=(pressed,held,released)=>runSlot(f,'lmb',{pressed,held,released,dt},g);
 aim(0,0);for(let i=0;i<hz;i++)step();aim(yaw,pitch);
 const arms=style==='two-hand'?[f.parts.armL,f.parts.armR]:[f.parts.armR];
 return {f,g,dt,voices,feedback,arms,aim,animate,step,input,close(){combat.dispose();scene.remove(f.obj);f.dispose();}};
}
