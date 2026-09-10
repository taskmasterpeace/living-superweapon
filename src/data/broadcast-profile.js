import {normalizeNewsCameraProfile} from '../engine/news-camera.js';
const KEY='lsw_broadcast_camera_v1';
export function broadcastPackage(profile){return {format:'lsw-broadcast-camera',version:1,camera:normalizeNewsCameraProfile(profile)};}
export function importBroadcastProfile(value){
 if(!value||value.format!=='lsw-broadcast-camera'||value.version!==1||!value.camera||typeof value.camera!=='object')throw new Error('Choose a version 1 LSW broadcast-camera package.');
 for(const k of ['crashZoom','handheld','shotHold'])if(typeof value.camera[k]!=='number'||!Number.isFinite(value.camera[k]))throw new Error('Camera values must be finite numbers.');
 return normalizeNewsCameraProfile(value.camera);
}
export function loadBroadcastProfile(storage=globalThis.localStorage){
 try{return importBroadcastProfile(JSON.parse(storage?.getItem(KEY)||'null'));}catch{return normalizeNewsCameraProfile();}
}
export function saveBroadcastProfile(profile,storage=globalThis.localStorage){
 const data=broadcastPackage(profile);if(!storage)throw new Error('Browser storage is unavailable. Export JSON to keep these settings.');
 storage.setItem(KEY,JSON.stringify(data));return data.camera;
}
