import test from 'node:test';import assert from 'node:assert/strict';import {performAction,actionHistory,actionCatalog} from './playtest/actions.mjs';
function fake({ready=true,advance=true}={}){let time=1;const calls=[];return {calls,keyboard:{down:async k=>calls.push('down:'+k),up:async k=>calls.push('up:'+k)},mouse:{down:async()=>calls.push('mouseDown'),up:async()=>calls.push('mouseUp')},evaluate:async fn=>fn.toString().includes('ready:')?{ready,time}:time,waitForTimeout:async()=>{if(advance)time+=.1;},waitForFunction:async()=>{if(!advance)throw new Error('simulation did not advance');}};}
test('native strike uses canonical binding, releases, and records simulation advancement',async()=>{const p=fake();await performAction(p,'strike');assert.equal(actionCatalog().strike.code,'KeyV');assert.deepEqual(p.calls,['down:v','up:v']);assert.equal(actionHistory(p)[0].status,'dispatched');assert.equal(actionHistory(p)[0].released,true);});
test('stalled simulation releases held input and records failure',async()=>{const p=fake({advance:false});await assert.rejects(performAction(p,'guard'));assert.deepEqual(p.calls,['down:q','up:q']);assert.equal(actionHistory(p)[0].status,'failed');});
test('unavailable runtime and invalid actions cannot send input',async()=>{const p=fake({ready:false});await assert.rejects(performAction(p,'strike'));await assert.rejects(performAction(p,'constructor'));await assert.rejects(performAction(p,'strike',{holdMs:Infinity}));assert.deepEqual(p.calls,[]);});

test('charge condition timeout releases input and cannot count as charged success',async()=>{const p=fake({advance:false});await assert.rejects(performAction(p,'strike',{until:'melee-charged'}));assert.deepEqual(p.calls,['down:v','up:v']);assert.equal(actionHistory(p)[0].status,'failed');const other=fake();await assert.rejects(performAction(other,'guard',{until:'melee-charged'}));assert.deepEqual(other.calls,[]);});

test('combined stick and attack releases both inputs after charge timeout',async()=>{
 const p=fake({advance:false}),original=p.evaluate;
 p.evaluate=async(fn,arg)=>{if(arg&&Object.hasOwn(arg,'x')){p.calls.push(['axes',arg.x,arg.y]);return;}if(arg&&Object.hasOwn(arg,'index')){p.calls.push(['button',arg.index,arg.held]);return;}return original(fn,arg);};
 await assert.rejects(performAction(p,'strike',{scheme:'pad',move:[1,0],until:'melee-charged'}));
 assert.deepEqual(p.calls,[['axes',1,0],['button',2,true],['button',2,false],['axes',0,0]]);
 const r=actionHistory(p)[0];assert.equal(r.status,'failed');assert(r.released&&r.movementReleased);
});
test('invalid or incompatible stick input is rejected before input dispatch',async()=>{
 for(const options of [{move:[1,0]},{scheme:'pad',move:[NaN,0]},{scheme:'pad',move:[2,0]},{scheme:'pad',move:[0]}]){const p=fake();await assert.rejects(performAction(p,'strike',options));assert.deepEqual(p.calls,[]);}
});
test('throw arming timeout releases grab and never reports an armed throw',async()=>{const p=fake({advance:false});await assert.rejects(performAction(p,'grab',{until:'grab-armed'}));assert.deepEqual(p.calls,['down:e','up:e']);assert.equal(actionHistory(p)[0].throwArmed,undefined);assert.equal(actionHistory(p)[0].released,true);await assert.rejects(performAction(fake(),'strike',{until:'grab-armed'}));});
test('flight-height wait releases rise on timeout and rejects incompatible actions',async()=>{const p=fake({advance:false});await assert.rejects(performAction(p,'up',{until:'flight-height'}));assert.deepEqual(p.calls,['down:Space','up:Space']);assert.equal(actionHistory(p)[0].flightHeightReached,undefined);await assert.rejects(performAction(fake(),'strike',{until:'flight-height'}));});
