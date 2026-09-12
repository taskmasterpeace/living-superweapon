import test from 'node:test';
import assert from 'node:assert/strict';
import {sweepFighterEnvironment} from '../src/engine/fighter-environment-contact.js';
import {Vector3} from 'three';

for(const launched of [false,true])test(`authored ramp steps ${launched?'block launched bodies':'admit grounded walking'}`,()=>{
 const f={pos:new Vector3(0,0,4),vel:new Vector3(0,0,-4),radius:.5,sizeScale:1,launchT:launched?1:0,flying:false,_wallContact(){}};
 const world={cover:[{x:0,z:0,hx:3,hz:2,bottom:-1,top:1,finiteBuilding:true,standable:true,buildingRole:'step'}],interiors:[]};
 sweepFighterEnvironment(f,{world},1);
 if(launched)assert.ok(f.pos.z>2);else assert.equal(f.pos.z,0);
});
