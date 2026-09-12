import test from 'node:test';
import assert from 'node:assert/strict';
import {SquadTransport} from '../src/engine/squad-transport.js';
import {Group,Vector3} from 'three';

test('boarding cancellation clears only this transport targets',()=>{
 const entry={},cabin={},other={},members=[{_deploymentTarget:entry},{_deploymentTarget:cabin},{_deploymentTarget:other}];
 SquadTransport.prototype.cancelBoarding.call({entry,cabin,g:{ms:{squad:{members}}}});
 assert.equal(members[0]._deploymentTarget,null);assert.equal(members[1]._deploymentTarget,null);
 assert.equal(members[2]._deploymentTarget,other);
});

test('all unseated followers receive boarding intent so the front of the lane clears',()=>{
 const player={alive:true},members=[{alive:true},{alive:true},{alive:false}],target={};
 const attempts=[];
 const t={model:{},state:'parked',g:{player,ms:{squad:{members}}},passengers:new Map([[player,{}]]),boardingTarget:()=>target,board:f=>attempts.push(f),sync(){}};
 SquadTransport.prototype.update.call(t,.016);
 assert.equal(members[0]._deploymentTarget,target);assert.equal(members[1]._deploymentTarget,target);
 assert.equal(members[2]._deploymentTarget,undefined);assert.deepEqual(attempts,members.slice(0,2));
});

test('a follower already on the ramp continues inside instead of reversing into the queue',()=>{
 const t={model:new Group(),entry:new Vector3(0,0,40),cabin:new Vector3(0,5.7,12)};
 assert.equal(SquadTransport.prototype.boardingTarget.call(t,{pos:new Vector3(0,3,30)}),t.cabin);
 assert.equal(SquadTransport.prototype.boardingTarget.call(t,{pos:new Vector3(20,0,30)}),t.entry);
 assert.equal(SquadTransport.prototype.boardingTarget.call(t,{pos:new Vector3(0,0,55)}),t.entry);
});

test('transport destruction applies one crash hit without inventing a player attacker',()=>{
 const hits=[],actor={takeDamage:(n,opts)=>hits.push({n,opts})};
 const transport={state:'flying',passengers:new Map([[actor,{}]]),g:{player:{}},model:{visible:true},
  cancelBoarding(){},exit(f){this.passengers.delete(f);},removeCover(){this.removed=true;}};
 SquadTransport.prototype.destroy.call(transport);
 SquadTransport.prototype.destroy.call(transport);
 assert.equal(hits.length,1);assert.equal(hits[0].n,40);
 assert.equal(hits[0].opts.src,undefined);
 assert.equal(transport.passengers.size,0);assert.equal(transport.model.visible,false);
 assert.equal(transport.removed,true);
});

for(const owner of ['_scoutVehicle','_aircraftVehicle','grabbing'])test(`boarding rejects an actor owned by ${owner}`,()=>{
 const actor={alive:true,[owner]:{},get radius(){assert.fail('Admission must reject before seat selection');}};
 assert.equal(SquadTransport.prototype.board.call({state:'parked'},actor),false);
});
