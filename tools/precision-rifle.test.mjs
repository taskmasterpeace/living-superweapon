import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {sampleMouseCombat} from '../src/core/combat-selection.js';
import {KEYMAPS} from '../src/core/settings.js';
import {runSlot} from '../src/engine/abilities.js';
import {setAttackOverride,applyAttackOverrides,attackFields} from '../src/data/attack-tuning.js';

function fixture(){const x=mainCombatFixture({hero:'recon',mode:'powerworld'});x.p._openSky=true;x.p.onFoot=true;x.g.ms.chaseCam=true;x.p._selSlot='q';x.p.level=10;x.g.attackRandom=()=>.5;return x;}
test('a selected precision rifle acquires a real target beyond the legacy 162-unit aim plane',()=>{
 const x=fixture();try{const f=x.foe({z:550});x.w.chase(x.p,null,0,'bfp');x.w.camera.position.set(0,6,-20);x.w.camera.lookAt(0,5.2,550);x.w.camera.updateMatrixWorld(true);x.g.controlPlayer(1/60);assert.ok(x.g._aimHit.ent===f,`aim stopped at ${x.g._aimHit.dist}`);assert.ok(x.p.aimWorld.z>540);}finally{x.close();}
});
test('authored precision lifetime carries a finite round to a distant body, without splash damage',()=>{
 const x=fixture();try{const f=x.foe({z:550}),hp=f.hp;Object.assign(x.p.slots.q.def,{life:3,spread:0,recoil:0,blast:0,cost:0});x.p.hasAimWorld=true;x.p.aimWorld.set(0,5.2,550);x.p.aim3.copy(x.p.aimWorld).sub(new THREE.Vector3(0,6,0)).normalize();runSlot(x.p,'q',{held:true,pressed:true,dt:1/60},x.g);x.p._animate(1/60);x.p.obj.updateMatrixWorld(true);const shot=x.g.projectiles.list.at(-1);assert.ok(shot);shot.resolveLaunch(x.g);assert.equal(shot.blast,0);assert.equal(f.hp,hp);let alive=true;for(let i=0;i<240&&alive;i++)alive=shot.update(1/60,x.g);assert.ok(f.hp<hp,'round expired before reaching the distant fighter');}finally{x.close();}
});
test('precision secondary hold magnifies without firing the secondary, and wheel consumes the sight gesture',()=>{
 const x=fixture();try{const m=x.g.input.mouse,map=KEYMAPS.classic;Object.assign(x.p.slots.q.def,{scopeZoom:4});m.right=true;m.rightEdge=true;let out=sampleMouseCombat(x.p,x.g.input,map,.2);assert.equal(out.scope,true);assert.equal(out.slots.rmb.held,false);x.g.input.endFrame();x.g.input.wheelSecondary=1;out=sampleMouseCombat(x.p,x.g.input,map,.02);assert.equal(out.scope,false);assert.equal(out.changed[0],'secondary');x.g.input.endFrame();m.right=false;m.rightUp=true;out=sampleMouseCombat(x.p,x.g.input,map,.02);assert.equal(out.scope,false);assert.ok(Object.values(out.slots).every(s=>!s.held&&!s.pressed));}finally{x.close();}
});
test('third-person sight narrows the lens and restores it without changing player or aim heading',()=>{
 const x=fixture();try{Object.assign(x.p.slots.q.def,{scopeZoom:4});x.w.chase(x.p,null,1/60,'bfp');const base=x.w.camera.fov,heading=x.w._lookYaw;x.p._scopeHeld=true;for(let i=0;i<60;i++)x.w.chase(x.p,null,1/60,'bfp');assert.ok(x.w.camera.fov<base*.5);assert.equal(x.w._lookYaw,heading);assert.ok(x.w.camera.position.distanceTo(x.p.pos)>10);x.p._scopeHeld=false;for(let i=0;i<60;i++)x.w.chase(x.p,null,1/60,'bfp');assert.ok(Math.abs(x.w.camera.fov-base)<.05);}finally{x.close();}
});
test('Studio precision lifetime and sight magnification compile into the actual rifle slot',()=>{
 const x=fixture();try{const o=setAttackOverride({},x.p.def,'q',{life:3.5,scopeZoom:3});const d=applyAttackOverrides(x.p.def,o);assert.equal(d.abilities.q.life,3.5);assert.equal(d.abilities.q.scopeZoom,3);assert.throws(()=>setAttackOverride({},x.p.def,'q',{life:0}));}finally{x.close();}
});
test('RECON uses soldier direct selection and reload controls, not hero-slot keys',()=>{
 const x=fixture();try{x.p._selSlot='lmb';x.g.input.justPressed.add('Digit3');x.control();assert.equal(x.p._selSlot,'q');x.g.input.endFrame();x.p.slots.q.ammo={loaded:2,capacity:5,reserve:30,dryUntil:0};x.g.input.justPressed.add('KeyR');x.control();assert.equal(x.p._firearmReload?.key,'q');}finally{x.close();}
});
test('a horizontal long-range aim ray stops at a native terrain ridge before the target',()=>{
 const x=fixture();try{const f=x.foe({z:550});x.w._ghTriangles=true;x.w.heightAt=(_x,z)=>Math.max(0,30*(1-Math.abs(z-120)/120));const hit=x.w.aimTrace({}, {origin:new THREE.Vector3(0,6,0),dir:new THREE.Vector3(0,0,1),maxD:960,foes:[f],ignore:x.p});assert.equal(hit.hit,'ground');assert.ok(hit.dist<100);}finally{x.close();}
});
test('cover prevents a distant precision round reaching the actor behind it',()=>{
 const x=fixture();try{const f=x.foe({z:550}),hp=f.hp;x.w.cover.push({x:0,z:280,hx:20,hz:3,top:50,projectileShape:'box'});x.p.aimWorld.set(0,5.2,550);x.p.hasAimWorld=true;x.p.slots.q.def.spread=0;runSlot(x.p,'q',{pressed:true,held:true,dt:1/60},x.g);x.p._animate(1/60);x.p.obj.updateMatrixWorld(true);const shot=x.g.projectiles.list.at(-1);let alive=true;for(let i=0;i<240&&alive;i++)alive=shot.update(1/60,x.g);assert.equal(f.hp,hp);assert.ok(shot.pos.z<300,'round crossed the blocking wall');}finally{x.close();}
});
test('scope releases when the combat view is retired',()=>{
 const x=fixture();try{x.p._scopeHeld=true;x.g.retireCombatViewInput(x.p);assert.equal(x.p._scopeHeld,false);}finally{x.close();}
});
test('magnification keeps the soldier torso inside the third-person frame',()=>{
 const x=fixture();try{x.w.chase(x.p,null,1/60,'bfp');x.w.camera.updateMatrixWorld(true);const base=x.p.center(new THREE.Vector3()).project(x.w.camera);x.p._scopeHeld=true;for(let i=0;i<80;i++)x.w.chase(x.p,null,1/60,'bfp');x.w.camera.updateMatrixWorld(true);const aimed=x.p.center(new THREE.Vector3()).project(x.w.camera);assert.ok(Math.abs(aimed.y)<.9,`torso offscreen at ${aimed.y}`);assert.ok(Math.abs(aimed.y-base.y)<.05);}finally{x.close();}
});
test('Studio displays the short native pellet lifetime rather than the rifle fallback',()=>{
 const x=mainCombatFixture({hero:'breach'});try{assert.equal(attackFields(x.p.def,'lmb').find(f=>f.key==='life').value,.34);}finally{x.close();}
});
