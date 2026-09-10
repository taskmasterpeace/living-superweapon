import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as sourceApi from './lib/quaternius-source.mjs';

test('jump bank uses the three licensed source takes without simulation translation or closed one-shots',async()=>{
 assert.equal(typeof sourceApi.bakeJumps,'function','Jump source ingestion is missing');
 const source=await sourceApi.loadSource(),bank=sourceApi.bakeJumps(source);
 assert.equal(bank.source.license,'CC0-1.0');
 assert.deepEqual(bank.source.sha256,{gltf:'0ff075c7ad6855c5c2c37a171592ee8f0d6ab2f58259e2be77a9b63dd8027765',bin:'6e65377d81558333c4093dbb144a48fd19019343d82b1a3a7992a98ec0e0543c'});
 for(const [key,take,duration,mode,loop]of [['takeoff','Jump_Start',4/3,'jump',false],['fall','Jump_Loop',2.5,'fall',true],['landing','Jump_Land',1.25,'landing',false]]){
  const c=bank.clips[key];assert.equal(c.take,take);assert.equal(c.mode,mode);assert.equal(c.loop,loop);assert.ok(Math.abs(c.duration-duration)<1e-6);
  for(const frame of c.frames){assert.equal(frame.length,45);assert.ok(frame.every(Number.isFinite));assert.equal(frame[44],0,'Source root/lift must not drive the game');
   for(let i=0;i<24;i+=3)assert.ok(Math.abs(Math.hypot(...frame.slice(i,i+3))-1)<2e-6);
   for(let i=24;i<44;i+=4)assert.ok(Math.abs(Math.hypot(...frame.slice(i,i+4))-1)<2e-6);
  }
  const delta=Math.max(...c.frames[0].map((n,i)=>Math.abs(n-c.frames.at(-1)[i])));
  if(loop)assert.ok(delta<2e-6,'Fall loop must close without a wrap pop');else assert.ok(delta>.1,'One-shot endpoint must remain the actual source ending');
 }
 const generated=JSON.parse(await readFile(new URL('../src/data/jump-bank.json',import.meta.url)));
 assert.deepEqual(generated,JSON.parse(JSON.stringify(bank)),'Checked-in runtime data must reproduce from the licensed source');
});
