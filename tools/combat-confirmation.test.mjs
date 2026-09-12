import test from 'node:test';import assert from 'node:assert/strict';
import {confirmCombatOutcome} from '../src/engine/combat-confirmation.js';
test('local confirmations distinguish accepted health damage, guard, break and remote combat',()=>{
 const player={},foe={},remote={},calls=[],g={time:1,isHuman:f=>f===player,audio:{sample:(id,o)=>{calls.push({id,o});return true;}}};
 const base={healthLost:10,guard:'none',deflected:false};
 confirmCombatOutcome(g,foe,{src:remote},base);confirmCombatOutcome(g,foe,{src:player,dot:true},base);confirmCombatOutcome(g,foe,{src:player},{...base,healthLost:0});assert.equal(calls.length,0);
 confirmCombatOutcome(g,foe,{src:player},base);confirmCombatOutcome(g,foe,{src:player},base);assert.equal(calls.length,1);
 confirmCombatOutcome(g,foe,{src:player},{...base,guard:'blocked'});assert.equal(calls.length,1);
 confirmCombatOutcome(g,player,{src:foe},{...base,guard:'blocked'});assert.equal(calls.at(-1).id,'op.block.confirm');
 confirmCombatOutcome(g,player,{src:foe},{...base,guard:'broken'});assert.equal(calls.at(-1).id,'op.guard.break');
 assert.equal(calls.length,3);assert.ok(calls.every(c=>c.o.pos===null));
});
