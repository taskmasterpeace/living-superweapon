import {VEHICLE_RECORDINGS} from '../data/vehicle-recordings.js';

// One audio owner per pilot. Never queue a one-shot for replay after decoding.
export class FleetAudio {
 constructor(audio){this.audio=audio;this.actor=null;this.idle=null;this.throttle=false;this.braking=false;}
 _play(id,loop=false){
  const lib=this.audio?.soundLibrary;if(!lib||!this.actor)return null;
  try{
   const source=lib.source(id);
   if(source==='bundled-recording'&&!this.audio.sampleBuffer?.(VEHICLE_RECORDINGS[id]))return null;
   // SoundLibrary handles authored decode and explicit placeholder preferences.
   return lib.play(id,{pos:this.actor.pos,loop});
  }catch{return null;} // Audio failure cannot interrupt vehicle control.
 }
 enter(actor){this.stop();if(actor?.cls!=='wheeled')return;this.actor=actor;this.throttle=false;this.braking=false;this._play('vehicle-start');}
 pause(){try{this.idle?.stop();}catch{}this.idle=null;}
 update(controls={}){
  const a=this.actor;if(!a)return;
  const lib=this.audio?.soundLibrary;
  // The global watchdog or authoring stop may already have retired this handle.
  if(this.idle&&lib?.active&&!lib.active.has(this.idle))this.idle=null;
  if(!this.idle)this.idle=this._play('vehicle-idle',true);
  const speed=Math.hypot(a.motion?.vx||0,a.motion?.vz||0);
  try{this.idle?.set(Math.min(1,.35+speed/90),a.pos);}catch{this.pause();}
  const braking=!!controls.brake,throttle=Math.abs(controls.fwd||0)>.1&&!braking;
  if(throttle&&!this.throttle)this._play('vehicle-accel');
  if(braking&&!this.braking&&speed>2)this._play('vehicle-brake');
  this.throttle=throttle;this.braking=braking;
 }
 stop({off=false}={}){this.pause();if(off&&!this.actor?.destroyed)this._play('vehicle-off');this.actor=null;}
}
