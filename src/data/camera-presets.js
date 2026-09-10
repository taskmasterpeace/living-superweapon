import {CAMERA_DEFAULTS} from './flight-tuning.js';

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
export function cameraProfileOf(subject){return subject._aircraftVehicle?(subject._aircraftVehicle.kind==='jet'?JET_CAMERA:HELICOPTER_CAMERA):subject._scoutVehicle?SCOUT_CAMERA:subject._cameraPreset==='frontline'?FRONTLINE_CAMERA:subject.def?.model?.camera;}
