import test from 'node:test';
import assert from 'node:assert/strict';
import {figure} from '../src/engine/figure.js';
import {ROSTER} from '../src/data/characters.js';
import {Vector3,Scene} from 'three';
import {bendArm} from '../src/engine/hero-rig.js';
import {updateLimbSurfaces} from '../src/engine/hero-limb-surface.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {Fighter} from '../src/engine/entity.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
import {Game} from '../src/engine/game.js';

const cleanup=p=>p.g.traverse(n=>{n.geometry?.dispose();});
for(const id of ['sol','kano','vega','sarge'])test(`${id}: a single connected surface spans each articulated limb`,()=>{
 const p=figure(ROSTER.find(d=>d.id===id));
 try{
  for(const [upper,lower] of [[p.armL.children[0],p.armL.children[1]],[p.armR.children[0],p.armR.children[1]],
   [p.legL.userData.thigh,p.legL.userData.shin],[p.legR.userData.thigh,p.legR.userData.shin]]){
   const surface=upper.children.find(n=>n.name==='hero-limb-surface');
   assert.ok(surface,'separate capped segments must be replaced by one continuous elbow/knee surface');
   assert.equal(upper.geometry.drawRange.count,0,'upper is a socket driver, not a second visible shell');
   assert.equal(lower.geometry.drawRange.count,0,'lower is a socket driver, not a second visible shell');
   const geo=surface.geometry,index=geo.index.array,adj=Array.from({length:geo.attributes.position.count},()=>[]);
   for(let i=0;i<index.length;i+=3)for(let j=0;j<3;j++){const a=index[i+j],b=index[i+(j+1)%3];adj[a].push(b);adj[b].push(a);}
   const visited=new Set([0]),queue=[0];while(queue.length){const a=queue.pop();for(const b of adj[a])if(!visited.has(b)){visited.add(b);queue.push(b);}}
   assert.equal(visited.size,adj.length,'no disconnected knee ball or independent forearm cap');
   p.g.updateMatrixWorld(true);geo.computeBoundingBox();
   const end=lower.getWorldPosition(new Vector3());surface.worldToLocal(end);
   assert.ok(geo.boundingBox.containsPoint(end),'surface reaches the lower segment rather than merely decorating the upper');
  }
  assert.equal(p.armL.children.length,3);assert.equal(p.armR.children.length,3);
 }finally{cleanup(p);}
});

test('continuous surfaces do not multiply draw calls per cross section',()=>{
 const p=figure(ROSTER.find(d=>d.id==='kano'));
 try{for(const s of p.rig.limbSurfaces){
  let draws=0,indices=0;
  s.mesh.traverse(m=>{if(m.isMesh&&m.geometry.drawRange.count>0){draws++;indices+=m.geometry.drawRange.count;}});
  assert.ok(draws<=2,'at most one draw per upper/lower material');
  assert.equal(indices,s.mesh.geometry.index.count,'draw views must cover each triangle exactly once');
  if(s.lowerView){
   for(const key of ['position','normal'])assert.equal(s.lowerView.geometry.attributes[key],s.mesh.geometry.attributes[key],'material views must share live vertex buffers');
   assert.equal(s.lowerView.geometry.boundingSphere,s.mesh.geometry.boundingSphere);
   assert.equal(s.lowerView.geometry.boundingBox,s.mesh.geometry.boundingBox);
  }
 }}
 finally{cleanup(p);}
});

test('deforming limbs preserve the single-material contract used by copies and invisibility',()=>{
 const p=figure(ROSTER.find(d=>d.id==='kano'));
 try{p.g.traverse(o=>{if(o.material)assert.equal(typeof o.material.clone,'function','body material cannot become an array');});}
 finally{cleanup(p);}
});

function invertedTriangles(s){
 const geo=s.mesh.geometry,pos=geo.attributes.position,indices=geo.index.array,centers=s.rows.map((_,r)=>{
  const center=new Vector3();for(let i=0;i<s.segments;i++)center.add(new Vector3().fromBufferAttribute(pos,r*s.segments+i));return center.divideScalar(s.segments);
 });
 let inverted=0;
 for(let i=0;i<indices.length;i+=3){
  const ids=Array.from(indices.slice(i,i+3));if(ids.some(v=>v>=s.rows.length*s.segments))continue;
  const [a,b,c]=ids.map(v=>new Vector3().fromBufferAttribute(pos,v));
  const radial=a.clone().add(b).add(c);for(const id of ids)radial.sub(centers[Math.floor(id/s.segments)]);
  const normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.dot(radial)<-1e-6)inverted++;
 }
 return inverted;
}

test('deep elbows and knees retain outward-facing surface triangles instead of folding inside out',()=>{
 const p=figure(ROSTER.find(d=>d.id==='kano'));
 try{
  for(const angle of [0,.7,1.4,2,2.6]){
   bendArm(p.armL,angle);bendArm(p.armR,angle);p.legL.userData.knee.rotation.x=angle;p.legR.userData.knee.rotation.x=angle;updateLimbSurfaces(p);
   for(const s of p.rig.limbSurfaces){
    const inverted=invertedTriangles(s);
    assert.equal(inverted,0,`${s.upper.parent===p.armL?'left arm':'limb'} at ${angle}rad has ${inverted} inside-out triangles`);
   }
  }
 }finally{cleanup(p);}
});

test('seeded real ragdoll tumbles keep 3-D limb surfaces outward-facing',()=>{
 const random=Math.random;let seed=0x12345678;
 Math.random=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
 try{
  for(const def of ROSTER.slice(0,30)){
   const f=new Fighter(def);f.pos.set(0,20,0);f._openSky=true;f.flying=true;f.gait='airborne';f.vel.set(30,0,50);
   try{
    for(let i=0;i<45;i++){f.animT+=1/60;f._animate(1/60);}
    const rag=new Ragdoll(f,new Vector3(32,12,18));
    for(let frame=0;frame<240;frame++){
     rag.step(1/60,null);rag.apply(f);
     for(const s of f.parts.rig.limbSurfaces)assert.equal(invertedTriangles(s),0,`${def.id} tumble frame ${frame} inverted a limb (angle ${s.upAxis.angleTo(s.downAxis)}, segment ${f.parts.rig.limbSurfaces.indexOf(s)})`);
    }
    rag.restore();anchored(f.parts);
   }finally{f.dispose();}
  }
 }finally{Math.random=random;}
});

function anchored(p){
 p.g.updateMatrixWorld(true);
 for(const s of p.rig.limbSurfaces){
  const a=s.mesh.geometry.attributes.position;
  assert.ok(Array.from(a.array).every(Number.isFinite));
  for(const row of [0,s.rows.length-1]){
   const source=s.rows[row];
   for(let i=0;i<s.segments;i++){
    const angle=i/s.segments*Math.PI*2;
    const expected=new Vector3(Math.sin(angle)*source.ring[1],source.ring[0],Math.cos(angle)*source.ring[2]);
    source.driver.localToWorld(expected);
    const actual=s.mesh.localToWorld(new Vector3().fromBufferAttribute(a,row*s.segments+i));
    assert.ok(actual.distanceTo(expected)<1e-4,'visible terminal ring detached from its driven limb');
   }
  }
  const normals=s.mesh.geometry.attributes.normal;
  for(let i=0;i<normals.count;i++)assert.ok(Math.abs(new Vector3().fromBufferAttribute(normals,i).length()-1)<1e-4,'degenerate shading normal');
 }
}

for(const frame of [{scale:1,bulk:1,head:1,broad:1,stance:1,neck:1},{scale:.65,bulk:1.65,head:1.4,broad:1.3,stance:1.2,neck:.6}])
test(`final articulated surfaces follow custom frame ${frame.scale} through bends and world rotation`,()=>{
 const p=figure({...ROSTER.find(d=>d.id==='kano'),frame,build:{weaponR:'rifle'}});
 try{
  const positions=[];
  for(const angle of [0,.4,.9,1.4,2,2.6,1.4,.4,0]){
   bendArm(p.armL,angle);bendArm(p.armR,angle*.9);p.legL.userData.knee.rotation.x=angle;p.legR.userData.knee.rotation.x=angle*.7;
   p.g.rotation.set(.7,1.4,-.3);p.g.position.set(240,80,-340);updateLimbSurfaces(p);anchored(p);
   positions.push(p.rig.limbSurfaces.map(s=>Array.from(s.mesh.geometry.attributes.position.array)));
  }
  assert.notDeepEqual(positions[0],positions[4],'surface stayed in its bind pose');
  for(let s=0;s<4;s++)for(let i=0;i<positions[0][s].length;i++)assert.ok(Math.abs(positions[0][s][i]-positions.at(-1)[s][i])<1e-5,'loop accumulated deformation');
  const versions=p.rig.limbSurfaces.map(s=>s.mesh.geometry.attributes.position.version);
  updateLimbSurfaces(p);assert.deepEqual(p.rig.limbSurfaces.map(s=>s.mesh.geometry.attributes.position.version),versions,'unchanged pose reuploads geometry');
 }finally{cleanup(p);}
});

test('ragdoll apply and recovery update the visible surfaces without an extra animation frame',()=>{
 const p=figure({...ROSTER.find(d=>d.id==='sarge'),build:{weaponR:'rifle'}});
 try{
  bendArm(p.armL,.8);bendArm(p.armR,1.2);p.legL.userData.knee.rotation.x=.7;updateLimbSurfaces(p);
  const before=p.rig.limbSurfaces.map(s=>Array.from(s.mesh.geometry.attributes.position.array));
  const f={parts:p,obj:p.g,pos:p.g.position,strength:5},rag=new Ragdoll(f,new Vector3(20,10,5));
  for(let i=0;i<120;i++){rag.step(1/60,null);rag.apply(f);anchored(p);}
  assert.notDeepEqual(p.rig.limbSurfaces.map(s=>Array.from(s.mesh.geometry.attributes.position.array)),before);
  rag.restore();anchored(p);
  for(let s=0;s<4;s++)for(let i=0;i<before[s].length;i++)assert.ok(Math.abs(before[s][i]-p.rig.limbSurfaces[s].mesh.geometry.attributes.position.array[i])<1e-5,'respawn left a ragdoll surface');
 }finally{cleanup(p);}
});

test('production animation updates the surfaces after flight and hit reaction; disabled deformation is detected',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(0,80,0);
 try{
  for(const speed of [0,20,65,0]){
   f.vel.set(0,0,speed);
   queueHitReaction(f,50,{kb:new Vector3(60,30,0)});
   assert.ok(f._hitReaction?.velocity.length()>0,'fixture must exercise a real hit reaction');
   for(let i=0;i<30;i++){f.animT+=1/60;f._animate(1/60);anchored(f.parts);}
  }
  const surfaces=f.parts.rig.limbSurfaces,updates=surfaces.map(s=>s.update);
  for(const s of surfaces)s.update=()=>{};
  f.vel.set(0,0,65);for(let i=0;i<45;i++){f.animT+=1/60;f._animate(1/60);}
  assert.throws(()=>anchored(f.parts),/detached/,'a frozen bind surface must not pass final-pipeline acceptance');
  surfaces.forEach((s,i)=>s.update=updates[i]);f._animate(1/60);anchored(f.parts);
 }finally{f.dispose();}
});

test('real hologram creation snapshots deforming geometry and releases only its owned copies on expiry',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='kano'));
 const g={scene:new Scene(),vfx:{ring(){},flash(){}},audio:{teleport(){}},time:0};
 try{
  const d=Game.prototype.spawnDecoy.call(g,f,.5),copied=[];
  d.grp.traverse(o=>{if(o.geometry?.userData.deformsWithRig)copied.push(o.geometry);});
  const originals=[];f.obj.traverse(o=>{if(o.geometry?.userData.deformsWithRig)originals.push(o.geometry);});
  assert.equal(copied.length,originals.length);assert.ok(copied.length>=4);
  assert.ok(copied.every(geo=>!originals.includes(geo)),'hologram is borrowing the live deformation buffer');
  const snapshots=copied.map(geo=>geo.attributes.position.array.slice());
  bendArm(f.parts.armL,2);bendArm(f.parts.armR,1.4);updateLimbSurfaces(f.parts);
  copied.forEach((geo,i)=>assert.deepEqual(geo.attributes.position.array,snapshots[i],'hologram changed pose with its caster'));
  let ownedDisposed=0,sourceDisposed=0;copied.forEach(geo=>geo.addEventListener('dispose',()=>ownedDisposed++));originals.forEach(geo=>geo.addEventListener('dispose',()=>sourceDisposed++));
  Game.prototype.updateDecoys.call(g,1);
  assert.equal(ownedDisposed,copied.length,'expired snapshots leaked GPU buffers');assert.equal(sourceDisposed,0,'expiry disposed the live fighter geometry');
  assert.equal(g._decoys.length,0);
 }finally{f.dispose();}
});
