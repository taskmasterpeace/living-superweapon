// Source adapter: CMU Graphics Lab ASF/AMC motion capture → humanoid-motion package through the
// same generic retarget the Quaternius adapter uses. The skeleton is rebuilt from the ASF text
// (a parser, not an eval); AMC frames are interpolated at the requested sample time. The root's
// translation is read and discarded: nothing here can author gameplay root motion.
import * as THREE from 'three';
import {HUMANOID_SLOTS} from '../lib/slots.js';
import {checkBindContract,retarget,analyzeTake} from '../lib/humanoid-retarget.js';
import {deriveEvents} from '../lib/clip-events.js';
import {POSE_BRIDGE} from '../lib/slots.js';

const DEG=Math.PI/180;
export function parseAsf(text){
 const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
 const bones=new Map(),order=[];let section=null,cur=null,i=0;
 const root={name:'root',direction:[0,0,0],length:0,axis:[0,0,0],axisOrder:'XYZ',dof:[],order:['TX','TY','TZ','RX','RY','RZ']};
 const units={};
 for(;i<lines.length;i++){
  const l=lines[i];
  if(l.startsWith(':')){section=l.slice(1).split(/\s+/)[0];continue;}
  if(section==='units'){const [k,v]=l.split(/\s+/);units[k]=isNaN(+v)?v:+v;}
  else if(section==='root'){
   const [k,...v]=l.split(/\s+/);
   if(k==='order')root.order=v.map(s=>s.toUpperCase());else if(k==='axis')root.axisOrder=v[0];
  }
  else if(section==='bonedata'){
   if(l==='begin'){cur={dof:[],limits:[],axis:[0,0,0],axisOrder:'XYZ'};continue;}
   if(l==='end'){bones.set(cur.name,cur);order.push(cur.name);cur=null;continue;}
   const [k,...v]=l.split(/\s+/);
   if(k==='name')cur.name=v[0];else if(k==='direction')cur.direction=v.slice(0,3).map(Number);else if(k==='length')cur.length=+v[0];
   else if(k==='axis'){cur.axis=v.slice(0,3).map(Number);cur.axisOrder=(v[3]||'XYZ').toUpperCase();}
   else if(k==='dof')cur.dof=v.map(s=>s.toLowerCase());
  }
  else if(section==='hierarchy'){
   if(l==='begin'||l==='end')continue;
   const [parent,...children]=l.split(/\s+/);
   for(const c of children){const b=bones.get(c);if(!b)throw new Error(`hierarchy names unknown bone ${c}`);b.parent=parent;}
  }
 }
 if(units.angle&&units.angle!=='deg')throw new Error('only degree ASF files are supported');
 for(const b of bones.values())if(!b.parent)throw new Error(`bone ${b.name} is not in the hierarchy`);
 return {root,bones,order,units};
}
export function parseAmc(text){
 const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')&&!l.startsWith(':'));
 const frames=[];let cur=null;
 for(const l of lines){
  if(/^\d+$/.test(l)){cur={};frames.push(cur);continue;}
  if(!cur)throw new Error('AMC values before the first frame number');
  const [name,...v]=l.split(/\s+/);cur[name]=v.map(Number);
  if(cur[name].some(n=>!Number.isFinite(n)))throw new Error(`non-finite value for ${name} in frame ${frames.length}`);
 }
 if(!frames.length)throw new Error('AMC has no frames');
 return frames;
}
const eulerMatrix=(deg,order='XYZ')=>new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(deg[0]*DEG,deg[1]*DEG,deg[2]*DEG,order));
// World rotation and end-point of every bone for one frame (rest pose when frame is null).
export function poseSkeleton(asf,frame){
 const C=new Map(),Cinv=new Map();
 for(const b of asf.bones.values()){const c=eulerMatrix(b.axis,b.axisOrder);C.set(b.name,c);Cinv.set(b.name,c.clone().invert());}
 const rootC=eulerMatrix(asf.root.axis,asf.root.axisOrder),rootCinv=rootC.clone().invert();
 const world=new Map(),end=new Map();
 const rootRot=[0,0,0];
 if(frame?.root){const vals=frame.root;asf.root.order.forEach((ch,i)=>{if(ch==='RX')rootRot[0]=vals[i];if(ch==='RY')rootRot[1]=vals[i];if(ch==='RZ')rootRot[2]=vals[i];});}
 world.set('root',rootC.clone().multiply(eulerMatrix(rootRot,asf.root.axisOrder)).multiply(rootCinv));
 end.set('root',new THREE.Vector3(0,0,0)); // translation deliberately not carried
 for(const name of asf.order){
  const b=asf.bones.get(name),rot=[0,0,0];
  if(frame?.[name])b.dof.forEach((d,i)=>{if(d==='rx')rot[0]=frame[name][i];if(d==='ry')rot[1]=frame[name][i];if(d==='rz')rot[2]=frame[name][i];});
  const local=C.get(name).clone().multiply(eulerMatrix(rot,'XYZ')).multiply(Cinv.get(name));
  const m=world.get(b.parent).clone().multiply(local);world.set(name,m);
  const dir=new THREE.Vector3().fromArray(b.direction).applyMatrix4(new THREE.Matrix4().extractRotation(m));
  end.set(name,end.get(b.parent).clone().addScaledVector(dir,b.length));
 }
 return {world,end};
}
function makeCmuSampler(asf,takes,mapping,conversion,fps){
 const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(conversion.yawDegrees||0)*DEG),mirror=!!conversion.mirrorX;
 const convertPoint=v=>{v.applyQuaternion(yaw);if(mirror)v.x=-v.x;return v;};
 const convertQuat=q=>{q.premultiply(yaw);if(mirror){q.x=-q.x;q.w=-q.w;}return q;};
 for(const slot of HUMANOID_SLOTS){const name=mapping[slot];if(name!=='root'&&!asf.bones.has(name))throw new Error(`Required source joint missing: ${name} (slot ${slot})`);}
 const read=frame=>{
  const {world,end}=poseSkeleton(asf,frame),points={},rotations={};
  for(const slot of HUMANOID_SLOTS)points[slot]=convertPoint(end.get(mapping[slot]).clone());
  for(const slot of ['hip','chest','head','footL','footR'])rotations[slot]=convertQuat(new THREE.Quaternion().setFromRotationMatrix(world.get(mapping[slot])));
  return {points,rotations};
 };
 const lerpFrame=(a,b,t)=>{const out={};for(const k of Object.keys(a))out[k]=a[k].map((v,i)=>v+(b[k][i]-v)*t);return out;};
 return {
  takes:[...Object.keys(takes),'rest'],
  duration(name){if(name==='rest')return 0;const f=takes[name];if(!f)throw new Error(`Unknown source take: ${name}`);return (f.length-1)/fps;},
  sample(name,time){
   if(name==='rest')return read(null);
   const f=takes[name];if(!f)throw new Error(`Unknown source take: ${name}`);
   const x=Math.max(0,Math.min(f.length-1,time*fps)),i=Math.floor(x),j=Math.min(f.length-1,i+1),t=x-i;
   return read(t>0?lerpFrame(f[i],f[j],t):f[i]);
  },
 };
}
export default {
 name:'cmu-asfamc',version:1,kinds:['humanoid-motion'],
 async build({recipe,sources,log}){
  const asfSource=sources.find(s=>s.path.endsWith('.asf'));if(!asfSource)throw new Error('cmu-asfamc needs one .asf source');
  const asf=parseAsf(asfSource.bytes.toString('utf8'));
  const fps=recipe.sourceFps||120;
  const takes={};
  for(const s of sources.filter(s=>s.path.endsWith('.amc')))takes[s.path.split('/').pop().replace(/\.amc$/,'')]=parseAmc(s.bytes.toString('utf8'));
  if(!Object.keys(takes).length)throw new Error('cmu-asfamc needs at least one .amc source');
  // ASF length unit: 1 unit = (1/units.length) inches. Recorded, not applied: the bank is normalised.
  const inchPerUnit=1/(asf.units.length||1),metersPerUnit=inchPerUnit*0.0254;
  const conversion={scale:+(metersPerUnit/0.19).toFixed(6),yawDegrees:0,mirrorX:false,sourceUp:'+Y',sourceForward:'+Z',...recipe.sourceConversion,note:`ASF length unit ${asf.units.length}: ${metersPerUnit.toFixed(4)} m per source unit; directions only are retargeted`};
  const sampler=makeCmuSampler(asf,takes,recipe.mapping,conversion,fps);
  const problems=checkBindContract(sampler.sample('rest',0));
  if(problems.length)throw new Error(`bind contract: ${problems.join('; ')}`);
  const specs={};
  for(const c of recipe.clips){if(!takes[c.take])throw new Error(`take "${c.take}" is not among the .amc sources`);const {id,events,...spec}=c;specs[id]=spec;}
  const {clips,meta,legLength,restSupport}=retarget(sampler,specs,{bindTake:'rest',sampleRate:60});
  const manifestClips=[];
  for(const c of recipe.clips){
   const clip=clips[c.id],analysis=analyzeTake(meta[c.id].samples,clip.duration,{legLength,restSupport});
   const events=deriveEvents(c.events,analysis,clip.duration,legLength,{loop:c.loop===true});
   manifestClips.push({id:c.id,take:c.take,duration:+clip.duration.toFixed(6),loop:c.loop===true,sampleRate:60,frames:clip.frames.length,mirror:c.mirror??null,handedness:c.handedness||'none',events});
   log(`  ${c.id}: ${c.take} ${clip.duration.toFixed(3)}s ${clip.frames.length} frames (${takes[c.take].length} source frames @${fps}Hz)${events.length?' events '+events.map(e=>`${e.type}${e.side?'·'+e.side:''}@${e.t}`).join(' '):''}`);
  }
  const bank={version:1,source:{author:recipe.provenance.author,pack:recipe.provenance.pack,license:recipe.provenance.license,url:recipe.provenance.url,files:sources.map(s=>s.path),sha256:Object.fromEntries(sources.map(s=>[s.path.split('/').pop(),s.sha256])),
   basis:'ASF rest pose, +Y up, +Z forward; the slot L limb is the source limb on negative X; root translation discarded',sampleRate:60},clips};
  const text=JSON.stringify(bank)+'\n',bytes=Buffer.from(text,'utf8');
  return {
   manifest:{
    rig:{skeleton:POSE_BRIDGE.skeleton,mapping:recipe.mapping,bones:asf.order.length+1},
    clips:manifestClips,
    units:{sourceConversion:conversion},
    budgets:{measured:{triangles:0,drawCalls:0,materials:0,bones:0,textures:0,bytes:bytes.length}},
    provenance:{},
   },
   outputs:[{path:'pose-bank.json',role:'pose-bank',bytes}],
  };
 },
};
