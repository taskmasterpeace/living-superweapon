import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleFrontlineBedrock} from '../src/engine/frontline-foothills.js';

test('broad distant talus reaches zero continuously instead of being clipped at an acceleration bound',()=>{
 // At the outer edge of the largest east ridge, the repose slope still has
 // height. An undersized culling box used to drop it by tens of metres.
 const a=sampleFrontlineBedrock(3645.99,4630),b=sampleFrontlineBedrock(3646.01,4630);
 assert.ok(Math.abs(a-b)<.1,`Abrupt false cliff at talus culling bound: ${a} -> ${b}`);
 for(const x of [-120,0,120])for(const z of [-800,0,800,3000])assert.equal(sampleFrontlineBedrock(x,z),0,'Bedrock fills the battle corridor');
});
