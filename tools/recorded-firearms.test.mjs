import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioBus} from '../src/core/audio.js';
test('recorded firearm reports lead without synthesizing a second shot',()=>{
 const calls=[];const a={ok:true,muted:false,sample:(name,opts)=>{calls.push({name,opts});return true;},_pg:()=>{throw Error('synth should not run');}};
 AudioBus.prototype.gunshot.call(a,1,{x:1,y:2,z:3},null,'ar556');
 assert.equal(calls[0].name,'wpn.m16');assert.equal(calls[0].opts.pos.x,1);
});
test('cold recording and unmapped voice retain the existing fallback',()=>{
 for(const key of ['ar556','unknown']){let fallback=false;const a={ok:true,muted:false,sample:()=>false,_pg:()=>{fallback=true;return 0;}};AudioBus.prototype.gunshot.call(a,1,null,null,key);assert.ok(fallback);}
});
import {access} from 'node:fs/promises';
import {FIREARM_RECORDINGS,FIREARM_SAMPLES} from '../src/data/firearm-recordings.js';
import {MANIFEST,HOT_SET} from '../src/core/samples.js';
test('every mapped gun is banked, preloaded and backed by a local MP3',async()=>{
 for(const cue of Object.values(FIREARM_RECORDINGS)){assert.ok(HOT_SET.includes(cue));assert.deepEqual(MANIFEST[cue],FIREARM_SAMPLES[cue]);for(const stem of MANIFEST[cue].f)await access('public/audio/'+stem+'.mp3');}
});
test('muted and uninitialized audio never trigger recordings',()=>{
 for(const flags of [{ok:false,muted:false},{ok:true,muted:true}])AudioBus.prototype.gunshot.call({...flags,sample:()=>{throw Error('not audible');}},1,null,null,'ar556');
});
