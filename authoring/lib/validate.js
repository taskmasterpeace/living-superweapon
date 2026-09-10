// The manifest validator. Every rule has a code; every failure names the path it found.
// It never throws on bad input — the CLI and tests read the result. Nothing here executes,
// evaluates or imports anything named by a manifest.
import {HUMANOID_SLOTS,POSE_BRIDGE,KINDS,OUTPUT_ROLES,EVENT_TYPES} from './slots.js';
import {unsafePathReason,isUnderSourceRoot} from './paths.js';
import {BUDGET_KEYS,PROFILES,overBudget} from './budgets.js';
import {packageHashOf} from './hash.js';

export const FORMAT='pw-asset-package';
export const FORMAT_VERSION=1;
const ID_RE=/^[a-z0-9][a-z0-9._-]{0,79}$/;
const SHA_RE=/^[0-9a-f]{64}$/;
const LICENSE_RE=/^[A-Za-z0-9.+-]{2,40}$/;
const NAME_RE=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const TEXT_RE=new RegExp("[<>"+String.fromCharCode(92)+"u0000-"+String.fromCharCode(92)+"u001f]");
const REDISTRIBUTION=['free','runtime-embed-only','internal'];
const REQUIRED_SOCKETS={
 'humanoid-body':['hand.right','hand.left','holster.hip'],
 equipment:{firearm:['grip','support','muzzle','magazine','holster'],blade:['grip','holster'],thrown:['grip']},
};
const CREATURE_CLIPS=['idle','move','attack'];

export function validateManifest(manifest,options={}){
 const errors=[],warnings=[];
 const fail=(code,path,message)=>errors.push({code,path,message});
 const warn=(code,path,message)=>warnings.push({code,path,message});
 const ctx={fail,warn,options};
 if(!plainObject(manifest)){fail('shape','$','manifest must be a JSON object');return result(errors,warnings);}
 const unsafe=findUnsafeKey(manifest,'$');if(unsafe){fail('unsafe-key',unsafe,'reserved property name');return result(errors,warnings);}
 const nonFinite=findNonFinite(manifest,'$');if(nonFinite)fail('finite',nonFinite,'number is not finite');
 if(manifest.format!==FORMAT)fail('incompatible-version','$.format',`expected ${FORMAT}`);
 if(manifest.formatVersion!==FORMAT_VERSION)fail('incompatible-version','$.formatVersion',`expected ${FORMAT_VERSION}, got ${manifest.formatVersion}`);
 if(typeof manifest.id!=='string'||!ID_RE.test(manifest.id))fail('id','$.id','id must match '+ID_RE);
 if(!Number.isInteger(manifest.version)||manifest.version<1)fail('id','$.version','version must be a positive integer');
 if(!KINDS.includes(manifest.kind))fail('kind','$.kind',`kind must be one of ${KINDS.join(', ')}`);
 if(typeof manifest.displayName!=='string'||!manifest.displayName.length||manifest.displayName.length>80||TEXT_RE.test(manifest.displayName))fail('shape','$.displayName','plain text, 1–80 characters');
 if(manifest.tags!==undefined&&(!Array.isArray(manifest.tags)||manifest.tags.some(t=>typeof t!=='string'||!/^[a-z0-9-]{1,32}$/.test(t))))fail('shape','$.tags','tags are lowercase [a-z0-9-] strings');
 checkProvenance(manifest.provenance,ctx);
 checkSource(manifest.source,ctx);
 checkTool(manifest.tool,ctx);
 checkUnits(manifest.units,ctx);
 checkOutputs(manifest.outputs,manifest.kind,ctx);
 checkBounds(manifest.bounds,ctx);
 checkRig(manifest.rig,manifest.kind,ctx);
 checkSockets(manifest.sockets,manifest,ctx);
 checkClips(manifest.clips,manifest.kind,ctx);
 checkHitZones(manifest.hitZones,ctx);
 checkBudgets(manifest.budgets,ctx);
 checkCompatibility(manifest.compatibility,manifest.kind,ctx);
 if(manifest.packageHash!==undefined){
  if(!SHA_RE.test(String(manifest.packageHash)))fail('hash','$.packageHash','not a sha256');
  else if(!nonFinite){try{if(packageHashOf(manifest)!==manifest.packageHash)fail('hash','$.packageHash','package hash does not match manifest content');}catch(e){fail('hash','$.packageHash',e.message);}}
 }
 return result(errors,warnings);
}
function result(errors,warnings){return {ok:errors.length===0,errors,warnings};}
const plainObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function findUnsafeKey(value,path){
 if(Array.isArray(value)){for(let i=0;i<value.length;i++){const r=findUnsafeKey(value[i],`${path}[${i}]`);if(r)return r;}return null;}
 if(!plainObject(value))return null;
 for(const key of Object.keys(value)){
  if(['__proto__','constructor','prototype'].includes(key))return `${path}.${key}`;
  const r=findUnsafeKey(value[key],`${path}.${key}`);if(r)return r;
 }
 return null;
}
function findNonFinite(value,path){
 if(typeof value==='number')return Number.isFinite(value)?null:path;
 if(Array.isArray(value)){for(let i=0;i<value.length;i++){const r=findNonFinite(value[i],`${path}[${i}]`);if(r)return r;}return null;}
 if(plainObject(value)){for(const key of Object.keys(value)){const r=findNonFinite(value[key],`${path}.${key}`);if(r)return r;}}
 return null;
}
const vec=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
function checkProvenance(p,{fail}){
 if(!plainObject(p))return fail('license','$.provenance','provenance record is required');
 if(typeof p.author!=='string'||!p.author.trim())fail('license','$.provenance.author','author is required');
 if(typeof p.license!=='string'||!LICENSE_RE.test(p.license))fail('license','$.provenance.license','license must be an SPDX identifier or Proprietary-Internal');
 if(!REDISTRIBUTION.includes(p.redistribution))fail('license','$.provenance.redistribution',`redistribution must be one of ${REDISTRIBUTION.join(', ')}`);
 if(p.url!==undefined&&!/^https?:\/\/\S+$/.test(p.url))fail('shape','$.provenance.url','url must be http(s)');
 if(p.retrievedFrom!==undefined&&!/^https?:\/\/\S+$/.test(p.retrievedFrom))fail('shape','$.provenance.retrievedFrom','retrievedFrom must be http(s)');
 if(p.revision!==undefined&&!/^[A-Za-z0-9._-]{1,64}$/.test(p.revision))fail('shape','$.provenance.revision','revision must be a plain token');
 if(p.terms!==undefined&&(typeof p.terms!=='string'||p.terms.length>600))fail('shape','$.provenance.terms','terms is a string up to 600 characters');
}
function checkSource(s,{fail}){
 if(!plainObject(s))return fail('source','$.source','source record is required');
 if(typeof s.adapter!=='string'||!/^[a-z0-9-]+@[0-9]+$/.test(s.adapter))fail('source','$.source.adapter','adapter must look like name@version');
 if(!Array.isArray(s.files)||!s.files.length)fail('source','$.source.files','at least one source file with a sha256 is required');
 else s.files.forEach((f,i)=>{
  const path=`$.source.files[${i}]`;
  if(!plainObject(f))return fail('source',path,'source file record must be an object');
  const reason=unsafePathReason(f.path);if(reason)fail('unsafe-path',path+'.path',reason);
  else if(!isUnderSourceRoot(f.path))fail('unsafe-path',path+'.path','source files must live under assets-src/ or authoring/');
  if(!SHA_RE.test(String(f.sha256)))fail('source',path+'.sha256','sha256 is required for every source file');
 });
 if(!plainObject(s.recipe))fail('source','$.source.recipe','recipe record is required');
 else{
  const reason=unsafePathReason(s.recipe.path);if(reason)fail('unsafe-path','$.source.recipe.path',reason);
  else if(!s.recipe.path.startsWith('authoring/recipes/'))fail('unsafe-path','$.source.recipe.path','recipes live under authoring/recipes/');
  if(!SHA_RE.test(String(s.recipe.sha256)))fail('source','$.source.recipe.sha256','recipe sha256 is required');
 }
}
function checkTool(t,{fail}){
 if(!plainObject(t))return fail('incompatible-version','$.tool','tool record is required');
 if(t.name!=='powerworld-authoring')fail('incompatible-version','$.tool.name','built by an unknown tool');
 if(typeof t.version!=='string'||!/^\d+\.\d+\.\d+$/.test(t.version))fail('incompatible-version','$.tool.version','tool version must be semver');
 if(typeof t.three!=='string'||!/^\d+\.\d+\.\d+$/.test(t.three))fail('incompatible-version','$.tool.three','three version must be semver');
 if(!Number.isInteger(t.adapterVersion)||t.adapterVersion<1)fail('incompatible-version','$.tool.adapterVersion','adapterVersion must be a positive integer');
}
function checkUnits(u,{fail}){
 if(!plainObject(u))return fail('units','$.units','units record is required');
 if(u.lengthUnit!=='game-unit')fail('units','$.units.lengthUnit','outputs are always in game units');
 if(u.metersPerUnit!==0.19)fail('units','$.units.metersPerUnit','the world is 1u = 0.19m; declare the conversion, never a different runtime unit');
 if(u.up!=='+Y')fail('units','$.units.up','runtime is +Y up');
 if(u.forward!=='+Z')fail('units','$.units.forward','runtime is +Z forward');
 if(u.handedness!=='right')fail('units','$.units.handedness','runtime is right-handed');
 const c=u.sourceConversion;
 if(!plainObject(c))return fail('units','$.units.sourceConversion','explicit source→runtime conversion is required');
 if(typeof c.scale!=='number'||!(c.scale>0))fail('units','$.units.sourceConversion.scale','scale must be a positive number');
 if(typeof c.yawDegrees!=='number')fail('units','$.units.sourceConversion.yawDegrees','yawDegrees must be a number');
 if(typeof c.mirrorX!=='boolean')fail('units','$.units.sourceConversion.mirrorX','mirrorX must be a boolean');
 if(typeof c.sourceUp!=='string'||typeof c.sourceForward!=='string')fail('units','$.units.sourceConversion','sourceUp and sourceForward must name the source axes');
}
function checkOutputs(outputs,kind,{fail}){
 if(!Array.isArray(outputs)||!outputs.length)return fail('outputs','$.outputs','at least one output is required');
 const seen=new Set();
 outputs.forEach((o,i)=>{
  const path=`$.outputs[${i}]`;
  if(!plainObject(o))return fail('outputs',path,'output must be an object');
  const reason=unsafePathReason(o.path);if(reason)fail('unsafe-path',path+'.path',reason);
  else if(o.path.includes('/'))fail('unsafe-path',path+'.path','outputs are flat files inside the package directory');
  if(seen.has(o.path))fail('outputs',path+'.path','duplicate output path');seen.add(o.path);
  if(!OUTPUT_ROLES.includes(o.role))fail('outputs',path+'.role',`role must be one of ${OUTPUT_ROLES.join(', ')}`);
  if(!SHA_RE.test(String(o.sha256)))fail('hash',path+'.sha256','output sha256 is required');
  if(!Number.isInteger(o.bytes)||o.bytes<0)fail('outputs',path+'.bytes','bytes must be a non-negative integer');
 });
 const roles=new Set(outputs.filter(plainObject).map(o=>o.role));
 if(kind==='humanoid-motion'&&!roles.has('pose-bank'))fail('outputs','$.outputs','a humanoid-motion package must emit a pose-bank');
 if(['equipment','creature','prop'].includes(kind)&&!roles.has('glb'))fail('outputs','$.outputs',`a ${kind} package must emit a glb`);
}
function checkBounds(b,{fail}){
 if(b===undefined)return;
 if(!plainObject(b)||!vec(b.min,3)||!vec(b.max,3))return fail('shape','$.bounds','bounds need finite min/max triples');
 for(let i=0;i<3;i++)if(b.min[i]>b.max[i])fail('shape','$.bounds','min exceeds max');
}
function checkRig(rig,kind,{fail}){
 if(kind==='prop'||kind==='equipment'){if(rig!==undefined&&rig.skeleton!=='none')fail('rig-mapping','$.rig',`${kind} packages carry no skeleton`);return;}
 if(!plainObject(rig))return fail('rig-mapping','$.rig','rig record is required');
 if(kind==='humanoid-motion'){
  if(rig.skeleton!==POSE_BRIDGE.skeleton)fail('rig-mapping','$.rig.skeleton',`humanoid motion targets ${POSE_BRIDGE.skeleton}`);
  if(!plainObject(rig.mapping))return fail('rig-mapping','$.rig.mapping','slot → source joint mapping is required');
  for(const slot of HUMANOID_SLOTS){
   const joint=rig.mapping[slot];
   if(typeof joint!=='string'||!NAME_RE.test(joint))fail('rig-mapping',`$.rig.mapping.${slot}`,'every humanoid slot must map to a named source joint');
  }
  for(const key of Object.keys(rig.mapping))if(!HUMANOID_SLOTS.includes(key))fail('rig-mapping',`$.rig.mapping.${key}`,'not a humanoid slot');
  const joints=Object.values(rig.mapping).filter(v=>typeof v==='string');
  if(new Set(joints).size!==joints.length)fail('rig-mapping','$.rig.mapping','two slots map to the same source joint');
 }
 if(kind==='creature'){
  if(rig.skeleton===POSE_BRIDGE.skeleton)fail('rig-mapping','$.rig.skeleton','a creature must not reuse the humanoid pose bridge');
  if(typeof rig.skeleton!=='string'||!/^[a-z0-9-]+@[0-9]+$/.test(rig.skeleton))fail('rig-mapping','$.rig.skeleton','skeleton must look like name@version');
  if(!Number.isInteger(rig.bones)||rig.bones<1)fail('rig-mapping','$.rig.bones','bone count is required');
 }
 if(kind==='humanoid-body'){
  if(typeof rig.skeleton!=='string')fail('rig-mapping','$.rig.skeleton','skeleton is required');
  if(rig.catalogBody!==undefined&&!/^[a-z0-9-]+$/.test(rig.catalogBody))fail('rig-mapping','$.rig.catalogBody','catalog body must be a plain id');
 }
}
function checkSockets(sockets,manifest,{fail}){
 const kind=manifest.kind;
 if(sockets!==undefined){
  if(!Array.isArray(sockets))return fail('missing-socket','$.sockets','sockets must be an array');
  const names=new Set();
  sockets.forEach((s,i)=>{
   const path=`$.sockets[${i}]`;
   if(!plainObject(s))return fail('missing-socket',path,'socket must be an object');
   if(typeof s.name!=='string'||!/^[a-z][a-z0-9.-]{0,31}$/.test(s.name))fail('missing-socket',path+'.name','socket names are lowercase dotted tokens');
   if(names.has(s.name))fail('missing-socket',path+'.name','duplicate socket name');names.add(s.name);
   if(typeof s.parent!=='string'||!NAME_RE.test(s.parent))fail('missing-socket',path+'.parent','parent node or slot name is required');
   if(!vec(s.position,3))fail('missing-socket',path+'.position','position must be a finite triple');
   if(!vec(s.rotation,4))fail('missing-socket',path+'.rotation','rotation must be a finite quaternion');
   else if(Math.abs(Math.hypot(...s.rotation)-1)>1e-3)fail('missing-socket',path+'.rotation','rotation quaternion must be unit length');
  });
 }
 const have=new Set((sockets||[]).filter(plainObject).map(s=>s.name));
 let required=[];
 if(kind==='humanoid-body')required=REQUIRED_SOCKETS['humanoid-body'];
 if(kind==='equipment'){
  const eq=manifest.equipment;
  if(!plainObject(eq)||!Object.hasOwn(REQUIRED_SOCKETS.equipment,eq.class))fail('missing-socket','$.equipment.class','equipment class must be firearm, blade or thrown');
  else{
   required=REQUIRED_SOCKETS.equipment[eq.class];
   if(typeof eq.twoHanded!=='boolean')fail('shape','$.equipment.twoHanded','twoHanded must be a boolean');
   if(!['right','left','either'].includes(eq.hand))fail('shape','$.equipment.hand','hand must be right, left or either');
  }
 }
 for(const name of required)if(!have.has(name))fail('missing-socket','$.sockets',`${kind} package is missing required socket "${name}"`);
}
function checkClips(clips,kind,{fail}){
 if(clips===undefined){if(kind==='humanoid-motion'||kind==='creature')fail('clips','$.clips',`${kind} packages need clips`);return;}
 if(!Array.isArray(clips))return fail('clips','$.clips','clips must be an array');
 const ids=new Set();
 clips.forEach((c,i)=>{
  const path=`$.clips[${i}]`;
  if(!plainObject(c))return fail('clips',path,'clip must be an object');
  if(typeof c.id!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(c.id))fail('clips',path+'.id','clip id is a lowercase token');
  if(ids.has(c.id))fail('duplicate-id',path+'.id','duplicate clip id');ids.add(c.id);
  if(typeof c.take!=='string'||!c.take.length||c.take.length>80)fail('clips',path+'.take','source take name is required');
  if(typeof c.duration!=='number'||!(c.duration>0))fail('clips',path+'.duration','duration must be positive');
  if(typeof c.loop!=='boolean')fail('clips',path+'.loop','loop must be a boolean');
  if(!Number.isInteger(c.sampleRate)||c.sampleRate<1)fail('clips',path+'.sampleRate','sampleRate must be a positive integer');
  if(!Number.isInteger(c.frames)||c.frames<2)fail('clips',path+'.frames','frame count must be at least 2');
  if(c.mirror!==undefined&&c.mirror!==null&&!['L','R'].includes(c.mirror))fail('clips',path+'.mirror','mirror is L, R or null');
  if(!['right','left','none'].includes(c.handedness))fail('clips',path+'.handedness','handedness must be right, left or none');
  if(c.events!==undefined){
   if(!Array.isArray(c.events))fail('clips',path+'.events','events must be an array');
   else c.events.forEach((e,j)=>{
    const ep=`${path}.events[${j}]`;
    if(!plainObject(e))return fail('clips',ep,'event must be an object');
    if(typeof e.t!=='number'||!Number.isFinite(e.t)||e.t<0||(typeof c.duration==='number'&&e.t>c.duration+1e-9))fail('clips',ep+'.t','event time must lie inside the clip');
    if(!EVENT_TYPES.includes(e.type))fail('clips',ep+'.type',`event type must be one of ${EVENT_TYPES.join(', ')}`);
    if(e.side!==undefined&&!['L','R'].includes(e.side))fail('clips',ep+'.side','side is L or R');
   });
  }
 });
 if(kind==='creature')for(const id of CREATURE_CLIPS)if(!ids.has(id))fail('clips','$.clips',`creature packages need an "${id}" clip`);
}
function checkHitZones(zones,{fail}){
 if(zones===undefined)return;
 if(!Array.isArray(zones))return fail('shape','$.hitZones','hitZones must be an array');
 const allowed=['head','torso','arm.left','arm.right','leg.left','leg.right','weakpoint'];
 zones.forEach((z,i)=>{
  const path=`$.hitZones[${i}]`;
  if(!plainObject(z))return fail('shape',path,'zone must be an object');
  if(!allowed.includes(z.zone))fail('shape',path+'.zone',`zone must be one of ${allowed.join(', ')}`);
  if(!['sphere','capsule','box'].includes(z.shape))fail('shape',path+'.shape','shape must be sphere, capsule or box');
  if(typeof z.attach!=='string'||!NAME_RE.test(z.attach))fail('shape',path+'.attach','attach names a slot or node');
  if(!vec(z.center,3))fail('shape',path+'.center','center must be a finite triple');
  if(z.shape==='box'?!vec(z.halfExtents,3):!(typeof z.radius==='number'&&z.radius>0))fail('shape',path,'sphere/capsule need radius, box needs halfExtents');
  if(z.shape==='capsule'&&!vec(z.end,3))fail('shape',path+'.end','capsule needs an end point');
 });
}
function checkBudgets(b,{fail}){
 if(!plainObject(b))return fail('budget','$.budgets','budgets record is required');
 if(!PROFILES.includes(b.profile))fail('budget','$.budgets.profile',`profile must be one of ${PROFILES.join(', ')}`);
 for(const group of ['measured','limits']){
  if(!plainObject(b[group]))return fail('budget',`$.budgets.${group}`,`${group} record is required`);
  for(const key of BUDGET_KEYS)if(!Number.isInteger(b[group][key])||b[group][key]<0)fail('budget',`$.budgets.${group}.${key}`,'must be a non-negative integer');
 }
 for(const key of overBudget(b.measured,b.limits))fail('budget',`$.budgets.measured.${key}`,`${b.measured[key]} exceeds the hard ${b.profile} limit ${b.limits[key]}`);
}
function checkCompatibility(c,kind,{fail}){
 if(kind!=='humanoid-motion'){if(c!==undefined&&!plainObject(c))fail('shape','$.compatibility','compatibility must be an object');return;}
 const pb=c?.poseBridge;
 if(!plainObject(pb))return fail('incompatible-version','$.compatibility.poseBridge','humanoid motion must declare the pose bridge it targets');
 if(pb.frameLength!==POSE_BRIDGE.frameLength)fail('incompatible-version','$.compatibility.poseBridge.frameLength',`pose bridge frames are ${POSE_BRIDGE.frameLength} floats`);
 if(pb.engineModule!==POSE_BRIDGE.engineModule)fail('incompatible-version','$.compatibility.poseBridge.engineModule',`expected ${POSE_BRIDGE.engineModule}`);
}

// Pose-bank content checks run against the emitted output file, not the manifest.
export function validatePoseBank(bank,manifest){
 const errors=[],fail=(code,path,message)=>errors.push({code,path,message});
 if(!plainObject(bank)||!plainObject(bank.clips))return {ok:false,errors:[{code:'pose-bank',path:'$',message:'pose bank must carry a clips object'}],warnings:[]};
 if(bank.version!==1)fail('incompatible-version','$.version','pose bank version must be 1');
 const declared=new Map((manifest?.clips||[]).map(c=>[c.id,c]));
 for(const [id,clip] of Object.entries(bank.clips)){
  const path=`$.clips.${id}`;
  if(!declared.has(id))fail('clips',path,'clip is not declared in the manifest');
  if(!Array.isArray(clip.frames)||clip.frames.length<2){fail('nan-frame',path+'.frames','clip needs at least two frames');continue;}
  const d=declared.get(id);
  if(d&&clip.frames.length!==d.frames)fail('clips',path+'.frames',`manifest declares ${d.frames} frames, bank has ${clip.frames.length}`);
  if(d&&Math.abs(clip.duration-d.duration)>1e-6)fail('clips',path+'.duration','duration differs from the manifest');
  frames:for(let i=0;i<clip.frames.length;i++){
   const frame=clip.frames[i];
   if(!Array.isArray(frame)||frame.length!==POSE_BRIDGE.frameLength){fail('nan-frame',`${path}.frames[${i}]`,`frame must have ${POSE_BRIDGE.frameLength} floats`);break;}
   for(let j=0;j<frame.length;j++)if(typeof frame[j]!=='number'||!Number.isFinite(frame[j])){fail('nan-frame',`${path}.frames[${i}][${j}]`,'non-finite frame value');break frames;}
   for(let j=0;j<24;j+=3)if(Math.abs(Math.hypot(frame[j],frame[j+1],frame[j+2])-1)>1e-3){fail('nan-frame',`${path}.frames[${i}][${j}]`,'segment direction is not unit length');break frames;}
   for(let j=24;j<44;j+=4)if(Math.abs(Math.hypot(frame[j],frame[j+1],frame[j+2],frame[j+3])-1)>1e-3){fail('nan-frame',`${path}.frames[${i}][${j}]`,'quaternion is not unit length');break frames;}
   // Support is foot lift over leg length. A roll or a jump can lift the feet past one leg
   // length; the production bridge clamps what it applies. Three leg lengths is a data error.
   if(frame[44]<-1e-6||frame[44]>3){fail('nan-frame',`${path}.frames[${i}][44]`,'support ratio outside [0,3]');break;}
  }
  if(Object.hasOwn(clip,'rootMotion'))fail('root-motion',path,'a pose bank must never author gameplay root motion');
 }
 for(const id of declared.keys())if(!Object.hasOwn(bank.clips,id))fail('clips',`$.clips.${id}`,'manifest declares a clip the bank does not contain');
 return {ok:errors.length===0,errors,warnings:[]};
}
export function validateCatalogIds(manifests){
 const errors=[],seen=new Map();
 for(const m of manifests){
  const key=`${m.id}@${m.version}`;
  if(seen.has(key))errors.push({code:'duplicate-id',path:`$.${key}`,message:`package ${key} appears twice`});
  seen.set(key,m);
 }
 return {ok:errors.length===0,errors,warnings:[]};
}
export const CODES=['shape','unsafe-key','finite','incompatible-version','id','kind','license','source','unsafe-path','units','outputs','hash','rig-mapping','missing-socket','clips','duplicate-id','budget','nan-frame','root-motion','pose-bank'];
