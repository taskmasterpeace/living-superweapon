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

export function validateAnimationClip(clip,category) {
  const issues=[];
  if(!Number.isFinite(clip.duration)||clip.duration<=0)issues.push('invalid-duration');
  if(!Array.isArray(clip.frames)||clip.frames.length<2)issues.push('missing-frames');
  else if(clip.frames.some(f=>!Array.isArray(f)||f.length!==45||!f.every(Number.isFinite)))issues.push('invalid-pose-frame');
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
  return {version:1,entries};
}

export function resolveAnimationClip(id,banks=ANIMATION_BANKS) {
  const slash=id.indexOf('/');if(slash<0)return null;
  return banks.find(b=>b.id===id.slice(0,slash))?.bank.clips?.[id.slice(slash+1)]??null;
}

