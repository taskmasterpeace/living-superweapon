import test from 'node:test';
import assert from 'node:assert/strict';
import {ANIMATION_BANKS,buildAnimationCatalog,resolveAnimationClip,validateAnimationClip} from '../src/data/animation-catalog.js';
test('catalog reconciles every native bank entry and resolves original clips',()=>{
 const catalog=buildAnimationCatalog();
 assert.equal(catalog.entries.length,ANIMATION_BANKS.reduce((n,b)=>n+Object.keys(b.bank.clips).length,0));
 for(const bank of ANIMATION_BANKS)for(const [key,clip] of Object.entries(bank.bank.clips)) {
  const e=catalog.entries.find(e=>e.id===`${bank.id}/${key}`);assert.ok(e);assert.deepEqual(e.issues,[]);
  assert.equal(resolveAnimationClip(e.id),clip);assert.equal(e.frames,clip.frames.length);
 }
});
test('new registered bank clips appear without individual catalog rows',()=>{
 const original=ANIMATION_BANKS[0],bank={...original,bank:{...original.bank,clips:{...original.bank.clips,newPunch:original.bank.clips.jab}}};
 assert.ok(buildAnimationCatalog([bank]).entries.some(e=>e.id==='strike/newPunch'));
 assert.throws(()=>buildAnimationCatalog([bank,bank]),/Duplicate/);
});
test('invalid frames and contact windows are surfaced rather than silently repaired',()=>{
 assert.deepEqual(validateAnimationClip({duration:1,frames:[[NaN]],contactStart:.8,contactEnd:.2},'Melee'),['missing-frames','invalid-contact-markers']);
 const c={...resolveAnimationClip('strike/jab'),frames:[[0],[1]]};
 assert.ok(validateAnimationClip(c,'Melee').includes('invalid-pose-frame'));
 assert.equal(resolveAnimationClip('missing/clip'),null);
 assert.equal(buildAnimationCatalog().entries.find(e=>e.id==='locomotion/walk').audioStatus,'not-audited');
});
