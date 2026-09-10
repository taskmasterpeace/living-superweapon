import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';

function fixture(id,motion,frame){
 const f=new Fighter({...ROSTER.find(d=>d.id===id),...(frame?{frame}:{})});
 f.animT=0;f._openSky=true;f.flying=motion==='fly';f.gait=f.flying?'airborne':'grounded';
 f.pos.set(20,f.flying?50:0,-15);f.vel.set(14,0,f.flying?45:0);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
 for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);return f;
}
function meshes(p){
 const out=[];
 for(const arm of [p.armL,p.armR])for(const m of arm.children.slice(0,3))out.push(m);
 for(const leg of [p.legL,p.legR])for(const name of ['thigh','shin','boot','kneeCap'])out.push(leg.userData[name]);
 return out;
}
function snapshot(p){return meshes(p).map(m=>({m,world:m.matrixWorld.clone()}));}
function compare(before,transform=new T.Matrix4()){
 for(const {m,world}of before){
  const expected=world.clone().premultiply(transform);let error=0;
  for(let i=0;i<16;i++)error=Math.max(error,Math.abs(expected.elements[i]-m.matrixWorld.elements[i]));
  assert.ok(error<1e-5,`${m.name||m.geometry.type} changed world pose by ${error.toFixed(4)}`);
 }
}

// Removing the capture-to-physics pose adapter must fail these actual driver/gear checks.
for(const id of ['sol','titan','sarge','gale'])for(const motion of ['ground','fly'])test(`${id}/${motion}: limbs and carried gear retain the exact displayed pose at no-step ragdoll handoff`,()=>{
 const f=fixture(id,motion,{scale:.85,bulk:1.3,head:1,stance:1.2});
 try{
  const before=snapshot(f.parts),gear=[];
  for(const arm of [f.parts.armL,f.parts.armR])arm.children[2].traverse(m=>{if(m.isMesh)gear.push({m,world:m.matrixWorld.clone()});});
  const rag=new Ragdoll(f,new T.Vector3(30,20,12));rag.apply(f);f.obj.updateMatrixWorld(true);compare([...before,...gear]);
 }finally{f.dispose();}
});

test('coherent rotation of the physics skeleton carries limbs, wrist roll and boot heading',()=>{
 const f=fixture('sarge','fly');try{
  const before=snapshot(f.parts),rag=new Ragdoll(f,new T.Vector3()),q=new T.Quaternion().setFromEuler(new T.Euler(.6,1.2,-.5)),shift=new T.Vector3(15,12,-8);
  for(const pt of Object.values(rag.P)){pt.pos.applyQuaternion(q).add(shift);pt.prev.applyQuaternion(q).add(shift);}
  rag.apply(f);f.obj.updateMatrixWorld(true);compare(before,new T.Matrix4().compose(shift,q,new T.Vector3(1,1,1)));
 }finally{f.dispose();}
});

test('a rolling forearm carries its wrist and attached gun instead of leaving them world-locked',()=>{
 const f=fixture('sarge','fly');try{
  const p=f.parts,hand=p.armR.children[2],fore=p.armR.children[1],relative=fore.matrixWorld.clone().invert().multiply(hand.matrixWorld),rag=new Ragdoll(f,new T.Vector3());
  const turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),1.2),elbow=rag.P.elR.pos.clone();
  rag.P.haR.pos.sub(elbow).applyQuaternion(turn).add(elbow);rag.apply(f);f.obj.updateMatrixWorld(true);
  const current=fore.matrixWorld.clone().invert().multiply(hand.matrixWorld);let error=0;
  for(let i=0;i<16;i++)error=Math.max(error,Math.abs(relative.elements[i]-current.elements[i]));
  assert.ok(error<1e-5,`wrist detached from its forearm orientation by ${error}`);
 }finally{f.dispose();}
});
