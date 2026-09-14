import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MANIFEST,HOT_SET} from '../src/core/samples.js';
import {registerHooks} from 'node:module';
const css=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {};',shortCircuit:true}:next(url,context);}});
const {mainCombatFixture}=await import('./helpers/main-combat-fixture.mjs');css.deregister();

for(const [kind,sample,pitch]of [['jammer','gear.jammer',180],['shieldpack','gear.shield.activate',700]]){
 for(const handled of [true,false])test(`${kind} applies its effect once with ${handled?'recording':'existing fallback'}`,()=>{
  const x=mainCombatFixture();try{
   const calls=[],zaps=[];x.g.audio={...x.g.audio,sample:(name,options)=>{calls.push({name,options});return handled;},zap:(...args)=>zaps.push(args)};
   const ai={};x.g.entities.push({ai});x.p._shieldHp=0;
   x.p.items=[{def:{kind,dur:7,shield:33,charges:1},state:'ready',charges:1}];
   x.g.useItem(x.p);assert.equal(calls.length,1);assert.equal(calls[0].name,sample);assert.equal(calls[0].options.pos,x.p.pos);
   assert.equal(zaps.length,handled?0:1);if(!handled)assert.deepEqual(zaps[0],[pitch,x.p.pos]);
   assert.equal(kind==='jammer'?ai._jammedT:x.p._shieldHp,kind==='jammer'?7:33);
   assert.equal(x.p.items[0].charges,0);assert.equal(x.p.items[0].state,'spent');
   x.g.useItem(x.p);assert.equal(calls.length,1);
   x.g.entities.pop();
  }finally{x.close();}
 });
 for(const state of ['spent','cooldown','noPowers'])test(`${kind} rejected ${state} activation is silent and has no effect`,()=>{
  const x=mainCombatFixture();try{
   x.g.audio={...x.g.audio,sample:()=>assert.fail('rejected item sample'),zap:()=>assert.fail('rejected item fallback')};
   x.p._shieldHp=0;x.p.noPowers=state==='noPowers';
   x.p.items=[{def:{kind,charges:1},state:state==='noPowers'?'ready':state,charges:state==='spent'?0:1}];
   x.g.useItem(x.p);assert.equal(x.p._shieldHp,0);assert.equal(x.p.items[0].charges,state==='spent'?0:1);
  }finally{x.close();}
 });
 test(`${kind} bundled sample has exact source provenance and preload`,async()=>{
  assert.ok(HOT_SET.includes(sample));assert.equal(MANIFEST[sample].loop,undefined);
  const stem='public/audio/'+MANIFEST[sample].f[0],data=await fs.readFile(stem+'.mp3'),p=JSON.parse(await fs.readFile(stem+'.provenance.json'));
  assert.equal(createHash('sha256').update(data).digest('hex'),p.sha256);
  if(kind==='jammer')assert.equal(p.manifestEntry.moment,'ACTION');
  else assert.ok(p.sourcePath.endsWith('/shield-raise.mp3'));
 });
}
