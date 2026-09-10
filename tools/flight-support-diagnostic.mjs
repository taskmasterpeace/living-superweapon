// Production rig/beam phase inspection. No renderer or native-control claim.
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
def.abilities={lmb:{type:'beam',castStyle:'palm',cost:1,kiPerSec:1,dps:1,steer:0}};
const f=new Fighter(def),scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}},combat=new StudioCombat(scene,world),g=combat.game,dt=1/60;
scene.add(f.obj);g.entities=[f];f._game=g;
Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:true,gait:'airborne'});
f.pos.set(0,50,0);f.vel.set(0,0,45);
const aim=yaw=>{f.facing=yaw*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
const step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
const axis=(p,x,y,z)=>new THREE.Vector3(x,y,z).applyQuaternion(p.getWorldQuaternion(new THREE.Quaternion()));
const report=label=>{const beam=f.slots.lmb.active;console.log(JSON.stringify({label,front:axis(f.parts.torso,0,0,1).toArray(),spine:axis(f.parts.torso,0,1,0).toArray(),pelvis:axis(f.parts.pelvis,0,1,0).toArray(),palm:axis(f.parts.armR.children[2],0,-1,0).toArray(),beam:beam?.dir.toArray(),body:f.parts.body.rotation.toArray(),root:f.parts.g.rotation.toArray()}));};
aim(0);for(let i=0;i<60;i++)step();report('cruise');
runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);for(let i=0;i<60;i++)step();report('firing before cursor turn');
aim(170);for(let i=0;i<120;i++){step();if([0,15,30,59,119].includes(i))report(`cursor reversed frame ${i}`);}
combat.dispose();f.dispose();
