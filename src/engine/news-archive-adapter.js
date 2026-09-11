import {createNewsArchive} from '../core/news-archive.js';
let archive;
export function getNewsArchive(){return archive||(archive=createNewsArchive());}
export async function snapshotNewsClip(clip){
 const refs=Array.isArray(clip?.frames)?clip.frames.slice():[];
 const jobs=refs.map(async(ref,i)=>{if(ref instanceof Blob)return ref.slice(0,ref.size,ref.type);if(typeof ref!=='string'||ref.startsWith('#'))throw Error(`Archive frame ${i} is unresolved`);let response;try{response=await fetch(ref);}catch{throw Error(`Archive frame ${i} could not be read`);}if(!response.ok)throw Error(`Archive frame ${i} could not be read`);const blob=await response.blob();return blob.slice(0,blob.size,blob.type);});
 return {...clip,heroIds:[...(clip.heroIds||[])],shots:structuredClone(clip.shots||[]),frames:await Promise.all(jobs)};
}
export async function persistNewsClip(clip,encoder){
 // Start ownership of resolved URLs now. Pending encoder tokens are resolved after flush; newscrew
 // keeps only those token-bearing frames alive until this promise settles.
 const ownedFrame=ref=>snapshotNewsClip({...clip,frames:[ref]}).then(x=>({value:x.frames[0]}),error=>({error}));
 const refs=clip.frames.slice(),jobs=refs.map(ref=>typeof ref==='string'&&ref.startsWith('#')?null:ownedFrame(ref));
 await encoder?.flush?.();
 for(let i=0;i<jobs.length;i++)if(!jobs[i])jobs[i]=ownedFrame(clip.frames[i]);
 const results=await Promise.all(jobs),failure=results.find(result=>result.error);if(failure)throw failure.error;
 const owned={...clip,heroIds:[...(clip.heroIds||[])],shots:structuredClone(clip.shots||[]),frames:results.map(result=>result.value)};
 return getNewsArchive().put(owned);
}
export async function loadArchivedClip(id){const clip=await getNewsArchive().get(id);if(!clip)return null;let released=false;const frames=clip.frames.map(b=>URL.createObjectURL(b));return {...clip,frames,release(){if(released)return;released=true;for(const url of frames)URL.revokeObjectURL(url);}};}
