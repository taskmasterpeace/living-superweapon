import test from 'node:test';import assert from 'node:assert/strict';
import {requireRecordingModels} from '../src/engine/recording-models.js';
const actor=(loaded)=>({def:{id:'sol'},_modularCharacter:loaded?{}:null});
test('recording rejects a modular fallback or a not-yet-loaded target',()=>{
 assert.throws(()=>requireRecordingModels([actor(false)]),/Modular/);
 assert.throws(()=>requireRecordingModels([actor(true),actor(false)]),/Modular/);
});
test('recording identifies both loaded modular fighters',()=>{
 const result=requireRecordingModels([actor(true),actor(true)]);
 assert.equal(result.length,2);assert.ok(result.every(m=>m.loadedModular&&m.body==='faceted-v1'));
});
