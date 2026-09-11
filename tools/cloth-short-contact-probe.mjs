// Observe a native seeded fall. Diagnostic wrappers never replace a solve.
import * as T from 'three';
import {clothFall} from './helpers/cloth-fall.mjs';
import {trunkProbe} from './helpers/trunk-probe.mjs';
const stock=process.argv.includes('--stock'),limit=stock?234:84;
const {f,rag,world}=clothFall(stock?{seed:31}:{seed:99,frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},cover:[{x:52,z:3,hx:4,hz:4,top:4}]});
const cloth=rag.capePose,face=cloth.faces[stock?58:80],rows=[],sample=new T.Vector3(),probe=trunkProbe(f.parts.torso);let frame=0,pass=0;
const snapshot=()=>face.map(p=>({id:cloth.points.indexOf(p),pos:p.pos.toArray(),prev:p.prev.toArray(),pin:p.pin,normals:p.contactNormals.slice(0,p.contactCount).map(n=>n.toArray()),offsets:p.contactOffsets.slice(0,p.contactCount)}));
const inspect=()=>{
 const inverse=f.parts.torso.matrixWorld.clone().invert(),bad=[];
 for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){
  sample.set(0,0,0);face.forEach((p,i)=>sample.addScaledVector(p.pos,weights[i]));
  if(probe(sample,inverse))bad.push({weights,world:sample.toArray(),local:sample.clone().applyMatrix4(inverse).toArray()});
 }
 return bad;
};
const surface=cloth.surfaceTargets;cloth.surfaceTargets=function(points,weights,normal,depth,w){
 const result=surface.call(this,points,weights,normal,depth,w);
 if(frame===limit&&points===face){
  const end=new T.Vector3();points.forEach((p,i)=>end.addScaledVector(cloth.proposalTargets[i],weights[i]));
  rows.push({phase:'candidate',pass,weights,normal:normal.toArray(),depth,cost:Number.isFinite(result)?result:'infeasible',mobility:[...cloth.mobility],targets:cloth.proposalTargets.map(p=>p.toArray()),inside:cloth.bodies.flatMap((b,i)=>b.box.containsPoint(end.clone().applyMatrix4(b.inverse))?[i]:[])});
 }
 return result;
};
const collide=cloth.collideSurface;cloth.collideSurface=function(...args){
 const before=frame===limit?snapshot():null;pass++;const result=collide.apply(this,args);
 if(frame===limit)rows.push({phase:'surface',pass,before,after:snapshot(),bad:inspect(),correction:result});return result;
};
try{
 for(frame=0;frame<=limit;frame++){
  pass=0;rag.step(stock?1/60:1/120,{world});rag.apply(f);
 }
 console.log(JSON.stringify({scope:stock?'native stock seed31, frame234 at60Hz':'native short/broad seed99, platform, frame84 at120Hz',face:face.map(p=>cloth.points.indexOf(p)),bad:inspect(),bodyBoxes:cloth.bodies.map((b,i)=>({i,matrix:b.matrix.toArray(),box:[b.box.min.toArray(),b.box.max.toArray()]})),rows},null,2));
}finally{f.dispose();}
