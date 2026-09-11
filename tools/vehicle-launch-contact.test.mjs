import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {earliestOrdinaryContact} from '../src/engine/attack-interception.js';
const hull={x:0,z:0,hx:5,hz:8,top:15,bottom:0,projectileShape:'box',frontlineVehicle:true};
const wall={x:0,z:25,hx:8,hz:.1,top:30,projectileShape:'box'};
const caster={team:1},shot={pos:new Vector3(0,14,7),radius:.2,life:3,ground:true,caster,launchCover:hull,launchCaster:caster};
const game={world:{cover:[hull,wall]},entities:[]};
test('mounted shot leaves its own broad hull proxy but still hits the next wall',()=>{
 const c=earliestOrdinaryContact(shot,new Vector3(0,14,40),.1,game);
 assert.equal(c.target,wall);assert.ok(c.t>.5&&c.t<.6);
});
test('reflected and ordinary hostile shots still collide with the original vehicle',()=>{
 assert.equal(earliestOrdinaryContact({...shot,caster:{team:0}},new Vector3(0,14,40),.1,game).target,hull);
 assert.equal(earliestOrdinaryContact({...shot,launchCover:null},new Vector3(0,14,40),.1,game).target,hull);
});
