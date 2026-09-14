import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {AudioBus} from '../src/core/audio.js';import {MANIFEST,HOT_SET} from '../src/core/samples.js';
test('direct light and heavy impact paths resolve selected real punch files without oscillator',()=>{
 for(const power of [.7,1.3]){
  const a=new AudioBus();a.ok=true;const seen=[];a.ctx={createOscillator(){assert.fail('ready punch recording should not synthesize');}};
  a.sample=(id,options)=>{seen.push({id,options});return true;};const pos={x:1,y:2,z:3};a.impact(power,pos);
  assert.equal(seen.length,1);assert.equal(seen[0].id,power>1.05?'punch.heavy':'punch.med');assert.equal(seen[0].options.pos,pos);
  assert.deepEqual(MANIFEST[seen[0].id].f,MANIFEST['library.melee'].f);assert.ok(HOT_SET.includes(seen[0].id));
 }
});
test('authored melee recording remains first choice and is not doubled by fallback',()=>{
 const a=new AudioBus();a.ok=true;const ids=[];a.soundLibrary.native=id=>{ids.push(id);return true;};a.sample=()=>assert.fail('selected native voice already handled hit');
 a.meleeHit(.7,null,false);a.meleeHit(1.3,null,true);assert.deepEqual(ids,['light','heavy']);
});
test('fallback source hashes retain selected real CC0 punch provenance; blade swings do not draw weapons',async()=>{
 const p=JSON.parse(await fs.readFile('public/audio/sfx-cc0/final/punch-fallback.provenance.json'));assert.equal(p.pickedBy,'Robert');assert.match(p.license,/CC0/);
 for(const f of p.files)assert.equal(createHash('sha256').update(await fs.readFile(f.path)).digest('hex'),f.sha256);
 assert.ok(MANIFEST['swing.blade'].f.every(f=>!f.startsWith('drawKnife')));
});
