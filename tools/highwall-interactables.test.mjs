import test from 'node:test';
import assert from 'node:assert/strict';
import {doorOccupied,HighwallInteractables,canOperateHighwallDevice,HIGHWALL_MEDIA} from '../src/engine/highwall-interactables.js';
const door={x:0,z:0,hx:10,hz:2,bottom:0,top:30};
const actor=(x=0,z=10,extra={})=>({alive:true,pos:{x,y:0,z},def:{family:'soldier'},...extra});
test('occupied gate rejects closing across actor including radius; overhead actor does not block',()=>{
 assert.equal(doorOccupied(door,[actor(12,0)]),true);
 assert.equal(doorOccupied(door,[actor(0,0,{pos:{x:0,y:32,z:0}})]),false);
 assert.equal(doorOccupied(door,[actor(0,0,{alive:false})]),false);
});
test('door rejects occupied close without publishing geometry; valid close publishes once',()=>{
 let calls=0;const it=Object.assign(Object.create(HighwallInteractables.prototype),{door,doorOpen:true,g:{entities:[actor(0,0)]},onDoorChange:()=>{calls++;},message(){}});
 assert.equal(it.toggleDoor(actor()),false);assert.equal(calls,0);assert.equal(it.doorOpen,true);
 it.g.entities=[];assert.equal(it.toggleDoor(actor()),true);assert.equal(calls,1);assert.equal(it.doorOpen,false);
});
test('unsupported zombies cannot open gates; soldiers share callback and callback failure retains state',()=>{
 let calls=0;const it=Object.assign(Object.create(HighwallInteractables.prototype),{door,doorOpen:false,g:{entities:[]},onDoorChange:()=>{calls++;return false;},message(){}});
 assert.equal(it.toggleDoor(actor(0,10,{ai:{},def:{family:'zombie'}}),{open:true}),false);assert.equal(calls,0);
 assert.equal(it.toggleDoor(actor(0,10,{ai:{}}),{open:true}),false);assert.equal(calls,1);assert.equal(it.doorOpen,false);
});
test('stunned, carried and dead bodies cannot operate devices',()=>{
 for(const patch of [{alive:false},{stunT:2},{sleepT:1},{launchT:1},{_fleetVehicle:{}},{frozenT:2},{grabbedBy:{}},{_carry:{}},{staggerT:1}])assert.equal(canOperateHighwallDevice(actor(0,0,patch)),false);
 assert.equal(canOperateHighwallDevice(actor()),true);
});
test('media definitions distinguish prerecorded archive from bounded lure',()=>{
 assert.equal(HIGHWALL_MEDIA.find(m=>m.kind==='mp4').lure,false);
 assert.equal(HIGHWALL_MEDIA.filter(m=>m.lure).length,1);
 assert.ok(HIGHWALL_MEDIA.every(m=>m.url.startsWith('/')&&m.source));
});
