import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {beamBodyContact} from '../src/engine/beam-body-contact.js';

const receiver=(x,z,extra={})=>({pos:new THREE.Vector3(x,0,z),radius:2,team:2,alive:true,phase:false,...extra});
function fixture(points,entities,radius=1){
  const caster={team:1,alive:true},beam={caster,radius,pn:points.length,path:new Float32Array(points.flat()),pvel:new Float32Array(points.length*3)};
  const game={entities,world:{cover:[],interiors:[]},isFoe:(a,b)=>a.team!==b.team};
  const out={point:new THREE.Vector3(),surface:new THREE.Vector3(),direction:new THREE.Vector3()};
  return {beam,game,out,hit:(padding=1,surfaceStop=false)=>beamBodyContact(beam,game,out,padding,surfaceStop)};
}
const close=(actual,want)=>assert.ok(Math.abs(actual-want)<1e-6,`${actual} != ${want}`);

test('compressed absorbing knots retain their own incoming packet direction',()=>{
  const f=fixture([[0,5.2,18.00008],[0,5.2,18]],[receiver(0,20)]);
  f.beam.pvel.set([900,0,0,0,0,3600]);
  f.beam._absorbed=[f.game.entities[0],f.game.entities[0]];
  assert.equal(f.hit(1,true),true);
  assert.deepEqual(f.out.direction.toArray(),[0,0,1]);
  assert.ok(f.out.point.z>=18&&f.out.point.z<=18.00009);
});

test('a genuine reversed segment keeps its path tangent even with forward packet velocity',()=>{
  const f=fixture([[0,5.2,19],[0,5.2,18]],[receiver(0,20)]);
  f.beam.pvel.set([0,0,3600,0,0,3600]);
  assert.equal(f.hit(),true);assert.deepEqual(f.out.direction.toArray(),[0,0,-1]);
});

test('absorption metadata only overrides a tangent for the same receiving body',()=>{
  const f=fixture([[0,5.2,18.00008],[0,5.2,18]],[receiver(0,20)]);
  f.beam.pvel.set([0,0,3600,0,0,3600]);
  f.beam._absorbed=[receiver(0,30),f.game.entities[0]];
  assert.equal(f.hit(),true);assert.deepEqual(f.out.direction.toArray(),[0,0,-1]);
  f.beam._absorbed.fill(f.game.entities[0]);f.beam.pvel.fill(0);
  assert.equal(f.hit(),true);assert.deepEqual(f.out.direction.toArray(),[0,0,-1]);
});

test('the first body wins within a traveled segment regardless of entity order',()=>{
  const near=receiver(0,20),far=receiver(0,35),f=fixture([[0,5.2,0],[0,5.2,50]],[far,near]);
  const original=Array.from(f.beam.path),velocities=Array.from(f.beam.pvel);
  assert.equal(f.hit(),true);assert.equal(f.out.fighter,near);assert.equal(f.out.index,1);
  close(f.out.t,.32);close(f.out.point.z,16);close(f.out.surface.z,18);
  assert.deepEqual(f.out.direction.toArray(),[0,0,1]);
  assert.deepEqual(Array.from(f.beam.path),original);assert.deepEqual(Array.from(f.beam.pvel),velocities);
});

test('curved path order wins over both entity order and distance from the shooter',()=>{
  const first=receiver(17,0),later=receiver(0,8),f=fixture([[0,5.2,0],[30,5.2,0],[30,5.2,20],[0,5.2,8]],[later,first]);
  assert.equal(f.hit(),true);assert.equal(f.out.fighter,first);assert.equal(f.out.index,1);
  close(f.out.point.x,13);assert.deepEqual(f.out.direction.toArray(),[1,0,0]);
});

test('an oblique hit returns a path point and a distinct physical near-side surface',()=>{
  const target=receiver(3,20),f=fixture([[0,5.2,0],[0,5.2,30]],[target]);
  assert.equal(f.hit(),true);close(f.out.point.z,20-Math.sqrt(7));
  close(f.out.surface.distanceTo(new THREE.Vector3(3,5.2,20)),2);
  assert.ok(f.out.surface.x>0&&f.out.surface.x<3);assert.ok(f.out.surface.z<20);
});

test('a miss outside the envelope does not retain stale contact',()=>{
  const target=receiver(0,20),f=fixture([[0,5.2,0],[0,5.2,30]],[target]);
  assert.equal(f.hit(),true);target.pos.x=4.01;
  assert.equal(f.hit(),false);assert.equal(f.out.fighter,null);assert.equal(f.out.index,-1);assert.equal(f.out.t,Infinity);
});

test('the helper never acquires a fighter beyond the actually traveled tip',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,15.9]],[receiver(0,20)]);
  assert.equal(f.hit(),false);
  f.beam.path[5]=16.1;assert.equal(f.hit(),true);assert.ok(f.out.point.z<=f.beam.path[5]);
});

test('an advancing receiver carries contact toward the shooter without changing packets',()=>{
  const target=receiver(0,30),f=fixture([[0,5.2,0],[0,5.2,50]],[target]);
  assert.equal(f.hit(),true);const before=f.out.point.z;
  target.pos.z=22;assert.equal(f.hit(),true);close(before-f.out.point.z,8);close(f.out.surface.z,20);
  target.pos.x=20;assert.equal(f.hit(),false);close(f.beam.path[5],50);
});

test('phase and dead bodies do not shield the next solid foe, but hurt invulnerability does',()=>{
  const phased=receiver(0,10,{phase:true}),dead=receiver(0,15,{alive:false}),solid=receiver(0,20,{invuln:10}),behind=receiver(0,35);
  const f=fixture([[0,5.2,0],[0,5.2,50]],[behind,solid,dead,phased]);
  assert.equal(f.hit(),true);assert.equal(f.out.fighter,solid);
  solid.phase=true;assert.equal(f.hit(),true);assert.equal(f.out.fighter,behind);
});

for(const surfaceStop of [false,true])test(`banished fighters are absent while possession's inert body stays solid, surface stop ${surfaceStop}`,()=>{
  const banished=receiver(0,10,{invuln:9999,_banished:{t:2}});
  const abandoned=receiver(0,20,{_inert:true}),behind=receiver(0,35);
  const f=fixture([[0,5.2,0],[0,5.2,50]],[behind,banished,abandoned]);
  assert.equal(f.hit(1,surfaceStop),true);assert.equal(f.out.fighter,abandoned,'A body absent from this world cannot shield the vulnerable abandoned body');
  banished._banished=null;
  assert.equal(f.hit(1,surfaceStop),true);assert.equal(f.out.fighter,banished,'Returning restores solidity even while hurt invulnerability remains');
});

test('friendly bodies cannot consume the opposing beam',()=>{
  const friend=receiver(0,10,{team:1}),foe=receiver(0,20),f=fixture([[0,5.2,0],[0,5.2,50]],[friend,foe]);
  assert.equal(f.hit(),true);assert.equal(f.out.fighter,foe);
});

test('the caller may remove compatibility padding without changing the physical surface',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,50]],[receiver(0,20)]);
  assert.equal(f.hit(0),true);close(f.out.point.z,17);close(f.out.surface.z,18);
});

test('zero-length pending geometry is not a traveled hit and duplicate knots stay safe',()=>{
  const f=fixture([[0,5.2,16],[0,5.2,16]],[receiver(0,20)]);
  assert.equal(f.hit(),false);
  f.beam.path=new Float32Array([0,5.2,0,0,5.2,0,0,5.2,30]);f.beam.pn=3;
  assert.equal(f.hit(),true);assert.equal(f.out.index,2);assert.deepEqual(f.out.direction.toArray(),[0,0,1]);
});

for(const radius of [.05,1,4])test(`a broad thin wall prevents body-padding contact at radius ${radius}`,()=>{
  const f=fixture([[0,5.2,0],[0,5.2,10-radius-.01]],[receiver(0,12.8)],radius);
  f.game.world.interiors=[{x:0,z:10,hx:30,hz:.01,top:30,walls:[{x:0,z:10,hx:30,hz:.01}]}];
  assert.equal(f.hit(),false,'The pre-clipped tip must not reach a body through the wall');
  f.game.world.interiors.length=0;assert.equal(f.hit(),true,'The same body is within compatibility padding in open space');
});

test('an occluded early path section does not veto later exposed curved contact',()=>{
  const target=receiver(0,3),f=fixture([[0,5.2,-1.02],[4.15,5.2,-1.02],[4.15,5.2,3]],[target],1.2);
  f.game.world.interiors=[{x:0,z:0,hx:1,hz:.01,top:30,walls:[{x:0,z:0,hx:1,hz:.01}]}];
  assert.equal(f.hit(),true);assert.equal(f.out.fighter,target);assert.equal(f.out.index,2);
  assert.ok(f.out.point.x>4,'Only the exposed section may own contact');
});

test('caller-owned outputs retain their vector identities across calls',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,50]],[receiver(0,20)]),{point,surface,direction}=f.out;
  assert.equal(f.hit(),true);assert.equal(f.hit(),true);
  assert.equal(f.out.point,point);assert.equal(f.out.surface,surface);assert.equal(f.out.direction,direction);
});

for(const secondWall of [false,true])test(`an occluded envelope entry still finds the first exposed part of that segment${secondWall?' before another shadow':''}`,()=>{
  const f=fixture([[0,5.2,-1.02],[4.15,5.2,-1.02]],[receiver(0,3)],1.5);
  const walls=[{x:0,z:0,hx:1,hz:.01}];
  if(secondWall)walls.push({x:.7,z:1,hx:.02,hz:.01});
  f.game.world.interiors=[{x:0,z:0,hx:10,hz:10,top:30,walls}];
  assert.equal(f.hit(),true);assert.equal(f.out.index,1);
  // Beyond the far corner (1, .01), the center-to-contact segment clears the
  // wall. This literal intersection is earlier than the second wall's shadow.
  assert.ok(f.out.point.x>=1.34448&&f.out.point.x<1.34449,`first clear point x=${f.out.point.x}`);
});

test('surface stop puts a broad central beam on the physical near body instead of eight units ahead',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,30]],[receiver(0,20,{radius:3})],4);
  assert.equal(f.hit(1,true),true);close(f.out.point.z,17);close(f.out.surface.z,17);close(f.out.t,17/30);
  assert.equal(f.hit(),true);close(f.out.point.z,12,'The default retains compatibility envelope entry');
});

test('surface stop waits when the traveled tip has only entered the inflated envelope',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,13]],[receiver(0,20,{radius:3})],4);
  assert.equal(f.hit(),true);assert.equal(f.hit(1,true),false);
  f.beam.path[5]=17.1;assert.equal(f.hit(1,true),true);close(f.out.point.z,17);
  assert.ok(f.out.point.z<=f.beam.path[5],'The stop cannot add travel');
});

test('surface stop keeps a lateral beam-width graze but ends it at closest approach',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,30]],[receiver(5,20)],4);
  assert.equal(f.hit(1,true),true);close(f.out.point.z,20);close(f.out.point.x,0);
  close(f.out.surface.z,20);close(f.out.surface.x,3);assert.deepEqual(f.out.direction.toArray(),[0,0,1]);
  f.beam.path[5]=19.9;assert.equal(f.hit(1,true),false,'Even a lateral graze must reach its contact plane');
});

test('surface stop chooses the actual oblique sphere entry when the centerline intersects the body',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,30]],[receiver(1.2,20)],4);
  assert.equal(f.hit(1,true),true);close(f.out.point.z,18.4);close(f.out.surface.z,18.4);close(f.out.surface.x,0);
});

test('surface stop still follows curved source order instead of entity order',()=>{
  const first=receiver(17,0),later=receiver(0,8),f=fixture([[0,5.2,0],[30,5.2,0],[30,5.2,20],[0,5.2,8]],[later,first],4);
  assert.equal(f.hit(1,true),true);assert.equal(f.out.fighter,first);assert.equal(f.out.index,1);close(f.out.point.x,15);
});

test('surface stop clamps a negative plane only while the segment start remains inside the contact envelope',()=>{
  const f=fixture([[0,5.2,21],[0,5.2,30]],[receiver(0,20)],4);
  assert.equal(f.hit(1,true),true);close(f.out.t,0);close(f.out.point.z,21);
  f.beam.path[2]=28;assert.equal(f.hit(1,true),false,'A body behind an outward-moving segment is not a new hit');
});

test('surface stop cannot use its lateral envelope through an adjacent thin wall',()=>{
  const f=fixture([[0,5.2,0],[0,5.2,30]],[receiver(5.8,20,{radius:1})],4);
  f.game.world.interiors=[{x:4.5,z:20,hx:.01,hz:10,top:30,walls:[{x:4.5,z:20,hx:.01,hz:10}]}];
  assert.equal(f.hit(1,true),false);
  f.game.world.interiors.length=0;assert.equal(f.hit(1,true),true);close(f.out.point.z,20);
});

test('an enemy-held teammate stops the beam before its holder, without becoming an AI foe',()=>{
 const holder=receiver(0,20),held=receiver(0,10,{team:1});holder.grabbing=held;held.grabbedBy=holder;
 const f=fixture([[0,5.2,0],[0,5.2,30]],[holder,held]);
 assert.equal(f.game.isFoe(f.beam.caster,held),false);
 assert.equal(f.hit(),true);assert.equal(f.out.fighter,held);
 holder.grabbing=null;assert.equal(f.hit(),true);assert.equal(f.out.fighter,holder);
});

test('opt-in quadruped bounds reject beams above its back and accept torso height',()=>{
 const body=receiver(0,20,{radius:8,bodyBounds:new THREE.Box3(new THREE.Vector3(-2,0,-5),new THREE.Vector3(2,4,5))});
 assert.equal(fixture([[0,8,0],[0,8,40]],[body],.2).hit(),false);
 assert.equal(fixture([[0,2,0],[0,2,40]],[body],.2).hit(),true);
});
