import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Raycaster,Mesh,MeshBasicMaterial,DoubleSide,Matrix4} from 'three';
import {figure} from '../src/engine/figure.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,validateProfile,applyProfile,DraftHistory,saveProfile,loadProfile} from '../src/tool/studio-profile.js';
import {editForm} from '../src/tool/studio-progression.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';

const sol=ROSTER.find(d=>d.id==='sol');
function release(p){p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});}
function depth(p,x,y,side=1){
 p.g.updateMatrixWorld(true);
 const ray=new Raycaster(p.torso.localToWorld(new Vector3(x,y,3*side)),new Vector3(0,0,-side));
 const hit=ray.intersectObject(p.torso,false)[0];assert.ok(hit,`no torso surface at ${x},${y}`);
 return p.torso.worldToLocal(hit.point).z*side;
}

test('the actual torso separates the chest and back muscle planes instead of a blank convex barrel',()=>{
 const p=figure({...sol,model:{costume:'fitted',definition:1}});
 try{
  assert.ok(depth(p,.62,.55)>depth(p,0,.55)+.035,'the sternum must sit behind the pectoral planes');
  assert.ok(depth(p,.62,.55,-1)>depth(p,0,.55,-1)+.025,'the spine must sit behind the shoulder blades');
  assert.ok(depth(p,.45,-.48)>depth(p,0,-.48)+.012,'the abdomen needs a shallow central channel');
 }finally{release(p);}
});

test('definition changes the rendered body while preserving sockets, torso envelope and powers',()=>{
 const a=figure({...sol,model:{definition:0}}),b=figure({...sol,model:{definition:1}});
 try{
  assert.ok(Math.abs(depth(a,.62,.55)-depth(b,.62,.55))>.025,'body definition must affect the real surface');
  for(const key of ['head','torso','pelvis','armL','armR','legL','legR'])assert.deepEqual(a[key].position.toArray(),b[key].position.toArray(),`${key} socket moved`);
  for(const p of [a,b]){
   const geo=p.torso.geometry;geo.computeBoundingBox();const box=geo.boundingBox;
   assert.ok(box.min.x>=-1.571&&box.max.x<=1.571&&box.min.z>=-.801&&box.max.z<=.801,'sculpt must remain inside the existing torso collision envelope');
   assert.ok(geo.index.count/3<4000,'single bounded-resolution surface');
   assert.equal(geo.groups.length,0,'no extra material draws for muscle islands');
   assert.equal(p.armL.children.length,3);assert.equal(p.armR.children.length,3);
  }
 }finally{release(a);release(b);}
});

test('definition survives draft history, local save, JSON import and production profile application',()=>{
 const p=profileFromDef(sol);p.model.definition=.25;const h=new DraftHistory(p),next=h.value;
 next.model.definition=.9;h.push(next);h.undo();assert.equal(h.value.model.definition,.25);h.redo();
 const records=new Map(),storage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
 saveProfile(h.value,storage);const loaded=validateProfile(JSON.parse(JSON.stringify(loadProfile(sol.id,storage))));
 const def=applyProfile(sol,loaded);assert.equal(def.model.definition,.9);assert.deepEqual(def.abilities,sol.abilities);
 const old=profileFromDef(sol);delete old.model.definition;assert.doesNotThrow(()=>validateProfile(old));
 for(const value of [-.01,1.01,NaN,Infinity,'1',null]){const bad=profileFromDef(sol);bad.model.definition=value;assert.throws(()=>validateProfile(bad),/definition/i);}
});

test('appearance forms retain body definition without replacing the gameplay root or arm ownership',()=>{
 const f=new Fighter({...sol,model:{definition:0}}),root=f.obj,position=f.pos;
 try{
  const before=depth(f.parts,.62,.55);f.applyForm({model:{definition:1}});
  assert.ok(Math.abs(depth(f.parts,.62,.55)-before)>.025);
  assert.equal(f.obj,root);assert.equal(f.pos,position);assert.equal(f.parts.rig.sockets.rightHand,f.parts.armR.children[2]);
 }finally{f.dispose();}
});

test('the transformation editor writes numeric definition and can restore inheritance',()=>{
 const p=profileFromDef(sol),q=editForm(p,{level:'4',name:'Ascended',definition:'1'});
 assert.equal(q.progression.forms[4].model?.definition,1);
 const inherited=editForm(q,{level:'4',name:'Ascended',definition:''},'4');
 assert.equal(inherited.progression.forms[4].model?.definition,undefined);
 assert.throws(()=>editForm(p,{level:'4',definition:'1.5'}),/definition/i);
 assert.equal(p.progression.forms[4],undefined);
});

test('the chest hem covers the pelvis instead of showing a sawtooth underwear edge above the belt',()=>{
 for(const definition of [0,.5,1]){
  const p=figure({...sol,model:{definition}});p.g.updateMatrixWorld(true);
  try{for(const x of [-.4,-.2,0,.2,.4]){
   const ray=new Raycaster(p.torso.localToWorld(new Vector3(x,-1.35,3)),new Vector3(0,0,-1));
   assert.ok(ray.intersectObjects([p.torso,p.pelvis],false)[0]?.object===p.torso,`pelvis crosses chest hem: definition ${definition}, x ${x}`);
  }}finally{release(p);}
 }
});

test('the martial neckline follows the sculpt instead of hovering on an obsolete chest plane',()=>{
 for(const definition of [0,1]){
  const p=figure({...sol,model:{costume:'martial',definition}});p.g.updateMatrixWorld(true);
  try{for(const y of [.2,.5,.8,1.12]){
   const origin=p.torso.localToWorld(new Vector3(0,y,3)),ray=new Raycaster(origin,new Vector3(0,0,-1));
   const garment=ray.intersectObject(p.torso.getObjectByName('martial-undershirt'),false)[0],body=ray.intersectObject(p.torso,false)[0];
   assert.ok(garment&&body&&body.distance-garment.distance>.005&&body.distance-garment.distance<.07,`neckline lifts away or clips into definition ${definition} at ${y}`);
  }}finally{release(p);}
 }
});

function emblemContact(p,label){
 p.g.updateMatrixWorld(true);const geometry=p.emblem.geometry,position=geometry.attributes.position,index=geometry.index,points=[];
 for(let i=0;i<position.count;i++)points.push(new Vector3().fromBufferAttribute(position,i));
 for(let i=0;i<index.count;i+=3){const point=new Vector3();for(let j=0;j<3;j++)point.add(new Vector3().fromBufferAttribute(position,index.getX(i+j)));points.push(point.multiplyScalar(1/3));}
 const body=new Mesh(p.torso.geometry),ray=new Raycaster();body.updateMatrixWorld(true);
 for(const point of points){
  p.torso.worldToLocal(p.emblem.localToWorld(point));
  // A transformed +/- 1e-16 at the duplicated loft seam is numerical noise,
  // not a surface hole. Cast on the actual axis for these boundary samples.
  ray.set(new Vector3(Math.abs(point.x)<1e-8?0:point.x,point.y,3),new Vector3(0,0,-1));
  const hit=ray.intersectObject(body,false)[0],gap=hit?point.z-hit.point.z:Infinity;
  assert.ok(gap>.008&&gap<.06,`${label}: insignia clips or floats, gap ${gap}`);
 }
}
test('the insignia stays on the chest through charged windup, recoil, ragdoll and recovery',()=>{
 const f=new Fighter({...sol,model:{definition:1}});f._openSky=true;
 try{
  emblemContact(f.parts,'bind');f.meleeCharge=1;
  for(let i=0;i<30;i++)f._animate(1/60);emblemContact(f.parts,'charged twist');
  queueHitReaction(f,30,{kb:new Vector3(30,16,20)});for(let i=0;i<10;i++)f._animate(1/60);emblemContact(f.parts,'hurt');
  f.meleeCharge=0;const rag=new Ragdoll(f,new Vector3(35,22,-18));
  for(let i=0;i<120;i++){rag.step(1/60,null);rag.apply(f);if(i%30===0)emblemContact(f.parts,`ragdoll ${i}`);}
  rag.restore();emblemContact(f.parts,'restored');f.applyForm({model:{definition:.2},frame:{bulk:.7}});emblemContact(f.parts,'replacement form');
 }finally{f.dispose();}
});

test('tactical and plated panels stay seated on both smooth and defined bodies',()=>{
 for(const costume of ['plated','tactical'])for(const definition of [0,1]){
  const p=figure({...sol,model:{costume,definition}});p.g.updateMatrixWorld(true);
  const mat=new MeshBasicMaterial({side:DoubleSide}),inverse=new Matrix4().copy(p.torso.matrixWorld).invert();
  const panels=p.torso.children.filter(o=>o.name==='costume-chest-panel'||o.geometry?.type==='BoxGeometry').map(o=>{const clone=new Mesh(o.geometry,mat);clone.applyMatrix4(new Matrix4().multiplyMatrices(inverse,o.matrixWorld));clone.updateMatrixWorld(true);return clone;});
  const body=new Mesh(p.torso.geometry);body.updateMatrixWorld(true);
  const anchors=costume==='tactical'?[[-.87,.1,1],[.87,.1,1],[.61,-.2,1]]:[[.68,.46,1],[0,-.44,1],[0,-.75,1],[0,-1.06,1],[.63,.15,-1]];
  try{for(const [x,y,side] of anchors){
   const ray=new Raycaster(new Vector3(x,y,3*side),new Vector3(0,0,-side)),skin=ray.intersectObject(body,false)[0],hits=ray.intersectObjects(panels,false);
   assert.ok(skin&&hits.length>=2,`${costume}: missing panel at ${x},${y}`);
   const samePanel=hits.filter(h=>h.object===hits[0].object);
   const outer=skin.distance-samePanel[0].distance,inner=skin.distance-samePanel.at(-1).distance;
   assert.ok(outer>.035&&inner<.008&&inner>-.065,`${costume} definition ${definition}: floating/buried panel at ${x},${y}, outer ${outer}, inner ${inner}`);
  }}finally{mat.dispose();release(p);}
 }
});

test('curved armor keeps a smooth normal field instead of visible triangulation diamonds',()=>{
 const p=figure({...sol,model:{costume:'plated',definition:1}});
 try{for(const mesh of p.torso.children.filter(o=>o.name==='costume-chest-panel')){
  const pos=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,seen=new Map();
  for(let i=0;i<pos.count;i++){
   const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Math.round(v*1e5)).join(','),normal=new Vector3().fromBufferAttribute(n,i).normalize();
   if(seen.has(key))assert.ok(normal.angleTo(seen.get(key))<.025,`shared panel vertex has discontinuous shading at ${key}`);else seen.set(key,normal);
  }
 }}finally{release(p);}
});

test('conforming armor has a bounded topology budget and no collapsed triangles',()=>{
 for(const costume of ['plated','tactical']){
  const p=figure({...sol,model:{costume,definition:1}});let count=0;
  try{for(const m of p.torso.children.filter(o=>o.name==='costume-chest-panel')){
   const a=m.geometry.attributes.position,index=m.geometry.index,n=index?index.count:a.count;count+=n/3;
   for(let i=0;i<n;i+=3){const points=[0,1,2].map(j=>new Vector3().fromBufferAttribute(a,index?index.getX(i+j):i+j));
    assert.ok(points[1].sub(points[0]).cross(points[2].sub(points[0])).lengthSq()>1e-14,`${costume}: collapsed panel triangle`);
   }
  }assert.ok(count<2500,`${costume}: ${count} armor triangles exceed the body-relative budget`);
  }finally{release(p);}
 }
});

test('the conforming insignia has no radial shading seams between sector grids',()=>{
 for(const definition of [0,.5,1]){
  const p=figure({...sol,model:{definition}}),seen=new Map();
  try{
   const position=p.emblem.geometry.attributes.position,normals=p.emblem.geometry.attributes.normal;
   for(let i=0;i<position.count;i++){
    const key=[position.getX(i),position.getY(i),position.getZ(i)].map(v=>Math.round(v*1e5)).join(','),normal=new Vector3().fromBufferAttribute(normals,i).normalize();
    assert.ok(normal.z>0,'insignia must face out from the chest');
    if(seen.has(key))assert.ok(normal.angleTo(seen.get(key))<.025,`definition ${definition}: radial insignia seam at ${key}`);else seen.set(key,normal);
   }
  }finally{release(p);}
 }
});

test('armor vertex normals stay in the outward hemisphere of their triangle',()=>{
 for(const costume of ['plated','tactical'])for(const definition of [0,1]){
  const p=figure({...sol,model:{costume,definition}});
  try{for(const m of p.torso.children.filter(o=>o.name==='costume-chest-panel')){
   const pos=m.geometry.attributes.position,n=m.geometry.attributes.normal,index=m.geometry.index;
   for(let i=0;i<index.count;i+=3){
    const ids=[0,1,2].map(j=>index.getX(i+j)),points=ids.map(id=>new Vector3().fromBufferAttribute(pos,id));
    const face=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    for(const id of ids)assert.ok(face.dot(new Vector3().fromBufferAttribute(n,id))>0,`${costume} definition ${definition}: backward shading on triangle ${i/3}`);
   }
  }}finally{release(p);}
 }
});
