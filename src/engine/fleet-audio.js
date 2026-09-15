import {VEHICLE_RECORDINGS} from '../data/vehicle-recordings.js';

// One audio owner per pilot. Never queue a one-shot for replay after decoding.
// Each class has its own LOOP cue — wheeled idle rides the recorded car set;
// rotor/jet ride the sound-library's aircraft loops (their provenance is the
// library's own business: source() says recording vs placeholder, and the
// listening review for aircraft sources remains an open item — no claim made
// here beyond "the declared cue is audible and intensity-driven").
const LOOP_CUE = {wheeled:'vehicle-idle', rotor:'rotor', fixedwing:'jet'};
export class FleetAudio {
 constructor(audio){this.audio=audio;this.actor=null;this.idle=null;this.throttle=false;this.braking=false;}
 _play(id,loop=false){
  const lib=this.audio?.soundLibrary;if(!lib||!this.actor)return null;
  try{
   const source=lib.source(id);
   if(source==='bundled-recording'&&VEHICLE_RECORDINGS[id]&&!this.audio.sampleBuffer?.(VEHICLE_RECORDINGS[id]))return null;
   // SoundLibrary handles authored decode and explicit placeholder preferences.
   return lib.play(id,{pos:this.actor.pos,loop});
  }catch{return null;} // Audio failure cannot interrupt vehicle control.
 }
 enter(actor){this.stop();if(!actor||!LOOP_CUE[actor.cls])return;this.actor=actor;this.throttle=false;this.braking=false;if(actor.cls==='wheeled')this._play('vehicle-start');}
 pause(){try{this.idle?.stop();}catch{}this.idle=null;}
 update(controls={}){
  const a=this.actor;if(!a)return;
  const lib=this.audio?.soundLibrary;
  // The global watchdog or authoring stop may already have retired this handle.
  if(this.idle&&lib?.active&&!lib.active.has(this.idle))this.idle=null;
  if(!this.idle)this.idle=this._play(LOOP_CUE[a.cls],true);
  const m=a.motion||{},speed=Math.hypot(m.vx||0,m.vy||0,m.vz||0);
  const intensity=a.cls==='rotor'?Math.min(1,.3+.5*(m.spool??1)+speed/160)
    :a.cls==='fixedwing'?Math.min(1,.25+.6*(m.lever||0)+speed/500)
    :Math.min(1,.35+speed/90);
  try{this.idle?.set(intensity,a.pos);}catch{this.pause();}
  if(a.cls!=='wheeled')return;                     // accel/brake one-shots are car recordings
  const braking=!!controls.brake,throttle=Math.abs(controls.fwd||0)>.1&&!braking;
  if(throttle&&!this.throttle)this._play('vehicle-accel');
  if(braking&&!this.braking&&speed>2)this._play('vehicle-brake');
  this.throttle=throttle;this.braking=braking;
 }
 stop({off=false}={}){this.pause();if(off&&this.actor?.cls==='wheeled'&&!this.actor?.destroyed)this._play('vehicle-off');this.actor=null;}
}
