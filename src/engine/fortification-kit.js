import * as THREE from 'three';
import {fortificationPlacement,FORTIFICATION_PALETTE} from '../data/fortification-kit.js';

// Produce the EXTERIOR surface of the box union. Armor and red insets are
// material regions on that surface, not almost-coplanar boxes in front of it.
// This remains stable in the native .6..4200 perspective/depth range.
export function fortificationSurfaceBuffers(instances){
 const solids=instances.flatMap(i=>i.solids),visuals=instances.flatMap(i=>i.visuals),bySolid=new Map(),batches=new Map(),eps=1e-5;
 for(const v of visuals){if(!bySolid.has(v.solid))bySolid.set(v.solid,[]);bySolid.get(v.solid).push(v);}
 const bounds=solids.map(p=>({min:[p.x-p.hx,p.bottom,p.z-p.hz],max:[p.x+p.hx,p.top,p.z+p.hz]}));
 const buckets=new Map(),cells=b=>{const keys=[];for(let x=Math.floor((b.min[0]-eps)/32);x<=Math.floor((b.max[0]+eps)/32);x++)for(let y=Math.floor((b.min[1]-eps)/32);y<=Math.floor((b.max[1]+eps)/32);y++)for(let z=Math.floor((b.min[2]-eps)/32);z<=Math.floor((b.max[2]+eps)/32);z++)keys.push(`${x},${y},${z}`);return keys;};
 const indices=bounds.map(cells);indices.forEach((keys,i)=>keys.forEach(key=>{if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);}));
 const emit=(material,axis,sign,plane,a,b,loU,hiU,loV,hiV)=>{
  if(!batches.has(material))batches.set(material,{positions:[],normals:[]});const batch=batches.get(material),p=[];
  for(const [u,v]of[[loU,loV],[hiU,loV],[hiU,hiV],[loU,hiV]]){const q=[0,0,0];q[axis]=plane;q[a]=u;q[b]=v;p.push(q);}
  const n=[0,0,0];n[axis]=sign;const winding=(axis===1?-1:1)*sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
  for(const i of winding){batch.positions.push(...p[i]);batch.normals.push(...n);}
 };
 solids.forEach((solid,index)=>{
  const box=bounds[index],entries=bySolid.get(solid.id)||[],base=entries.find(p=>p.id)||entries[0],candidates=[...new Set(indices[index].flatMap(key=>buckets.get(key)))].filter(i=>i!==index);
  for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){
   const [a,b]=[0,1,2].filter(v=>v!==axis),plane=sign<0?box.min[axis]:box.max[axis],covers=[],paints=[];
   for(const other of candidates){const q=bounds[other],inside=plane>q.min[axis]+eps&&plane<q.max[axis]-eps,touch=sign>0?Math.abs(plane-q.min[axis])<eps:Math.abs(plane-q.max[axis])<eps,same=sign>0?Math.abs(plane-q.max[axis])<eps:Math.abs(plane-q.min[axis])<eps;
    if(!(inside||touch||(same&&other>index)))continue;const rect={loU:Math.max(box.min[a],q.min[a]),hiU:Math.min(box.max[a],q.max[a]),loV:Math.max(box.min[b],q.min[b]),hiV:Math.min(box.max[b],q.max[b])};if(rect.hiU-rect.loU>eps&&rect.hiV-rect.loV>eps)covers.push(rect);
   }
   for(const p of entries.filter(p=>!p.id)){
    const center=[p.x,p.y,p.z],sizes=[p.width,p.height,p.depth],thin=sizes.indexOf(Math.min(...sizes));if(thin!==axis||Math.sign(center[axis]-(box.min[axis]+box.max[axis])/2)!==sign)continue;
    paints.push({loU:Math.max(box.min[a],center[a]-sizes[a]/2),hiU:Math.min(box.max[a],center[a]+sizes[a]/2),loV:Math.max(box.min[b],center[b]-sizes[b]/2),hiV:Math.min(box.max[b],center[b]+sizes[b]/2),material:p.material});
   }
   const u=[box.min[a],box.max[a]],v=[box.min[b],box.max[b]];for(const r of[...covers,...paints]){u.push(r.loU,r.hiU);v.push(r.loV,r.hiV);}const us=[...new Set(u)].sort((x,y)=>x-y),vs=[...new Set(v)].sort((x,y)=>x-y),contains=(r,x,y)=>x>=r.loU-eps&&x<=r.hiU+eps&&y>=r.loV-eps&&y<=r.hiV+eps;
   for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){if(us[i+1]-us[i]<eps||vs[j+1]-vs[j]<eps)continue;const x=(us[i]+us[i+1])/2,y=(vs[j]+vs[j+1])/2;if(covers.some(r=>contains(r,x,y)))continue;let material=base?.material||'armor';for(const p of paints)if(contains(p,x,y))material=p.material;emit(material,axis,sign,plane,a,b,us[i],us[i+1],vs[j],vs[j+1]);}
  }
 });
 return batches;
}

// Renderer consumes the same recipe as collision, without a Highwall-specific branch.
export function buildFortificationKit(placements,{name='War World / fortification kit'}={}){
 const root=new THREE.Group();root.name=name;
 const instances=placements.map(p=>p.visuals?p:fortificationPlacement(p));
 const mats=Object.fromEntries(Object.entries(FORTIFICATION_PALETTE).map(([key,color])=>[key,new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.87})]));
 const batches=fortificationSurfaceBuffers(instances);
 for(const [key,batch]of batches){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));const mesh=new THREE.Mesh(geo,mats[key]);mesh.name=`fortification/${key}`;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 root.userData.solids=instances.flatMap(i=>i.solids);root.userData.instances=instances;
 root.userData.mounts=instances.flatMap(i=>i.mounts.map(m=>({...m,placementId:i.id})));
 root.userData.traversalLinks=instances.flatMap(i=>i.traversalLinks.map(t=>({...t,placementId:i.id})));
 root.userData.dispose=()=>{root.removeFromParent();root.traverse(o=>o.geometry?.dispose());for(const mat of Object.values(mats))mat.dispose();};
 return root;
}
