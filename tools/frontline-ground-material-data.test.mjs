import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='assets-src/frontline-ground-material/';
test('baked geology mask leaves the clear pad sediment-covered and follows measured native banks',async()=>{
 const raw=await readFile(folder+'geology-mask.rgba').catch(()=>null);assert.ok(raw,'Native geological mask has not been baked');
 const meta=JSON.parse(await readFile(folder+'metadata.json','utf8'));
 const heights=await readFile('assets-src/frontline-heightfield-candidate/native-after.f32');
 assert.equal(meta.groundSHA256,createHash('sha256').update(heights).digest('hex'),'Material mask is stale against the accepted native land');
 assert.equal(meta.maskSize,257);assert.equal(raw.length,257*257*4);
 let exposed=0,sediment=0,concave=0;
 for(let r=0;r<257;r++)for(let c=0;c<257;c++){
  const x=-1028+c*2056/256,z=-1028+r*2056/256,i=(r*257+c)*4;
  if(Math.hypot(x,z)<125){assert.equal(raw[i],0,'Start pad exposes cliff rock');assert.equal(raw[i+2],255,'Start pad loses sediment');}
  assert.equal(raw[i+3],255);
  if(raw[i]>190)exposed++;if(raw[i+2]>190)sediment++;if(raw[i+1]<230)concave++;
 }
 assert.ok(exposed>10000,'No substantial native bank exposure');
 assert.ok(sediment>3000,'Sediment pockets have disappeared');
 assert.ok(concave>1000,'Authored recesses lost cavity response');
});

test('packed source PBR preserves roughness variation and restrained measured cavities within budget',async()=>{
 const raw=await readFile(folder+'rock-pbr.rgba').catch(()=>null);assert.ok(raw,'Measured roughness/cavity texture has not been baked');
 const meta=JSON.parse(await readFile(folder+'metadata.json','utf8'));
 assert.equal(meta.pbrSize,1024);assert.equal(raw.length,1024*1024*4);
 let minR=255,maxR=0,minAO=255,maxAO=0;
 for(let i=0;i<raw.length;i+=4){minR=Math.min(minR,raw[i]);maxR=Math.max(maxR,raw[i]);minAO=Math.min(minAO,raw[i+1]);maxAO=Math.max(maxAO,raw[i+1]);assert.equal(raw[i+3],255);}
 // Inspected source range is .777–.855: preserve its actual narrow response,
 // rather than inventing polished/wet patches to satisfy a wider test range.
 assert.ok(maxR-minR>=18&&maxR-minR<=22,'Physical roughness was flattened or exaggerated');
 assert.ok(minAO>=140&&minAO<230&&maxAO>250,'Cavity map is missing or crushes shaded rock');
});
