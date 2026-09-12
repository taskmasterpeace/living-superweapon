import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSquad} from '../src/engine/squad-config.js';
const roster=[{id:'soldier',archetype:'soldier'},...['a','b','c','d','e','f','g'].map(id=>({id}))];
test('allegiance independent from playable class; companion limits enforced',()=>{
 assert.equal(validateSquad({side:'soldier',p1:'a',companions:['b']},roster).side,'soldier');
 assert.equal(validateSquad({side:'lsw',p1:'soldier',companions:['a','b','c','d','e']},roster).companions.length,5);
 assert.throws(()=>validateSquad({side:'soldier',p1:'a',companions:['b','c']},roster));
 assert.throws(()=>validateSquad({side:'lsw',p1:'a',companions:['b','c','d','e','f','g']},roster));
});
test('reject duplicates, self recruitment, soldiers and missing profiles',()=>{
 for(const companions of [['b','b'],['a'],['soldier'],['missing']])assert.throws(()=>validateSquad({side:'lsw',p1:'a',companions},roster));
});
test('Soldier allies count toward the supported six-person squad',()=>{
 const roster=[{id:'sol'},{id:'sarge',archetype:'soldier'}];
 assert.equal(validateSquad({side:'soldier',p1:'sarge',companions:['sol'],soldiers:3},roster).soldiers,3);
 for(const soldiers of [-1,.5,6])assert.throws(()=>validateSquad({side:'soldier',p1:'sarge',soldiers},roster));
 assert.throws(()=>validateSquad({side:'soldier',p1:'sarge',companions:['sol'],soldiers:5},roster));
});
test('reserve budgets validate independently of active squad size',()=>{
 const cfg={side:'lsw',p1:'a',soldierReserves:0,lswReserves:5};
 const accepted=validateSquad(cfg,roster);
 assert.equal(accepted.soldierReserves,0);assert.equal(accepted.lswReserves,5);
 for(const n of [-1,.5,13,NaN])assert.throws(()=>validateSquad({...cfg,lswReserves:n},roster));
 assert.equal(validateSquad({side:'lsw',p1:'a'},roster).lswReserves,2);
});
