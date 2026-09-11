import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Fighter } from '../src/engine/entity.js';
import { ROSTER } from '../src/data/characters.js';
import { TYPES } from '../src/engine/abilities.js';

const wall=()=>({x:0,z:60,hx:25,hz:5,bottom:0,top:45,hp:100});
function fixture(covers=[wall()]){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='webline')));
 const g={scene:new THREE.Scene(),world:{cover:covers,ARENA:900,heightAt:()=>0},audio:{zap(){},sustain(){return {set(){},stop(){}};}},vfx:{ring(){}},afterimage(){},trail(){},isHuman:()=>true,hud:{feed(){}}};
 f._game=g;f._openSky=true;f._altTag=()=>{};f.ki=110;f.pos.set(0,0,0);f.aim.set(0,0,1);f.aim3.set(0,.4,1).normalize();
 return {f,g,cast(){const st=f.slots.shift;TYPES[st.def.type](f,st.def,st,g,{pressed:true,dt:1/60});},close(){f.dispose();}};
}
test('WEBLINE Shift creates a paid physical anchor, not a dash or natural flight',()=>{
 const x=fixture();try{x.cast();assert.ok(x.f._grapple?.zip);assert.equal(x.f.ki,104);assert.equal(x.f.flightTier,0);assert.equal(x.f.flying,false);assert.equal(x.f._grapple.anchor,x.g.world.cover[0]);}finally{x.close();}
});
test('a miss costs no energy and creates no imaginary anchor',()=>{
 const x=fixture([]);try{x.cast();assert.equal(x.f.ki,110);assert.equal(x.f._grapple,null);assert.equal(x.f.vel.length(),0);}finally{x.close();}
});
test('actual forward aim does not secretly tilt a horizontal web upward',()=>{
 const x=fixture();try{x.f.aim3.set(0,0,1);x.cast();assert.ok(x.f._grapple?.zip);assert.ok(Math.abs(x.f._grapple.y-5.2)<1e-6);}finally{x.close();}
});
test('finite hovering aircraft hull is not a building anchor',()=>{
 const x=fixture([{...wall(),frontlineAircraft:true,bottom:25}]);try{x.cast();assert.equal(x.f._grapple,null);assert.equal(x.f.ki,110);}finally{x.close();}
});
test('zip travels without crossing the wall and reaches a stable wall hold at 30/60/120Hz',()=>{
 for(const hz of [30,60,120]){const x=fixture();try{x.cast();assert.ok(x.f._grapple?.zip);for(let i=0;i<hz*2;i++){x.f._physics(1/hz,x.g);assert.ok(x.f.pos.z+x.f.radius<=55.001,'body never passes into wall');}assert.ok(x.f.hanging?.zip);assert.ok(x.f.pos.z>45);assert.ok(x.f.pos.y>10);assert.equal(x.f.flying,false);assert.equal(x.f.vel.length(),0);}finally{x.close();}}
});
test('a newly obstructed rope cancels rather than pulling the body through cover',()=>{
 const x=fixture();try{x.cast();assert.ok(x.f._grapple?.zip);x.g.world.cover.unshift({x:0,z:20,hx:10,hz:1,top:30,hp:100});x.f._physics(1/60,x.g);assert.equal(x.f._grapple,null);assert.ok(x.f.pos.z<18);}finally{x.close();}
});
test('destroyed anchor releases a hanging hero instead of supporting them in empty air',()=>{
 const x=fixture();try{x.cast();assert.ok(x.f._grapple?.zip);for(let i=0;i<120;i++)x.f._physics(1/60,x.g);assert.ok(x.f.hanging?.zip);x.g.world.cover[0].hp=0;x.f._physics(1/60,x.g);assert.equal(x.f.hanging,null);}finally{x.close();}
});
test('pressing Zip again cancels during cooldown without paying twice',()=>{
 const x=fixture();try{x.cast();assert.ok(x.f._grapple?.zip);x.cast();assert.equal(x.f._grapple,null);assert.equal(x.f.ki,104);}finally{x.close();}
});
test('disposing a grappling form releases its anchor state and looping audio',()=>{
 const x=fixture();x.cast();assert.ok(x.f._grapple?.zip);x.f._physics(1/60,x.g);x.close();assert.equal(x.f._grapple,null);assert.equal(x.f.hanging,null);assert.equal(x.f._grapLoop,null);
});
test('the rendered web begins at a raised reaching hand and ends on its real wall anchor',()=>{
 const x=fixture();try{x.cast();for(let i=0;i<15;i++){x.f._physics(1/60,x.g);x.f._animate(1/60);}
  const arm=x.f.parts.armR,shoulder=arm.getWorldPosition(new THREE.Vector3()),wrist=arm.children[2].getWorldPosition(new THREE.Vector3());
  const aim=new THREE.Vector3(0,27.2,55).sub(shoulder).normalize();assert.ok(wrist.clone().sub(shoulder).dot(aim)>3,'hand reaches toward tether, not idle/down');
  const line=x.f._grapLine.geometry.attributes.position;assert.ok(new THREE.Vector3().fromBufferAttribute(line,0).distanceTo(wrist)<.001);assert.ok(Math.abs(line.getZ(1)-55)<.001);
 }finally{x.close();}
});
