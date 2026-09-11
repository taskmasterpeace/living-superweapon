import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as ingest from './lib/quaternius-source.mjs';

test('jab and cross preserve their actual one-shot source motion and contact landmarks',async()=>{
 assert.equal(typeof ingest.bakeStrikes,'function','a strike bank must sample the actual named takes');
 const source=await ingest.loadSource(),bank=ingest.bakeStrikes(source);
 for(const [key,name,duration,count,side]of [['jab','Punch_Jab',5/6,51,1],['cross','Punch_Cross',1,61,-1]]){
  const clip=bank.clips[key];assert.equal(clip.take,name);assert.ok(Math.abs(clip.duration-duration)<1e-6);assert.equal(clip.frames.length,count);assert.equal(clip.side,side);
  assert.equal(clip.mode,'strike');assert.ok(clip.contactStart>0&&clip.contactEnd>clip.contactStart&&clip.contactEnd<duration);
  for(const frame of clip.frames){assert.equal(frame.length,45);assert.ok(frame.every(Number.isFinite));for(let j=0;j<24;j+=3)assert.ok(Math.abs(new THREE.Vector3().fromArray(frame,j).length()-1)<2e-6);}
  const end=ingest.sampleSource(source,name,clip.duration).points;
  const expected=end.handR.clone().sub(end.elbowR).normalize();
  assert.ok(new THREE.Vector3().fromArray(clip.frames.at(-1),9).distanceTo(expected)<2e-6,'one-shots must preserve the authored endpoint, not close a loop');
  const at=ingest.sampleSource(source,name,clip.contactStart).points;
  assert.ok((side===1?at.handR:at.handL).z>.58,'contact landmark must reach the source forward punch, not anticipation');
 }
 assert.equal(bank.source.license,'CC0-1.0');
});
