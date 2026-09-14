// Metadata adapters reference the same banks as native animation playback.
// Never copy attack balance into this catalog or load it in the per-frame loop.
import strikes from './strike-bank.json' with {type:'json'};
import heavies from './heavy-strike-bank.json' with {type:'json'};
import locomotion from './locomotion-bank.json' with {type:'json'};
import jumps from './jump-bank.json' with {type:'json'};

export const ANIMATION_BANKS = [
  {id:'strike',category:'Melee',bank:strikes,runtime:'src/engine/strike-motion.js'},
  {id:'heavy-strike',category:'Melee',bank:heavies,runtime:'src/engine/strike-motion.js'},
  {id:'locomotion',category:'Locomotion',bank:locomotion,runtime:'src/engine/ground-motion.js'},
  {id:'jump',category:'Jump and landing',bank:jumps,runtime:'src/engine/jump-motion.js'},
];
export const PROCEDURAL_ANIMATIONS=Object.freeze([
 {id:'native/hostile-hold',label:'Hostile grab hold',friendly:false},
 {id:'native/rear-hostile-hold',label:'Rear hostile neck hold',friendly:false,holdMode:'back'},
 {id:'native/friendly-carry',label:'Friendly carry hold',friendly:true},
].map(e=>Object.freeze({...e,key:e.id.split('/')[1],kind:'procedural',category:'Paired holds',duration:2,frames:0,loop:true,
 runtime:'src/engine/entity.js _animate + src/engine/person-carry.js',take:'Native procedural hold',source:{author:'PowerWorld runtime'},
 contact:null,issues:[],warnings:['Hold pose only — startup, escape and throw are reviewed in the Threat Room'],audioStatus:'not-audited'})));

export function validateAnimationClip(clip,category) {
  const issues=[];
  if(!Number.isFinite(clip.duration)||clip.duration<=0)issues.push('invalid-duration');
  if(!Array.isArray(clip.frames)||clip.frames.length<2)issues.push('missing-frames');
  else if(clip.frames.some(f=>!Array.isArray(f)||f.length!==45||!f.every(Number.isFinite)))issues.push('invalid-pose-frame');
  else {
    // Playback interpolates unit directions and quaternions. Finite numbers
    // alone cannot establish a usable skeletal pose; allow export rounding.
    const unit=(f,start,count)=>Math.abs(Math.hypot(...f.slice(start,start+count))-1)<=.01;
    if(clip.frames.some(f=>[0,3,6,9,12,15,18,21].some(i=>!unit(f,i,3))))issues.push('invalid-limb-direction');
    if(clip.frames.some(f=>[24,28,32,36,40].some(i=>!unit(f,i,4))))issues.push('invalid-joint-rotation');
  }
  if(category==='Melee') {
    if(!Number.isFinite(clip.contactStart)||!Number.isFinite(clip.contactEnd))issues.push('missing-contact-markers');
    else if(clip.contactStart<0||clip.contactEnd<clip.contactStart||clip.contactEnd>clip.duration)issues.push('invalid-contact-markers');
  }
  return issues;
}

export function buildAnimationCatalog(banks=ANIMATION_BANKS) {
  const entries=[],ids=new Set();
  for(const source of banks)for(const [key,clip] of Object.entries(source.bank.clips||{})) {
    const id=`${source.id}/${key}`;
    if(ids.has(id))throw new Error(`Duplicate animation ID: ${id}`);
    ids.add(id);
    entries.push({id,key,label:key.replaceAll('-',' '),kind:'authored',category:source.category,
      sourceFile:`src/data/${source.id}-bank.json`,runtime:source.runtime,
      source:source.bank.source,take:clip.take,duration:clip.duration,frames:clip.frames?.length||0,
      loop:clip.loop??source.id==='locomotion',side:clip.side??null,
      contact:source.category==='Melee'?{start:clip.contactStart,end:clip.contactEnd}:null,
      attackProfile:source.category==='Melee'?{file:'src/data/martial.js',id:key}:null,
      issues:validateAnimationClip(clip,source.category),
      // Absence is explicit; it must not be presented as a verified assignment.
      assignmentStatus:'runtime-policy',audioStatus:'not-audited',
      warnings:source.id==='locomotion'&&key!=='idle'?['foot-contact-markers-not-authored']:[],
    });
  }
  return {version:1,entries,procedural:PROCEDURAL_ANIMATIONS};
}

export function resolveAnimationClip(id,banks=ANIMATION_BANKS) {
  const slash=id.indexOf('/');if(slash<0)return null;
  return banks.find(b=>b.id===id.slice(0,slash))?.bank.clips?.[id.slice(slash+1)]??null;
}

// Validation, missing data and unverified audio are different authoring states.
export function animationAttention(entry){
 const issues=entry.issues||[],warnings=entry.warnings||[];
 const badges=[];
 if(issues.length)badges.push({kind:'invalid',label:issues.includes('missing-frames')?'Missing animation frames':'Invalid animation data'});
 if(warnings.length)badges.push({kind:'motion',label:'Motion needs review'});
 if(entry.audioStatus==='missing')badges.push({kind:'audio-missing',label:'Audio missing'});
 else if(entry.audioStatus!=='verified')badges.push({kind:'audio-unverified',label:'Audio not audited'});
 return badges;
}

