import {movementProfile} from '../data/movement-gears.js';
import {SOUND_LIBRARY_SAMPLES} from '../data/sound-library-recordings.js';
export function stopFlightAudio(f){f._flightAudio?.stop();f._flightAudio=null;}
export function updateFlightAudio(f,g){
 const library=g.audio?.soundLibrary;
 const active=f===g.player&&f.alive&&f.flying&&f.airborne&&!(f.launchT>0)&&!f.grabbedBy&&!f._scoutVehicle&&!f._aircraftVehicle;
 if(!active||!library||g.audio.muted){stopFlightAudio(f);return;}
 const speed=f.vel.length(),previous=f._flightAudio;
 // Hysteresis keeps small hover drift from repeatedly restarting both recordings.
 const id=speed>(previous?.id==='flight'?5:9)?'flight':'hover';
 if(previous&&(previous.id!==id||!library.active.has(previous)))stopFlightAudio(f);
 const selected=library.source(id);
 const ready=selected==='chosen-recording'?library.buffers.has(id):selected==='bundled-recording'&&!!g.audio.sampleBuffer?.(SOUND_LIBRARY_SAMPLES[id]);
 if(!ready){stopFlightAudio(f);return;}
 f._flightAudio??=library.play(id,{pos:f.pos,loop:true});
 f._flightAudio?.set(id==='hover'?.35:Math.min(1,.35+speed/240),f.pos);
}
let motionPreference;
export function flightTurbulence(f,time){
 motionPreference??=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
 if(motionPreference.matches||!f?.flying||!f?.alive||f._scoutVehicle||f._aircraftVehicle)return 0;
 const profile=movementProfile(f),top=(f.def.speed||30)*profile.air[profile.maxGear-1];
 const strength=Math.max(0,Math.min(1,(f.vel.length()/Math.max(1,top)-.55)/.45));
 return strength*.0025*(Math.sin(time*37)*.65+Math.sin(time*59)*.35);
}
export function updateFlightSense(f,dt,g){
 updateFlightAudio(f,g);
 const s=f._flightSense??={sonic:false,cooldown:0,booms:0};s.cooldown=Math.max(0,s.cooldown-dt);
 const p=movementProfile(f),top=(f.def.speed||30)*p.air[p.maxGear-1];
 const active=f.alive&&f._openSky&&f.flying&&f.airborne&&p.maxGear===3;
 const ratio=active?f.vel.length()/Math.max(1,top):0;
 if(ratio<.5)s.sonic=false;
 if(active&&f.movementGear?.gear===3&&ratio>.8&&!s.sonic&&s.cooldown<=0){
  s.sonic=true;s.cooldown=3;s.booms++;
  const pos=f.center();g.vfx.ring(pos,{color:'#e7f5ff',r0:2,r1:22,life:.38,opacity:.7});
  g.vfx.ring(pos,{color:'#ffffff',r0:1,r1:13,life:.25,opacity:.5});
  g.audio.boom(.8,f.pos);
 }
}
