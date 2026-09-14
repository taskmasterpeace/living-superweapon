import {HERO_SIGNATURE_RECIPES} from '../data/hero-signature-recipes.js';
import * as T from 'three';
import {setModularExpression,setModularMuscle} from './modular-face.js';
import {INFECTION_STYLES,infectionTexture,outfitTexture} from './modular-surfaces.js';

export const MODULAR_FRAMES={hero:[1,1,1],heavy:[1.38,.92,1.18],agile:[.83,.98,.88],machine:[1.20,1.08,1.12]};
export const MODULAR_RECIPES={
 ...HERO_SIGNATURE_RECIPES,
 scientist:{name:'Scientist · laboratory coat',frame:'hero',anatomy:'male',hair:'swept',hairColor:'#493322',skin:'#c79c72',primary:'#30383c',secondary:'#bb2929',trim:'#252b2e',emblemColor:'#eee9df',emblem:'none',coat:true,glasses:true,cape:false,armor:false,backpack:false,shoulders:false,gauntlets:false,knees:false,belt:false,gloves:'bare',footwear:'shoes',muscle:.85},
 striped:{name:'Striped explorer · fabric example',frame:'hero',hair:'swept',skin:'#c79c72',primary:'#e8e6d9',secondary:'#c62b31',trim:'#263443',pattern:'stripes',emblem:'none',cape:false,armor:false,shoulders:false,gauntlets:false,knees:false,belt:false,gloves:'bare',muscle:.85},
 vegas:{name:'Vegas · black and old gold',frame:'hero',hair:'none',skin:'#633b28',primary:'#161a1b',secondary:'#b18a3b',trim:'#252a29',emblemColor:'#d5b15c',emblem:'V',cape:false,armor:false,shoulders:true,muscle:1.15},
 mage:{name:'Ascendant · robed caster',frame:'agile',anatomy:'female',hair:'bun',skin:'#78462e',primary:'#e8e5d6',secondary:'#b52e23',trim:'#20272b',emblemColor:'#b52e23',emblem:'triangle',cape:false,robe:true,sleeves:true,collar:true,gauntlets:false,knees:false,armor:false,shoulders:false,gloves:'bare',muscle:.9},
 infected:{infection:'rupture',tornClothes:false,name:'Infected · civilian',frame:'hero',hair:'swept',skin:'#a8aa85',primary:'#505958',secondary:'#74352b',trim:'#303830',emblemColor:'#74352b',emblem:'none',cape:false,armor:false,shoulders:false,gauntlets:false,knees:false,belt:false,gloves:'bare',bareArms:true,muscle:.85,eyeColor:'#e4e5b2',eyeGlow:true,expression:'angry'},
 infectedHeavy:{infection:'rupture',tornClothes:false,name:'Infected · heavy',frame:'heavy',hair:'none',skin:'#a8aa85',primary:'#555a49',secondary:'#74352b',trim:'#303830',emblemColor:'#74352b',emblem:'none',cape:false,armor:false,shoulders:false,gauntlets:false,knees:false,belt:false,gloves:'bare',bareArms:true,muscle:1.3,eyeColor:'#e4e5b2',eyeGlow:true,expression:'angry'},
 base:{name:'Base character',frame:'hero',anatomy:'male',hair:'none',skin:'#b18b6d',primary:'#89928b',secondary:'#89928b',trim:'#89928b',emblemColor:'#e7d5a2',emblem:'none',cape:false,armor:false,shoulders:false,gauntlets:false,knees:false,belt:false,backpack:false,gloves:'bare',muscle:1},
 female:{name:'Base character · female',frame:'agile',anatomy:'female',hair:'bun',skin:'#78462e',primary:'#89928b',secondary:'#89928b',trim:'#89928b',emblemColor:'#e7d5a2',emblem:'none',cape:false,armor:false,shoulders:false,gauntlets:false,knees:false,belt:false,backpack:false,gloves:'bare',muscle:1},
 hero:{name:'Ascendant',frame:'hero',hair:'swept',skin:'#b18b6d',primary:'#dce0d9',secondary:'#b52e23',trim:'#20272b',emblemColor:'#b52e23',emblem:'triangle',cape:true,armor:false,shoulders:true,muscle:1},
 mercenary:{name:'Mercenary · heavy',frame:'heavy',hair:'braids',skin:'#633b28',primary:'#69704a',secondary:'#85805a',trim:'#262d28',emblemColor:'#dac792',emblem:'shield',cape:false,armor:true,shoulders:false,bareArms:true,muscle:1.25},
 scout:{name:'Mercenary · agile',frame:'agile',hair:'afro',skin:'#78462e',primary:'#666c47',secondary:'#a29970',trim:'#242c28',emblemColor:'#e0c783',emblem:'bolt',cape:false,armor:true,shoulders:false,bareArms:true,muscle:.85},
 robot:{name:'Armored automaton',frame:'machine',hair:'none',skin:'#8b9694',primary:'#677575',secondary:'#c6ac57',trim:'#243033',emblemColor:'#78dcca',emblem:'star',cape:false,armor:false,shoulders:true,muscle:1.15,eyeColor:'#73ffe0',eyeGlow:true},
};
export function validateModularRecipe(input){
 if(!input||input.schema!==1||input.skeleton!=='ual-deform-v1'||input.body!=='faceted-v1')throw Error('Expected a version 1 faceted character recipe');
 const r={...MODULAR_RECIPES.hero};
 const enums={clawStyle:['paired','singleBone'],aura:['none','swarm','gravity','sparks'],auraState:['always','flight','attack'],tattooRegion:['chest','upperArmL','upperArmR'],capeStyle:['full','short','split','shoulder','pointed'],headwear:['none','cap','hood','speed','helmet','mask','skull','tactical','domino','insect','greathelm','circlet'],wings:['none','angel','armor'],coatStyle:['long','short'],shieldStyle:['round','kite','riot'],weapon:['none','sword','bat','axe','spear','dualKatana'],frame:Object.keys(MODULAR_FRAMES),anatomy:['male','female'],infection:Object.keys(INFECTION_STYLES),patternRegion:['all','torso','arms','legs'],pattern:['solid','gilt','stripes','pinstripe','denim','custom'],beltStyle:['plain','utility'],footwear:['boots','shoes'],gloves:['bare','full','fingerless','boxing'],emblemPlacement:['front','back','both'],hair:['swept','afro','bun','braids','none','dreadlocks','mohawk','fade','buzz','spiky','ponytail','slicked','bob'],emblem:['triangle','shield','bolt','star','V','web','ring','deck52','none','custom',...Object.values(HERO_SIGNATURE_RECIPES).map(r=>r.emblem),...Object.values(HERO_SIGNATURE_RECIPES).filter(r=>r.rosterId).map(r=>'sig-'+r.rosterId)],expression:['neutral','happy','angry','talkA','talkB','surprised','sad']};
 for(const [key,values]of Object.entries(enums))if(input[key]!==undefined){if(!values.includes(input[key]))throw Error('Invalid '+key);r[key]=input[key];}
 for(const key of ['primary','secondary','trim','emblemColor','skin','hairColor','eyeColor','gloveColor'])if(input[key]!==undefined){if(!/^#[0-9a-f]{6}$/i.test(input[key]))throw Error('Invalid '+key+' color');r[key]=input[key];}
 for(const key of ['centerPanel','skirt','beard','claws','tentacles','wristBlasters','lasso','kilt','metallic','shimmer','shield','coat','wristbands','tornClothes','cape','robe','sleeves','collar','glasses','armor','shoulders','gauntlets','knees','belt','backpack','bareArms','helmet','visor','eyepatch','eyeGlow'])if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw Error('Invalid '+key);r[key]=input[key];}
 if(input.emblemImage!==undefined){if(typeof input.emblemImage!=='string'||input.emblemImage.length>1500000||!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.emblemImage))throw Error('Expected a small PNG or WebP emblem');r.emblemImage=input.emblemImage;}
 if(input.tattooImage!==undefined){if(typeof input.tattooImage!=='string'||input.tattooImage.length>1500000||!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.tattooImage))throw Error('Expected a small PNG or WebP tattoo');r.tattooImage=input.tattooImage;}
 if(input.patternImage!==undefined){if(typeof input.patternImage!=='string'||input.patternImage.length>1500000||!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.patternImage))throw Error('Expected a small PNG or WebP pattern');r.patternImage=input.patternImage;}
 for(const [key,min,max]of [['patternScale',.5,4],['muscle',.8,1.3],['size',.85,1.25]])if(input[key]!==undefined){if(!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw Error('Invalid '+key);r[key]=input[key];}
 if(input.regionColors){r.regionColors={};for(const [slot,color] of Object.entries(input.regionColors)){if(!['torso','arms','legs','calves','waist','boots'].includes(slot)||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Invalid region color');r.regionColors[slot]=color;}}
 if(input.generation){if(input.generation.schema!==1||!Number.isInteger(input.generation.seed)||input.generation.seed<0||input.generation.seed>2147483647)throw Error('Invalid generation seed');r.generation={schema:1,seed:input.generation.seed};}
 if(typeof input.rosterId==='string')r.rosterId=input.rosterId.slice(0,40);
 r.name=typeof input.name==='string'?input.name.slice(0,60):'Imported character';return r;
}
const emblemTextures=new Map();
export function emblemTexture(id){
 if(emblemTextures.has(id))return emblemTextures.get(id);
 if(!['triangle','shield','bolt','star','V','web','ring','deck52','none'].includes(id)&&!Object.values(HERO_SIGNATURE_RECIPES).some(r=>r.emblem===id||'sig-'+r.rosterId===id))throw Error('Unknown emblem: '+id);
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.beginPath();
 const poly=points=>{points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fill();};
 if(id.startsWith('sig-')){const h=[...id].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,0);x.strokeStyle='#fff';x.lineWidth=14;const count=3+h%4;for(let i=0;i<count;i++){const a=i*Math.PI*2/count;x.beginPath();x.moveTo(128+35*Math.cos(a),128+35*Math.sin(a));x.lineTo(128+99*Math.cos(a),128+99*Math.sin(a));x.stroke();}poly([[128,72],[170,128],[128,184],[86,128]]);}
 if(id==='triangle')poly([[24,40],[232,40],[128,220]]);
 if(id==='shield')poly([[44,35],[212,35],[212,138],[128,224],[44,138]]);
 if(id==='bolt')poly([[139,18],[49,142],[114,142],[88,238],[207,103],[143,103]]);
 if(id==='star')poly(Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?43:105;return[128+Math.cos(a)*r,128+Math.sin(a)*r];}));
 if(id==='ring'){x.strokeStyle='#fff';x.lineWidth=20;x.arc(128,128,79,0,Math.PI*2);x.stroke();}
 if(id==='deck52'){x.font='bold 100px sans-serif';x.textAlign='center';x.fillText('52',128,164);}
 if(id==='web'){x.strokeStyle='#fff';x.lineWidth=8;for(let i=0;i<8;i++){const a=i*Math.PI/4;x.beginPath();x.moveTo(128,128);x.lineTo(128+105*Math.cos(a),128+105*Math.sin(a));x.stroke();}for(const radius of [38,70,103]){x.beginPath();x.arc(128,128,radius,0,Math.PI*2);x.stroke();}}
 if(id==='V')poly([[29,40],[78,40],[128,165],[178,40],[227,40],[150,224],[106,224]]);
 const t=new T.CanvasTexture(c);t.flipY=false;t.colorSpace=T.SRGBColorSpace;emblemTextures.set(id,t);return t;
}
export function applyModularRecipe(meshes,recipe){
 const r={infection:'none',pattern:'solid',patternScale:1,footwear:'boots',beltStyle:'utility',gauntlets:true,knees:true,belt:true,gloves:'full',gloveColor:'#20272b',emblemPlacement:'front',...MODULAR_RECIPES.hero,...recipe};
 for(const m of meshes){
  if(!m.userData.recipeMaterialOwned){m.material=m.material.clone();m.userData.recipeMaterialOwned=true;}
  const slot=m.userData.slot;m.visible=true;
  if(!['expression','emblem','emblemBack'].includes(slot)){const translucent=r.shimmer&&m.material.name==='skin';m.material.transparent=!!translucent;m.material.opacity=translucent?.88:1;m.material.depthWrite=!translucent;m.material.emissive.set(translucent?'#d9e2e7':'#000000');m.material.emissiveIntensity=translucent?.13:0;}
  if(slot==='hair')m.visible=m.userData.variant===r.hair;
  if(slot==='coat'){m.visible=!!r.coat;const i=m.morphTargetDictionary?.coatShort;if(i!==undefined)m.morphTargetInfluences[i]=r.coatStyle==='short'?1:0;}
  if(r.coat&&['arms','deltoids','forearms','gauntlets','sleeves','robe','shoulders'].includes(slot))m.visible=false;
  if(slot==='cape'){m.visible=!!r.cape;for(const style of ['short','split','shoulder','pointed']){const i=m.morphTargetDictionary?.['cape_'+style];if(i!==undefined)m.morphTargetInfluences[i]=r.capeStyle===style?1:0;}}
  if(['tornClothes','robe','sleeves','collar','glasses'].includes(slot))m.visible=!!r[slot];
  if(['vest','backpack','pouches'].includes(slot))m.visible=!!r.armor;
  if(slot==='backpack')m.visible=r.backpack??!!r.armor;
  if(slot==='belt')m.visible=!!r.belt;
  if(slot==='pouches')m.visible=!!r.belt&&r.beltStyle==='utility';
  if(slot==='knees')m.visible=!!r.knees;
  if(slot==='gauntlets')m.visible=!!r.gauntlets&&!r.sleeves&&r.gloves!=='boxing';
  if(slot==='forearms')m.visible=(!r.gauntlets||r.gloves==='boxing')&&!r.sleeves;
  if(slot==='wristbands')m.visible=!!r.wristbands&&!r.gauntlets&&!r.sleeves&&r.gloves!=='boxing';
  if(slot==='boxingGloves')m.visible=r.gloves==='boxing';
  if(['hands','handTips'].includes(slot))m.visible=r.gloves!=='boxing';
  if(slot==='boots')m.visible=r.footwear==='boots';
  if(['shoes','calves'].includes(slot))m.visible=r.footwear==='shoes';
  if(slot==='shoulders')m.visible=!!r.shoulders;
  if(slot==='helmet')m.visible=!!r.helmet;
  if(slot==='visor')m.visible=!!r.visor;
  if(slot==='eyepatch')m.visible=!!r.eyepatch;
  if(slot==='glasses'&&r.visor)m.visible=false;
  if(r.coat&&['arms','deltoids','forearms','gauntlets','sleeves','robe','shoulders'].includes(slot))m.visible=false;
  const colors={suit:r.primary,accent:r.secondary,dark:r.trim,metal:r.emblemColor,skin:r.skin};
  if(colors[m.material.name])m.material.color.set(colors[m.material.name]);
  if(r.regionColors?.[slot])m.material.color.set(r.regionColors[slot]);
  m.material.metalness=r.metallic&&['suit','accent','dark'].includes(m.material.name)?.72:0;m.material.roughness=r.metallic?.3:.78;
  if(slot==='hair')m.material.color.set(r.hairColor||'#171b19');
  if(['arms','deltoids','forearms'].includes(slot)&&r.bareArms)m.material.color.set(r.skin);
  if(['hands','handTips'].includes(slot))m.material.color.set(r.gloves==='bare'||(r.gloves==='fingerless'&&slot==='handTips')?r.skin:r.gloveColor);
  if(slot==='boxingGloves')m.material.color.set(r.gloveColor);
  if(slot==='coat'&&m.material.name==='suit')m.material.color.set(r.coatStyle==='short'?r.primary:'#eeeae2');
  if(!['expression','emblem','emblemBack'].includes(slot)&&typeof document!=='undefined'){
   let map=null;const infected=INFECTION_STYLES[r.infection];
   if(slot!=='coat'&&m.material.name==='suit'&&r.pattern!=='solid'&&(!r.patternRegion||r.patternRegion==='all'||({torso:['torso'],arms:['arms','forearms','deltoids'],legs:['legs','calves']}[r.patternRegion]||[]).includes(slot))){map=outfitTexture(r);if(map)m.material.color.set('#ffffff');}
   const exposed=m.material.name==='skin'||(['arms','deltoids','forearms'].includes(slot)&&r.bareArms)||(['hands','handTips'].includes(slot)&&(r.gloves==='bare'||(r.gloves==='fingerless'&&slot==='handTips')));
   if(infected&&exposed){map=infectionTexture(r.infection);m.material.color.set(infected.skin);}else if(infected&&['suit','accent','dark'].includes(m.material.name)&&slot!=='hair'){m.material.color.lerp(new T.Color('#777d78'),.38);}
   if(m.material.map!==map){m.material.map=map;m.material.needsUpdate=true;}
  }
  const waist=m.morphTargetDictionary?.waistNarrow;if(waist!==undefined)m.morphTargetInfluences[waist]=(r.anatomy??(r.frame==='agile'?'female':'male'))==='female'?1:0;
  if(slot==='emblem'||slot==='emblemBack'){
   const back=slot==='emblemBack',gear=back?(r.backpack??r.armor):r.armor;
   m.visible=r.emblem!=='none'&&(r.emblem!=='custom'||!!r.emblemImage)&&(r.emblemPlacement==='both'||r.emblemPlacement===(back?'back':'front'));
   for(const [key,value]of Object.entries({onGear:gear?1:0,muscleSmall:!gear&&r.muscle<1?(1-r.muscle)/.2:0,muscleLarge:!gear&&r.muscle>1?(r.muscle-1)/.3:0}))if(m.morphTargetDictionary?.[key]!==undefined)m.morphTargetInfluences[m.morphTargetDictionary[key]]=value;
   if(typeof document!=='undefined'){m.material.map=r.emblem==='custom'?customEmblemTexture(r.emblemImage):emblemTexture(r.emblem);m.material.transparent=true;m.material.alphaTest=.05;m.material.depthWrite=false;m.material.color.set(r.emblem==='custom'?'#ffffff':r.emblemColor);m.material.needsUpdate=true;}
  }
 }
 setModularMuscle(meshes,r.muscle);
 if(typeof document!=='undefined')setModularExpression(meshes,r.expression||'neutral',{eyeColor:r.infection!=='none'?'#f5f4dc':r.eyeColor||'#29221b',glow:r.infection!=='none'||!!r.eyeGlow,infection:r.infection});
 return r;
}
export function customEmblemTexture(data){
 if(!data)return null;
 if(emblemTextures.has(data))return emblemTextures.get(data);
 const t=new T.TextureLoader().load(data);t.flipY=false;t.colorSpace=T.SRGBColorSpace;emblemTextures.set(data,t);return t;
}
export function animateModularCape(meshes,time,speed=0){
 const value=T.MathUtils.clamp(.08+speed*.003+Math.sin(time*2)*.035,0,.40);
 for(const m of meshes)if(m.userData.slot==='cape'&&m.morphTargetDictionary?.capeBend!==undefined)m.morphTargetInfluences[m.morphTargetDictionary.capeBend]=value;
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
