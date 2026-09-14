import test from 'node:test';import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {SoundLibrary} from '../src/core/sound-library.js';import {MANIFEST,HOT_SET} from '../src/core/samples.js';import {SOUND_LIBRARY_SAMPLES} from '../src/data/sound-library-recordings.js';
const css=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {};',shortCircuit:true}:next(url,context);}});
const {mainCombatFixture}=await import('./helpers/main-combat-fixture.mjs');css.deregister();
for(const ready of [true,false])test(`flashbang preserves detonation and uses ${ready?'recording':'native fallback'}`,()=>{
 const x=mainCombatFixture();try{
  const cues=[],fallback=[];x.g.audio={...x.g.audio,soundLibrary:{native:(id,o)=>{cues.push(id);assert.equal(o.pos,x.p.pos);return ready;}},zap:()=>fallback.push('zap'),impact:()=>fallback.push('impact')};
  x.p.items=[{def:{kind:'flashbang',radius:26},state:'ready',charges:1}];
  x.g.useItem(x.p);assert.deepEqual(cues,['flashbang-detonate']);assert.deepEqual(fallback,ready?[]:['zap','impact']);assert.equal(x.p.items[0].state,'spent');
  x.g.useItem(x.p);assert.equal(cues.length,1);
 }finally{x.close();}
});
test('shield impact cue follows actual absorption including overflow, but not true damage or empty shields',()=>{
 const x=mainCombatFixture();try{
  const calls=[];x.g.audio={...x.g.audio,soundLibrary:{native:id=>{calls.push(id);return true;}}};
  x.p.armor=0;x.p._shieldHp=10;x.p.hp=x.p.maxHp;
  x.p.takeDamage(4,{unblockable:true});assert.equal(x.p._shieldHp,6);assert.equal(x.p.hp,x.p.maxHp);assert.equal(calls.filter(c=>c==='shieldpack-hit').length,1);
  x.p.takeDamage(9,{unblockable:true});assert.equal(x.p._shieldHp,0);assert.equal(calls.filter(c=>c==='shieldpack-hit').length,2);
  x.p.takeDamage(2,{unblockable:true});assert.equal(calls.filter(c=>c==='shieldpack-hit').length,2);
  x.p._shieldHp=10;x.p.takeDamage(2,{trueDamage:true});assert.equal(x.p._shieldHp,10);assert.equal(calls.filter(c=>c==='shieldpack-hit').length,2);
 }finally{x.close();}
});
test('impact recordings retain exact IMPACT provenance, preload, and author preferences',async()=>{
 const lib=new SoundLibrary({storage:null});
 for(const id of ['flashbang-detonate','shieldpack-hit']){
  const sample=SOUND_LIBRARY_SAMPLES[id],stem='public/audio/'+MANIFEST[sample].f[0],bytes=await fs.readFile(stem+'.mp3'),p=JSON.parse(await fs.readFile(stem+'.provenance.json'));
  assert.equal(p.manifestEntry.moment,'IMPACT');assert.equal(p.manifestEntry.status,'confirmed');assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);assert.ok(HOT_SET.includes(sample));
  assert.equal(lib.source(id),'bundled-recording');lib.state.bindings[id]={name:'custom.wav',data:'custom'};assert.equal(lib.source(id),'chosen-recording');lib.setSettings(id,{source:'placeholder'});assert.equal(lib.source(id),'synthesized-placeholder');
 }
});
