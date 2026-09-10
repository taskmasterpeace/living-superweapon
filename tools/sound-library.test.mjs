import test from 'node:test';
import assert from 'node:assert/strict';

// Missing catalog/resolver is a behavioral failure before implementation exists.
const catalog=await import('../src/data/sound-library.js').catch(()=>({SOUND_CUES:[]}));
const core=await import('../src/core/sound-library.js').catch(()=>({}));
const {SOUND_CUES}=catalog;
test('every described family can resolve to an audible phase-specific recipe',()=>{
 assert.ok(SOUND_CUES.length>=60,'Complete cue library has not been implemented');
 for(const c of SOUND_CUES){assert.ok(c.placeholder.frequency>0,c.id);assert.ok(c.duration>0);assert.ok(c.generationPrompt.length>25);}
 assert.equal(new Set(SOUND_CUES.map(c=>c.id)).size,SOUND_CUES.length);
});
test('speech rejects repeated speakers, global overlap and stale events before consuming cooldowns',()=>{
 assert.equal(typeof core.SpeechGate,'function','Speech gate is not implemented');
 const g=new core.SpeechGate(),cue=SOUND_CUES.find(c=>c.line),other=SOUND_CUES.filter(c=>c.line)[1];
 assert.equal(g.evaluate(cue,{speaker:'vega',now:0,eventTime:0,event:cue.event}).accepted,true);
 assert.equal(g.evaluate(other,{speaker:'vega',now:1,eventTime:1,event:other.event}).reason,'speaker-cooldown');
 assert.equal(g.evaluate(other,{speaker:'sol',now:1,eventTime:1,event:other.event}).reason,'global-gap');
 assert.equal(g.evaluate(other,{speaker:'sol',now:20,eventTime:0,event:other.event}).reason,'stale-event');
 assert.equal(g.evaluate(other,{speaker:'sol',now:20,eventTime:20,event:other.event}).accepted,true);
});
test('line, category, anti-repeat, profile and priority policies make independent decisions',()=>{
 assert.equal(typeof core.SpeechGate,'function');
 const cues=SOUND_CUES.filter(c=>c.line),[a,b]=cues,g=new core.SpeechGate();
 const ev=(cue,speaker,now,extra={})=>g.evaluate(cue,{speaker,now,eventTime:now,event:cue.event,...extra});
 assert.equal(ev(a,'vega',0).accepted,true);
 assert.equal(ev(a,'vega',30).reason,'line-cooldown');
 assert.equal(ev(a,'vega',100).reason,'immediate-repeat');
 assert.equal(ev(b,'vega',100).accepted,true);
 assert.equal(ev(a,'vega',125).accepted,true);
 const h=new core.SpeechGate();h.evaluate(a,{speaker:'one',now:0,eventTime:0,event:a.event});
 assert.equal(h.evaluate({...b,category:a.category},{speaker:'two',now:9,eventTime:9,event:b.event}).reason,'category-cooldown');
 const active=new core.SpeechGate();active.evaluate({...a,duration:12,priority:3},{speaker:'one',now:0,eventTime:0,event:a.event});
 assert.equal(active.evaluate(b,{speaker:'two',now:9,eventTime:9,event:b.event}).reason,'lower-priority');
 assert.ok(core.SPEAKER_PROFILES.vega.speakerCooldown>core.SPEAKER_PROFILES.decibel.speakerCooldown);
});
test('a line cooldown is shared across speakers while distinct-line speaker cooldown stays independent',()=>{
 const [line,other]=SOUND_CUES.filter(c=>c.line),g=new core.SpeechGate();
 const event=(cue,speaker,now)=>g.evaluate(cue,{speaker,now,eventTime:now,event:cue.event});
 assert.equal(event(line,'vega',0).accepted,true);
 assert.deepEqual(event(line,'sol',20),{accepted:false,reason:'line-cooldown'});
 assert.equal(event(other,'sol',20).accepted,true,'Rejected same line must not consume Sol cooldown');
 assert.equal(event(line,'titan',44).reason,'line-cooldown');
 assert.equal(event(line,'titan',45).accepted,true,'Shared line expires exactly at 45 seconds');
});
test('malformed import never replaces valid settings or chosen media',async()=>{
 assert.equal(typeof core.SoundLibrary,'function');
 const a=new core.SoundLibrary({storage:null});a.setSettings('light',{gain:.4});
 const before=a.exportPackage();
 await assert.rejects(a.importPackage({format:'lsw.sound-library',version:1,settings:{light:{gain:99}},bindings:{}}));
 assert.deepEqual(a.exportPackage(),before);
 await assert.rejects(a.importPackage({...before,bindings:{light:{name:'bad.wav',type:'audio/wav',data:'not media'}}}));
 assert.deepEqual(a.exportPackage(),before);
});
test('validated local recording survives transfer and a rejected decoder leaves the good binding',async()=>{
 const ctx={decodeAudioData:async b=>{if(new Uint8Array(b)[0]!==82)throw Error('decode failure');return {duration:.1};}};
 const a=new core.SoundLibrary({storage:null,context:ctx});
 const data=new Uint8Array(48);data[0]=82;
 const file={name:'contact.wav',type:'audio/wav',size:48,arrayBuffer:async()=>data.buffer};
 await a.bindRecording('light',file);
 const b=new core.SoundLibrary({storage:null,context:ctx});await b.importPackage(a.exportPackage());
 assert.equal(b.source('light'),'chosen-recording');assert.equal(b.state.bindings.light.name,'contact.wav');assert.ok(b.buffers.has('light'));
 const before=b.exportPackage();data[0]=0;
 await assert.rejects(b.bindRecording('light',file),/Cannot decode/);assert.deepEqual(b.exportPackage(),before);
});
test('native melee contact is replaced as a whole, without original punch layers',async()=>{
 const {AudioBus}=await import('../src/core/audio.js');const a=new AudioBus();a.ok=true;
 const calls=[];a.soundLibrary={native:(...args)=>{calls.push(args);return true;}};
 a.impact=()=>{throw Error('Original impact should be replaced');};a.sample=()=>{throw Error('Original body layers should be replaced');};
 a.meleeHit(1,null,false);a.meleeHit(2,{x:1,y:0,z:2},true);
 assert.equal(calls.length,2);assert.equal(calls[0][0],'light');assert.equal(calls[1][0],'heavy');
});
