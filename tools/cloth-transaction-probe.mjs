// Rejected weighted-candidate diagnostic. Not the production contact solver.
import * as T from 'three';
import {clothFall} from './helpers/cloth-fall.mjs';
import {RagdollCape} from './prototypes/ragdoll-cape-weighted.mjs';
const {f,rag,world}=clothFall({seed:null,cover:[{x:45,z:0,hx:.15,hz:30,top:80}]});
const original=rag.capePose;
rag.capePose=new RagdollCape(f.parts,original.points[0].pos.clone().sub(original.points[0].prev).divideScalar(original.dt));
const cloth=rag.capePose,rows=[];let frame=0;
const box=new T.Box3(new T.Vector3(44.85,0,-30),new T.Vector3(45.15,80,30)),sample=new T.Vector3();
const inspect=()=>{
 const bad=[];
 for(let j=0;j<cloth.faces.length;j++)for(const w of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){
  sample.set(0,0,0);cloth.faces[j].forEach((p,i)=>sample.addScaledVector(p.pos,w[i]));
  if(box.containsPoint(sample)){bad.push(j);break;}
 }
 return bad;
};
const snapshot=face=>face.map(p=>({id:cloth.points.indexOf(p),pos:p.pos.toArray(),prev:p.prev.toArray(),last:p.last.toArray(),pin:p.pin,contacts:Array.from({length:p.contactCount||0},(_,i)=>{
 const ref=p.contactRefs?.[i];return ref?{face:ref.face.map(q=>cloth.points.indexOf(q)),w:ref.weights,n:ref.normal.toArray(),offset:ref.offset,sample:ref.face.reduce((s,q,k)=>s+ref.weights[k]*ref.normal.dot(q.pos),0)}:{n:p.contactNormals[i].toArray(),offset:p.contactOffsets[i]};
 })}));
const commit=cloth.commitContact;cloth.commitContact=function(p,target,normal){
 const before=p.pos.clone(),result=commit.call(this,p,target,normal);
 if(frame>=55&&cloth.points.indexOf(p)===30&&before.distanceToSquared(p.pos)>1e-12)rows.push({frame,phase:'point30',cover:!!this.solvingCover,surface:!!this.applyingSurface,before:before.toArray(),after:p.pos.toArray(),last:p.last.toArray(),normal:normal.toArray()});
 return result;
};
for(const name of ['collideCoverSurface','collideSurface']){
 const original=cloth[name];cloth[name]=function(...args){
  const before=frame>=55?inspect():[],result=original.apply(this,args);
  if(frame>=55)rows.push({frame,phase:name,before,after:inspect(),correction:result});
  return result;
 };
}
try{
 for(frame=0;frame<70;frame++){
  rag.step(1/120,{world});rag.apply(f);const bad=inspect();
  if(bad.length){console.log(JSON.stringify({frame,bad,rows:rows.filter(r=>r.frame===frame),face:snapshot(cloth.faces[bad[0]])},null,2));break;}
 }
}finally{f.dispose();}
