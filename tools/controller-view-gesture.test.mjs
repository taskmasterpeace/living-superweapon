import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Gamepad} from '../src/core/gamepad.js';
function fixture(){const pad=Object.assign(Object.create(Gamepad.prototype),{powerworld:true,connected:true,cur:{},prev:{}});return {pad,step(held,dt=.1,allowed=true){pad.prev=pad.cur;pad.cur={select:held};pad.sampleViewGesture(dt,allowed);}};}
test('View tap requests inventory exactly once; hold looks without opening on release',()=>{
 const {pad,step}=fixture();step(true);step(false);assert.equal(pad.inventoryRequested,true);step(false);assert.equal(pad.inventoryRequested,false);
 step(true,.3);assert.equal(pad.viewFreeLook,true);step(false);assert.equal(pad.viewFreeLook,false);assert.equal(pad.inventoryRequested,false);
});
test('cancelled and disconnected View gestures cannot open inventory on release',()=>{
 const {pad,step}=fixture();step(true);step(true,.1,false);step(false);assert.equal(pad.inventoryRequested,false);
 step(true);pad.connected=false;step(false);assert.equal(pad.inventoryRequested,false);
 pad.connected=true;step(false);assert.equal(pad.inventoryRequested,false);
});

test('reload chord consumes strike until full release, including modifier-first release',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(navigator,'getGamepads');
 const buttons=Array.from({length:17},()=>({pressed:false}));
 Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{connected:true,axes:[0,0,0,0],buttons}]});
 const pad=Object.assign(Object.create(Gamepad.prototype),{powerworld:true,btn:[],dead:.24,cur:{},prev:{}});
 const step=()=>{pad.update();pad.sampleCombatLock(true);};
 try{
  buttons[13].pressed=true;step();buttons[2].pressed=true;step();
  assert.equal(pad.pressed('reload'),true);assert.equal(pad.pressed('strike'),false);
  buttons[13].pressed=false;step();assert.equal(pad.down('strike'),false);
  buttons[2].pressed=false;step();assert.equal(pad.released('strike'),false);step();
  buttons[2].pressed=true;step();assert.equal(pad.pressed('strike'),true,'a new ordinary strike remains available');
 }finally{if(descriptor)Object.defineProperty(navigator,'getGamepads',descriptor);else delete navigator.getGamepads;}
});
