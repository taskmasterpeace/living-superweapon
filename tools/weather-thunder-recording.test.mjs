import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundLibrary} from '../src/core/sound-library.js';
import {SOUND_LIBRARY_SAMPLES} from '../src/data/sound-library-recordings.js';
import {MANIFEST,HOT_SET} from '../src/core/samples.js';
import {access} from 'node:fs/promises';

test('ordinary delayed thunder reuses the existing thunder one-shot and preserves author choices',async()=>{
 const lib=new SoundLibrary({storage:null});
 assert.equal(lib.source('weather-thunder'),'bundled-recording');
 assert.equal(SOUND_LIBRARY_SAMPLES['weather-thunder'],SOUND_LIBRARY_SAMPLES['weather-domain-thunder']);
 assert.equal(lib.cue('weather-thunder').loop,false);
 assert.ok(HOT_SET.includes('library.thunder'));
 for(const f of MANIFEST['library.thunder'].f)await access('public/audio/'+f+'.mp3');
 lib.state.bindings['weather-thunder']={name:'chosen.mp3',data:'chosen'};
 assert.equal(lib.source('weather-thunder'),'chosen-recording');
 lib.setSettings('weather-thunder',{source:'placeholder'});
 assert.equal(lib.source('weather-thunder'),'synthesized-placeholder');
 assert.equal(lib.source('rotor'),'synthesized-placeholder');
 assert.equal(lib.source('jet'),'synthesized-placeholder');
});

test('delayed thunder plays a positional buffer without oscillator or sustained-loop ownership',()=>{
 const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({gain:param(),pan:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.();}});
 const sources=[],buffer={duration:2.2},ctx={state:'running',currentTime:1,destination:node(),createGain:node,createStereoPanner:node,
  createBufferSource(){const n=node();sources.push(n);return n;},createOscillator(){assert.fail('thunder must use decoded recording');}};
 const pos={x:8,y:20,z:3},audio={ctx,_sus:new Set(),_pg:p=>{assert.equal(p,pos);return .6;},_pan:()=>.2,sampleBuffer:()=>buffer};
 const lib=new SoundLibrary({storage:null,audio}),handle=lib.play('weather-thunder',{pos});
 assert.equal(handle.source,'bundled-recording');assert.equal(sources.length,1);assert.equal(sources[0].buffer,buffer);
 assert.equal(sources[0].loop,false);assert.equal(audio._sus.size,0);handle.stop();assert.equal(lib.active.size,0);
});
