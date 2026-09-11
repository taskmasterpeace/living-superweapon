// Independent CPU oracle: contact with native indexed PlaneGeometry triangles.
// No heightAt sampling, grid cuts, or production trace math in the oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {traceCameraGround} from '../src/engine/camera-ground.js';

function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

// Triangle point = a + u*(b-a) + v*(c-a). The moving camera footprint's
// bottom is an axis-aligned square at start.y + delta.y*t - pad. Its first
// contact is the minimum t in a convex polytope of (u,v,t), found by testing
// all intersections of three constraint planes. This also catches ridges
// crossing the square between the centre/corner rays and starting overlap.
function triangleContact(a,b,c,start,end,pad){
 const ab=b.clone().sub(a),ac=c.clone().sub(a),d=end.clone().sub(start);
 const planes=[[-1,0,0,0],[0,-1,0,0],[1,1,0,1],[0,0,-1,0],[0,0,1,1]];
 for(const axis of ['x','z']){
  planes.push([ab[axis],ac[axis],-d[axis],start[axis]+pad-a[axis]]);
  planes.push([-ab[axis],-ac[axis],d[axis],a[axis]-start[axis]+pad]);
 }
 planes.push([-ab.y,-ac.y,d.y,a.y-start.y+pad]);
 let earliest=1;
 for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++)for(let k=j+1;k<planes.length;k++){
  const p=planes[i],q=planes[j],r=planes[k],qr=cross(q,r),rp=cross(r,p),pq=cross(p,q),det=dot(p,qr);
  if(Math.abs(det)<1e-12)continue;
  const x=[0,1,2].map(axis=>(p[3]*qr[axis]+q[3]*rp[axis]+r[3]*pq[axis])/det);
  if(x[2]>=earliest||planes.some(plane=>dot(plane,x)>plane[3]+1e-8))continue;
  earliest=Math.max(0,x[2]);
 }
 return earliest;
}

function meshContact(geometry,start,end,pad){
 const positions=geometry.attributes.position,index=geometry.index;
 let earliest=1;
 for(let i=0;i<index.count;i+=3){
  const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(positions,index.getX(i+j)));
  earliest=Math.min(earliest,triangleContact(...vertices,start,end,pad));
 }
 return earliest;
}

test('randomized native triangle camera footprints agree with independent convex contact oracle',t=>{
 const seed=0x51A7C0DE,rnd=random(seed);let contacts=0,clear=0,overlaps=0,maxError=0;
 for(let field=0;field<12;field++){
  const segments=1+field%5,arena=segments*4,geometry=new THREE.PlaneGeometry(arena*2,arena*2,segments,segments);
  const gh=Float32Array.from({length:(segments+1)**2},()=>rnd()*36-12);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++)position.setXYZ(i,position.getX(i),gh[i],-position.getY(i));
  const world=Object.assign(Object.create(World.prototype),{_gh:gh,_gseg:segments,_ghArena:arena,ARENA:arena,_ghTriangles:true});
  try{for(let trace=0;trace<20;trace++){
   const pad=trace%5===0?0:.15+rnd()*Math.min(3,arena*.4),limit=arena-pad-.01;
   const coord=()=> (rnd()*2-1)*limit;
   const start=new THREE.Vector3(coord(),trace%4===0?rnd()*34-6:26+pad,coord());
   const end=new THREE.Vector3(coord(),rnd()*50-18,coord());
   if(trace%7===0){end.x=start.x;end.z=start.z;}
   const expected=meshContact(geometry,start,end,pad),actual=traceCameraGround(world,start,end,pad),error=Math.abs(actual-expected);
   if(expected===1)clear++;else if(expected===0)overlaps++;else contacts++;
   maxError=Math.max(maxError,error);
   assert.ok(error<1e-7,JSON.stringify({seed,field,trace,pad,gh:[...gh],start:start.toArray(),end:end.toArray(),expected,actual,error}));
  }}finally{geometry.dispose();}
 }
 assert.ok(contacts>50&&clear>20&&overlaps>10,`Vacuous distribution: ${JSON.stringify({contacts,clear,overlaps})}`);
 t.diagnostic(JSON.stringify({seed,cases:240,contacts,clear,overlaps,maxError}));
});
