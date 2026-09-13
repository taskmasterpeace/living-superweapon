import {SOUND_CUES,SOUND_CUE_BY_ID,generationBrief} from '../data/sound-library.js';

export const SOUND_LIBRARY_KEY='lsw.sound-library.v1';
export const SPEAKER_PROFILES=Object.freeze({default:{speakerCooldown:18},vega:{speakerCooldown:24},titan:{speakerCooldown:30},sarge:{speakerCooldown:22},decibel:{speakerCooldown:10},sol:{speakerCooldown:18}});
const clone=v=>JSON.parse(JSON.stringify(v));
const MAX_BYTES=1024*1024,MAX_PACKAGE=4*1024*1024;
const storageDefault=()=>{try{return globalThis.window?.localStorage??null;}catch{return null;}};
const getCue=(id,custom={})=>{const c=SOUND_CUE_BY_ID.get(id)||(Object.hasOwn(custom,id)?custom[id]:null);if(!c)throw Error(`Unknown cue: ${id}`);return c;};
export class SpeechGate {
 constructor(){this.reset();}
 reset(){this.lines=new Map();this.speakers=new Map();this.categories=new Map();this.lastBySpeaker=new Map();this.global=-Infinity;this.activeUntil=-Infinity;this.priority=0;}
 evaluate(cue,{speaker='default',now=0,eventTime=now,event=cue.event,contextValid=true,paused=false}={}){
  const reject=reason=>({accepted:false,reason});
  if(!cue.line)return {accepted:true,reason:'sfx-unthrottled'};
  if(paused)return reject('paused');
  if(!Number.isFinite(now)||!Number.isFinite(eventTime)||eventTime>now||now-eventTime>(cue.expiry??3))return reject('stale-event');
  if(!contextValid||event!==cue.event)return reject('context-mismatch');
  const profile=SPEAKER_PROFILES[speaker]||SPEAKER_PROFILES.default,key=cue.id;
  if(now-(this.speakers.get(speaker)??-Infinity)<profile.speakerCooldown)return reject('speaker-cooldown');
  if(now-this.global<8)return reject('global-gap');
  // Future-facing for authored speech longer than the global gap. Current 1.3s
  // candidate markers finish before that gap; priority never bypasses spacing.
  if(now<this.activeUntil&&(cue.priority??1)<=this.priority)return reject('lower-priority');
  if(now-(this.lines.get(key)??-Infinity)<(cue.lineCooldown??45))return reject('line-cooldown');
  if(this.lastBySpeaker.get(speaker)===cue.id)return reject('immediate-repeat');
  if(now-(this.categories.get(cue.category)??-Infinity)<(cue.categoryCooldown??12))return reject('category-cooldown');
  this.speakers.set(speaker,now);this.lines.set(key,now);this.categories.set(cue.category,now);this.lastBySpeaker.set(speaker,cue.id);this.global=now;this.activeUntil=now+cue.duration;this.priority=cue.priority??1;
  return {accepted:true,reason:'accepted'};
 }
}
function settings(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['gain','loop','source'].includes(k)))throw Error('Invalid cue settings');
 if(value.gain!==undefined&&(!Number.isFinite(value.gain)||value.gain<0||value.gain>1))throw Error('Gain must be 0–1');
 if(value.loop!==undefined&&typeof value.loop!=='boolean')throw Error('Loop must be boolean');
 if(value.source!==undefined&&!['chosen','placeholder'].includes(value.source))throw Error('Invalid source');
 return {...value};
}
function mediaBytes(binding){
 if(!binding||typeof binding.name!=='string'||binding.name.length>200||typeof binding.type!=='string'||!/^audio\/(wav|x-wav|wave|mpeg|ogg|webm|mp4|flac)$/.test(binding.type)||typeof binding.data!=='string'||binding.data.length>MAX_BYTES*1.34||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(binding.data))throw Error('Invalid or oversized audio recording (maximum 1 MiB)');
 const bytes=Uint8Array.from(atob(binding.data),c=>c.charCodeAt(0));
 if(bytes.length<32||bytes.length>MAX_BYTES)throw Error('Invalid audio recording');
 return bytes;
}
function customCue(c){
 if(!c||typeof c.id!=='string'||!/^custom\.[a-z0-9][a-z0-9-]{0,79}$/.test(c.id)||typeof c.label!=='string'||!c.label.trim()||c.label.length>100||typeof c.family!=='string'||!c.family.trim()||c.family.length>40||typeof c.loop!=='boolean')throw Error('Invalid custom sound entry');
 const duration=c.duration??(c.loop?3:.5);if(!Number.isFinite(duration)||duration<=0||duration>30)throw Error('Duration must be 0–30 seconds');
 const description=String(c.description||'').slice(0,1000);
 return {id:c.id,label:c.label.trim(),family:c.family.trim(),loop:c.loop,duration,description,event:c.id,phase:c.loop?'sustain':'impact',bus:'sfx',spatial:'world-distance-and-pan',gain:.55,cooldown:.08,concurrency:c.loop?1:4,wiring:'preview-only',nativeMethod:null,nativeNote:'Custom sound entry. Assign its recording to an existing connected cue to use it in gameplay. This entry alone does not create an event.',generationPrompt:description+' Deliver an isolated '+(c.loop?'seamless loop':'one-shot')+'; no music or unrelated sounds.',placeholder:{frequency:150,endFrequency:80,noise:.5,wave:'sine',attack:.02}};
}
function validatePackage(data){
 if(typeof data==='string'){if(data.length>MAX_PACKAGE)throw Error('Package exceeds 4 MiB');data=JSON.parse(data);}
 if(!data||data.format!=='lsw.sound-library'||data.version!==1||!data.bindings||!data.settings||Array.isArray(data.bindings)||Array.isArray(data.settings))throw Error('Not a Sound Library v1 package');
 if(JSON.stringify(data).length>MAX_PACKAGE)throw Error('Package exceeds 4 MiB');
 const next={format:'lsw.sound-library',version:1,bindings:{},settings:{}};
 if(data.customCues!==undefined){if(!data.customCues||Array.isArray(data.customCues)||typeof data.customCues!=='object'||Object.keys(data.customCues).length>200)throw Error('Invalid custom sound catalog');next.customCues={};for(const [id,c]of Object.entries(data.customCues)){const clean=customCue(c);if(id!==clean.id)throw Error('Sound ID mismatch');next.customCues[id]=clean;}}
 for(const [id,v] of Object.entries(data.settings)){getCue(id,next.customCues);next.settings[id]=settings(v);}
 for(const [id,b] of Object.entries(data.bindings)){getCue(id,next.customCues);mediaBytes(b);next.bindings[id]={name:b.name,type:b.type,data:b.data};}
 return next;
}
export class SoundLibrary {
 constructor({audio=null,context=null,output=null,storage=storageDefault()}={}){
  this.audio=audio;this.context=context;this.output=output;this.storage=storage;this.state={format:'lsw.sound-library',version:1,bindings:{},settings:{}};this.buffers=new Map();this.active=new Set();this.events=[];this.gate=new SpeechGate();this.lastCue=new Map();this.lastPlayback=null;this.error='';this._loadSerial=0;
  try{const saved=storage?.getItem(SOUND_LIBRARY_KEY);if(saved)this.state=validatePackage(saved);}catch(e){this.error=`Saved audio was not loaded: ${e.message}`;}
 }
 get cues(){return [...SOUND_CUES,...Object.values(this.state.customCues||{})];}
 cue(id){return getCue(id,this.state.customCues);}
 addCue(value){const c=customCue(value);if(this.cues.some(x=>x.id===c.id))throw Error('Sound ID already exists');const next=this.exportPackage();next.customCues={...next.customCues,[c.id]:c};this._commit(validatePackage(next));return c;}
 editCue(id,value){if(!this.state.customCues?.[id])throw Error('Only custom entries can be renamed');const next=this.exportPackage();next.customCues[id]=customCue({...next.customCues[id],...value,id});this._commit(validatePackage(next));}
 async reuseRecording(from,to){this.cue(from);this.cue(to);const b=this.state.bindings[from];if(!b)throw Error('Source has no recording assigned');const next=this.exportPackage();next.bindings[to]=clone(b);next.settings[to]={...next.settings[to],source:'chosen'};await this.importPackage(next);}
 get ctx(){return this.context||this.audio?.ctx;}
 async ready(){if(!this.ctx)throw Error('Start audio with Play or a browser gesture first');await this.ctx.resume?.();await this.prepare();return this;}
 async prepare(){
  const serial=++this._loadSerial;
  for(const [id,b] of Object.entries(this.state.bindings)){
   if(this.buffers.get(id)?.data===b.data)continue;
   try{const buffer=await this.ctx.decodeAudioData(mediaBytes(b).buffer);if(serial===this._loadSerial&&this.state.bindings[id]?.data===b.data)this.buffers.set(id,{data:b.data,buffer});}
   catch(e){this.error=`${b.name}: unsupported audio; native fallback remains available`;}
  }
 }
 exportPackage(){return clone(this.state);}
 exportBrief(){const brief=generationBrief();brief.cues.push(...Object.values(this.state.customCues||{}).map(({id,family,event,generationPrompt,duration,loop,wiring})=>({id,family,event,generationPrompt,duration,loop,wiring})));return brief;}
 _commit(next,buffers=this.buffers){
  const text=JSON.stringify(next);if(text.length>MAX_PACKAGE)throw Error('Package exceeds 4 MiB');
  try{this.storage?.setItem(SOUND_LIBRARY_KEY,text);}catch{throw Error('Local audio storage is full or unavailable. Remove a recording or export the current library.');}
  this.state=next;this.buffers=buffers;
 }
 async importPackage(data){
  const previous=this.state,next=validatePackage(data),buffers=new Map();
  if(Object.keys(next.bindings).length&&!this.ctx)throw Error('Press Play to enable audio before importing recordings');
  for(const [id,b] of Object.entries(next.bindings)){
   let buffer;try{buffer=await this.ctx.decodeAudioData(mediaBytes(b).buffer);}catch{throw Error(`Cannot decode ${b.name}; previous library was kept`);}
   if(!Number.isFinite(buffer.duration)||buffer.duration<=0||buffer.duration>30)throw Error('Recordings must be at most 30 seconds');
   buffers.set(id,{data:b.data,buffer});
  }
  if(this.state!==previous)throw Error('Library changed while importing; retry with the current library.');
  this._commit(next,buffers);this.stop();return this.exportPackage();
 }
 async addMissingRecordings(data){
  const incoming=validatePackage(data),next=this.exportPackage();let added=0;
  for(const [id,binding]of Object.entries(incoming.bindings)){
   if(next.bindings[id])continue;
   if(incoming.customCues?.[id]&&!next.customCues?.[id])next.customCues={...next.customCues,[id]:incoming.customCues[id]};
   next.bindings[id]=binding;next.settings[id]={...incoming.settings[id],...next.settings[id]};added++;
  }
  if(added)await this.importPackage(next);
  return {added,kept:Object.keys(incoming.bindings).length-added};
 }
 async bindRecording(id,file){
  this.cue(id);if(!file||file.size>MAX_BYTES)throw Error('Choose an audio recording up to 1 MiB');
  const bytes=new Uint8Array(await file.arrayBuffer());let text='';for(let i=0;i<bytes.length;i++)text+=String.fromCharCode(bytes[i]);
  const next=this.exportPackage();next.bindings[id]={name:file.name||'recording.wav',type:file.type||'audio/wav',data:btoa(text)};next.settings[id]={...next.settings[id],source:'chosen'};
  await this.importPackage(next);return this.state.bindings[id];
 }
 removeRecording(id){this.cue(id);const next=this.exportPackage();delete next.bindings[id];this._commit(next);this.buffers.delete(id);this.stop();}
 setSettings(id,value){this.cue(id);const next=this.exportPackage();next.settings[id]=settings({...next.settings[id],...value});this._commit(next);}
 source(id){this.cue(id);return this.state.settings[id]?.source!=='placeholder'&&this.state.bindings[id]?'chosen-recording':'synthesized-placeholder';}
 eventGate(id,options){const result=this.gate.evaluate(this.cue(id),options);this._record({id,...result,speaker:options?.speaker});return result;}
 _record(e){this.events.push({...e,time:this.ctx?.currentTime??0});if(this.events.length>40)this.events.shift();}
 audition(id,options={}){this.stop();return this.play(id,{...options,audition:true});}
 play(id,{pos=null,gain=1,audition=false,source=null,loop:loopOverride,event=null}={}){
  const cue=this.cue(id),ctx=this.ctx;if(!ctx||ctx.state!=='running'||this.audio?.muted)return null;
  if(event){const decision=this.eventGate(id,event);if(!decision.accepted)return null;}
  const authored=this.state.settings[id]||{},loop=loopOverride??authored.loop??cue.loop,now=ctx.currentTime;
  if(!audition&&(now-(this.lastCue.get(id)??-Infinity)<cue.cooldown||[...this.active].filter(h=>h.id===id).length>=cue.concurrency)){this._record({id,accepted:false,reason:'sfx-cooldown-or-concurrency'});return null;}
  const selected=source||this.source(id),decoded=this.buffers.get(id),recording=selected==='chosen-recording'&&decoded?.data===this.state.bindings[id]?.data?decoded.buffer:null;
  if(selected==='chosen-recording'&&!recording){this._record({id,accepted:false,reason:'recording-not-decoded'});return null;}
  const reach=cue.reach??150;
  const out=ctx.createGain(),baseLevel=Math.max(0,Math.min(1,Number.isFinite(gain)?gain:1))*(authored.gain??cue.gain),level=baseLevel*(audition?1:(this.audio?._pg?.(pos,reach)??1));
  out.gain.setValueAtTime(.00001,now);out.gain.linearRampToValueAtTime(level*.35,now+cue.placeholder.attack);
  const nodes=[],output=this.output||this.audio?.bus?.[cue.bus]||ctx.destination;
  let pan=null;
  if(!audition&&pos&&ctx.createStereoPanner){pan=ctx.createStereoPanner();pan.pan.value=this.audio?._pan?.(pos)??0;out.connect(pan);pan.connect(output);nodes.push(pan);}else out.connect(output);
  const sources=[],duration=recording?.duration||cue.duration;
  if(recording){const s=ctx.createBufferSource();s.buffer=recording;s.loop=loop;s.connect(out);sources.push(s);}
  else {
   const p=cue.placeholder,o=ctx.createOscillator(),og=ctx.createGain();o.type=p.wave;o.frequency.setValueAtTime(p.frequency,now);o.frequency.exponentialRampToValueAtTime(p.endFrequency,now+duration);og.gain.value=.4*(1-p.noise*.5);o.connect(og);og.connect(out);nodes.push(og);sources.push(o);
   const s=ctx.createBufferSource(),buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*Math.min(duration,2)),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*p.noise*.5;
   s.buffer=buffer;s.loop=loop;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=Math.max(300,p.frequency*5);s.connect(f);f.connect(out);nodes.push(f);sources.push(s);
  }
  let stopped=false;
  const cleanup=()=>{this.active.delete(handle);this.audio?._sus?.delete(handle);for(const n of [...sources,...nodes,out])try{n.disconnect();}catch{}};
  const handle={id,source:recording?'chosen-recording':'synthesized-placeholder',name:recording?this.state.bindings[id].name:null,loop,last:performance.now(),
   stop:()=>{
    if(stopped)return;stopped=true;const t=ctx.currentTime;
    out.gain.cancelScheduledValues(t);out.gain.setTargetAtTime(.00001,t,.015);
    for(const s of sources)try{s.stop(t+.07);}catch{}
    this.active.delete(handle);this.audio?._sus?.delete(handle);
   },
   set:(intensity=1,p=pos)=>{
    if(stopped)return;handle.last=performance.now();
    out.gain.setTargetAtTime(Math.max(.00001,baseLevel*Math.max(0,Math.min(1.5,intensity))*(audition?1:(this.audio?._pg?.(p,reach)??1))),ctx.currentTime,.04);
    if(pan)pan.pan.setTargetAtTime(this.audio?._pan?.(p)??0,ctx.currentTime,.04);
   },
  };
  if(loop&&!audition)this.audio?._sus?.add(handle);
  handle.ramp=handle.set;sources[0].onended=cleanup;for(const s of sources){s.start(now);if(!loop)s.stop(now+duration+.03);}if(!loop){out.gain.setTargetAtTime(.00001,now+Math.max(cue.placeholder.attack,duration*.45),Math.max(.008,duration*.15));}
  this.active.add(handle);this.lastCue.set(id,now);this.lastPlayback={id,source:handle.source,name:handle.name,loop,time:now,native:!audition};this._record({...this.lastPlayback,accepted:true,reason:'playing'});return handle;
 }
 // Synchronous native contact: never queue a stale hit while decoding a file.
 native(id,options={}){if(this.source(id)!=='chosen-recording'||!this.buffers.has(id))return false;try{this.play(id,{...options,loop:false});return true;}catch(e){this.error=e.message;return false;}}
 stop(){for(const h of [...this.active])h.stop();}
}
