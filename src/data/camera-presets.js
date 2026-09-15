import {CAMERA_DEFAULTS} from './flight-tuning.js';
// PowerWorld's default is a right rear-quarter view. A positive shoulder moves
// the eye camera-right, leaving the player to the left of the aiming area.
export const POWERWORLD_BACKSIDE_CAMERA=Object.freeze({...CAMERA_DEFAULTS,shoulder:6});

// An explicit close presentation option, not a replacement for calibrated BFP.
export const FRONTLINE_CAMERA=Object.freeze({...CAMERA_DEFAULTS,range:20,height:6,shoulder:3.5,fov:68});
export function withCameraPreset(def,id){
 if(id!=='frontline')return def;
 return {...def,model:{...def.model,camera:{...FRONTLINE_CAMERA}}};
}
// Runtime choice is carried by the actor, not its replaceable appearance data.
const SCOUT_CAMERA=Object.freeze({...CAMERA_DEFAULTS,range:52,height:18,shoulder:0,fov:68});
const HELICOPTER_CAMERA=Object.freeze({...CAMERA_DEFAULTS,range:95,height:22,shoulder:0,fov:68});
const JET_CAMERA=Object.freeze({...CAMERA_DEFAULTS,range:155,height:35,shoulder:0,fov:72});
// PER-CLASS chase camera for the whole fleet — a size-aware 3rd-person boom. A
// normal vehicle uses its class base; a giant (the carrier, the mothership) gets
// pulled way back and up off its real footprint span, so piloting it feels like
// flying a building. `span` = the model's XZ half-extent (from catalog dimensions).
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const CLASS_CAMERA = Object.freeze({
  fixedwing: { range: 150, height: 34, fov: 72 }, rotor: { range: 92, height: 22, fov: 68 },
  wheeled: { range: 50, height: 18, fov: 68 }, tracked: { range: 58, height: 22, fov: 66 },
  hover: { range: 54, height: 20, fov: 70 }, mech: { range: 60, height: 30, fov: 64 },
  ship: { range: 200, height: 80, fov: 70 },
});
export function cameraForClass(cls, span = 0) {
  const b = CLASS_CAMERA[cls] || { range: CAMERA_DEFAULTS.range, height: CAMERA_DEFAULTS.height, fov: CAMERA_DEFAULTS.fov };
  const s = Number.isFinite(span) && span > 0 ? span : 0;
  return Object.freeze({ ...CAMERA_DEFAULTS, fov: b.fov, shoulder: 0, range: clampN(Math.round(b.range + s * 2.2), b.range, 700), height: clampN(Math.round(b.height + s * 0.8), b.height, 240) });
}

// Temporary vehicles win; an explicit player choice wins over the match preset,
// then the Studio character profile, then the calibrated BFP defaults in World.
// Passing preferences explicitly keeps Studio previews and NPCs independent.
export function cameraProfileOf(subject,preference=null){
 if(subject._fleetVehicle)return cameraForClass(subject._fleetVehicle.cls,subject._fleetVehicle.span);
 if(subject._aircraftVehicle)return subject._aircraftVehicle.kind==='jet'?JET_CAMERA:HELICOPTER_CAMERA;
 if(subject._scoutVehicle)return SCOUT_CAMERA;
 if(preference){
  const profile={...(preference.mode==='shoulder'?FRONTLINE_CAMERA:CAMERA_DEFAULTS)};
  for(const key of ['fov','range'])if(Number.isFinite(preference[key]))profile[key]=preference[key];
  return profile;
 }
 return subject._cameraPreset==='frontline'?FRONTLINE_CAMERA:subject.def?.model?.camera||(subject._openSky?POWERWORLD_BACKSIDE_CAMERA:undefined);
}
