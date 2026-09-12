import {movementProfile} from '../data/movement-gears.js';
let motionPreference;
export function flightTurbulence(f,time){
 motionPreference??=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
 if(motionPreference.matches||!f?.flying||!f?.alive||f._scoutVehicle||f._aircraftVehicle)return 0;
 const profile=movementProfile(f),top=(f.def.speed||30)*profile.air[profile.maxGear-1];
 const strength=Math.max(0,Math.min(1,(f.vel.length()/Math.max(1,top)-.55)/.45));
 return strength*.0025*(Math.sin(time*37)*.65+Math.sin(time*59)*.35);
}
export function updateFlightSense(f,dt,g){
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
