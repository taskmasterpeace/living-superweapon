import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Raycaster} from 'three';
import {figure} from '../src/engine/figure.js';
import {ROSTER} from '../src/data/characters.js';
import {updateLimbSurfaces} from '../src/engine/hero-limb-surface.js';
import {Fighter} from '../src/engine/entity.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
const cleanup=p=>p.g.traverse(o=>o.geometry?.dispose());
// Removing chest-to-arm deformation must expose background through this corridor.
for(const frame of [{scale:1,bulk:1,broad:1.25},{scale:.8,bulk:.65,broad:1.6}])
test(`shoulder tissue spans chest-to-arm across authored frame ${frame.bulk}/${frame.broad}`,()=>{
 const p=figure({...ROSTER.find(d=>d.id==='kano'),frame});
 try{
  for(const side of [-1,1])for(const angle of [0,-1.4,-2.8]){
   const arm=side<0?p.armL:p.armR;arm.rotation.x=angle;updateLimbSurfaces(p,true);
   const a=p.torso.localToWorld(new Vector3(side*.85,1.05,0));
   const b=arm.children[0].localToWorld(new Vector3(0,.4,0));
   for(const t of [.15,.3,.5,.7,.85]){
    const point=a.clone().lerp(b,t),ray=new Raycaster(point.clone().add(new Vector3(0,0,8)),new Vector3(0,0,-1));
    const hits=ray.intersectObjects([p.torso,arm],true).filter(h=>h.object.visible);
    assert.ok(hits.some(h=>Math.abs(h.point.z-point.z)<2*frame.bulk),`background through shoulder at side=${side}, angle=${angle}, t=${t}`);
   }
  }
 }finally{cleanup(p);}
});

function attached(p,context=''){
 for(const surface of p.rig.shoulderSurfaces){
  const a=p.torso.localToWorld(new Vector3(surface.side*.85,1.05,0));
  const b=surface.upper.localToWorld(new Vector3(0,.4,0));
  const center=a.lerp(b,.5),direction=new Vector3(0,0,1);
  const ray=new Raycaster(center.clone().addScaledVector(direction,8),direction.negate());
  // Authored-body heroes suppress the procedural render layer. This contract
  // checks its deformation/restoration geometry even while that layer is hidden.
  const hits=[];surface.mesh.raycast(ray,hits);
  assert.ok(hits.some(h=>Math.abs(h.distance-8)<2),`shoulder detached from final drivers ${context} side=${surface.side}`);
  assert.ok(surface.mesh.geometry.attributes.position.array.every(Number.isFinite));
 }
}

test('production flight and hit reactions carry shoulders; a frozen bind surface is rejected',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='kano'));f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=80;
 try{
  for(const vel of [[0,0,65],[65,0,0],[0,-65,0],[0,0,-40]]){
   f.vel.set(...vel);queueHitReaction(f,50,{kb:new Vector3(60,30,0)});
   for(let i=0;i<45;i++){f.animT+=1/60;f._animate(1/60);attached(f.parts);}
  }
  const surfaces=f.parts.rig.shoulderSurfaces,updates=surfaces.map(s=>s.update);
  surfaces.forEach(s=>s.update=()=>{});
  f.vel.set(0,0,65);for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}
  // Broad scale exaggerates the detached bind geometry without changing the test's expected corridor.
  f.parts.armL.position.x-=2;f.parts.armR.position.x+=2;f._animate(1/60);
  assert.throws(()=>attached(f.parts),/detached/,'omitting the final deformation update must fail');
  surfaces.forEach((s,i)=>s.update=updates[i]);f._animate(1/60);attached(f.parts);
 }finally{f.dispose();}
});

test('all roster shoulders survive ragdoll playback and restore their exact authored geometry',()=>{
 for(const def of ROSTER){
  const f=new Fighter(def);
  try{
   const before=f.parts.rig.shoulderSurfaces.map(s=>s.mesh.geometry.attributes.position.array.slice());
   const rag=new Ragdoll(f,new Vector3(35,22,-18));
   for(let i=0;i<120;i++){rag.step(1/60,null);rag.apply(f);attached(f.parts,`${def.id} frame=${i}`);}
   rag.restore();
   f.parts.rig.shoulderSurfaces.forEach((s,i)=>{
    const after=s.mesh.geometry.attributes.position.array;
    for(let j=0;j<after.length;j++)assert.ok(Math.abs(after[j]-before[i][j])<1e-5,`${def.id}: recovery left a deformed shoulder`);
   });
  }finally{f.dispose();}
 }
});

test('shoulder triangles face outward and the volume follows final chest and arm drivers',()=>{
 const p=figure(ROSTER.find(d=>d.id==='kano'));
 try{
  for(const surface of p.rig.shoulderSurfaces){
   const geo=surface.mesh.geometry,pos=geo.attributes.position,indices=geo.index.array;
   for(let i=0;i<indices.length;i+=3){
    const a=new Vector3().fromBufferAttribute(pos,indices[i]),b=new Vector3().fromBufferAttribute(pos,indices[i+1]),c=new Vector3().fromBufferAttribute(pos,indices[i+2]);
    const normal=b.clone().sub(a).cross(c.clone().sub(a)),center=a.clone().add(b).add(c).divideScalar(3);
    const core=new Vector3().fromBufferAttribute(pos,0).lerp(new Vector3().fromBufferAttribute(pos,pos.count-1),.5);
    assert.ok(normal.dot(center.sub(core))>0,'shoulder is inside-out');
   }
   const before=pos.array.slice();surface.upper.parent.rotation.x=-2.6;updateLimbSurfaces(p);
   assert.notDeepEqual(pos.array,before,'shoulder frozen in its bind pose');
   const snapshot=pos.array.slice();updateLimbSurfaces(p,true);assert.deepEqual(pos.array,snapshot,'same phase accumulates deformation');
  }
 }finally{cleanup(p);}
});

test('smooth attachment motion through chest-forward cannot flip the shoulder surface',()=>{
 const p=figure(ROSTER.find(d=>d.id==='kano'));
 try{
  const s=p.rig.shoulderSurfaces[1],upper=s.upper,arm=p.armR;
  let previous=null,previousX=0;
  for(const x of [.032,.0316,.0312,0,-.0312,-.0316,-.032]){
   const b=p.torso.localToWorld(new Vector3(.85+x*1.3,1.05,Math.sqrt(1-x*x)*1.3));
   arm.worldToLocal(b);upper.position.copy(b).y-=.4*upper.scale.y;
   updateLimbSurfaces(p,true);const pos=s.mesh.geometry.attributes.position.array;
   if(previous&&Math.abs(x-previousX)<.001){
    let max=0;for(let i=0;i<pos.length;i+=3)max=Math.max(max,Math.hypot(pos[i]-previous[i],pos[i+1]-previous[i+1],pos[i+2]-previous[i+2]));
    assert.ok(max<.01,`tiny driver step popped shoulder by ${max}`);
   }
   previous=pos.slice();previousX=x;
  }
 }finally{cleanup(p);}
});

test('seeded ragdoll crossing the old basis singularity has no unowned surface jump',()=>{
 let seed=46;const random=Math.random;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const def={...ROSTER.find(d=>d.id==='vega'),frame:{scale:.65,bulk:1.65,broad:1.6,head:1,neck:1,stance:1}},p=figure(def);
 try{
  const f={parts:p,obj:p.g,pos:p.g.position,strength:def.strength??5},rag=new Ragdoll(f,new Vector3(42,12,42));let previous=null,previousAnchor=null;
  for(let frame=0;frame<360;frame++){
   rag.step(1/60,null);rag.apply(f);const s=p.rig.shoulderSurfaces[1],pos=s.mesh.geometry.attributes.position.array;
   const anchor=p.torso.worldToLocal(s.upper.localToWorld(new Vector3(0,.4,0)));
   if(previous){
    let maxStep=0;for(let i=0;i<pos.length;i+=3)maxStep=Math.max(maxStep,Math.hypot(pos[i]-previous[i],pos[i+1]-previous[i+1],pos[i+2]-previous[i+2]));
    assert.ok(maxStep<4*anchor.distanceTo(previousAnchor)+.02,`frame ${frame}: surface jumped independently of attachment (${maxStep})`);
   }
   previous=pos.slice();previousAnchor=anchor;
  }
 }finally{Math.random=random;cleanup(p);}
});
