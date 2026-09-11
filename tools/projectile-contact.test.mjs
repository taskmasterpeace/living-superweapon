import test from 'node:test';
import assert from 'node:assert/strict';
import {sweepSplitObstacle} from '../src/engine/projectile-contact.js';
const p=(x,y,z)=>({x,y,z});
const world={cover:[{x:0,z:3,r:.1,h:10}],interiors:[{x:0,z:8,hx:10,hz:.5,top:10,walls:[{x:0,z:8,hx:10,hz:.5}]}]};
test('sweep selects nearest obstacle, preserves height clearance and works in reverse',()=>{
  const out={};
  assert.equal(sweepSplitObstacle(world,p(0,5,0),p(0,5,10),.05,out),true);assert.ok(Math.abs(out.t-.285)<1e-9);assert.equal(out.ground,false);
  assert.equal(out.kind,'cover');assert.equal(out.target,world.cover[0]);
  assert.equal(sweepSplitObstacle(world,p(0,11,0),p(0,11,10),.05,out),false);
  assert.equal(sweepSplitObstacle(world,p(0,5,10),p(0,5,0),.05,out),true);assert.ok(Math.abs(out.t-.145)<1e-9);
  assert.equal(out.kind,'interior');assert.equal(out.target,world.interiors[0].walls[0]);
});
test('sweep handles vertical descent, ground opt-out and starts inside geometry',()=>{
  const out={};
  assert.equal(sweepSplitObstacle(world,p(0,20,3),p(0,5,3),.05,out),true);assert.ok(Math.abs(out.t-2/3)<1e-9);
  assert.equal(sweepSplitObstacle({},p(20,3,0),p(20,-3,0),1,out),true);assert.equal(out.ground,true);assert.ok(Math.abs(out.t-2.5/6)<1e-9);
  assert.equal(out.kind,'ground');assert.equal(out.target,null);
  assert.equal(sweepSplitObstacle({},p(20,3,0),p(20,-3,0),1,out,false),false);
  assert.equal(sweepSplitObstacle(world,p(0,5,8),p(0,5,8),.05,out),true);assert.equal(out.t,0);
});
