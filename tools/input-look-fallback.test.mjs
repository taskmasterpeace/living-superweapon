import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../src/core/input.js';

test('uncaptured PowerWorld mouse look resets at focus and lock boundaries; city remains absolute',()=>{
 const oldAdd=globalThis.addEventListener,oldDoc=globalThis.document,win={},doc={},events={};
 globalThis.addEventListener=(name,fn)=>win[name]=fn;
 globalThis.document={addEventListener:(name,fn)=>doc[name]=fn,pointerLockElement:null};
 const canvas={width:800,height:600,getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),addEventListener:(name,fn)=>events[name]=fn};
 try{
  const input=new Input();input.bind(canvas);
  const move=(x,y)=>events.mousemove({clientX:x,clientY:y});
  move(100,100);move(140,120);assert.equal(input.mouse.dx,0);
  input.pointerLock=true;move(160,130);assert.equal(input.mouse.dx,20);assert.equal(input.mouse.dy,10);
  input.endFrame();win.blur();move(500,500);assert.equal(input.mouse.dx,0);move(510,505);assert.equal(input.mouse.dx,10);
  doc.pointerlockchange();assert.equal(input.mouse.dx,0);move(30,30);assert.equal(input.mouse.dx,0);
  input.endFrame();events.mouseleave();move(700,500);assert.equal(input.mouse.dx,0);
  document.pointerLockElement=canvas;doc.pointerlockchange();events.mousemove({clientX:400,clientY:300,movementX:3,movementY:-4});assert.equal(input.mouse.dx,3);assert.equal(input.mouse.dy,-4);
 }finally{globalThis.addEventListener=oldAdd;globalThis.document=oldDoc;}
});
