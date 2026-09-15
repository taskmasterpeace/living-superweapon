export const fleetControls = cls => cls==='fixedwing'
 ? 'W/S nose down/up · A/D bank · R/F throttle +/− · G landing gear · Alt + mouse look · J exit · L next vehicle'
 : cls==='rotor' ? 'W/S forward/back · A/D turn · Space rise · Ctrl descend · Alt + mouse look · J exit · L next vehicle'
 : 'W/S drive · A/D steer · Space brake · Alt + mouse look · J exit · L next vehicle';
export function suppressFleetShortcut(game,code){return !!(game._simActive||game.player?._fleetVehicle)&&['KeyB','KeyN','BracketLeft','BracketRight','Tab'].includes(code);}
export class FleetControlsHud {
 constructor(){this.el=null;}
 update(actor){
  if(typeof document==='undefined')return;
  if(!actor){this.el?.remove();this.el=null;return;}
  if(!this.el){this.el=document.createElement('section');this.el.id='fleetControls';this.el.setAttribute('aria-label','Vehicle controls');this.el.style.cssText='position:fixed;top:74px;left:50%;transform:translateX(-50%);z-index:1200;max-width:780px;width:calc(100% - 40px);padding:12px 16px;border:1px solid #b58d3d;border-radius:10px;background:#141719f5;color:#fff1cf;font:600 14px/1.65 Inter,system-ui,sans-serif;box-shadow:0 4px 18px #0008;pointer-events:none;text-align:center';this.title=document.createElement('strong');this.title.style.cssText='display:block;color:#ffd24a;font-size:15px;letter-spacing:.02em';this.keys=document.createElement('div');this.el.append(this.title,this.keys);document.body.appendChild(this.el);}
  const m=actor.motion||{},speed=Math.hypot(m.vx||0,m.vy||0,m.vz||0)*.19*3.6;
  const status=actor.cls==='fixedwing'?` · THROTTLE ${Math.round((m.lever||0)*100)}% · GEAR ${m.gearDown?'DOWN':'UP'}${m.stalled?' · STALL — R TO ADD THROTTLE':''}`:'';
  this.title.textContent=`${actor.name||actor.id} · ${Math.round(speed)} km/h${status}`;
  this.keys.textContent=fleetControls(actor.cls);
 }
 dispose(){this.el?.remove();this.el=null;}
}
