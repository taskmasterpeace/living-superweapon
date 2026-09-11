import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAbilityEvidence} from '../src/bench/abilities.js';

test('unknown handler cannot pass because its fighter settles or changes state',()=>{
  assert.deepEqual(collectAbilityEvidence('__deliberately_unimplemented__',{
    move:6.2,flying:true,selfState:true,spawns:1,dmg:2,
  }),[]);
});
test('unrelated travel cannot make an inert shot pass',()=>{
  assert.deepEqual(collectAbilityEvidence('projectile',{move:20,ki:5,cd:true}),[]);
});
test('movement evidence needs both a movement power and observed execution',()=>{
  assert.deepEqual(collectAbilityEvidence('dash',{move:20}),[]);
  assert.deepEqual(collectAbilityEvidence('dash',{move:20,cd:true}),['travelled']);
});
test('sustained damage remains evidence even when the bench tops up energy',()=>{
  assert.deepEqual(collectAbilityEvidence('cone',{dmg:26.9,ki:0}),['damaged']);
});
