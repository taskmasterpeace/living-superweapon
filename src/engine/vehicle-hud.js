import {canPilotVehicle} from './mobility-policy.js';
import {soldierControlsActive} from '../core/soldier-controls.js';
import {unitsToMeters,unitsPerSecondToKmh} from '../core/world-units.js';

export function vehicleStatus(p){
 const a=p?._aircraftVehicle,v=p?._scoutVehicle;
 if(a)return `${a.kind==='jet'?'JET':'HELICOPTER'} · ${Math.round(unitsPerSecondToKmh(a.speed||0))} km/h · ${a.parked?'LANDED':'AIRBORNE'} · ALT ${Math.round(unitsToMeters(Math.max(0,a.wrapper.position.y-a.ground)))} m\n${a.kind==='jet'?'W/S PITCH · A/D BANK · Q/E RUDDER · R/F THROTTLE':'W/S FORWARD · A/D TURN · SPACE/Z LIFT'} · LMB CANNON · J EXIT AFTER LANDING`;
 if(v)return `ARMORED SCOUT · ${Math.round(unitsPerSecondToKmh(Math.abs(v.speed||0)))} km/h · HULL ${Math.max(0,Math.round(v.cover.hp))}\nWASD DRIVE · SPACE BRAKE · ${soldierControlsActive(p)?'E / J':'J'} EXIT · AUTOMATIC GUNNER`;
 return null;
}
export class VehicleHUD {
 constructor(stage){
  this.stage=stage;this.game=stage.g;
  if(typeof document==='undefined')return;
  this.el=document.createElement('aside');this.el.id='vehicleControls';this.el.setAttribute('aria-label','Vehicle controls');
  this.el.style.cssText='position:fixed;right:18px;bottom:18px;z-index:20;max-width:min(470px,calc(100vw - 36px));padding:12px 14px;border:1px solid oklch(.5 .08 80);border-radius:10px;background:oklch(.19 .02 80 / .95);color:oklch(.92 .045 80);font:600 12px/1.7 Inter,system-ui,sans-serif;white-space:pre-line;pointer-events:none;display:none';
  this.style=document.createElement('style');this.style.textContent='body.vehicle-occupied #hud .combat-dock{visibility:hidden}body:not(.vehicle-occupied) #vehicleControls{bottom:max(180px,22vh)!important}';document.head.append(this.style);document.body.append(this.el);
 }
 update(){
  if(!this.el)return;const g=this.game,p=g.player,active=g.running&&!g.matchOver&&!g.hud?.titleOpen;
  const occupied=!!(p?._scoutVehicle||p?._aircraftVehicle);document.body.classList.toggle('vehicle-occupied',active&&occupied);
  let text=active?vehicleStatus(p):null;
  if(!text&&active&&canPilotVehicle(p)){
   const use=soldierControlsActive(p,g)?'E / J':'J';
   const a=this.stage.aircraft?.piloting?.nearest(p);
   if(a)text=`${use} · PILOT ${a.kind==='jet'?'JET':'HELICOPTER'}`;
   else for(const v of this.stage.convoy?.vehicles||[]){
    const c=v.cover,dx=Math.max(0,Math.abs(p.pos.x-c.x)-c.hx),dz=Math.max(0,Math.abs(p.pos.z-c.z)-c.hz);
    if(!v.destroyed&&!v.occupant&&Math.hypot(dx,dz)<=7&&Math.abs(p.pos.y-v.ground)<8&&this.stage.convoy.driving._accessClear(p,v)){text=`${use} · DRIVE ARMORED SCOUT`;break;}
   }
  }
  this.el.style.display=text?'block':'none';if(text&&text!==this.text){this.el.textContent=text;this.text=text;}
 }
 dispose(){this.el?.remove();this.style?.remove();if(typeof document!=='undefined')document.body.classList.remove('vehicle-occupied');}
}
