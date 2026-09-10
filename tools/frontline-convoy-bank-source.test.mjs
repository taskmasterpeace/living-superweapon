import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const folder='assets-src/frontline-convoy-bank-study/';
test('sculpted bank preserves exact parking search, entry and historical camera stencils while changing broad shoulders',()=>{
 assert.ok(existsSync(folder+'native-bed.f32'),'Source bank sculpt has not been generated');
 const array=file=>{const b=readFileSync(file);return new Float32Array(b.buffer,b.byteOffset,b.byteLength/4);};
 const before=array('assets-src/frontline-escarpment-study/native-bed.f32'),after=array(folder+'native-bed.f32'),protection=JSON.parse(readFileSync(folder+'convoy-parking-witnesses.json'));
 assert.equal(after.length,before.length);let changed=0,maxSlope=0;
 for(const i of protection.protectedNativeIndices)assert.equal(after[i],before[i],`Parking-search support changed ${i}`);
 for(let i=0;i<after.length;i++){
  const c=i%257,r=Math.floor(i/257),x=c*2056/256-1028,z=r*2056/256-1028;
  const protectedArea=x<=-355||x>=-110||z<=170||z>=585||Math.hypot(x,z)<=130||(x>=-270&&x<=-120&&z<=190);
  if(protectedArea)assert.equal(after[i],before[i],`Protected native sample ${x},${z}`);
  if(Math.abs(after[i]-before[i])>6)changed++;
  if(c<256)maxSlope=Math.max(maxSlope,Math.abs(after[i+1]-after[i])/(2056/256));
  if(r<256)maxSlope=Math.max(maxSlope,Math.abs(after[i+257]-after[i])/(2056/256));
 }
 assert.ok(changed>120,'Source merely polishes a few vertices instead of breaking the bank');assert.ok(maxSlope<1.5,`Native slope exceeds existing contract ${maxSlope}`);
});
test('actual native parking search retains all three centers, wheel supports and tilted transforms on the candidate bed',()=>{
 const file=folder+'candidate-parking/convoy-parking-witnesses.json';assert.ok(existsSync(file),'Candidate native parking has not been exercised');
 const before=JSON.parse(readFileSync(folder+'convoy-parking-witnesses.json')),after=JSON.parse(readFileSync(file));
 assert.equal(after.bedSHA256,createHash('sha256').update(readFileSync(folder+'native-bed.f32')).digest('hex'),'Native parking report is stale against current source bed');
 assert.deepEqual(after.parks,before.parks);assert.deepEqual(after.sampledHeightQueries,before.sampledHeightQueries);assert.deepEqual(after.protectedNativeIndices,before.protectedNativeIndices);
});
