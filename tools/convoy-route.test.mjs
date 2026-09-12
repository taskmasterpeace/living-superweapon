import test from 'node:test';
import assert from 'node:assert/strict';
import {planConvoyRoute} from '../src/engine/convoy-route.js';
const vehicle={driveRadius:2,cover:{}};
test('route travels around a blocking wall rather than across it',()=>{
 const driving={_surface:()=>0,_clear:(x,z)=>Math.abs(x)<100&&Math.abs(z)<100&&!(x>20&&x<40&&Math.abs(z)<28)};
 const route=planConvoyRoute(driving,vehicle,{x:0,z:0},{x:72,z:0});assert.ok(route);assert.ok(route.some(p=>Math.abs(p.z)>28));
});
test('unreachable route returns no path; water or slope cannot be skipped',()=>{
 const driving={_surface:(x,z)=>Math.abs(x)>25||Math.abs(z)>25?null:0,_clear:()=>true};
 assert.equal(planConvoyRoute(driving,vehicle,{x:0,z:0},{x:100,z:0}),null);
});
