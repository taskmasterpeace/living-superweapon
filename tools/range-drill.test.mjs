import test from 'node:test';import assert from 'node:assert/strict';
import {RangeDrill} from '../src/engine/range-drill.js';
test('range score counts only admitted player damage to its exact target',()=>{
 const d=new RangeDrill(),t={alive:true},p={alive:true};d.start(t,p,'moving');
 d.contact(t,p,5);d.contact(t,{},50);d.contact({},p,50);d.contact(t,p,0);
 assert.equal(d.damage,5);assert.equal(d.contacts,1);
 d.update(29,t);assert.equal(d.remaining,1);d.update(2,t);
 assert.equal(d.elapsed,30);assert.equal(d.reason,'TIME UP');d.contact(t,p,8);assert.equal(d.damage,5);
 d.start(t,p,'still');assert.equal(d.damage,0);t.alive=false;d.update(.1,t);assert.equal(d.reason,'TARGET DOWN');
});
test('stopping or replacing a target freezes result; dead actors cannot begin',()=>{
 const d=new RangeDrill(),t={alive:true},p={alive:true};d.start(t,p,'still');d.update(1,t);d.stop();d.update(2,t);assert.equal(d.elapsed,1);
 d.start(t,p,'still');d.update(1,{});assert.equal(d.reason,'TARGET CHANGED');
 assert.equal(d.start({alive:false},p,'still'),false);
});
