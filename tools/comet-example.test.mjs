import test from 'node:test';
import assert from 'node:assert/strict';
import {cometCharacter} from '../examples/comet-character.mjs';
import {importCharacter} from '../src/tool/character-package.js';
import {CAMERA_DEFAULTS} from '../src/data/flight-tuning.js';
test('COMET imports as a separate fully authored character with calibrated rear camera and split/beam lifecycle',()=>{
  const saved=new Map(),roster=[];
  const pack=cometCharacter(),loaded=importCharacter(pack,roster,{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)});
  assert.notEqual(loaded.def.id,pack.sourceId);assert.equal(roster.length,1);assert.equal(saved.size,1);
  assert.equal(loaded.def.model.flightStyle,'martial');assert.deepEqual(loaded.def.model.camera,CAMERA_DEFAULTS);
  assert.equal(loaded.def.abilities.lmb.remoteDetonate,true);assert.equal(loaded.def.abilities.q.splitCount,4);
  assert.equal(loaded.def.abilities.q.splitHoming,5);assert.equal(loaded.def.abilities.e.dmgMax,84);
  assert.equal(loaded.def.flightTier,3);
});
