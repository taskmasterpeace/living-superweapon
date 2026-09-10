import * as THREE from 'three';

// Cut a closed strap from the actual bind surface once, at construction. Source
// skins retain their interpolated bone weights; the procedural belt stays on
// the pelvis driver. Neither path adds a per-frame fitting/animation solver.
export function waistbandGeometry(source,bottom,top,thickness){
 const attrs=source.attributes,skinned=!!attrs.skinWeight;
 const read=i=>({
  p:new THREE.Vector3().fromBufferAttribute(attrs.position,i),
  n:new THREE.Vector3().fromBufferAttribute(attrs.normal,i),
  weights:skinned?new Map(Array.from({length:4},(_,j)=>[attrs.skinIndex.array[i*4+j],attrs.skinWeight.array[i*4+j]]).filter(([,w])=>w>0)):null,
 });
 const mix=(a,b,t)=>{
  const weights=skinned?new Map():null;
  if(weights)for(const [v,k] of [[a,1-t],[b,t]])for(const [joint,w] of v.weights)weights.set(joint,(weights.get(joint)||0)+w*k);
  return {p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),weights};
 };
 const clip=(polygon,y,above)=>{
  const out=[];
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],inside=v=>above?v.p.y>=y:v.p.y<=y;
   if(inside(a))out.push(a);
   if(inside(a)!==inside(b))out.push(mix(a,b,(y-a.p.y)/(b.p.y-a.p.y)));
  }
  return out;
 };
 const positions=[],normals=[],indices=[],skinIndex=[],skinWeight=[];
 const put=(v,offset,normal=v.n)=>{
  const index=positions.length/3,p=v.p.clone().addScaledVector(v.n,offset);
  positions.push(p.x,p.y,p.z);normals.push(normal.x,normal.y,normal.z);
  if(skinned){
   const weights=[...v.weights].sort((a,b)=>b[1]-a[1]).slice(0,4),total=weights.reduce((s,[,w])=>s+w,0);
   for(let j=0;j<4;j++){skinIndex.push(weights[j]?.[0]??0);skinWeight.push((weights[j]?.[1]??0)/total);}
  }
  return index;
 };
 const inward=-thickness*.2;
 for(let i=0;i<source.index.count;i+=3){
  const triangle=[0,1,2].map(k=>read(source.index.getX(i+k)));
  const polygon=clip(clip(triangle,bottom,true),top,false);if(polygon.length<3)continue;
  const outer=polygon.map(v=>put(v,thickness)),inner=polygon.map(v=>put(v,inward,v.n.clone().negate()));
  for(let j=1;j<polygon.length-1;j++)indices.push(outer[0],outer[j],outer[j+1],inner[0],inner[j+1],inner[j]);
  for(let j=0;j<polygon.length;j++){
   const a=polygon[j],b=polygon[(j+1)%polygon.length];
   if(![bottom,top].some(y=>Math.abs(a.p.y-y)<1e-7&&Math.abs(b.p.y-y)<1e-7))continue;
   const normal=a.n.clone().negate().cross(b.p.clone().addScaledVector(b.n,thickness).sub(a.p).addScaledVector(a.n,-thickness)).normalize();
   const oa=put(a,thickness,normal),ob=put(b,thickness,normal),ia=put(a,inward,normal),ib=put(b,inward,normal);
   indices.push(oa,ia,ob,ia,ib,ob);
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setIndex(indices);
 if(skinned){geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));}
 geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}
