import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleFrontlineNaturalRelief,sampleFrontlineRelief} from '../src/engine/frontline-ground.js';
import {createHash} from 'node:crypto';

test('natural bank sampling uses the exact reviewed supporting benches, including off-vertex native triangles',()=>{
 const raw=readFileSync('assets-src/frontline-convoy-bank-study/native-bed.f32'),bed=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),step=2056/256;
 for(let i=0;i<bed.length;i++)assert.equal(Math.fround(sampleFrontlineNaturalRelief(i%257*step-1028,Math.floor(i/257)*step-1028,[])),bed[i],`Authored bank differs at native vertex ${i}`);
 // Deliberately inside the edited convoy bank, on both sides of a cell diagonal.
 for(const [c,r,u,v] of [[94,163,.2,.3],[94,163,.8,.7],[99,176,.3,.6],[91,190,.7,.7]]){
  const i=r*257+c,a=bed[i],b=bed[i+1],d=bed[i+257],e=bed[i+258],expected=u+v<=1?a+(b-a)*u+(d-a)*v:e+(b-e)*(1-v)+(d-e)*(1-u);
  assert.ok(Math.abs(sampleFrontlineNaturalRelief((c+u)*step-1028,(r+v)*step-1028,[])-expected)<1e-6,'Natural bank no longer follows authored triangles');
 }
});

test('live outpost grading levels occupied bays and runway while preserving surrounding natural banks',()=>{
 for(const [x,z]of [[65,700],[-90,285],[-90,450]]){
  assert.ok(sampleFrontlineNaturalRelief(x,z)>1,'This witness must require a real terrain cut');
  assert.equal(sampleFrontlineRelief(x,z),0,'Occupied outpost surfaces must be level');
 }
 // Five units beyond the runway grading edge at x=115: the 0.65 shoulder
 // envelope must cut the old bank to 3.25u, then rejoin unchanged geology.
 assert.ok(sampleFrontlineNaturalRelief(120,700)>3.25);
 assert.equal(sampleFrontlineRelief(120,700),3.25);
 for(const [x,z]of [[150,700],[-245,300],[245,300]]){
  const natural=sampleFrontlineNaturalRelief(x,z);assert.ok(natural>10);
  assert.equal(sampleFrontlineRelief(x,z),natural,'Outpost grading must not flatten the surrounding canyon');
 }
});

test('archived bank adapter witnesses retain the reviewed parking and protected source samples',()=>{
 const root='assets-src/frontline-convoy-bank-study/',before=JSON.parse(readFileSync(root+'convoy-parking-witnesses.json')),after=JSON.parse(readFileSync(root+'runtime-parking/convoy-parking-witnesses.json'));
 assert.equal(after.bedSHA256,createHash('sha256').update(readFileSync(root+'native-bed.f32')).digest('hex'));
 assert.deepEqual(after.parks,before.parks);assert.deepEqual(after.sampledHeightQueries,before.sampledHeightQueries);assert.deepEqual(after.protectedNativeIndices,before.protectedNativeIndices);
});
