import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MANIFEST,HOT_SET} from '../src/core/samples.js';
import {registerHooks} from 'node:module';
const css=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {};',shortCircuit:true}:next(url,context);}});
const {mainCombatFixture}=await import('./helpers/main-combat-fixture.mjs');
css.deregister();

test('medkit activation plays its recording once, preserves healing and spends the charge',()=>{
 const x=mainCombatFixture();try{
  const calls=[];x.g.audio={...x.g.audio};x.g.audio.sample=(name,options)=>{calls.push({name,options});return true;};
  x.g.audio.zap=()=>assert.fail('decoded medkit recording must not double with a zap');
  x.p.items=[{def:{kind:'medkit',heal:25,charges:1},state:'ready',charges:1}];x.p.hp=50;
  x.g.useItem(x.p);assert.equal(x.p.hp,75);assert.equal(x.p.items[0].state,'spent');
  assert.equal(calls.length,1);assert.equal(calls[0].name,'gear.ifak');assert.equal(calls[0].options.pos,x.p.pos);
  x.g.useItem(x.p);assert.equal(calls.length,1,'spent kit must stay silent');
 }finally{x.close();}
});
test('IFAK sample is preloaded and matches the selected source manifest provenance',async()=>{
 assert.ok(HOT_SET.includes('gear.ifak'));assert.equal(MANIFEST['gear.ifak'].g,.55);
 const bytes=await fs.readFile('public/audio/'+MANIFEST['gear.ifak'].f[0]+'.mp3');
 const provenance=JSON.parse(await fs.readFile('public/audio/ai-pass/final/gear-ifak.provenance.json'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
 assert.equal(provenance.manifestEntry.cue,'gear-ifak');assert.equal(provenance.manifestEntry.status,'confirmed');
 assert.ok(bytes.length>1000);
});
