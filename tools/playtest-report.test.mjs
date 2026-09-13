import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {collectRuns} from './playtest/report.mjs';
test('historical report exposes input mismatch and missing evidence without upgrading a pass',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'pw-report-'));try{
 const d=path.join(root,'run');await mkdir(d);
 await writeFile(path.join(d,'run.json'),JSON.stringify({status:'passed',scenario:'guard',config:{scheme:'touch'}}));
 await writeFile(path.join(d,'result.json'),JSON.stringify({passed:true,actions:[{scheme:'kbm',status:'dispatched',released:true}]}));
 const r=(await collectRuns(root)).runs[0];assert.equal(r.recordedStatus,'passed');assert(r.warnings.some(w=>w.includes('differ')));assert(r.warnings.some(w=>w.includes('checkout')));assert(r.artifacts.every(f=>path.isAbsolute(f)));
 await writeFile(path.join(d,'result.json'),'broken');assert((await collectRuns(root)).runs[0].warnings.some(w=>w.includes('lacks')));
 await writeFile(path.join(d,'run.json'),JSON.stringify({status:'running'}));assert((await collectRuns(root)).runs[0].warnings.some(w=>w.includes('alive')));
 }finally{await rm(root,{recursive:true,force:true});}
});
