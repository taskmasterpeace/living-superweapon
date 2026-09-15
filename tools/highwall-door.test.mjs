import test from 'node:test';
import assert from 'node:assert/strict';
import {HighwallDoor} from '../src/engine/highwall-door.js';
const box={x:0,z:0,hx:10,hz:2,bottom:0,top:30};
test('moving leaf and same collider publish matching bounds throughout the lift',()=>{
 const frames=[];const door=new HighwallDoor({box,onProgress:(fraction,target,collider)=>frames.push({fraction,bottom:collider.bottom})});const collider=door.collider;
 assert.equal(door.request(true),true);
 for(let i=0;i<45;i++){door.tick(1/60);assert.equal(door.collider,collider);assert.ok(Math.abs(door.leaf.position.y-15-door.collider.bottom)<1e-9);assert.ok(Math.abs(door.leaf.position.y+15-door.collider.top)<1e-9);}
 assert.equal(door.fraction,1);assert.equal(door.collider.bottom,32);assert.ok(frames.some(f=>f.fraction>0&&f.fraction<1));door.dispose();
});
test('closing gate rejects occupied threshold, then reverses on a new entrant without collision',()=>{
 const actors=[];const door=new HighwallDoor({box,open:true,actors:()=>actors});actors.push({alive:true,pos:{x:0,y:0,z:0}});assert.equal(door.request(false),false);
 actors.length=0;assert.equal(door.request(false),true);door.tick(.1);actors.push({alive:true,pos:{x:0,y:11,z:0}});
 const prior=door.collider.bottom;door.tick(.1);assert.equal(door.collider.bottom,prior);assert.equal(door.targetOpen,true);door.dispose();
});
test('rising gate waits for overhead actor rather than lifting through it',()=>{
 const door=new HighwallDoor({box,actors:()=>[{alive:true,pos:{x:0,y:31,z:0}}]});door.request(true);door.tick(.1);assert.equal(door.fraction,0);door.dispose();
});
