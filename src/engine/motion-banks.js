import bundled from '../data/locomotion-bank.json' with {type:'json'};
import * as authoredAssets from './authored-assets.js';

const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
};
const clone=value=>JSON.parse(JSON.stringify(value));
const FALLBACK={locomotion:bundled.clips};

function validatePoseBank(bank,ref){
 if(!bank||bank.version!==1||!bank.clips||typeof bank.clips!=='object')throw new Error(`${ref} has no compatible pose bank.`);
 for(const [id,clip] of Object.entries(bank.clips)){
  if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0||!Array.isArray(clip.frames)||clip.frames.length<2||clip.frames.some(frame=>!Array.isArray(frame)||frame.length!==45||frame.some(n=>!Number.isFinite(n))))
   throw new Error(`${ref} clip ${id} is not a compatible 45-value pose bridge.`);
 }
}

export function createMotionBankResolver(loader=authoredAssets){
 const packages=new Map();
 async function loadMotionPackage(ref){
  if(packages.has(ref))return packages.get(ref);
  const promise=(async()=>{
   const [resolved,raw]=await Promise.all([
    loader.resolvePackage(ref,'humanoid-motion'),
    loader.readOutput(ref,'pose-bank',{type:'json',expectedKind:'humanoid-motion'})
   ]);
   validatePoseBank(raw,ref);
   const metadata=Object.fromEntries((resolved.manifest.clips??[]).map(clip=>[clip.id,clone(clip)]));
   const value={ref,clips:clone(raw.clips),metadata,packageId:`${resolved.manifest.id}@${resolved.manifest.version}`,
    packageHash:resolved.packageHash,source:clone(raw.source??resolved.manifest.provenance??{})};
   return freeze(value);
  })();
  packages.set(ref,promise);try{const value=await promise;packages.set(ref,value);return value;}catch(error){packages.delete(ref);throw error;}
 }
 function resolveMotionClip(fighter,role,clipId){
  const ref=fighter?.def?.model?.assets?.motion?.[role],bound=fighter?._motionSources?.[role];
  const pack=bound?.ref===ref?bound:typeof ref==='string'?packages.get(ref):null;
  if(pack&&typeof pack.then!=='function'&&pack.clips[clipId])return {clip:pack.clips[clipId],metadata:pack.metadata[clipId]??null,
   packageId:pack.packageId,packageHash:pack.packageHash,source:pack.source};
  const clip=FALLBACK[role]?.[clipId];return clip?{clip,metadata:null,packageId:null,packageHash:null,source:'bundled'}:null;
 }
 function bindMotionPackage(fighter,role,pack){
  if(!fighter||!pack||pack.ref!==fighter.def?.model?.assets?.motion?.[role])return false;
  fighter._motionSources={...(fighter._motionSources??{}),[role]:pack};return true;
 }
 return {loadMotionPackage,resolveMotionClip,bindMotionPackage};
}

const singleton=createMotionBankResolver();
export const loadMotionPackage=(...args)=>singleton.loadMotionPackage(...args);
export const resolveMotionClip=(...args)=>singleton.resolveMotionClip(...args);
export const bindMotionPackage=(...args)=>singleton.bindMotionPackage(...args);
