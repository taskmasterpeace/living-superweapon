import test from 'node:test';import assert from 'node:assert/strict';import {Gamepad,POWERWORLD_MAP} from '../src/core/gamepad.js';import {actionCatalog} from './playtest/actions.mjs';
test('test bindings reuse PowerWorld controller map and native polling produces press/release edges',()=>{
 const old=Object.getOwnPropertyDescriptor(navigator,'getGamepads');const buttons=Array.from({length:17},()=>({pressed:false}));Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{connected:true,axes:[0,0,0,0],buttons}]});
 try{const pad=Object.assign(Object.create(Gamepad.prototype),{powerworld:true,dead:.24,btn:[],cur:{},prev:{}});
  for(const action of ['guard','strike','grab']){const binding=actionCatalog('pad')[action];assert.equal(binding.button,POWERWORLD_MAP[action]);buttons[binding.button].pressed=true;pad.update();assert(pad.pressed(action));pad.update();assert(pad.down(action));assert(!pad.pressed(action));buttons[binding.button].pressed=false;pad.update();assert(pad.released(action));assert(!pad.down(action));}
 }finally{if(old)Object.defineProperty(navigator,'getGamepads',old);else delete navigator.getGamepads;}
});
