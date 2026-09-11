import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Netplay} from '../src/engine/netplay.js';
test('remote cancellation is distinct from charged release and clears the held intent',()=>{
 const r={alive:true,aim3:new THREE.Vector3(),_held:new Set(['q']),state:'charge',slots:{q:{def:{type:'charge',cd:1},charging:true,chargeT:.8}}};
 const session=Object.assign(Object.create(Netplay.prototype),{remote:r,game:{}});
 session._applyEvents({t:'s',k:'q',p:4});assert.equal(r._held.has('q'),false);assert.equal(r.slots.q.charging,false);assert.equal(r.slots.q.cd,1);
});

test('pause flushes cancellations without a simulation tick and does not resend them',()=>{
 const sent=[],session=Object.assign(Object.create(Netplay.prototype),{active:true,_evQ:[],net:{sendEvent:e=>sent.push(e)}});
 session.queueSlot('q',4);session.flushEvents();
 assert.equal(sent.length,1);assert.equal(sent[0].list[0].p,4);assert.equal(session._evQ.length,0);
 session.flushEvents();assert.equal(sent.length,1);
});
