import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {World} from '../src/engine/world.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano'))),noop=()=>{};
 const world={ARENA:900,cover:[{x:0,z:0,hx:.25,hz:25,top:100,h:100}],interiors:[],heightAt:()=>0};
 const game={world,particles:{spawn:noop,burst:noop},audio:{land:noop},onSlam:noop,onHit:noop};
 f._game=game;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(-20,30,0);f.vel.set(6000,0,0);
 return {f,game,world,close(){f.dispose();}};
}
// Endpoint-only collision misses this thin wall entirely at all three rates.
for(const hz of [30,60,120])test(`fast native fighter stops before thin cover at ${hz} Hz`,()=>{
 const t=fixture();try{t.f._physics(1/hz,t.game);assert.ok(t.f.pos.x<=-.25-t.f.radius,'swept body cannot appear beyond the wall');assert.ok(t.f.vel.x<=0);}finally{t.close();}
});
test('swept wall preserves along-wall travel instead of freezing all movement',()=>{
 const t=fixture();try{t.f.vel.z=60;t.f._physics(1/60,t.game);assert.ok(t.f.pos.x<0);assert.ok(t.f.pos.z>.5);assert.ok(t.f.vel.z>0);}finally{t.close();}
});
test('a finite airborne hull does not become a ground-to-sky wall',()=>{
 const t=fixture();try{Object.assign(t.world.cover[0],{bottom:60,frontlineAircraft:true});t.f._physics(1/60,t.game);assert.ok(t.f.pos.x>0);}finally{t.close();}
});
test('swept collision catches crossing under the finite hull with the head',()=>{
 const t=fixture();try{Object.assign(t.world.cover[0],{bottom:35,frontlineAircraft:true});t.f._physics(1/60,t.game);assert.ok(t.f.pos.x<0);}finally{t.close();}
});
test('sprint-through remains intentional while ordinary invulnerability is not wall noclip',()=>{
 for(const ghost of [false,true]){const t=fixture();try{t.f.sprintT=1;t.f._sprintThrough=ghost;t.f.invuln=1;t.f._physics(1/60,t.game);assert.equal(t.f.pos.x>0,ghost);}finally{t.close();}}
});
test('a fast frame cannot skip an enterable-building wall or its legitimate door',()=>{
 for(const doorway of [false,true]){const t=fixture();try{
  t.world.cover=[];t.world.interiors=[{x:0,z:0,hx:15,hz:25,top:100,walls:[{x:0,z:doorway?18:0,hx:.25,hz:doorway?5:25}]}];
  t.f._physics(1/60,t.game);assert.equal(t.f.pos.x>0,doorway);
 }finally{t.close();}}
});
test('walking along the top of cover is not treated as entering its side',()=>{
 const t=fixture();try{t.f.pos.set(0,100,-10);t.f.vel.set(0,0,400);t.f.flying=false;t.f.gait='grounded';t.f.onBlock=true;t.f.groundY=100;t.f._physics(1/60,t.game);assert.ok(t.f.pos.z>-10);assert.equal(t.f.pos.y,100);}finally{t.close();}
});
test('a fast level flyer hits an intervening native terrain ridge even with clear endpoints',()=>{
 const t=fixture();try{
  const w=Object.create(World.prototype);Object.assign(w,{ARENA:900,_gseg:2,_ghArena:10,_ghTriangles:true,_gh:new Float32Array([75,75,75,75,100,75,75,75,75]),cover:[],interiors:[]});
  t.game.world=w;t.f.pos.set(-10,85,0);t.f.vel.set(1200,0,0);t.f._physics(1/60,t.game);
  assert.ok(t.f.pos.x<0,'Cannot emerge on the far side of the ridge');assert.ok(t.f.pos.y>=w.heightAt(t.f.pos.x,t.f.pos.z)-.001);
 }finally{t.close();}
});

test('fast descent lands on a thin roof instead of falling through it',()=>{
 const t=fixture();try{
  Object.assign(t.world.cover[0],{hx:10,hz:10,top:28});t.f.pos.set(0,30,0);t.f.vel.set(0,-210,0);t.f.descendHeld=true;
  t.f._physics(1/30,t.game);assert.equal(t.f.pos.y,28);assert.equal(t.f.onBlock,true);assert.equal(t.f.flying,false);assert.equal(t.f.vel.y,0);
 }finally{t.close();}
});

test('upward flight hits an aircraft underside and an interior ceiling without side ejection',()=>{
 for(const interior of [false,true]){const t=fixture();try{
  const ceiling=42;
  if(interior){t.world.cover=[];t.world.interiors=[{x:0,z:0,hx:20,hz:20,top:ceiling,walls:[]}];}
  else Object.assign(t.world.cover[0],{hx:20,hz:20,bottom:ceiling,top:55,frontlineAircraft:true});
  t.f.pos.set(0,29,0);t.f.vel.set(0,210,0);t.f.flyHeld=true;t.f._physics(1/30,t.game);
  assert.ok(t.f.pos.y<=ceiling-(interior?11:12));assert.equal(t.f.pos.x,0);assert.equal(t.f.pos.z,0);assert.ok(t.f.vel.y<=0);
 }finally{t.close();}}
});

test('swept powered impact damages once and attributes a launched fighter to the launcher',()=>{
 for(const launched of [false,true]){const t=fixture();try{
  const hits=[],slams=[],launcher={id:'source'};t.world.cover[0].hp=100;
  t.game.damageBlock=(...args)=>hits.push(args);t.f._slam=(...args)=>{if(t.f.launchT>0)slams.push(args);};
  if(launched){t.f.launchT=1;t.f.lastHitBy=launcher;}
  t.f._physics(1/60,t.game);
  assert.equal(hits.length,1);assert.equal(hits[0][3],launched?launcher:t.f);assert.equal(slams.length,launched?1:0);
 }finally{t.close();}}
});

test('two walls constrain a corner without losing the first collision plane',()=>{
 const t=fixture();try{
  t.world.cover.push({x:-15,z:6,hx:15,hz:.25,top:100});t.f.vel.z=1000;
  t.f._physics(1/60,t.game);assert.ok(t.f.pos.x<=-.25-t.f.radius);assert.ok(t.f.pos.z<=6-.25-t.f.radius);
 }finally{t.close();}
});
