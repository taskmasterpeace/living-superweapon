import test from 'node:test';import assert from 'node:assert/strict';
import {crossedFlightRings} from '../src/engine/flight-course.js';
const rings=Array.from({length:6},(_,i)=>({position:{x:0,y:35+i*22,z:100-i*60}}));
const path=z=>({x:0,y:35+(100-z)*22/60,z});
test('fast flight counts every crossed ring in order',()=>{assert.deepEqual(crossedFlightRings(rings,0,path(110),path(-210)),[0,1,2,3,4,5]);});
test('outside the ring and out-of-order crossings give no credit',()=>{assert.deepEqual(crossedFlightRings(rings,0,{...path(110),x:15},{...path(90),x:15}),[]);assert.deepEqual(crossedFlightRings(rings,0,path(50),path(-30)),[]);});
test('reverse crossings cannot award rings encountered before the active ring',()=>{assert.deepEqual(crossedFlightRings(rings,0,path(-210),path(110)),[0]);});
test('staying in the plane or missing the next ring cannot count a lap',()=>{assert.deepEqual(crossedFlightRings(rings,0,path(100),path(100)),[]);assert.deepEqual(crossedFlightRings(rings,0,path(110),{x:0,y:35,z:-210}),[0]);});
