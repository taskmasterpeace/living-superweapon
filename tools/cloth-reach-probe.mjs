// Read-only audit of native contact corrections versus the garment's material
// distance to its pinned shoulder seam. This does not alter any solver result.
import * as T from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import {clothFall} from './helpers/cloth-fall.mjs';
const {f,rag,world}=clothFall({seed:99,frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},cover:[{x:52,z:3,hx:4,hz:4,top:4}]});
try{
 const cloth=rag.capePose,n=cloth.points.length,neighbors=Array.from({length:n},()=>[]);
 for(const l of cloth.links){neighbors[l.a].push([l.b,l.length]);neighbors[l.b].push([l.a,l.length]);}
 const reach=Array(n).fill(Infinity),anchor=Array(n).fill(-1),visited=Array(n).fill(false);
 for(let i=0;i<n;i++)if(cloth.points[i].pin){reach[i]=0;anchor[i]=i;}
 for(let it=0;it<n;it++){
  let a=-1;for(let i=0;i<n;i++)if(!visited[i]&&(a<0||reach[i]<reach[a]))a=i;
  if(a<0||!Number.isFinite(reach[a]))break;visited[a]=true;
  for(const [b,length] of neighbors[a])if(reach[a]+length<reach[b]){reach[b]=reach[a]+length;anchor[b]=anchor[a];}
 }
 const ratio=(i,pos)=>cloth.points[i].pin?0:pos.distanceTo(cloth.points[anchor[i]].pos)/reach[i];
 const initial=cloth.points.map((p,i)=>({i,reach:reach[i],anchor:anchor[i],ratio:ratio(i,p.pos)}));
 const commits=[],resolve=cloth.resolveContact,frames=[];let tick=0;
 cloth.resolveContact=function(p,...args){
  const i=cloth.points.indexOf(p),before=p.pos.clone(),count=p.contactCount||0;
  const requested=args[0].clone(),normal=args[1].clone();
  const oldNormals=p.contactNormals.slice(0,count).map(n=>n.toArray()),oldOffsets=p.contactOffsets.slice(0,count);
  const accepted=resolve.call(this,p,...args),distance=before.distanceTo(p.pos);
  if(accepted&&distance>.5)commits.push({tick,i,distance,reachRatio:ratio(i,p.pos),stage:this.applyingSurface?'surface':this.solvingCover?'cover':'vertex',before:before.toArray(),requested:requested.toArray(),after:p.pos.toArray(),normal:normal.toArray(),oldNormals,oldOffsets});
  return accepted;
 };
 for(tick=1;tick<=180;tick++){
  rag.step(1/120,{world});rag.apply(f);
  let maxStretch=0,link=null,maxReach=0;
  for(const l of cloth.links){const r=cloth.points[l.a].pos.distanceTo(cloth.points[l.b].pos)/l.length;if(r>maxStretch){maxStretch=r;link={...l};}}
  for(let i=0;i<n;i++)maxReach=Math.max(maxReach,ratio(i,cloth.points[i].pos));
  frames.push({tick,maxStretch,link,maxReach});
 }
 const worst=commits.sort((a,b)=>b.distance-a.distance).slice(0,12);
 const report={scope:'Native short/broad seed99, no solver replacement or pose substitution',initial,frames,worst};
 await mkdir('artifacts/cloth-reach',{recursive:true});await writeFile('artifacts/cloth-reach/baseline.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({initialMaxReach:Math.max(...initial.map(r=>r.ratio)),worstFrames:frames.sort((a,b)=>b.maxStretch-a.maxStretch).slice(0,4),worst},null,2));
}finally{f.dispose();}
