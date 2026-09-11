import test from 'node:test';
import assert from 'node:assert/strict';
import {helionCharacter} from '../examples/helion-character.mjs';
import {validateCharacter,importCharacter} from '../src/tool/character-package.js';
import {formAt,slotUnlocked} from '../src/data/progression.js';
import {CAMERA_DEFAULTS} from '../src/data/flight-tuning.js';

test('HELION is a repeatable portable recipe with independent imports and real progression',()=>{
 const pack=helionCharacter();assert.deepEqual(helionCharacter(),pack);assert.deepEqual(validateCharacter(pack),pack);
 const saved=new Map(),roster=[],storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const a=importCharacter(pack,roster,storage),b=importCharacter(pack,roster,storage);
 assert.equal(roster.length,2);assert.equal(saved.size,1);assert.notEqual(a.def.id,b.def.id);assert.notEqual(a.def.id,pack.sourceId);
 assert.equal(a.def.name,'HELION');assert.equal(a.def.flightTier,3);assert.deepEqual(a.def.model.camera,CAMERA_DEFAULTS);
 assert.equal(a.def.model.flightStyle,'martial');assert.equal(Object.keys(a.picks.slots).length,6);
 assert.equal(slotUnlocked({def:a.def,level:3},'q'),false);assert.equal(slotUnlocked({def:a.def,level:4},'q'),true);
 assert.equal(slotUnlocked({def:a.def,level:6},'r'),false);assert.equal(slotUnlocked({def:a.def,level:7},'r'),true);
 assert.deepEqual(formAt(a.def,1),{level:0,form:null});
 for(const [level,style,name] of [[4,'hero','Ignition'],[7,'twin','Corona'],[10,'thruster','White Star']]){
  const selected=formAt(a.def,level);assert.equal(selected.level,level);assert.equal(selected.form.model.flightStyle,style);assert.equal(selected.form.name,name);
 }
 a.def.progression.forms[4].name='Changed';assert.equal(helionCharacter().profile.progression.forms[4].name,'Ignition');
});
