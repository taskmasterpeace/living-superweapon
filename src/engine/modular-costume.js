import * as T from 'three';
import {setModularExpression,setModularMuscle} from './modular-face.js';

export const MODULAR_FRAMES={hero:[1,1,1],heavy:[1.38,.92,1.18],agile:[.83,.98,.88],machine:[1.20,1.08,1.12]};
export const MODULAR_RECIPES={
 hero:{name:'Ascendant',frame:'hero',hair:'swept',skin:'#b18b6d',primary:'#dce0d9',secondary:'#b52e23',trim:'#20272b',emblemColor:'#b52e23',emblem:'triangle',cape:true,armor:false,shoulders:true,muscle:1},
 mercenary:{name:'Mercenary · heavy',frame:'heavy',hair:'braids',skin:'#633b28',primary:'#69704a',secondary:'#85805a',trim:'#262d28',emblemColor:'#dac792',emblem:'shield',cape:false,armor:true,shoulders:false,bareArms:true,muscle:1.25},
 scout:{name:'Mercenary · agile',frame:'agile',hair:'afro',skin:'#78462e',primary:'#666c47',secondary:'#a29970',trim:'#242c28',emblemColor:'#e0c783',emblem:'bolt',cape:false,armor:true,shoulders:false,bareArms:true,muscle:.85},
 robot:{name:'Armored automaton',frame:'machine',hair:'none',skin:'#8b9694',primary:'#677575',secondary:'#c6ac57',trim:'#243033',emblemColor:'#78dcca',emblem:'star',cape:false,armor:false,shoulders:true,muscle:1.15,eyeColor:'#73ffe0',eyeGlow:true},
};
export function validateModularRecipe(input){
 if(!input||input.schema!==1||input.skeleton!=='ual-deform-v1'||input.body!=='faceted-v1')throw Error('Expected a version 1 faceted character recipe');
 const r={...MODULAR_RECIPES.hero};
 const enums={frame:Object.keys(MODULAR_FRAMES),hair:['swept','afro','bun','braids','none'],emblem:['triangle','shield','bolt','star','V','none'],expression:['neutral','happy','angry','talkA','talkB','surprised','sad']};
 for(const [key,values]of Object.entries(enums))if(input[key]!==undefined){if(!values.includes(input[key]))throw Error('Invalid '+key);r[key]=input[key];}
 for(const key of ['primary','secondary','trim','emblemColor','skin','hairColor','eyeColor'])if(input[key]!==undefined){if(!/^#[0-9a-f]{6}$/i.test(input[key]))throw Error('Invalid '+key+' color');r[key]=input[key];}
 for(const key of ['cape','armor','shoulders','bareArms','helmet','visor','eyepatch','eyeGlow'])if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw Error('Invalid '+key);r[key]=input[key];}
 for(const [key,min,max]of [['muscle',.8,1.3],['size',.85,1.25]])if(input[key]!==undefined){if(!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw Error('Invalid '+key);r[key]=input[key];}
 r.name=typeof input.name==='string'?input.name.slice(0,60):'Imported character';return r;
}
const emblemTextures=new Map();
export function emblemTexture(id){
 if(emblemTextures.has(id))return emblemTextures.get(id);
 if(!['triangle','shield','bolt','star','V','none'].includes(id))throw Error('Unknown emblem: '+id);
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.beginPath();
 const poly=points=>{points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fill();};
 if(id==='triangle')poly([[24,40],[232,40],[128,220]]);
 if(id==='shield')poly([[44,35],[212,35],[212,138],[128,224],[44,138]]);
 if(id==='bolt')poly([[139,18],[49,142],[114,142],[88,238],[207,103],[143,103]]);
 if(id==='star')poly(Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?43:105;return[128+Math.cos(a)*r,128+Math.sin(a)*r];}));
 if(id==='V')poly([[29,40],[78,40],[128,165],[178,40],[227,40],[150,224],[106,224]]);
 const t=new T.CanvasTexture(c);t.flipY=false;t.colorSpace=T.SRGBColorSpace;emblemTextures.set(id,t);return t;
}
export function applyModularRecipe(meshes,recipe){
 const r={...MODULAR_RECIPES.hero,...recipe};
 for(const m of meshes){
  const slot=m.userData.slot;m.visible=true;
  if(slot==='hair')m.visible=m.userData.variant===r.hair;
  if(slot==='cape')m.visible=!!r.cape;
  if(['vest','backpack','pouches'].includes(slot))m.visible=!!r.armor;
  if(slot==='shoulders')m.visible=!!r.shoulders;
  if(slot==='helmet')m.visible=!!r.helmet;
  if(slot==='visor')m.visible=!!r.visor;
  if(slot==='eyepatch')m.visible=!!r.eyepatch;
  const colors={suit:r.primary,accent:r.secondary,dark:r.trim,metal:r.emblemColor,skin:r.skin};
  if(colors[m.material.name])m.material.color.set(colors[m.material.name]);
  if(slot==='hair')m.material.color.set(r.hairColor||'#171b19');
  if(slot==='arms'&&r.bareArms)m.material.color.set(r.skin);
  const waist=m.morphTargetDictionary?.waistNarrow;if(waist!==undefined)m.morphTargetInfluences[waist]=r.frame==='agile'?1:0;
  if(slot==='emblem'){
   m.visible=r.emblem!=='none';
   if(typeof document!=='undefined'){m.material.map=emblemTexture(r.emblem);m.material.transparent=true;m.material.alphaTest=.05;m.material.depthWrite=false;m.material.color.set(r.emblemColor);m.material.needsUpdate=true;}
  }
 }
 setModularMuscle(meshes,r.muscle);
 if(typeof document!=='undefined')setModularExpression(meshes,r.expression||'neutral',{eyeColor:r.eyeColor||'#29221b',glow:!!r.eyeGlow});
 return r;
}

export function applyModularFrame(actor,frame,nativeScale=1){
 const ratios=MODULAR_FRAMES[frame];if(!ratios)throw Error('Unknown modular frame: '+frame);
 actor.scale.set(...ratios.map(n=>n*nativeScale));
}
// Keep the common head and every attached hair/visor/face module the same size.
// Call after animation sampling, which restores the source bone scale.
export function applyModularHeadScale(actor,frame){
 const ratios=MODULAR_FRAMES[frame],head=actor.getObjectByName('DEF-head');
 if(head&&ratios)head.scale.set(1/ratios[0],1/ratios[1],1/ratios[2]);
}
