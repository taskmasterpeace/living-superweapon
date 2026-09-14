import test from 'node:test';
import assert from 'node:assert/strict';
import {advancePreview,previewOffset} from '../src/tool/animation-playback.js';
test('one shot stops on last frame and never wraps an attack into its start',()=>{assert.deepEqual(advancePreview(.9,.2,1,false),{time:1,ended:true});assert.deepEqual(advancePreview(.9,.2,1,true),{time:.10000000000000009,ended:false});});
test('air fall descends to floor and hover retains clearance without changing simulation',()=>{assert.equal(previewOffset({motion:'fall',height:12},0),12);assert.equal(previewOffset({motion:'fall',height:12},1),0);assert.ok(previewOffset({motion:'fall',height:12},.5)<12);assert.equal(previewOffset({motion:'hover',height:7},1),7);assert.equal(previewOffset(null,.5),0);});
