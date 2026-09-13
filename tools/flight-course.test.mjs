import test from 'node:test';import assert from 'node:assert/strict';
import {crossedFlightRings} from '../src/engine/flight-course.js';
const rings=Array.from({length:6},(_,i)=>({position:{x:0,y:35+i*22,z:100-i*60}}));
const path=z=>({x:0,y:35+(100-z)*22/60,z});
test('fast flight counts every crossed ring in order',()=>{assert.deepEqual(crossedFlightRings(rings,0,path(110),path(-210)),[0,1,2,3,4,5]);});
test('outside the ring and out-of-order crossings give no credit',()=>{assert.deepEqual(crossedFlightRings(rings,0,{...path(110),x:15},{...path(90),x:15}),[]);assert.deepEqual(crossedFlightRings(rings,0,path(50),path(-30)),[]);});
test('reverse crossings cannot award rings encountered before the active ring',()=>{assert.deepEqual(crossedFlightRings(rings,0,path(-210),path(110)),[0]);});
test('staying in the plane or missing the next ring cannot count a lap',()=>{assert.deepEqual(crossedFlightRings(rings,0,path(100),path(100)),[]);assert.deepEqual(crossedFlightRings(rings,0,path(110),{x:0,y:35,z:-210}),[0]);});

test('oriented curved gates count a complete loop and reject radial misses',async()=>{const {facilityFlightCourse}=await import('../src/engine/flight-course.js');const gates=facilityFlightCourse();for(let i=0;i<gates.length;i++){const {position:p,normal:n}=gates[i],from={x:p.x-n.x*4,y:p.y-n.y*4,z:p.z-n.z*4},to={x:p.x+n.x*4,y:p.y+n.y*4,z:p.z+n.z*4};assert.deepEqual(crossedFlightRings(gates,i,from,to),[i]);assert.deepEqual(crossedFlightRings(gates,i,{...from,y:from.y+40},{...to,y:to.y+40}),[]);assert(Math.hypot(p.x,p.z)<260);}});
