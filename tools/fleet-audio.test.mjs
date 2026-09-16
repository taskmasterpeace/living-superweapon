import test from 'node:test';
import assert from 'node:assert/strict';
import {FleetPilot} from '../src/engine/fleet-pilot.js';
import {SoundLibrary} from '../src/core/sound-library.js';
import {initVehicleState} from '../src/engine/vehicle-pilot.js';
import {VEHICLE_ENVELOPES} from '../src/data/vehicle-envelopes.js';

function fixture(cls='wheeled'){
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({gain:param(),pan:param(),connect(){},disconnect(){},start(){},stop(){}});
 const sources=[],ctx={state:'running',currentTime:1,createGain:node,createStereoPanner:node,createBufferSource(){const n=node();sources.push(n);return n;},createOscillator(){throw Error('unexpected placeholder');}};
 let ready=true;const buffer={duration:1};const audio={ctx,_sus:new Set(),_pg:()=>1,_pan:()=>0,sampleBuffer:()=>ready?buffer:null};
 const lib=audio.soundLibrary=new SoundLibrary({storage:null,audio});
 const pos=()=>({x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}});
 const player={alive:true,pos:pos(),vel:{set(){}},slots:{},obj:{visible:true}};
 const a={cls,id:'test',pos:pos(),ready:true,bodyRadius:6,motion:initVehicleState(cls),env:VEHICLE_ENVELOPES.humvee};
 const game={player,audio,running:true,world:{heightAt:()=>0,ARENA:10000},_fleetActors:[a]};
 return {pilot:new FleetPilot(game),a,game,lib,audio,sources,buffer,setReady:v=>{ready=v;}};
}
const ids=f=>f.lib.events.filter(e=>e.accepted).map(e=>e.id);
const input=keys=>({down:key=>keys.includes(key),pressed:()=>false});

test('actual boarding, held throttle, moving brake and exit emit recordings once per transition',()=>{
 const f=fixture();f.pilot.enter(f.a,f.game.player);
 f.pilot.handleInput(input(['KeyW']));for(let i=0;i<40;i++){f.audio.ctx.currentTime+=.1;f.pilot.update(.1);}
 assert.ok(f.a.pos.z>0);assert.deepEqual(ids(f),['vehicle-start','vehicle-idle','vehicle-accel']);
 f.pilot.handleInput(input(['Space']));for(let i=0;i<10;i++){f.audio.ctx.currentTime+=.1;f.pilot.update(.1);}
 assert.equal(ids(f).filter(x=>x==='vehicle-brake').length,1);
 assert.equal(f.audio._sus.size,1);f.pilot.exit();assert.equal(f.audio._sus.size,0);
 assert.equal(ids(f).at(-1),'vehicle-off');assert.ok(f.sources.every(s=>s.buffer===f.buffer));
 assert.equal(f.game.player._fleetVehicle,null);assert.equal(f.game.player.obj.visible,true);
});

test('cold boarding stays silent; idle recovers on decode without replaying stale ignition',()=>{
 const f=fixture();f.setReady(false);f.pilot.enter(f.a,f.game.player);f.pilot.update(.1);assert.deepEqual(ids(f),[]);
 f.setReady(true);f.pilot.update(.1);assert.deepEqual(ids(f),['vehicle-idle']);
});

test('authored idle binding remains authoritative and global stop can recover one loop',()=>{
 const f=fixture(),custom={duration:3};f.lib.state.bindings['vehicle-idle']={name:'custom.mp3',data:'custom'};
 f.lib.buffers.set('vehicle-idle',{data:'custom',buffer:custom});f.pilot.enter(f.a,f.game.player);f.pilot.update(.1);
 assert.equal(f.sources.at(-1).buffer,custom);f.lib.stop();assert.equal(f.audio._sus.size,0);
 f.audio.ctx.currentTime+=1;f.pilot.update(.1);assert.equal(f.audio._sus.size,1);assert.equal(f.sources.at(-1).buffer,custom);
});

for(const end of ['pause','dispose','destroy','death','transfer','missing-occupant'])test(`idle cleans up on ${end}`,()=>{
 const f=fixture();f.pilot.enter(f.a,f.game.player);f.pilot.update(.1);assert.equal(f.audio._sus.size,1);
 if(end==='pause')f.game.paused=true;
 if(end==='destroy')f.a.destroyed=true;
 if(end==='death')f.game.player.alive=false;
 if(end==='transfer')f.game.player={alive:true};
 if(end==='missing-occupant')f.a.occupant=null;
 if(end==='dispose')f.pilot.dispose();else f.pilot.update(.1);
 assert.equal(f.audio._sus.size,0);
 if(['pause','dispose','destroy'].includes(end))assert.equal(ids(f).includes('vehicle-off'),false);
});

for(const cls of ['tracked','mech','hover','ship'])test(`${cls} never acquires car recordings`,()=>{
 const f=fixture(cls);f.pilot.enter(f.a,f.game.player);f.pilot._audio.update({fwd:1,brake:true});f.pilot.exit();assert.deepEqual(ids(f),[]);
});

for(const [cls,cue] of [['rotor','rotor'],['fixedwing','jet']])test(`${cls} runs its OWN loop (${cue}) once a REAL recording is bound — and never a car cue`,()=>{
 // no recording bound: the library honestly refuses (no fake rotor audio)
 const cold=fixture(cls);cold.pilot.enter(cold.a,cold.game.player);cold.pilot._audio.update({fwd:1,brake:true});
 assert.deepEqual(ids(cold),[],'silent until an authentic source exists');
 cold.pilot.exit();
 // a chosen recording bound: the loop starts and cleans up on exit
 const f=fixture(cls),buf={duration:3};
 f.lib.state.bindings[cue]={name:'real.mp3',data:'real'};f.lib.buffers.set(cue,{data:'real',buffer:buf});
 f.pilot.enter(f.a,f.game.player);f.pilot._audio.update({fwd:1,brake:true});
 const played=ids(f);
 assert.ok(played.includes(cue),`${cue} loop started (${played})`);
 assert.ok(played.every(id=>!id.startsWith('vehicle-')),'no car cues');
 f.pilot.exit();assert.equal(f.audio._sus.size,0,'loop cleaned up on exit');
});

test('explicit placeholder choice reaches SoundLibrary and audio errors never interrupt driving',()=>{
 const f=fixture(),requested=[];f.lib.setSettings('vehicle-idle',{source:'placeholder'});
 const original=f.lib.play.bind(f.lib);f.lib.play=(id,options)=>{requested.push([id,f.lib.source(id)]);return original(id,options);};
 f.pilot.enter(f.a,f.game.player);f.pilot.handleInput(input(['KeyW']));assert.doesNotThrow(()=>f.pilot.update(.1));
 assert.ok(requested.some(([id,source])=>id==='vehicle-idle'&&source==='synthesized-placeholder'));assert.ok(f.a.pos.z>0);
});
