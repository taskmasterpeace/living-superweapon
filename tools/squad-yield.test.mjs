import test from 'node:test';import assert from 'node:assert/strict';import {squadYieldMove} from '../src/engine/squad-yield.js';
const f={pos:{x:0,y:0,z:6},radius:2},leader={pos:{x:0,y:0,z:0},moveDir:{x:0,z:1}};
test('open-ground teammate steps aside without changing forward movement',()=>{assert.deepEqual(squadYieldMove(f,leader,[]),{x:1,z:-0});});
test('door frame causes forward clearance rather than futile side pressure',()=>{const frame=[-6,6].map(x=>({x,z:6,hx:2,hz:2,bottom:0,top:15}));assert.deepEqual(squadYieldMove(f,leader,frame),{x:0,z:1});});
test('blocked front and sides never produce a move through a wall',()=>{assert.equal(squadYieldMove(f,leader,[{x:0,z:6,hx:20,hz:20,bottom:0,top:20}]),null);});
test('idle, distant, behind or vertically separated teammates do not yield',()=>{assert.equal(squadYieldMove(f,{...leader,moveDir:{x:0,z:0}},[]),null);for(const pos of [{x:0,y:0,z:20},{x:0,y:0,z:-6},{x:0,y:20,z:6}])assert.equal(squadYieldMove({...f,pos},leader,[]),null);});
test('walkable transport risers do not falsely block a yield route',()=>{const walls=[-6,6].map(x=>({x,z:6,hx:2,hz:2,bottom:0,top:15}));walls.push({x:0,z:10,hx:4,hz:3,bottom:0,top:3,buildingRole:'step'});assert.deepEqual(squadYieldMove(f,leader,walls),{x:0,z:1});});
