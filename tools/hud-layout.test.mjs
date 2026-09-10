import test from 'node:test';
import assert from 'node:assert/strict';
import {hudLayout,hudLayoutPosition} from '../src/engine/hud-layout.js';
test('layout rejects unsafe persisted values',()=>{assert.deepEqual(hudLayout({scale:Infinity,x:-2,y:5}),{scale:1,x:0,y:1});assert.equal(hudLayout({scale:9}).scale,1.4);assert.equal(hudLayout({scale:0}).scale,.6);});
test('dragging cannot park meters outside the viewport',()=>{const p=hudLayoutPosition({x:1,y:1,scale:1.4},1000,700);assert.ok(p.left+360*p.scale<=992);assert.ok(p.top+142*p.scale<=692);});
