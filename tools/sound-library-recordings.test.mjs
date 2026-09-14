import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundLibrary} from '../src/core/sound-library.js';
test('bundled defaults do not override a chosen recording or explicit placeholder',()=>{
 const lib=new SoundLibrary({storage:null});assert.equal(lib.source('scout-gunshot'),'bundled-recording');
 lib.setSettings('scout-gunshot',{source:'placeholder'});assert.equal(lib.source('scout-gunshot'),'synthesized-placeholder');
});
import {access} from 'node:fs/promises';
import {SOUND_LIBRARY_SAMPLES} from '../src/data/sound-library-recordings.js';
import {MANIFEST} from '../src/core/samples.js';
import {SOUND_CUE_BY_ID} from '../src/data/sound-library.js';
test('bundled mappings resolve catalog cues and existing files',async()=>{
 for(const [id,sample] of Object.entries(SOUND_LIBRARY_SAMPLES)){assert.ok(SOUND_CUE_BY_ID.has(id),id);assert.ok(MANIFEST[sample],sample);for(const f of MANIFEST[sample].f)await access('public/audio/'+f+'.mp3');}
});
function fixture(ready=true){
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({gain:param(),pan:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.();}});
 const sources=[];const ctx={state:'running',currentTime:1,destination:node(),createGain:node,createStereoPanner:node,createBufferSource(){const n=node();sources.push(n);return n;},createOscillator(){throw Error('bundled cue must not beep');}};
 const buffer={duration:2};const audio={ctx,muted:false,_sus:new Set(),_pg:()=>1,_pan:()=>0,sampleBuffer:()=>ready?buffer:null};
 return {lib:new SoundLibrary({storage:null,audio}),audio,sources,buffer};
}
test('bundled loop keeps watchdog ownership and stops its actual buffer',()=>{
 const {lib,audio,sources,buffer}=fixture();const h=lib.play('weather-domain-rain',{pos:{x:1,y:0,z:1}});
 assert.equal(h.source,'bundled-recording');assert.equal(sources[0].buffer,buffer);assert.equal(sources[0].loop,true);assert.ok(audio._sus.has(h));h.set(.5);h.stop();assert.equal(audio._sus.size,0);assert.equal(lib.active.size,0);
});
test('native recording stays synchronous and yields to fallback until decoded',()=>{
 assert.equal(fixture(false).lib.native('light'),false);
 const {lib,sources}=fixture();assert.equal(lib.native('light'),true);assert.equal(sources.length,1);
 lib.state.bindings.light={name:'custom.mp3',data:'test'};lib.buffers.set('light',{data:'test',buffer:{duration:1}});assert.equal(lib.source('light'),'chosen-recording');
});

test('successful grab cue has a bundled capture recording with no synth duplicate',()=>{
 const {lib,sources}=fixture();
 assert.equal(lib.source('grab'),'bundled-recording');
 assert.equal(lib.native('grab',{pos:{x:1,y:2,z:3}}),true);
 assert.equal(sources.length,1);assert.equal(sources[0].loop,false);
});
test('vehicle destruction uses an existing explosion recording without a placeholder oscillator',()=>{
 const {lib,sources,buffer}=fixture();const h=lib.play('vehicle-explosion',{pos:{x:0,y:0,z:0}});
 assert.equal(SOUND_LIBRARY_SAMPLES['vehicle-explosion'],'boom');assert.equal(h.source,'bundled-recording');assert.equal(sources.length,1);assert.equal(sources[0].buffer,buffer);assert.equal(sources[0].loop,false);h.stop();
});
test('audition prepares bundled audio without changing saved source preferences',async()=>{
 const requested=[];const lib=new SoundLibrary({storage:null,audio:{prepareSample:async id=>{requested.push(id);return {};}}});
 lib.setSettings('scout-gunshot',{source:'placeholder'});const before=lib.exportPackage();
 assert.equal(await lib.prepareAudition('scout-gunshot'),'bundled-recording');assert.deepEqual(requested,['wpn.saw']);assert.deepEqual(lib.exportPackage(),before);
});
