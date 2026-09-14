import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

for(const recovery of [.5,1,2])for(const hz of [30,60,120]){
 test(`stun recovery ${recovery} applies once at ${hz} Hz`,()=>{
  const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')));
  try{
   f.sheet={...f.sheet,ccRecover:recovery};
   Object.assign(f,{_physics(){},_animate(){},_sync(){},flying:true,flyHeld:true,hitstop:0});
   f.applyStun();
   assert.equal(f.flying,false);
   const expected=1.7/recovery;
   let elapsed=0;
   while(f.stunT>0&&elapsed<5){f.update(1/hz,null);elapsed+=1/hz;}
   assert.ok(Math.abs(elapsed-expected)<=1/hz+1e-8,`expected ${expected}s, got ${elapsed}s`);
   assert.equal(f._stunImmune,4);
  }finally{f.dispose();}
 });
}
