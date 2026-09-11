// Reuse the native key light. A 110u city shadow view cannot cover this valley.
// Keep ownership reversible: no extra light, no retained obsolete render target.
const CAMERA_FIELDS=['left','right','top','bottom','near','far'];
function invalidate(shadow){
 shadow.map?.dispose();shadow.map=null;
 shadow.mapPass?.dispose();shadow.mapPass=null;
 shadow.needsUpdate=true;shadow.camera.updateProjectionMatrix();
}
export function installFrontlineLighting(stage){
 if(stage._frontlineLighting)return;
 const world=stage.g.world,shadow=world.sun?.shadow;if(!shadow||!world.sunOff)return;
 stage._frontlineLighting={offset:world.sunOff.clone(),size:shadow.mapSize.clone(),camera:Object.fromEntries(CAMERA_FIELDS.map(k=>[k,shadow.camera[k]]))};
 world.sunOff.set(900,360,576);
 Object.assign(shadow.camera,{left:-1000,right:1000,bottom:-1000,top:1000,near:10,far:3500});
 shadow.mapSize.set(4096,4096);invalidate(shadow);
}
export function restoreFrontlineLighting(stage){
 const saved=stage._frontlineLighting;if(!saved)return;
 const world=stage.g.world,shadow=world.sun.shadow;
 world.sunOff.copy(saved.offset);shadow.mapSize.copy(saved.size);Object.assign(shadow.camera,saved.camera);
 invalidate(shadow);stage._frontlineLighting=null;
}
