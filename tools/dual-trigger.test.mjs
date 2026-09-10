import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../src/core/input.js';
import {KEYMAPS} from '../src/core/settings.js';
import {sampleMouseCombat} from '../src/core/combat-selection.js';

const fighter=()=>({slots:{lmb:{cd:0},rmb:{cd:2},q:{cd:0},e:{cd:0}}});
test('wheel changes primary attack in classic without changing secondary or cooldown',()=>{
 const f=fighter(),i=new Input();i.wheel=1;
 const out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 assert.equal(out.primary,'rmb');assert.equal(out.secondary,'rmb');assert.equal(f.slots.rmb.cd,2);
 i.endFrame();i.mouse.leftEdge=i.mouse.left=true;
 assert.equal(sampleMouseCombat(f,i,KEYMAPS.classic,.016).slots.rmb.pressed,true);
});
test('RMB wheel changes only secondary and suppresses firing until a fresh click',()=>{
 const f=fighter(),i=new Input();Object.assign(i.mouse,{right:true,rightEdge:true});i.wheel=1;
 let out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 assert.equal(out.primary,'lmb');assert.equal(out.secondary,'q');assert.equal(out.slots.q.held,false);
 i.endFrame();out=sampleMouseCombat(f,i,KEYMAPS.classic,.5);assert.equal(out.slots.q.pressed,false);
 i.mouse.right=false;i.mouse.rightUp=true;out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.slots.q.released,false);
 i.endFrame();i.mouse.right=true;i.mouse.rightEdge=true;sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 i.endFrame();out=sampleMouseCombat(f,i,KEYMAPS.classic,.18);assert.equal(out.slots.q.pressed,true);assert.equal(out.slots.q.held,true);
});
test('quick right click fires once on release and late selection cancels only old channel',()=>{
 const f=fighter(),i=new Input();i.mouse.right=true;i.mouse.rightEdge=true;
 let out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.slots.rmb.pressed,false);
 i.endFrame();i.mouse.right=false;i.mouse.rightUp=true;out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 assert.deepEqual(out.slots.rmb,{pressed:true,held:true,released:false});
 i.endFrame();out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.slots.rmb.released,true);
 i.endFrame();i.mouse.right=true;i.mouse.rightEdge=true;sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 i.endFrame();sampleMouseCombat(f,i,KEYMAPS.classic,.2);i.wheel=1;
 out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.deepEqual(out.cancel,['rmb']);assert.equal(out.slots.q.pressed,false);
});
test('primary hold cannot remap and shared slot remains held when one trigger releases',()=>{
 const f=fighter(),i=new Input();f._selSlot='rmb';i.mouse.left=true;i.mouse.leftEdge=true;
 sampleMouseCombat(f,i,KEYMAPS.classic,.016);i.endFrame();i.wheel=1;
 let out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.primary,'rmb');
 i.endFrame();i.mouse.right=true;i.mouse.rightEdge=true;sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 i.endFrame();sampleMouseCombat(f,i,KEYMAPS.classic,.2);i.mouse.left=false;i.mouse.leftUp=true;
 out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.slots.rmb.held,true);assert.equal(out.slots.rmb.released,false);
});
test('wheel event retains secondary modifier even if RMB releases before next simulation frame',()=>{
 const f=fighter(),i=new Input();i.wheelSecondary=1;i.wheel=1;i.mouse.rightUp=true;
 const out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.primary,'lmb');assert.equal(out.secondary,'q');assert.equal(out.slots.q.pressed,false);
});
test('arena melee has an independent grab trigger that can be replaced by a power',()=>{
 const f=fighter(),i=new Input();f._selSlot='melee';
 let out=sampleMouseCombat(f,i,KEYMAPS.arena,.016);assert.equal(out.secondary,'grab');
 i.mouse.right=true;i.mouse.rightEdge=true;i.wheel=1;out=sampleMouseCombat(f,i,KEYMAPS.arena,.016);
 assert.equal(out.primary,'melee');assert.equal(out.secondary,'lmb');assert.equal(out.buttons.right.pressed,false);
});
test('focus loss cannot turn a pending selection gesture into an attack',()=>{
 const f=fighter(),i=new Input();i.mouse.right=true;i.mouse.rightEdge=true;
 sampleMouseCombat(f,i,KEYMAPS.classic,.016);i.endFrame();i.cancelVersion++;i.mouse.right=false;i.mouse.rightUp=true;
 const out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.slots.rmb.pressed,false);assert.equal(out.slots.rmb.released,false);
});
test('release plus wheel in one frame ends the old primary channel instead of orphaning it',()=>{
 const f=fighter(),i=new Input();i.mouse.left=true;i.mouse.leftEdge=true;sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 i.endFrame();i.mouse.left=false;i.mouse.leftUp=true;i.wheel=1;
 const out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);assert.equal(out.slots.lmb.released,true);assert.equal(out.primary,'lmb');
});
test('primary wheel entering melee does not silently replace the independent secondary',()=>{
 const f=fighter(),i=new Input();sampleMouseCombat(f,i,KEYMAPS.arena,.016);i.wheel=-1;
 sampleMouseCombat(f,i,KEYMAPS.arena,.016);i.endFrame();
 const out=sampleMouseCombat(f,i,KEYMAPS.arena,.016);assert.equal(out.primary,'melee');assert.equal(out.secondary,'rmb');
});
test('scrolling secondary does not cancel an ability still owned by a direct key or pad',()=>{
 const f=fighter(),i=new Input();f._selSecondary='q';i.mouse.right=true;i.mouse.rightEdge=true;
 sampleMouseCombat(f,i,KEYMAPS.classic,.2);i.endFrame();i.wheel=1;
 const out=sampleMouseCombat(f,i,KEYMAPS.classic,.016,k=>k==='q');assert.deepEqual(out.cancel,[]);
});

test('fresh secondary click after scrolling survives release and re-press between simulation ticks',()=>{
 const f=fighter(),i=new Input();i.mouse.right=true;i.mouse.rightEdge=true;i.wheelSecondary=1;
 sampleMouseCombat(f,i,KEYMAPS.classic,.016);i.endFrame();
 // A user can release the selector and make a complete fresh click before RAF.
 i.mouse.right=false;i.mouse.rightUp=true;i.mouse.rightEdge=true;
 const out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 assert.deepEqual(out.slots.q,{pressed:true,held:true,released:false});
 i.endFrame();assert.equal(sampleMouseCombat(f,i,KEYMAPS.classic,.016).slots.q.released,true);
});

test('fresh secondary hold after scrolling ignores an older release edge in the same frame',()=>{
 const f=fighter(),i=new Input();i.mouse.right=true;i.mouse.rightEdge=true;i.wheelSecondary=1;
 sampleMouseCombat(f,i,KEYMAPS.classic,.016);i.endFrame();
 Object.assign(i.mouse,{right:true,rightUp:true,rightEdge:true});
 assert.equal(sampleMouseCombat(f,i,KEYMAPS.classic,.016).slots.q.pressed,false);
 i.endFrame();const held=sampleMouseCombat(f,i,KEYMAPS.classic,.2).slots.q;
 assert.deepEqual(held,{pressed:true,held:true,released:false});
 i.endFrame();assert.equal(sampleMouseCombat(f,i,KEYMAPS.classic,.2).slots.q.held,true);
});

test('a queued tap release belongs to its original secondary even when scrolling again immediately',()=>{
 const f=fighter(),i=new Input();Object.assign(i.mouse,{rightEdge:true,rightUp:true});
 sampleMouseCombat(f,i,KEYMAPS.classic,.016);i.endFrame();
 Object.assign(i.mouse,{right:true,rightEdge:true});i.wheelSecondary=1;
 const out=sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 assert.equal(out.secondary,'q');assert.equal(out.slots.rmb.released,true);assert.equal(out.slots.q.released,false);
 assert.equal(out.slots.q.held,false);
});

test('a fast primary click provides one held tick and its queued release survives scrolling',()=>{
 const f=fighter(),i=new Input();Object.assign(i.mouse,{leftEdge:true,leftUp:true});
 const first=sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 assert.deepEqual(first.slots.lmb,{pressed:true,held:true,released:false});
 i.endFrame();i.wheelPrimary=1;
 const next=sampleMouseCombat(f,i,KEYMAPS.classic,.016);
 assert.equal(next.primary,'rmb');assert.equal(next.slots.lmb.released,true);assert.equal(next.slots.rmb.released,false);
});
