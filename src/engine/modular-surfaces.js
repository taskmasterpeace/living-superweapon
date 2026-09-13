import * as T from 'three';

// Surface treatments reuse mesh UVs: no stacked transparent body shells,
// new colliders, or per-character material recompiles during animation.
const cache=new Map();
export const INFECTION_STYLES={none:null,fever:{skin:'#96957f',mark:'#713b32'},rupture:{skin:'#a2aaa5',mark:'#bb1725'},hollow:{skin:'#777d76',mark:'#493a34'}};
export function infectionTexture(style){
 if(!INFECTION_STYLES[style])return null;
 const key='infection:'+style;if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);
 x.fillStyle='#c9c8bf';for(const [a,b,w,h]of [[28,18,38,24],[180,80,32,21],[60,176,27,48],[204,212,25,32]])x.fillRect(a,b,w,h);
 x.strokeStyle=INFECTION_STYLES[style].mark;x.lineWidth=style==='rupture'?13:5;x.lineJoin='miter';
 for(const path of [[[0,44],[30,58],[38,81],[65,98],[78,130]],[[38,81],[18,110],[22,141]],[[256,189],[211,171],[199,134],[178,120]],[[211,171],[220,212],[245,229]]]){x.beginPath();path.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();}
 if(style==='rupture'){
  for(const [a,b] of [[38,81],[199,134],[78,130]]){x.fillStyle='#50121a';x.fillRect(a-11,b-9,24,20);x.fillStyle='#c82332';x.fillRect(a-7,b-6,15,11);x.fillStyle='#e87773';x.fillRect(a-5,b-5,6,3);}
  x.strokeStyle='#871627';x.lineWidth=7;for(const [a,b] of [[38,81],[199,134]]){x.beginPath();x.moveTo(a,b);x.lineTo(a+30,b-22);x.lineTo(a+46,b-18);x.stroke();}
 }
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
 if(!file||file.size>12000000||!(/image\/(png|webp|jpeg)/.test(file.type)||/\.(png|jpe?g|webp)$/i.test(file.name)))throw Error('Choose a PNG, JPEG or WebP up to 12 MB.');
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('This image could not be decoded. Try saving it as PNG or JPEG.');}
 const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();
 return c.toDataURL('image/webp',.9);
}
