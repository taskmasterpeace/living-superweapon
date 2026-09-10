// Source adapter: Quaternius Universal Animation Library glTF/GLB → humanoid-motion package.
// Reads pinned local files only; the loader embeds the .bin as a data URI so no network path exists.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeSampler,resolveNodes,checkBindContract,retarget,analyzeTake} from '../lib/humanoid-retarget.js';
import {deriveEvents} from '../lib/clip-events.js';
import {POSE_BRIDGE} from '../lib/slots.js';

globalThis.ProgressEvent??=class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init);}};
async function loadScene(sources){
 const gltf=sources.find(s=>s.path.endsWith('.gltf')),glb=sources.find(s=>s.path.endsWith('.glb'));
 const loader=new GLTFLoader();
 let parsed;
 if(glb){parsed=await loader.parseAsync(glb.bytes.buffer.slice(glb.bytes.byteOffset,glb.bytes.byteOffset+glb.bytes.byteLength),'');}
 else if(gltf){
  const bin=sources.find(s=>s.path.endsWith('.bin'));if(!bin)throw new Error('a .gltf source needs its .bin listed as a source too');
  const document=JSON.parse(gltf.bytes.toString('utf8'));
  document.buffers[0].uri=`data:application/octet-stream;base64,${bin.bytes.toString('base64')}`;
  parsed=await loader.parseAsync(JSON.stringify(document),'');
 }else throw new Error('quaternius-ual needs a .gltf(+.bin) or .glb source');
 parsed.scene.updateMatrixWorld(true);
 return parsed;
}
export default {
 name:'quaternius-ual',version:1,kinds:['humanoid-motion'],
 async build({recipe,sources,log}){
  const gltf=await loadScene(sources);
  const conversion={scale:1,yawDegrees:0,mirrorX:false,sourceUp:'+Y',sourceForward:'+Z',...recipe.sourceConversion};
  const nodes=resolveNodes(gltf.scene,recipe.mapping,THREE.PropertyBinding.sanitizeNodeName);
  const sampler=makeSampler(gltf.scene,gltf.animations,nodes,conversion);
  const bindTake=recipe.bindTake||'A_TPose';
  const problems=checkBindContract(sampler.sample(bindTake,0));
  if(problems.length)throw new Error(`bind contract: ${problems.join('; ')}`);
  const takes={};
  for(const c of recipe.clips){
   if(!sampler.takes.includes(c.take))throw new Error(`take "${c.take}" is not in the source (${sampler.takes.length} takes)`);
   const {id,events,...spec}=c;takes[id]=spec;
  }
  const {clips,meta,legLength,restSupport}=retarget(sampler,takes,{bindTake,sampleRate:60});
  const manifestClips=[];
  for(const c of recipe.clips){
   const clip=clips[c.id],analysis=analyzeTake(meta[c.id].samples,clip.duration,{legLength,restSupport});
   const events=deriveEvents(c.events,analysis,clip.duration,legLength,{loop:c.loop===true});
   manifestClips.push({id:c.id,take:c.take,duration:+clip.duration.toFixed(6),loop:c.loop===true,sampleRate:60,frames:clip.frames.length,mirror:c.mirror??null,handedness:c.handedness||'right',events});
   log(`  ${c.id}: ${c.take} ${clip.duration.toFixed(3)}s ${clip.frames.length} frames${events.length?' events '+events.map(e=>`${e.type}${e.side?'·'+e.side:''}@${e.t}`).join(' '):''}`);
  }
  let bones=0;gltf.scene.traverse(o=>{if(o.isBone)bones++;});
  const bank={version:1,source:{author:recipe.provenance.author,pack:recipe.provenance.pack,license:recipe.provenance.license,url:recipe.provenance.url,files:sources.map(s=>s.path),sha256:Object.fromEntries(sources.map(s=>[s.path.split('/').pop(),s.sha256])),
   basis:'Y-up, +Z-forward; the slot L limb is the source limb that lands on negative X',sampleRate:60},clips};
 const text=JSON.stringify(bank)+'\n',bytes=Buffer.from(text,'utf8');
  return {
   manifest:{
    rig:{skeleton:POSE_BRIDGE.skeleton,mapping:recipe.mapping,bones},
    clips:manifestClips,
    units:{sourceConversion:conversion},
    budgets:{measured:{triangles:0,drawCalls:0,materials:0,bones:0,textures:0,bytes:bytes.length}},
    provenance:{},
   },
   outputs:[{path:'pose-bank.json',role:'pose-bank',bytes}],
  };
 },
};
