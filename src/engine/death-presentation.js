import * as T from 'three';
// Existing shipped GLB take. Simulation root and airborne impacts remain physics-owned.
export function beginDeathPresentation(f,{airborne=false}={}){
 const c=f._modularCharacter,clip=c?.clips.get('Death01');
 if(!clip||!(f.def.highwallBiological===true||f.def.model?.equipment==='soldier')||airborne||Math.hypot(f.vel.x,f.vel.y,f.vel.z)>28)return false;
 f._deathPresentation={take:'Death01',source:'/models/modular-hero/modular-hero.glb',elapsed:0,duration:clip.duration};return true;
}
export function sampleDeathPresentation(f){const s=f._deathPresentation,c=f._modularCharacter;if(!s||!c)return false;c.pose(s.take,Math.min(1,s.elapsed/s.duration));c.actor.updateWorldMatrix(true,true);return true;}
export function deathPoseJoints(f){
 const c=f._modularCharacter;if(!c)return null;const names={head:'head',chest:'spine.003',pelvis:'hips',shL:'upper_arm.R',shR:'upper_arm.L',elL:'forearm.R',elR:'forearm.L',haL:'hand.R',haR:'hand.L',hiL:'thigh.R',hiR:'thigh.L',kneeL:'shin.R',kneeR:'shin.L',ftL:'foot.R',ftR:'foot.L'};
 const out={};for(const [key,name]of Object.entries(names)){const bone=c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-'+name));if(!bone)return null;out[key]=bone.getWorldPosition(new T.Vector3());}return out;
}
// Align the hidden native contact meshes before capturing ragdoll local offsets.
// Captured source points alone cannot describe a prone body's mesh baseline.
export function seedDeathContactMeshes(f,j){
 const p=f.parts,restore=[],up=new T.Vector3(0,1,0);
 const put=(mesh,pos,q)=>{if(!mesh)return;restore.push({node:mesh,position:mesh.position.clone(),quaternion:mesh.quaternion.clone()});mesh.position.copy(pos);if(mesh.parent)mesh.parent.worldToLocal(mesh.position);const parent=mesh.parent?.getWorldQuaternion(new T.Quaternion()).invert();mesh.quaternion.copy(q);if(parent)mesh.quaternion.premultiply(parent);mesh.updateWorldMatrix(false,true);};
 const direction=(a,b)=>new T.Quaternion().setFromUnitVectors(up,new T.Vector3().subVectors(a,b).normalize());
 const torsoQ=direction(j.chest,j.pelvis);put(p.torso,j.chest,torsoQ);put(p.pelvis,j.pelvis,torsoQ);put(p.head,j.head,torsoQ);
 for(const side of ['L','R']){const a=p['arm'+side],leg=p['leg'+side].userData;const mid=(a,b)=>a.clone().lerp(b,.5);
  put(a.children[0],mid(j['sh'+side],j['el'+side]),direction(j['sh'+side],j['el'+side]));put(a.children[1],mid(j['el'+side],j['ha'+side]),direction(j['el'+side],j['ha'+side]));put(a.children[2],j['ha'+side],torsoQ);
  put(leg.thigh,mid(j['hi'+side],j['knee'+side]),direction(j['hi'+side],j['knee'+side]));put(leg.shin,mid(j['knee'+side],j['ft'+side]),direction(j['knee'+side],j['ft'+side]));put(leg.boot,j['ft'+side],torsoQ);put(leg.kneeCap,j['knee'+side],torsoQ);
 }
 return restore;
}
