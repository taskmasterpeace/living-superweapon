// Offline source validation, not retargeting or visual acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';

const root=path.resolve(process.argv[2]);
const manifest=JSON.parse(await fs.readFile(path.join(root,'source-manifest.json'),'utf8'));
const manager=new T.LoadingManager();
manager.setURLModifier(url=>{throw Error('External resource requires separate review: '+url);});
// This process audits motion only. Do not fetch referenced textures or claim material acceptance.
let skippedTextures=[], warnings=[];
console.warn=(...args)=>warnings.push(args.map(String).join(" "));
T.TextureLoader.prototype.load=function(url){skippedTextures.push(url??'(unspecified)');return new T.Texture();};
const loader=new FBXLoader(manager),results=[];
for(const pack of manifest.packs)for(const file of pack.files||[]){
 if(!file.path.toLowerCase().endsWith('.fbx'))continue;
 skippedTextures=[]; warnings=[];
 try{
  const data=await fs.readFile(file.path),actor=loader.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const bones=[];actor.traverse(o=>{if(o.isBone)bones.push(o.name);});
  const clips=actor.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length,valid:c.validate(),finite:c.tracks.every(t=>[...t.times,...t.values].every(Number.isFinite))}));
  results.push({pack:pack.id,path:file.path,bones: bones.length,boneNames:bones,clips,skippedTextures:[...new Set(skippedTextures)],warnings:[...warnings],status:!warnings.length&&clips.length&&clips.every(c=>c.valid&&c.finite&&c.duration>0&&c.tracks>0)?'source-parsed':'needs-review'});
  actor.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose();});
 }catch(e){results.push({pack:pack.id,path:file.path,status:'parse-failed',error:e.message});}
}
const summary=manifest.packs.map(p=>{const r=results.filter(x=>x.pack===p.id);return {pack:p.id,fbx:r.length,parsed:r.filter(x=>x.status==='source-parsed').length,needsReview:r.filter(x=>x.status!=='source-parsed').length,clips:r.reduce((n,x)=>n+(x.clips?.length||0),0)};});
await fs.writeFile(path.join(root,'fbx-audit-with-warnings.json'),JSON.stringify({acceptance:'Source parse and finite tracks only; no retarget, visual or gameplay approval',summary,results},null,2));
console.log(JSON.stringify(summary,null,2));
