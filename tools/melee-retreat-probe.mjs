import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
for(const retreat of [false,true]){
const x=mainCombatFixture({mode:'powerworld',hero:'rage'}),a=x.p,b=x.foe({z:20});try{
x.g.audio={...x.g.audio,yell(){}};x.g.vfx.impact=()=>{};x.g.vfx.impactStar=()=>{};for(const f of [a,b]){f._openSky=true;f._chaseKb=true;f.invuln=0;f.gait='grounded';f.flying=false;f.hp=f.maxHp=1000;f._sync();}
if(retreat)b.vel.z=30;a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.set(0,0,1);a.faceDir(0,1);b.faceDir(0,-1);
for(let i=0;i<60;i++){a._animate(1/60);b._animate(1/60);}a._sync();b._sync();x.g.melee.chargeStart(a);x.g.melee.chargeRelease(a);
const frames=[];
for(let i=0;i<60;i++){const dt=1/60;x.g.melee.beginContactFrame();x.g.beginBodyContactFrame();a.move(new THREE.Vector3(),dt);b.move(new THREE.Vector3(0,0,retreat?1:0),dt);a.update(dt,x.g);b.update(dt,x.g);x.g.resolveBodies();x.g.melee.endContactFrame();if(a.mstate==='active')frames.push({i,z:a.pos.z,y:a.pos.y,bz:b.pos.z,state:a.mstate,hp:b.hp,fist:a.parts.armR.children[2].getWorldPosition(new THREE.Vector3()).toArray()});}
console.log(JSON.stringify({retreat,frames}));
}finally{x.close();}}


