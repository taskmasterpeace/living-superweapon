import test from 'node:test';import assert from 'node:assert/strict';
import {blockedJabAudio} from '../src/engine/blocked-jab-audio.js';import {ROSTER} from '../src/data/characters.js';
import {AudioBus} from '../src/core/audio.js';import {MANIFEST,HOT_SET} from '../src/core/samples.js';import {SoundLibrary} from '../src/core/sound-library.js';
test('ordinary flesh blocks use a reduced physical recording or physical fallback, never energy zap',()=>{
 for(const ready of [true,false]){const calls=[],pos={};blockedJabAudio({soundLibrary:{native:(id,o)=>{calls.push(id);assert.equal(o.gain,.65);return ready;}},impact:(gain,p)=>{calls.push('impact');assert.equal(gain,.45);assert.equal(p,pos);},zap:()=>assert.fail('physical block beep')},'fist',{body:'flesh',def:{guardType:'block'}},pos);assert.deepEqual(calls,ready?['physical-jab-block']:['physical-jab-block','impact']);}
});
test('barrier and blade contacts keep existing semantics; author block preferences remain',()=>{
 for(const [kind,body,guardType]of [['fist','flesh','barrier'],['blade','flesh','block'],['fist','metal','block']]){let calls=0;blockedJabAudio({zap:()=>calls++},kind,{body,def:{guardType}},{});assert.equal(calls,1);}
 const lib=new SoundLibrary({storage:null});assert.equal(lib.source('physical-jab-block'),'bundled-recording');lib.state.bindings['physical-jab-block']={name:'custom',data:'custom'};assert.equal(lib.source('physical-jab-block'),'chosen-recording');
});
test('Sandra twin pistols select preloaded real pistol audio without changing shot mechanics',()=>{
 const d=ROSTER.find(d=>d.id==='sandra').abilities.lmb;assert.equal(d.voice,'pistol9');assert.equal(d.interval,.16);assert.equal(d.damage,10);
 const a=new AudioBus();a.ok=true;const calls=[];a.sample=(id,o)=>{calls.push(id);return true;};a.ctx={createOscillator:()=>assert.fail('ready pistol must not synthesize')};a.gunshot(.8,{},null,d.voice);
 assert.deepEqual(calls,['wpn.pistol']);assert.ok(HOT_SET.includes('wpn.pistol'));assert.ok(MANIFEST['wpn.pistol'].f.every(f=>f.startsWith('sfx-cc0/final/')));
});
