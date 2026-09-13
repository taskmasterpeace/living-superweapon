import * as T from 'three';

// Surface treatments reuse mesh UVs: no stacked transparent body shells,
// new colliders, or per-character material recompiles during animation.
const cache=new Map();
export const INFECTION_STYLES={none:null,fever:{skin:'#96957f',mark:'#713b32'},rupture:{skin:'#757971',mark:'#b4452c'},hollow:{skin:'#777d76',mark:'#493a34'}};
export function infectionTexture(style){
 if(!INFECTION_STYLES[style])return null;
 const key='infection:'+style;if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);
 x.fillStyle='#c9c8bf';for(const [a,b,w,h]of [[28,18,38,24],[180,80,32,21],[60,176,27,48],[204,212,25,32]])x.fillRect(a,b,w,h);
 x.strokeStyle=INFECTION_STYLES[style].mark;x.lineWidth=style==='rupture'?5:2;x.lineJoin='miter';
 for(const path of [[[0,44],[30,58],[38,81],[65,98],[78,130]],[[38,81],[18,110],[22,141]],[[256,189],[211,171],[199,134],[178,120]],[[211,171],[220,212],[245,229]]]){x.beginPath();path.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.name=key;cache.set(key,t);return t;
}
export function outfitTexture(recipe){
 if(!recipe.pattern||recipe.pattern==='solid')return null;
 const key=JSON.stringify([recipe.pattern,recipe.patternImage,recipe.primary,recipe.secondary,recipe.patternScale||1]);if(cache.has(key))return cache.get(key);
 let t;
 if(recipe.pattern==='custom'){
  if(!recipe.patternImage)return null;
  t=new T.TextureLoader().load(recipe.patternImage);
 }else{
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=recipe.primary;x.fillRect(0,0,256,256);x.strokeStyle=recipe.secondary;x.lineWidth=5;
  // Original angular filigree and key border; no brand logos or copied print.
  for(const [cx,cy]of [[64,64],[192,192]]){x.save();x.translate(cx,cy);for(let i=0;i<4;i++){x.rotate(Math.PI/2);x.beginPath();x.moveTo(0,4);x.bezierCurveTo(46,-42,60,45,18,34);x.bezierCurveTo(-1,29,8,12,20,19);x.stroke();}x.restore();}
  x.lineWidth=3;for(let i=0;i<256;i+=32){x.strokeRect(i,2,22,10);x.strokeRect(i+10,244,22,10);}t=new T.CanvasTexture(c);
 }
 t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(recipe.patternScale||1);cache.set(key,t);return t;
}
export async function readCostumeImage(file){
 if(!file||!['image/png','image/webp'].includes(file.type)||file.size>1000000)throw Error('Use a PNG or WebP under 1 MB');
 const bitmap=await createImageBitmap(file);const valid=bitmap.width<=2048&&bitmap.height<=2048;bitmap.close();if(!valid)throw Error('Image must be at most 2048 × 2048');
 return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
}
