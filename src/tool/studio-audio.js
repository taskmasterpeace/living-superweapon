import {AudioBus} from '../core/audio.js';
import {SampleBank,HOT_SET} from '../core/samples.js';

const LOOPS=new Set(['charge','beamVoice','sustain','sampleLoop']);
const METHODS=['blast','boom','hit','impact','kiRelease','power','zap','gunshot','swing','meleeHit','grunt','teleport','land','yell','cry','bowLoose','sample','denied','drained'];
async function prepareSamples(audio){
 audio._bank??=new SampleBank(audio);audio._bank.preload(HOT_SET);
 await Promise.all([...audio._bank.pend.values()]);
}

// Studio owns a separate native mixer. Playback and deterministic reconstruction
// share simulation, but only live playback may send events to this output.
export class StudioAudio {
 constructor({backend=new AudioBus(),prepare=prepareSamples}={}){
  this.backend=backend;this.prepare=prepare;this.enabled=false;this.playing=false;this.scrubbing=false;
  this.disposed=false;this.handles=new Set();this.events=[];this.eventCount=0;this._epoch=0;
  this.audio=Object.fromEntries(METHODS.map(name=>[name,(...args)=>this._call(name,args)]));
  this.audio.soundLibrary={play:(id,options)=>{if(!this.active)return;this._record(id);return this.backend.soundLibrary?.play(id,options);}};
  for(const name of LOOPS)this.audio[name]=(...args)=>this._loop(name,args);
  this.audio.listen=(...args)=>{if(this.active)this.backend.listen?.(...args);};
  this.audio.sweep=()=>{if(this.active)this.backend.sweep?.();};
 }
 get active(){return this.enabled&&this.playing&&!this.scrubbing&&!this.disposed;}
 async enable(){
  if(this.disposed)return false;
  const epoch=++this._epoch;
  try{
   this.backend.init();
   if(!this.backend.ok)return false;
   await this.backend.ctx?.resume?.();
   await this.prepare(this.backend);
   if(this.disposed||epoch!==this._epoch)return false;
   this.enabled=true;return true;
  }catch{this.enabled=false;return false;}
 }
 disable(){++this._epoch;this.enabled=false;this.stop();}
 setPlaying(value){this.playing=!!value;if(!this.playing)this.stop();}
 setScrubbing(value){this.scrubbing=!!value;if(this.scrubbing)this.stop();}
 _record(name){this.eventCount++;this.events.push({name,time:this.backend.ctx?.currentTime??0});if(this.events.length>32)this.events.shift();}
 _call(name,args){
  if(!this.active||typeof this.backend[name]!=='function')return;
  this._record(name);return this.backend[name](...args);
 }
 _loop(name,args){
  const voice={handle:null,dead:false};
  const start=()=>{
   if(voice.dead||!this.active)return null;
   if(!voice.handle)voice.handle=this._call(name,args)||null;
   return voice.handle;
  };
  const drive=(method,values)=>{
   const h=start();if(!h)return;
   const fn=h[method]||h.set||h.ramp;fn?.apply(h,values);
  };
  voice.retire=()=>{voice.handle?.stop?.();voice.handle=null;};
  const facade={set:(...values)=>drive('set',values),ramp:(...values)=>drive('ramp',values),
   stop:()=>{if(voice.dead)return;voice.dead=true;voice.retire();this.handles.delete(voice);}};
  if(!this.disposed){this.handles.add(voice);start();}else voice.dead=true;
  return facade;
 }
 stop(){
  this.backend.soundLibrary?.stop();
  for(const voice of this.handles)voice.retire();
  for(const h of [...(this.backend._sus||[])])h.stop();
  // Disconnect the old buses, including one-shot tails. Resuming immediately
  // gets fresh routes, so old punches cannot become audible again. Native
  // source nodes still finish normally; decoded sample buffers remain cached.
  const a=this.backend;
  if(a.ctx&&a.ctx.state!=='closed'&&a.bus)for(const [name,old] of Object.entries(a.bus)){
   const level=old.gain.value;old.disconnect();
   const next=a.ctx.createGain();next.gain.value=level;next.connect(a.master);a.bus[name]=next;
  }
 }
 async dispose(){
  if(this.disposed)return;this.disable();this.disposed=true;
  for(const voice of this.handles)voice.dead=true;this.handles.clear();
  if(this.backend.ctx?.state!=='closed')await this.backend.ctx?.close?.();
 }
}
