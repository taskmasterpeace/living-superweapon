import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Game} from '../src/engine/game.js';

function hit({field=true,modeId,blocked=false,amount=4,options={}}={}) {
 const flashes=[],target={pos:new Vector3(10,80,20),maxHp:200,hp:190,_openSky:field,def:{colors:{accent:'#ffaa44'}}};
 const game={modeId,time:3,isHuman:()=>false,vfx:{flash(...args){flashes.push(args);}}};
 const point=new Vector3(10.2,87,19.5);
 Game.prototype.onHit.call(game,target,amount,{ballistic:true,contactPoint:point,...options},blocked);
 return {flashes,target,point};
}
for(const blocked of [false,true])test(`field rifle ${blocked?'guard':'body'} contact is local, not a torso-sized flash`,()=>{
 const {flashes,point}=hit({blocked});
 assert.equal(flashes.length,1);
 assert.ok(flashes[0][0].equals(point));
 assert.notEqual(flashes[0][0],point,'feedback must not retain the projectile scratch vector');
 assert.ok(flashes[0][2]<=.65);
});
test('large ballistic impacts and city feedback retain their scale',()=>{
 assert.equal(hit({amount:40}).flashes[0][2],2.4);
 assert.equal(hit({field:false}).flashes[0][2],2.4);
 assert.equal(hit({options:{ballistic:false}}).flashes[0][2],2.4);
});
test('swept contact and nanite absorption do not gain a duplicate flash',()=>{
 assert.equal(hit({options:{contactFx:true}}).flashes.length,0);
 assert.equal(hit({options:{naniteResult:{absorbed:2}}}).flashes.length,0);
});
test('grounded range and clone receivers use field feedback without gaining flight physics',()=>{
 const options={contactFx:true,dot:true};
 const field=hit({field:false,modeId:'powerworld',options});
 assert.equal(field.flashes.length,0,'A beam owns contact feedback even on a grounded receiver');
 assert.equal(field.target._openSky,false,'Presentation must not change altitude or locomotion rules');
 assert.equal(hit({field:false,modeId:'powerworld'}).flashes[0][2],.55);
 assert.equal(hit({field:false,modeId:'duel',options}).flashes.length,1,'City feedback remains unchanged');
});
