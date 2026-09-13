import test from 'node:test';
import assert from 'node:assert/strict';
import {updateFlightAudio,stopFlightAudio} from '../src/engine/flight-sense.js';
function fixture(){
 let speed=0;const events=[],active=new Set();
 const f={alive:true,flying:true,airborne:true,pos:{},vel:{length:()=>speed}};
 const library={active,buffers:new Map([['hover',{}],['flight',{}]]),source:()=> 'chosen-recording',play(id){events.push(id);const h={id,set(){},stop(){active.delete(h);}};active.add(h);return h;}};
 return {f,g:{player:f,audio:{soundLibrary:library}},events,active,speed:v=>speed=v};
}
test('hover and flight switch with hysteresis and never accumulate voices',()=>{
 const x=fixture();updateFlightAudio(x.f,x.g);assert.deepEqual(x.events,['hover']);
 x.speed(10);updateFlightAudio(x.f,x.g);assert.deepEqual(x.events,['hover','flight']);
 x.speed(7);updateFlightAudio(x.f,x.g);assert.equal(x.events.length,2);
 x.speed(4);updateFlightAudio(x.f,x.g);assert.equal(x.events.at(-1),'hover');assert.equal(x.active.size,1);
});
for(const [field,value] of [['alive',false],['flying',false],['airborne',false],['launchT',1],['grabbedBy',{}],['_aircraftVehicle',{}],['_scoutVehicle',{}]])test(`stops on ${field}`,()=>{
 const x=fixture();updateFlightAudio(x.f,x.g);x.f[field]=value;updateFlightAudio(x.f,x.g);assert.equal(x.active.size,0);assert.equal(x.f._flightAudio,null);
});
test('removal, control transfer, missing recording and library stop are safe',()=>{
 const x=fixture();updateFlightAudio(x.f,x.g);stopFlightAudio(x.f);stopFlightAudio(x.f);assert.equal(x.active.size,0);
 x.g.player={};updateFlightAudio(x.f,x.g);assert.equal(x.active.size,0);
 x.g.player=x.f;x.g.audio.soundLibrary.buffers.clear();updateFlightAudio(x.f,x.g);assert.equal(x.active.size,0);
 x.g.audio.soundLibrary.buffers.set('hover',{});updateFlightAudio(x.f,x.g);x.f._flightAudio.stop();updateFlightAudio(x.f,x.g);assert.equal(x.active.size,1);
 x.g.audio.muted=true;updateFlightAudio(x.f,x.g);assert.equal(x.active.size,0);
});
test('expired launch timer permits controlled flight audio',()=>{const x=fixture();x.f.launchT=-.01;updateFlightAudio(x.f,x.g);assert.equal(x.active.size,1);});
