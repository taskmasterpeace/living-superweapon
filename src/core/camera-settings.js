// Player preferences are intentionally separate from Studio's character packages.
export const CAMERA_STORAGE_KEY='lsw.camera-preferences.v1';
// Same bounds as Studio LIMITS.camera; covered by the settings regression test.
export const CAMERA_OPTION_LIMITS=Object.freeze({fov:[40,85],range:[18,60]});
export function normalizeCameraPreferences(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||!['centered','shoulder'].includes(value.mode))return null;
  const out={mode:value.mode};
  for(const [key,[min,max]] of Object.entries(CAMERA_OPTION_LIMITS)){
    if(typeof value[key]==='number'&&Number.isFinite(value[key]))out[key]=Math.max(min,Math.min(max,value[key]));
  }
  return Object.freeze(out);
}
const storage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function loadCameraPreferences(store=storage()){
  try{return normalizeCameraPreferences(JSON.parse(store?.getItem(CAMERA_STORAGE_KEY)||'null'));}catch{return null;}
}
let preference=loadCameraPreferences();
export const getCameraPreferences=()=>preference;
export function setCameraPreferences(value,store=storage()){
  preference=normalizeCameraPreferences(value);
  try{if(preference)store?.setItem(CAMERA_STORAGE_KEY,JSON.stringify(preference));else store?.removeItem(CAMERA_STORAGE_KEY);}catch{/* Session-only when storage is unavailable. */}
  return preference;
}
export const resetCameraPreferences=(store=storage())=>setCameraPreferences(null,store);
