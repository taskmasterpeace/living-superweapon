import test from 'node:test';
import assert from 'node:assert/strict';
import {hudLayout,hudLayoutPosition,nudgeHudLayout} from '../src/engine/hud-layout.js';
test('layout rejects unsafe persisted values',()=>{assert.deepEqual(hudLayout({scale:Infinity,x:-2,y:5}),{scale:.85,x:0,y:1});assert.equal(hudLayout({scale:9}).scale,1.4);assert.equal(hudLayout({scale:0}).scale,.6);});

test('new desktop layout stays 18px left and 20px above the bottom after resize',()=>{
 const layout=hudLayout();
 for(const [w,h] of [[1280,720],[1920,1080]]){
  const p=hudLayoutPosition(layout,w,h);assert.equal(p.scale,.85);assert.equal(p.left,18);assert.equal(p.top+142*p.scale,h-20);
 }
});
test('saved user coordinates and scale retain their original meaning',()=>{
 const saved={x:.25,y:.27,scale:1};assert.deepEqual(hudLayout(saved),saved);
 assert.deepEqual(hudLayoutPosition(saved,1280,720),{left:320,top:194.4,scale:1});
});
test('first keyboard nudge starts from the visible default, and reset survives persistence',()=>{
 const layout=JSON.parse(JSON.stringify(hudLayout())),before=hudLayoutPosition(layout,1280,720);
 const moved=nudgeHudLayout(layout,1280,720,4,-20),after=hudLayoutPosition(moved,1280,720);
 assert.equal(after.left,before.left+4);assert.equal(after.top,before.top-20);assert.equal(after.scale,.85);
 assert.deepEqual(hudLayoutPosition(JSON.parse(JSON.stringify(moved)),1280,720),after);
});
test('expanded effects and small viewports remain inside the safe inset',()=>{
 for(const [w,h,bw,bh] of [[1280,720,360,205],[300,180,360,205]]){
  const p=hudLayoutPosition(hudLayout(),w,h,bw,bh);
  assert.ok(p.left>=8&&p.top>=8);assert.ok(p.left+bw*p.scale<=w-8+1e-8);assert.ok(p.top+bh*p.scale<=h-8+1e-8);
 }
});
test('dragging cannot park meters outside the viewport',()=>{const p=hudLayoutPosition({x:1,y:1,scale:1.4},1000,700);assert.ok(p.left+360*p.scale<=992);assert.ok(p.top+142*p.scale<=692);});
