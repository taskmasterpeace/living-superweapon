import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
// Parked at the user's direction: cape work is not the current priority.
import {clothFall} from '../helpers/cloth-fall.mjs';

// Material distance is independent of contact-plane bookkeeping. A cloth
// contact correction must not create more fabric than the garment contains.
test('native short/broad cape stays within its captured material reach during the complete fall',()=>{
 const {f,rag,world}=clothFall({seed:99,frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},cover:[{x:52,z:3,hx:4,hz:4,top:4}]});
 try{
  const c=rag.capePose,material=c.mesh.userData.rest,bind=c.points.map((_,i)=>new T.Vector3().fromArray(material,i*3).applyMatrix4(c.mesh.matrixWorld));
  const limits=c.points.map((p,i)=>Math.max(bind[i].distanceTo(bind[i%c.columns]),p.pos.distanceTo(c.points[i%c.columns].pos))*1.05);
  for(let tick=1;tick<=720;tick++){
   rag.step(1/120,{world});rag.apply(f);
   for(let i=c.columns;i<c.points.length;i++){
    const distance=c.points[i].pos.distanceTo(c.points[i%c.columns].pos);
    assert.ok(distance<=limits[i]+1e-7,`tick ${tick}, point ${i}: ${distance.toFixed(4)}u exceeds ${limits[i].toFixed(4)}u available cloth`);
   }
  }
 }finally{f.dispose();}
});
