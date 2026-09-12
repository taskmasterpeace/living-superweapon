import test from 'node:test';
import assert from 'node:assert/strict';
import {operationSound,LIVE_OPERATION_CUES} from '../src/engine/operation-audio.js';
import {MANIFEST,HOT_SET} from '../src/core/samples.js';
test('native cues register delivered samples for preload without enabling unwired reports',()=>{
 for(const id of LIVE_OPERATION_CUES){assert.ok(HOT_SET.includes(id));assert.ok(MANIFEST[id].f.every(f=>f.startsWith('operation-v1/')));}
 assert.equal(operationSound({audio:{sample(){throw Error('unwired cue played');}}},'op.zombie.idle'),false);
});
test('scanner coalesces duplicates, recovers after clock reset and falls back without delayed replay',()=>{
 const calls=[],g={time:5,audio:{sample:(id,o)=>{calls.push({id,o});return !id.startsWith('op.');}}};
 assert.equal(operationSound(g,'op.scanner.acquire'),true);
 assert.deepEqual(calls.map(c=>c.id),['op.scanner.acquire','ui.confirm']);
 operationSound(g,'op.scanner.acquire');assert.equal(calls.length,2);
 g.time=0;operationSound(g,'op.scanner.acquire');assert.equal(calls.length,4);
 assert.equal(calls[0].o.pos,null);
});
test('portal sound follows its world contact position',()=>{
 const pos={x:10,y:20,z:30};let options;
 operationSound({time:1,audio:{sample:(id,o)=>{options=o;return true;}}},'op.portal.cross',pos);
 assert.equal(options.pos,pos);assert.equal(options.bus,'sfx');
});
