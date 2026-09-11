import {createNewsArchive} from '../core/news-archive.js';
let archive;
export function getNewsArchive(){return archive||(archive=createNewsArchive());}
export async function snapshotNewsClip(clip){
 const refs=Array.isArray(clip?.frames)?clip.frames.slice():[];
 const jobs=refs.map(async(ref,i)=>{if(ref instanceof Blob)return ref.slice(0,ref.size,ref.type);if(typeof ref!=='string'||ref.startsWith('#'))throw Error(`Archive frame ${i} is unresolved`);let response;try{response=await fetch(ref);}catch{throw Error(`Archive frame ${i} could not be read`);}if(!response.ok)throw Error(`Archive frame ${i} could not be read`);const blob=await response.blob();return blob.slice(0,blob.size,blob.type);});
 return {...clip,heroIds:[...(clip.heroIds||[])],shots:structuredClone(clip.shots||[]),frames:await Promise.all(jobs)};
}
export async function persistNewsClip(clip,encoder){
 // Register token claims before flush: encoder completion hands Blobs directly to archive ownership
 // before onReady trimming or any field-footage owner can revoke/null the live array.
 const ownership=(encoder?.ownFrames?encoder.ownFrames(clip.frames):snapshotNewsClip(clip).then(x=>x.frames))
  .then(value=>({value}),error=>({error}));
 const [,result]=await Promise.all([encoder?.flush?.(),ownership]);if(result.error)throw result.error;
 const owned={...clip,heroIds:[...(clip.heroIds||[])],shots:structuredClone(clip.shots||[]),frames:result.value};
 return getNewsArchive().put(owned);
}
export async function loadArchivedClip(id){const clip=await getNewsArchive().get(id);if(!clip)return null;let released=false;const frames=clip.frames.map(b=>URL.createObjectURL(b));return {...clip,frames,release(){if(released)return;released=true;for(const url of frames)URL.revokeObjectURL(url);}};}
