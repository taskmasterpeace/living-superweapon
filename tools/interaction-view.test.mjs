import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine/game.js';
test('shoulder-view interaction uses viewing direction even when weapon convergence points backward',()=>{
 const player={alive:true,pos:{x:0,y:0,z:0},aim:{x:0,z:1}},front={pos:{x:0,z:-6},r:10,priority:1,enabled:()=>true};
 const g={player,modeId:'powerworld',ms:{chaseCam:true},running:true,world:{_lookActive:true,_lookYaw:Math.PI},interactables:[front]};
 Game.prototype.updateInteractFocus.call(g,.1);assert.equal(g._focus,front);
 g._ifT=0;g.world._lookYaw=0;Game.prototype.updateInteractFocus.call(g,.1);assert.equal(g._focus,null);
 g._ifT=0;g.world._lookYaw=Math.PI;front.enabled=()=>false;Game.prototype.updateInteractFocus.call(g,.1);assert.equal(g._focus,null);
});
