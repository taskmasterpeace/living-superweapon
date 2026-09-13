import test from 'node:test';import assert from 'node:assert/strict';import {touchButton,touchMove} from './playtest/touch.mjs';
test('touch action uses visible button bounds and native browser touch start/end',async()=>{const sent=[];const p={context:()=>({newCDPSession:async()=>({send:async(...a)=>sent.push(a)})}),locator:()=>({isVisible:async()=>true,isDisabled:async()=>false,boundingBox:async()=>({x:10,y:20,width:40,height:60})})};await touchButton(p,'guard',true);await touchButton(p,'guard',false);assert.equal(sent[0][1].type,'touchStart');assert.equal(sent[0][1].touchPoints[0].x,30);assert.equal(sent[0][1].touchPoints[0].y,50);assert.deepEqual(sent[1][1],{type:'touchEnd',touchPoints:[]});});
test('hidden touch controls reject without dispatching input',async()=>{let calls=0;const p={context:()=>({newCDPSession:async()=>({send:async()=>calls++})}),locator:()=>({isVisible:async()=>false})};await assert.rejects(touchButton(p,'guard',true),/unavailable/);assert.equal(calls,0);});

test('releasing attack preserves movement finger until its own release',async()=>{
 const sent=[];const p={context:()=>({newCDPSession:async()=>({send:async(method,data)=>sent.push(structuredClone(data))})}),locator:()=>({isVisible:async()=>true,isDisabled:async()=>false,boundingBox:async()=>({x:10,y:20,width:200,height:200})})};
 await touchMove(p,1,0);await touchButton(p,'strike',true);await touchButton(p,'strike',false);await touchMove(p,0,0);
 assert.deepEqual(sent.map(s=>[s.type,s.touchPoints.map(p=>p.id)]),[['touchStart',[2]],['touchMove',[2]],['touchStart',[2,1]],['touchEnd',[2]],['touchEnd',[]]]);
 assert.equal(sent[1].touchPoints[0].x-sent[0].touchPoints[0].x,46);
});
test('touch movement rejects invalid axes before contacting the browser',async()=>{
 for(const xy of [[Infinity,0],[0,2],[NaN,0]])await assert.rejects(touchMove({},...xy),/Invalid/);
});
