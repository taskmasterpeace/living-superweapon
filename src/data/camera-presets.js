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
// Temporary vehicles win; an explicit player choice wins over the match preset,
// then the Studio character profile, then the calibrated BFP defaults in World.
// Passing preferences explicitly keeps Studio previews and NPCs independent.
export function cameraProfileOf(subject,preference=null){
 if(subject._aircraftVehicle)return subject._aircraftVehicle.kind==='jet'?JET_CAMERA:HELICOPTER_CAMERA;
 if(subject._scoutVehicle)return SCOUT_CAMERA;
 if(preference){
  const profile={...(preference.mode==='shoulder'?FRONTLINE_CAMERA:CAMERA_DEFAULTS)};
  for(const key of ['fov','range'])if(Number.isFinite(preference[key]))profile[key]=preference[key];
  return profile;
 }
 return subject._cameraPreset==='frontline'?FRONTLINE_CAMERA:subject.def?.model?.camera||(subject._openSky?POWERWORLD_BACKSIDE_CAMERA:undefined);
}
