import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../src/core/input.js';
import {KEYMAPS} from '../src/core/settings.js';
import {combatChoices,canChangeMouseTool} from '../src/core/combat-selection.js';
test('arena wheel contains melee and existing layouts retain their power order',()=>{
 const f={slots:{lmb:{},rmb:{},q:{},shift:{}}};
 assert.deepEqual(combatChoices(f,KEYMAPS.arena),['melee','lmb','rmb','q']);
 for(const key of ['classic','pilot','hybrid','brawler'])assert.deepEqual(combatChoices(f,KEYMAPS[key]),['lmb','rmb','q']);
});
test('held triggers and unfinished melee prevent remapping a mouse tool',()=>{
 const f={},input=new Input();assert.equal(canChangeMouseTool(f,input),true);
 for(const key of ['left','right']){input.mouse[key]=true;assert.equal(canChangeMouseTool(f,input),false);input.mouse[key]=false;}
 for(const key of ['meleeCharge','_meleeQueuedHeld','mstate','grabbing','grabState']){f[key]=1;assert.equal(canChangeMouseTool(f,input),false);f[key]=0;}
 assert.equal(canChangeMouseTool(f,input),true);
});
test('focus loss releases charged triggers and side-button guard without stale press edges',()=>{
 const win=new EventTarget(),doc=new EventTarget(),canvas=new EventTarget();canvas.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});canvas.width=canvas.height=100;
 const original={addEventListener:globalThis.addEventListener,document:globalThis.document};
 globalThis.addEventListener=win.addEventListener.bind(win);globalThis.document=doc;
 try{
  const input=new Input();input.bind(canvas);input.keys.add('KeyC');input.justPressed.add('KeyC');Object.assign(input.mouse,{left:true,right:true,leftEdge:true,rightEdge:true,b3:true,b4:true,dx:12,dy:4});
  win.dispatchEvent(new Event('blur'));
  assert.equal(input.mouse.leftUp,true);assert.equal(input.mouse.rightUp,true);assert.equal(input.released('KeyC'),true);
  for(const key of ['left','right','leftEdge','rightEdge','b3','b4'])assert.equal(input.mouse[key],false,key);
  assert.equal(input.justPressed.size,0);assert.equal(input.keys.size,0);assert.equal(input.mouse.dx,0);
 }finally{for(const key of Object.keys(original))if(original[key]===undefined)delete globalThis[key];else globalThis[key]=original[key];}
});
