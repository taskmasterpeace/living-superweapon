import {movementProfile} from '../data/movement-gears.js';
export const GEAR_TAP_WINDOW=.30,POWERUP_HOLD=.45;
export function createMovementGears(){return {gear:0,sequence:0,held:false,gap:Infinity,holdTime:0,ready:false,limited:false,blocked:false,cancelVersion:undefined,groundRecover:false,managed:false};}
export function resetMovementGears(f,requireRelease=true){
 const s=f.movementGear??=createMovementGears(),version=s.cancelVersion,managed=s.managed;
 Object.assign(s,createMovementGears(),{blocked:requireRelease,cancelVersion:version,managed});
 f.cruiseHeld=false;f._gearGroundSteering=false;f._gearUiHeld=false;
 return s;
}
export function movementGearBlocked(f){return f.alive===false||f.state==='ko'||f._formDisposed||f.grabbedBy||f.grabState==='clinch'||f.staggerT>0||f.frozenT>0||f.stunT>0||f.downedT>0||f.hanging||f._scoutVehicle||f._aircraftVehicle;}

// A semantic held action: keyboard union, R1, bots and held stage-selector buttons
// all enter here. Only physical release/repress advances; repeated keydown cannot.
export function updateMovementGears(f,input={},dt=0){
 const s=f.movementGear??=createMovementGears(),held=!!input.held,elapsed=Number.isFinite(dt)?Math.max(0,dt):0;
 s.managed=true;
 const profile=s.profile=movementProfile(f),version=input.cancelVersion??s.cancelVersion;
 let powerupReady=false;
 if((s.cancelVersion!==undefined&&version!==s.cancelVersion)||input.active===false||movementGearBlocked(f)){
  resetMovementGears(f,true);s.cancelVersion=version;return {powerupReady};
 }
 s.cancelVersion=version;
 if(s.blocked){if(!held)s.blocked=false;return {powerupReady};}
 if(!held){
  if(s.held){s.gap=0;s.holdTime=0;s.ready=false;}else s.gap+=elapsed;
  s.held=false;s.gear=0;f.cruiseHeld=false;
  if(s.gap>GEAR_TAP_WINDOW){s.sequence=0;s.limited=false;}
  return {powerupReady};
 }
 const selected=Number.isInteger(input.selectGear)?Math.max(1,Math.min(3,input.selectGear)):null;
 if(!s.held||(selected!==null&&selected!==s.sequence)){
  s.sequence=selected??(s.gap<=GEAR_TAP_WINDOW?Math.min(3,s.sequence+1):1);
  s.holdTime=0;s.ready=false;
 }
 s.held=true;s.gear=Math.min(s.sequence,profile.maxGear);s.limited=s.sequence>profile.maxGear;
 s.holdTime+=elapsed;
 if(s.sequence>=2&&!s.ready&&s.holdTime+1e-9>=POWERUP_HOLD){s.ready=true;powerupReady=true;}
 f.cruiseHeld=!!f.flying&&s.gear>0;
 return {powerupReady};
}

// Called once from native move(). Travel billing requires movement intent;
// stationary power-up is a semantic event, never displacement or damage gain.
export function movementTravelScale(f,dir,dt,sprint=1){
 const s=f.movementGear;if(!s?.gear)return 1;
 if(movementGearBlocked(f)||f.guarding||f.meleeCharge>0||f.burstT>0||f._slideT>0||f._grapple)return 1;
 const p=s.profile??movementProfile(f),ground=!f.airborne;
 if(ground&&p.id==='soldier'&&!f.sprintHeld)return 1;
 const moving=Math.hypot(dir.x||0,dir.y||0,dir.z||0)>.01||(!ground&&(f.flyHeld||f.descendHeld));
 if(!moving)return 1;
 const index=s.gear-1,rate=(ground?p.groundKi:p.airKi)[index],bill=rate*Math.max(0,dt);
 if(bill>0&&!f.energyInfinite){
  if(f.ki+1e-9<bill){f.ki=0;resetMovementGears(f,true);f._game?.onDrained?.(f);return 1;}
  f.ki=Math.max(0,f.ki-bill);
 }
 if(ground)s.groundRecover=true;
 return (ground?p.ground:p.air)[index]/(ground&&p.id==='soldier'?sprint:1);
}

// Keep native gravity, slopes and swept collisions. Only acceleration/friction
// ownership changes, avoiding two damping passes and rate-dependent top speeds.
export function steerGroundGear(f,dir,speed,dt){
 const s=f.movementGear;
 if(!s?.groundRecover||f.airborne||movementGearBlocked(f)||f.launchT>0||f.burstT>0||f._slideT>0||f._thrownT>0||f._grapple)return false;
 const p=s.profile??movementProfile(f),v=f.vel,length=Math.hypot(dir.x||0,dir.z||0),moving=length>.01;
 const x=(dir.x||0)/Math.max(1,length),z=(dir.z||0)/Math.max(1,length),old=Math.hypot(v.x,v.z);
 const turning=moving&&old>1&&(v.x*x+v.z*z)/old<.8;
 const response=!moving?p.braking:turning?p.turning:s.gear?p.boostAcceleration:p.acceleration,k=1-Math.exp(-response*dt);
 v.x+=(x*speed-v.x)*k;v.z+=(z*speed-v.z)*k;
 if(!moving&&Math.hypot(v.x,v.z)<.4){v.x=v.z=0;if(!s.gear)s.groundRecover=false;}
 f._gearGroundSteering=true;
 return true;
}
