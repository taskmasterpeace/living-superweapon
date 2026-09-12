import test from 'node:test';import assert from 'node:assert/strict';import {meleeSequenceCue} from '../src/engine/melee-entry-cue.js';
test('sequence cue separates attempt from contact and excludes heavy attacks',()=>{
 const p={alive:true,mKind:'light',mstate:'startup',strikeIdx:0,strikeHit:new Set()},g={modeId:'powerworld',running:true,player:p};
 assert.equal(meleeSequenceCue(g),'STRIKE 1/3 · WIND-UP');p.mstate='recover';assert.equal(meleeSequenceCue(g),'STRIKE 1/3 · MISS');p.strikeHit.add({});assert.equal(meleeSequenceCue(g),'STRIKE 1/3 · CONTACT');p._meleeBlocked=true;assert.equal(meleeSequenceCue(g),'STRIKE 1/3 · BLOCKED');p.mKind='heavy';assert.equal(meleeSequenceCue(g),null);p.mKind='light';p.sleepT=1;assert.equal(meleeSequenceCue(g),null);
});
