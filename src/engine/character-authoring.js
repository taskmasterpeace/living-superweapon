import * as T from 'three';
export const AUTHORING_SCHEMA='powerworld-authoring-v1';
export const RIG='ual-deform-v1';
const finite=(v,min,max,label)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+label);return v;};
const vector=(v,n,min,max,label)=>{if(!Array.isArray(v)||v.length!==n)throw Error('Invalid '+label);return v.map(x=>finite(x,min,max,label));};
export function validateAsset(input,bones){
 if(input?.schema!==AUTHORING_SCHEMA||input.rig!==RIG)throw Error('Expected Power World UAL authoring asset');
 const out={schema:AUTHORING_SCHEMA,rig:RIG,name:String(input.name||'Untitled').slice(0,80),parts:[],motion:null};
 if(!Array.isArray(input.parts)||input.parts.length>64)throw Error('Maximum 64 rigid parts');
 out.parts=input.parts.map(p=>{
  if(!bones.includes(p.bone))throw Error('Unknown socket '+p.bone);
  if(!['box','sphere','cylinder'].includes(p.shape))throw Error('Unknown primitive');
  if(!/^#[a-f0-9]{6}$/i.test(p.color))throw Error('Invalid part color');
  return {name:String(p.name||'Part').slice(0,60),bone:p.bone,shape:p.shape,color:p.color,position:vector(p.position,3,-3,3,'position'),rotation:vector(p.rotation,3,-Math.PI*2,Math.PI*2,'rotation'),size:vector(p.size,3,.001,3,'size')};
 });
 if(input.motion){
  const m=input.motion;if(m.hand!==undefined&&!['left','right','both'].includes(m.hand))throw Error('Invalid motion hand');const d=finite(m.duration,.1,30,'duration');
  if(m.contactStyle!==undefined&&!['carry','front','rear','side','neck'].includes(m.contactStyle))throw Error('Invalid contact style');
  let visualReview;
  if(m.visualReview!==undefined){
   const r=m.visualReview;
   if(!r||typeof r.rejected!=='boolean'||typeof r.note!=='string'||r.note.length>1000)throw Error('Invalid visual review');
   visualReview={rejected:r.rejected,note:r.note};
  }
  const markers={};for(const key of ['contact','release','controlReturn'])markers[key]=finite(m.markers?.[key],0,d,key);
  if(markers.contact>markers.release||markers.release>markers.controlReturn)throw Error('Markers must be contact ≤ release ≤ control return');
  if(!Array.isArray(m.keys)||m.keys.length<1||m.keys.length>240)throw Error('Use 1–240 keyframes');
  const bodyTrack=m.keys.some(k=>k.bodyPosition!==undefined);
  if(bodyTrack&&!bones.includes('DEF-hips'))throw Error('Body position requires DEF-hips');
  let previous=-1;
  const keys=m.keys.map(k=>{const time=finite(k.time,0,d,'key time');if(time<=previous)throw Error('Keyframe times must increase');previous=time;
   const pose={};for(const [bone,q] of Object.entries(k.pose||{})){if(!bones.includes(bone))throw Error('Unknown pose bone '+bone);const a=vector(q,4,-1,1,'quaternion'),len=Math.hypot(...a);if(Math.abs(len-1)>.01)throw Error('Quaternion must be normalized');pose[bone]=a;}return {time,pose,...(bodyTrack?{bodyPosition:vector(k.bodyPosition,3,-5,5,'body position')}: {})};});
  out.motion={...(visualReview?{visualReview}:{}),contactStyle:m.contactStyle||'carry',hand:m.hand||'right',name:String(m.name||out.name).slice(0,80),duration:d,loop:!!m.loop,base:String(m.base||'Idle_Loop').slice(0,100),markers,keys,status:'candidate',source:String(m.source||'Hand authored in Power World').slice(0,240)};
 }return out;
}
export function samplePose(m,time){
 const t=Math.max(0,Math.min(m.duration,time));let a=m.keys[0],b=a;
 for(const k of m.keys){if(k.time<=t)a=k;if(k.time>=t){b=k;break;}b=k;}
 const f=b.time>a.time?(t-a.time)/(b.time-a.time):0,pose={};
 for(const name of new Set([...Object.keys(a.pose),...Object.keys(b.pose)])){
  const q=a.pose[name]||b.pose[name],r=b.pose[name]||q;pose[name]=new T.Quaternion().fromArray(q).slerp(new T.Quaternion().fromArray(r),f).toArray();
}return pose;
}
// Absolute local hip translation in source-rig metres; never an entity transform.
export function sampleBodyPosition(m,time){
 if(!m.keys[0].bodyPosition)return null;
 const t=T.MathUtils.clamp(time,0,m.duration);let a=m.keys[0],b=a;
 for(const key of m.keys){if(key.time<=t)a=key;if(key.time>=t){b=key;break;}b=key;}
 const alpha=b.time>a.time?(t-a.time)/(b.time-a.time):0;
 return a.bodyPosition.map((v,i)=>T.MathUtils.lerp(v,b.bodyPosition[i],alpha));
}
export function createAuthoredParts(actor){
 let mounted=[],signature='';return {set(asset){const next=JSON.stringify(asset.parts);if(signature===next)return;this.dispose();signature=next;for(const p of asset.parts){const bone=actor.getObjectByName(p.bone);if(!bone)continue;
 const geo=p.shape==='box'?new T.BoxGeometry(1,1,1):p.shape==='sphere'?new T.IcosahedronGeometry(.5,1):new T.CylinderGeometry(.5,.5,1,8);
 const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:p.color,roughness:.75}));mesh.name='Authored '+p.name;mesh.position.fromArray(p.position);mesh.rotation.fromArray([...p.rotation,'XYZ']);mesh.scale.fromArray(p.size);bone.add(mesh);mounted.push(mesh);}},dispose(){for(const m of mounted){m.removeFromParent();m.geometry.dispose();m.material.dispose();}mounted=[];signature='';}};
}
export function recipeEnvelope(recipe){return {schema:1,skeleton:RIG,body:'faceted-v1',...recipe};}
export const RECIPE_STORE='powerworld.character-recipes.v1';
export function saveCharacterRecipe(id,recipe,storage=globalThis.localStorage){
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id))throw Error('Choose a roster character');
 const data=JSON.parse(storage.getItem(RECIPE_STORE)||'{}');data[id]=recipeEnvelope(recipe);storage.setItem(RECIPE_STORE,JSON.stringify(data));
}
export function readCharacterRecipe(id,storage=globalThis.localStorage){try{return JSON.parse(storage?.getItem(RECIPE_STORE)||'{}')[id]||null;}catch{return null;}}
// Compile validated authoring keys to the same Three.js clip format as the source bank.
// This does not grant a clip gameplay authority; the action registry owns admission.
export function compileAuthoredMotion(asset){
 const m=asset.motion;if(!m)throw Error('Asset has no motion');
 const names=new Set(m.keys.flatMap(k=>Object.keys(k.pose)));
 const tracks=[...names].map(name=>new T.QuaternionKeyframeTrack(name+'.quaternion',m.keys.map(k=>k.time),m.keys.flatMap(k=>samplePose(m,k.time)[name]||[0,0,0,1])));
 if(m.keys[0].bodyPosition)tracks.push(new T.VectorKeyframeTrack('DEF-hips.position',m.keys.map(k=>k.time),m.keys.flatMap(k=>k.bodyPosition)));
 const clip=new T.AnimationClip(m.name,m.duration,tracks);clip.userData={...(m.visualReview?{visualReview:{...m.visualReview}}:{}),rig:RIG,source:m.source,status:'candidate',markers:m.markers,hand:m.hand,contactStyle:m.contactStyle};return clip;
}
