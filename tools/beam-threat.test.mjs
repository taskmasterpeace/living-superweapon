import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Game} from '../src/engine/game.js';

// Concrete traveled packet fixtures, not a mocked threat result. Reverting to
// an XZ aim cone must fail vertical hits, overhead misses and old curved energy.
const target=(x,y,z)=>({team:2,pos:new Vector3(x,y,z),radius:2});
function beam(points,velocity=[0,0,100],extra={}){
 return{team:1,caster:{team:1},muzzle:new Vector3(...points[0]),dir:new Vector3(...velocity).normalize(),
  sustaining:true,dead:false,pendingLaunch:false,radius:1,maxLen:150,tipSpeed:100,
  pn:points.length,path:new Float32Array(points.flat()),pvel:new Float32Array(points.flatMap(()=>velocity)),...extra};
}
function incoming(f,beams,world={cover:[],interiors:[]}){
 return Game.prototype.incomingBeam.call({world,projectiles:{list:beams}},f);
}
test('vertical incoming energy is a threat even with zero horizontal separation',()=>{
 const b=beam([[0,60,0],[0,40,0]],[0,-100,0]);assert.equal(incoming(target(0,0,0),[b]),b);
});
test('a horizontal stream far above the head is not a threat',()=>{
 assert.equal(incoming(target(0,0,40),[beam([[0,60,0],[0,60,25]])]),null);
});
test('an unfired turn-to-cast cannot earn a defensive reaction',()=>{
 assert.equal(incoming(target(0,0,30),[beam([[0,5.2,0],[0,5.2,0]],undefined,{pendingLaunch:true})]),null);
});
test('packets aimed to miss laterally cannot induce a broad-cone guard',()=>{
 assert.equal(incoming(target(20,0,40),[beam([[0,5.2,0],[0,5.2,25]])]),null);
});
test('old curved energy still threatens after the source turns away',()=>{
 const b=beam([[0,5.2,0],[15,5.2,15],[0,5.2,35]],[0,0,100],{dir:new Vector3(1,0,0)});
 assert.equal(incoming(target(0,0,35),[b]),b);
});
test('released traveling tails remain threats, unlike retired beams',()=>{
 const b=beam([[0,5.2,15],[0,5.2,35]],undefined,{sustaining:false});
 assert.equal(incoming(target(0,0,40),[b]),b);b.dead=true;assert.equal(incoming(target(0,0,40),[b]),null);
});
test('far future packets and exhausted range cannot trigger premature guard',()=>{
 const b=beam([[0,5.2,0],[0,5.2,5]]);
 assert.equal(incoming(target(0,0,130),[b]),null);
 b.maxLen=25;assert.equal(incoming(target(0,0,40),[b]),null);
});
test('an intervening wall stops the predicted incoming path',()=>{
 const b=beam([[0,5.2,0],[0,5.2,5]]),world={cover:[{projectileShape:'box',x:0,z:20,hx:20,hz:1,top:25}],interiors:[]};
 assert.equal(incoming(target(0,0,40),[b],world),null);
});
test('absorbed and clashing streams do not predict through the receiver',()=>{
 for(const extra of [{blocked:true},{clashing:true},{_bodyContact:{fighter:target(0,0,20)}}]){
  const b=beam([[0,5.2,0],[0,5.2,20]],undefined,extra);
  assert.equal(incoming(target(0,0,40),[b]),null);
  assert.equal(incoming(target(0,0,19),[b]),b,'Already traveled energy remains a contact threat');
 }
});
test('the nearer arrival takes priority, independent of projectile insertion order',()=>{
 const far=beam([[0,5.2,0],[0,5.2,5]]),near=beam([[0,5.2,20],[0,5.2,35]]),f=target(0,0,40);
 assert.equal(incoming(f,[far,near]),near);assert.equal(incoming(f,[near,far]),near);
});
test('the same pushed receiver keeps recognizing energy following into the vacated space',()=>{
 const f=target(0,0,26),b=beam([[0,5.2,0],[0,5.2,20]],undefined,{_bodyContact:{fighter:f}});
 assert.equal(incoming(f,[b]),b,'Movement after clipping must not erase the next defensive observation');
 f.pos.x=20;assert.equal(incoming(f,[b]),null,'Leaving the lane genuinely releases the threat');
});
