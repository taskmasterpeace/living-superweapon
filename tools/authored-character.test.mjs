import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {loadFighterMotion,invalidateFighterMotion} from '../src/engine/authored-character.js';

const refs={locomotion:'motion.hero-ual@1',reload:'motion.hero-ual@1',grenade:'motion.hero-ual2@1'};
function fighter(){const def=structuredClone(ROSTER.find(d=>d.id==='sarge'));def.model={...def.model,assets:{motion:{...refs}}};return new Fighter(def);}
const pack=ref=>Object.freeze({ref,packageId:ref,packageHash:'checked-fixture',clips:{},metadata:{}});

test('fighter binds selected roles once loaded and exposes fallback-safe failures',async()=>{
 const f=fighter();try{
  await loadFighterMotion(f,{load:async ref=>{if(ref.endsWith('ual2@1'))throw Error('Package missing');return pack(ref);}});
  assert.equal(f._motionSources.locomotion.ref,refs.locomotion);
  assert.equal(f._motionSources.reload.ref,refs.reload);
  assert.equal(f._motionSources.grenade,undefined);
  assert.equal(f._authoredMotionStatus.grenade.state,'fallback');
  assert.match(f._authoredMotionStatus.grenade.message,/Package missing/);
  await loadFighterMotion(f,{load:async ref=>pack(ref)});
  assert.equal(f._motionSources.grenade.ref,refs.grenade,'failed source may retry');
 }finally{f.dispose();}
});

for(const transition of ['form','selection','ko','dispose','invalidate'])test(`late motion completion cannot bind after ${transition}`,async()=>{
 const f=fighter(),pending=[];
 try{
  const ready=loadFighterMotion(f,{load:ref=>new Promise(resolve=>pending.push(()=>resolve(pack(ref))))});
  if(transition==='form')f.applyForm({frame:{bulk:1.3}});
  if(transition==='selection')f.def.model.assets.motion={locomotion:'motion.future@2'};
  if(transition==='ko')f.state='ko';
  if(transition==='dispose')f.dispose();
  if(transition==='invalidate')invalidateFighterMotion(f);
  pending.forEach(resolve=>resolve());await ready;
  assert.deepEqual(f._motionSources,{});
 }finally{f.dispose();}
});

test('a retired load cannot replace the status or sources of a later selection',async()=>{
 const f=fighter(),pending=[];try{
  const old=loadFighterMotion(f,{load:ref=>new Promise(resolve=>pending.push(()=>resolve(pack(ref))))});
  f.def.model.assets.motion={locomotion:'motion.future@2'};
  await loadFighterMotion(f,{load:async ref=>pack(ref)});
  pending.forEach(resolve=>resolve());await old;
  assert.equal(f._motionSources.locomotion.ref,'motion.future@2');
  assert.deepEqual(Object.keys(f._authoredMotionStatus),['locomotion']);
 }finally{f.dispose();}
});
