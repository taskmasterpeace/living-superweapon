import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Raycaster,Quaternion} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
const kano=ROSTER.find(d=>d.id==='kano');
function attached(p){
 p.g.updateMatrixWorld(true);
 const local=p.head.worldToLocal(p.cowl.getWorldPosition(new Vector3()));
 assert.ok(local.distanceTo(new Vector3(0,.1,0))<1e-5,`hair rotated about a separate pivot: ${local.toArray()}`);
 assert.ok(p.head.getWorldQuaternion(new Quaternion()).angleTo(p.cowl.getWorldQuaternion(new Quaternion()))<1e-5,'hair orientation diverged from head');
}
for(const frame of [{scale:1,head:1},{scale:.65,head:1.4},{scale:1.5,head:.65}])
test(`boost keeps the crown covered on frame ${frame.scale}/${frame.head}`,()=>{
 const f=new Fighter({...kano,frame});Object.assign(f,{_openSky:true,flying:true,gait:'airborne',cruiseHeld:true});f.vel.set(0,0,100);
 try{
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}const p=f.parts;
  attached(p);
  for(const x of [-.3,0,.3])for(const z of [-.3,0,.3]){
   const from=p.head.localToWorld(new Vector3(x,3,z)),to=p.head.localToWorld(new Vector3(x,0,z));
   const hit=new Raycaster(from,to.sub(from).normalize()).intersectObjects([p.head,p.cowl],true)[0];
   assert.ok(hit&&hit.object.material!==p.head.material,`scalp exposed at crown ${x}/${z}`);
  }
 }finally{f.dispose();}
});
test('hair follows final head reaction, ragdoll tilt, and recovery rather than independent bobbing',()=>{
 const f=new Fighter(kano);
 try{
  queueHitReaction(f,50,{kb:new Vector3(40,30,15)});
  for(let i=0;i<40;i++){f.animT+=1/60;f._animate(1/60);attached(f.parts);}
  const rag=new Ragdoll(f,new Vector3(25,30,35));
  for(let i=0;i<180;i++){rag.step(1/60,null);rag.apply(f);attached(f.parts);}
  rag.restore();attached(f.parts);
 }finally{f.dispose();}
});
