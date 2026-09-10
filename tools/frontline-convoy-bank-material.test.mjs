import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('source bank material mask matches this sculpt and leaves all other terrain and physical PBR data unchanged',()=>{
 const root='assets-src/frontline-convoy-bank-study/',file=root+'material/metadata.json';assert.ok(existsSync(file),'Source bank material bake missing');
 const metadata=JSON.parse(readFileSync(file));assert.equal(metadata.groundSHA256,createHash('sha256').update(readFileSync(root+'native-bed.f32')).digest('hex'));
 const before=readFileSync('assets-src/frontline-escarpment-study/material/geology-mask.rgba'),after=readFileSync(root+'material/geology-mask.rgba');assert.equal(after.length,before.length);let changed=0;
 for(let i=0;i<257*257;i++){
  const x=(i%257)*2056/256-1028,z=Math.floor(i/257)*2056/256-1028;
  if(x<=-355||x>=-110||z<=170||z>=585)assert.deepEqual(after.subarray(i*4,i*4+4),before.subarray(i*4,i*4+4),'Unrelated terrain material changed');
  if(Math.abs(after[i*4]-before[i*4])>8)changed++;
 }
 assert.ok(changed>100,'Exposure did not follow the sculpt');
 assert.deepEqual(readFileSync(root+'material/rock-pbr.rgba'),readFileSync('assets-src/frontline-escarpment-study/material/rock-pbr.rgba'));
});
