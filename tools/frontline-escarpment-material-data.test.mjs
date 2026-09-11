import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('structural candidate exposure data belongs to the exact reviewed Float32 bed',()=>{
 const path='assets-src/frontline-escarpment-study/material/metadata.json';assert.ok(existsSync(path),'new geometry has no matching exposure bake');
 const metadata=JSON.parse(readFileSync(path)),bed=readFileSync('assets-src/frontline-escarpment-study/native-bed.f32');
 assert.equal(metadata.groundSHA256,createHash('sha256').update(bed).digest('hex'));
 const mask=readFileSync('assets-src/frontline-escarpment-study/material/geology-mask.rgba');assert.equal(mask.length,257*257*4);
 const old=readFileSync('assets-src/frontline-ground-material/geology-mask.rgba');let changed=0;
 for(let i=0;i<257*257;i++){
  const x=(i%257)*2056/256-1028,z=Math.floor(i/257)*2056/256-1028;
  if(Math.hypot(x,z)<=130){assert.equal(mask[i*4],0);assert.equal(mask[i*4+2],255);}
  if(Math.abs(mask[i*4]-old[i*4])>8)changed++;
 }
 assert.ok(changed>3000,'old geometry exposure mask was reused');
 assert.deepEqual(readFileSync('assets-src/frontline-escarpment-study/material/rock-pbr.rgba'),readFileSync('assets-src/frontline-ground-material/rock-pbr.rgba'),'physical source channels must not be restyled for new land');
});
