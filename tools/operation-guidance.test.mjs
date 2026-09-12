import test from 'node:test';
import assert from 'node:assert/strict';
import {operationGuidance} from '../src/engine/operation-guidance.js';
test('guidance follows mission ownership and camera direction',()=>{
 const p={pos:{x:0,z:0}},o={g:{player:p,world:{_lookYaw:0}},scientist:{pos:{x:0,z:100}},vehicle:{mesh:{position:{x:100,z:0}}},destination:{x:0,z:-100},state:'waiting'};
 assert.equal(operationGuidance(o),'Scientist · 100u · ahead');
 o.state='boarding';o.scientistLeader=p;assert.equal(operationGuidance(o),'Convoy · 100u · right');
 o.state='disabled';o.cargoOwner=p;assert.equal(operationGuidance(o),'Extraction · 100u · behind');
 o.g.world._lookYaw=Math.PI;assert.equal(operationGuidance(o),'Extraction · 100u · ahead');
});
