import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFrameTimes,measureMethod} from '../src/engine/performance-diagnostic.js';

test('reports real 4 FPS instead of clamping slow frames to 100ms',()=>{
 const s=summarizeFrameTimes(Array.from({length:32},()=>({dt:250,hidden:false})));
 assert.equal(s.fps,4);assert.equal(s.p95Ms,250);assert.equal(s.worstMs,250);assert.equal(s.frames,32);
});
test('separates hidden-tab timing and ignores invalid intervals',()=>{
 const s=summarizeFrameTimes([{dt:10,hidden:false},{dt:10,hidden:false},{dt:1000,hidden:true},{dt:NaN},{dt:-1}]);
 assert.equal(s.fps,100);assert.equal(s.frames,2);assert.equal(s.hiddenFrames,1);
 assert.equal(summarizeFrameTimes([]).fps,null);
});
test('temporary method timing preserves receiver, arguments, errors and restores exact method',()=>{
 let now=0;const rows=[];const object={value:3,work(a){now+=2;assert.equal(this,object);if(a<0)throw Error('sentinel');return this.value+a;}};
 const original=object.work,restore=measureMethod(object,'work',rows,()=>now);
 assert.equal(object.work(4),7);assert.throws(()=>object.work(-1),/sentinel/);
 assert.deepEqual(rows,[2,2]);restore();assert.equal(object.work,original);restore();
});
test('timing cleanup never overwrites a method replaced by another owner',()=>{
 const object={work(){}};const restore=measureMethod(object,'work',[],()=>0),replacement=()=>42;
 object.work=replacement;restore();assert.equal(object.work,replacement);
});
