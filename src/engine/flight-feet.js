import {Quaternion,Vector3} from 'three';
const axis=new Vector3(1,0,0),rotation=new Quaternion();
// Remove only our previous overlay before the native/authored pose runs again.
export function clearFlightFeet(f){for(const entry of f._flightFeet||[])entry.boot.quaternion.copy(entry.base);}
export function poseFlightFeet(f,dt){
 const active=f._openSky&&f.flying&&f.airborne&&f.alive&&!f.ragdoll&&f.def.flyStyle!=='ice';
 f._flightAnkle=(f._flightAnkle||0)+( (active ? .46 : 0)-(f._flightAnkle||0))*(1-Math.exp(-12*dt));
 if(!active)f._flightAnkle=0; // Landing returns to the native planted/authored foot.
 if(f._flightFeet?.[0]?.boot!==f.parts.legL.userData.boot)f._flightFeet=['L','R'].map(side=>({boot:f.parts['leg'+side].userData.boot,base:new Quaternion()}));
 for(const e of f._flightFeet){e.base.copy(e.boot.quaternion);e.boot.quaternion.multiply(rotation.setFromAxisAngle(axis,f._flightAnkle));}
}
