import * as T from 'three';

// Every compatible head uses the same UV patch and expression vocabulary.
// These are presentation IDs, independent of character identity or dialogue.
export const FACE_EXPRESSIONS={neutral:{mouth:'line'},happy:{mouth:'smile'},angry:{mouth:'frown',brows:'angry'},talkA:{mouth:'open'},talkB:{mouth:'wide'},surprised:{mouth:'round',wide:true},sad:{mouth:'frown',brows:'sad'}};
const textures=new Map();
export function faceTexture(id='neutral',eyeColor='#171e1b',infection='none'){
 if(!Object.hasOwn(FACE_EXPRESSIONS,id))throw Error('Unknown facial expression: '+id);
 const cacheKey=id+eyeColor+infection;if(textures.has(cacheKey))return textures.get(cacheKey);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const x=canvas.getContext('2d'),s=FACE_EXPRESSIONS[id];x.lineCap='round';
 for(const cx of [69,187]){
  if(infection==='hollow'){x.fillStyle='#111516';x.fillRect(cx-32,69,64,38);continue;}
  if(infection==='fever'){x.fillStyle='#765b56';x.fillRect(cx-28,99,56,8);}
  if(infection==='rupture'){x.fillStyle='#3b2026';x.fillRect(cx-34,66,68,46);x.fillStyle='#a82937';x.fillRect(cx-30,73,60,36);}
  x.fillStyle='#f4efe0';x.fillRect(cx-26,78,52,s.wide?32:25);x.fillStyle=eyeColor;x.fillRect(cx-7,78,15,s.wide?31:25);
  x.strokeStyle='#171e1b';x.lineWidth=7;x.beginPath();const left=cx<128,tilt=s.brows==='angry'?(left?10:-10):s.brows==='sad'?(left?-9:9):0;x.moveTo(cx-26,65-tilt);x.lineTo(cx+26,65+tilt);x.stroke();
 }
 x.strokeStyle='#392821';x.fillStyle='#392821';x.lineWidth=6;x.beginPath();
 if(s.mouth==='open'||s.mouth==='round'){x.ellipse(128,199,s.mouth==='round'?13:19,22,0,0,Math.PI*2);x.fill();}
 else if(s.mouth==='wide'){x.roundRect(95,184,66,24,5);x.fill();x.fillStyle='#f4efe0';x.fillRect(101,186,54,6);}
 else {x.moveTo(96,196);x.quadraticCurveTo(128,s.mouth==='smile'?220:s.mouth==='frown'?178:196,160,196);x.stroke();}
 if(infection==='rupture'){
  x.strokeStyle=infection==='rupture'?'#c92134':'#743e35';x.lineWidth=infection==='rupture'?10:5;
  for(const points of [[[23,0],[38,31],[20,48],[40,63]],[[233,132],[210,146],[220,172],[196,186]]]){x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();}
  x.fillStyle='#982635';x.fillRect(85,171,87,54);x.fillRect(113,219,20,28);x.fillStyle='#312d29';x.beginPath();x.moveTo(89,174);x.lineTo(167,180);x.lineTo(158,222);x.lineTo(95,216);x.fill();x.fillStyle='#bdbbab';x.fillRect(101,181,49,7);
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.name='expression.'+id;textures.set(cacheKey,texture);return texture;
}
export function setModularExpression(meshes,id='neutral',options={}){
 if(!Object.hasOwn(FACE_EXPRESSIONS,id))throw Error('Unknown facial expression: '+id);
 for(const m of meshes)if(m.userData.slot==='expression'){
  const eyeColor=options.eyeColor??m.userData.eyeColor??'#171e1b',glow=options.glow??m.userData.eyeGlow??false;
  m.material.map=faceTexture(id,eyeColor,options.infection||'none');m.material.transparent=true;m.material.depthWrite=false;m.material.alphaTest=.05;m.material.color.set('#ffffff');
  const key='eye-mask-'+id;
  if(!textures.has(key)){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,256,256);x.fillStyle='#fff';for(const cx of [69,187])x.fillRect(cx-7,78,15,FACE_EXPRESSIONS[id].wide?31:25);const t=new T.CanvasTexture(c);t.flipY=false;textures.set(key,t);}
  m.material.emissiveMap=textures.get(key);m.material.emissive.set(eyeColor);m.material.emissiveIntensity=glow?3:0;
  m.material.needsUpdate=true;Object.assign(m.userData,{expression:id,eyeColor,eyeGlow:glow});
 }
}
export function setModularMuscle(meshes,amount=1){
 if(!Number.isFinite(amount)||amount<.8||amount>1.3)throw Error('Muscle amount must be 0.8–1.3');
 for(const m of meshes)if(['arms','deltoids','torso'].includes(m.userData.slot)){
  // Authored morph deltas are local to the mesh. Runtime bindMatrixInverse
  // includes scene scale and must never be used to rewrite rest vertices.
  const small=m.morphTargetDictionary?.muscleSmall,large=m.morphTargetDictionary?.muscleLarge;
  if(small===undefined||large===undefined)continue;
  m.morphTargetInfluences[small]=amount<1?(1-amount)/.2:0;
  m.morphTargetInfluences[large]=amount>1?(amount-1)/.3:0;
  m.userData.muscleAmount=amount;
 }
}
