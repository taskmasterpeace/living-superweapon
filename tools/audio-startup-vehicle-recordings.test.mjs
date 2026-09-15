import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AudioBus} from '../src/core/audio.js';
import {SampleBank,HOT_SET,MANIFEST} from '../src/core/samples.js';
import {VEHICLE_SAMPLES,VEHICLE_RECORDINGS} from '../src/data/vehicle-recordings.js';
import {SoundLibrary} from '../src/core/sound-library.js';

test('unlock begins hot decoding before any playback and exposes stable readiness',async t=>{
 const requested=[];let release;
 const gate=new Promise(resolve=>{release=resolve;});
 t.mock.method(globalThis,'fetch',async url=>{requested.push(url);await gate;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};});
 const node=()=>({gain:{value:0},frequency:{value:0},threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}});
 class Context{createGain=node;createDynamicsCompressor=node;createBiquadFilter=node;decodeAudioData=async()=>({duration:1});}
 const original=globalThis.window;globalThis.window={AudioContext:Context};t.after(()=>{if(original===undefined)delete globalThis.window;else globalThis.window=original;});
 const a=new AudioBus();a.init();assert.equal(a.ok,true);
 assert.ok(requested.includes('audio/sfx-cc0/final/sfx_step_concrete_a.mp3'));
 assert.ok(requested.includes('audio/ai-pass/final/flight-loop.mp3'));
 assert.ok(requested.includes('audio/sfx-veh/final/veh_idle_a.mp3'));
 const ready=a.prepareSamples();assert.equal(a.prepareSamples(),ready);
 let done=false;ready.then(()=>{done=true;});await Promise.resolve();assert.equal(done,false);
 release();const buffers=await ready;assert.ok(buffers.length>0);assert.ok(buffers.every(Boolean));
 const count=requested.length;a.init();await a.prepareSamples();assert.equal(requested.length,count);
});

test('readiness settles on failed files and deduplicates overlapping cue variants',async t=>{
 const requested=[];t.mock.method(globalThis,'fetch',async url=>{requested.push(url);return {ok:false,status:404};});
 t.mock.method(console,'warn',()=>{});
 const bank=new SampleBank({ctx:{}});const results=await bank.preload(['punch.med','punch.heavy','unknown']);
 assert.equal(results.length,2);assert.deepEqual(results,[null,null]);assert.equal(requested.length,2);
 await bank.preload(['punch.med']);assert.equal(requested.length,2);
});

test('vehicle bank matches all locked winner rows and source bytes; only idle loops',async()=>{
 const base='public/audio/sfx-veh/final/';const winners=JSON.parse(await readFile(base+'veh-winners.json'));
 const provenance=JSON.parse(await readFile('docs/audio/vehicle-recordings-provenance.json'));
 assert.equal(Object.keys(VEHICLE_SAMPLES).length,winners.counts.sounds);
 let files=0;
 for(const winner of winners.winners){
  const m=MANIFEST[winner.sample];assert.ok(HOT_SET.includes(winner.sample));assert.equal(m.f.length,winner.files);
  assert.equal(m.loop,winner.sample==='veh.idle');
  for(const f of m.f){assert.ok(f.startsWith('sfx-veh/final/'));const bytes=await readFile('public/audio/'+f+'.mp3');
   assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.files[f.split('/').at(-1)+'.mp3']);files++;}
 }
 assert.equal(files,winners.counts.files);
});

test('vehicle defaults preserve explicit placeholder and authored recordings',()=>{
 const lib=new SoundLibrary({storage:null});
 for(const [id,sample] of Object.entries(VEHICLE_RECORDINGS)){
  assert.equal(lib.source(id),'bundled-recording');assert.equal(lib.cue(id).loop,MANIFEST[sample].loop);
  lib.state.bindings[id]={name:'user.mp3',data:'user'};assert.equal(lib.source(id),'chosen-recording');
  lib.setSettings(id,{source:'placeholder'});assert.equal(lib.source(id),'synthesized-placeholder');
 }
 assert.equal(lib.source('brake'),'synthesized-placeholder');
});
