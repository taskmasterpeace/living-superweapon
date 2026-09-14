import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createDec52Actor} from '../src/engine/dec52-actor.js';import {metersToUnits} from '../src/core/world-units.js';
globalThis.ProgressEvent??=class{};
const loader={async loadAsync(url){const b=await fs.readFile('public'+url);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}};
for(const family of ['rat','hound'])test(`real ${family} adapter owns rendering only and plays accepted actions`,async()=>{
 const scene=new T.Scene(),c=await createDec52Actor({family,scene,loader}),s={pos:new T.Vector3(4,7,-8),vel:new T.Vector3(0,0,metersToUnits(5)),yaw:.5,alive:true};
 assert.equal(c.root.parent,scene);assert.equal(c.actor.scale.x,1);assert.equal(c.sync(s,.1).action,'run');assert.deepEqual(c.root.position,s.pos);assert.equal(c.root.rotation.y,.5);
 s.vel.z=metersToUnits(2);assert.equal(c.sync(s,.1).action,'walk');s.vel.z=0;assert.equal(c.sync(s,.1).action,'idle');
 c.acceptAction({type:'bite',token:1});let p=c.sync(s,.1);assert.equal(p.action,'bite');const time=p.time;c.acceptAction({type:'bite',token:1});p=c.sync(s,.1);assert.ok(p.time>time,'repeated input token does not restart');
 const paused=p.time;s.hitstop=true;assert.equal(c.sync(s,.2).time,paused);s.hitstop=false;for(let i=0;i<10;i++)c.sync(s,.1);assert.equal(c.sync(s,.1).action,'idle');
 assert.deepEqual(s.pos,new T.Vector3(4,7,-8));c.acceptAction({type:'hit',token:2});assert.equal(c.sync(s,.05).action,'hit');s.alive=false;assert.equal(c.sync(s,.1).action,'shutdown');
 let freed=0;c.actor.traverse(o=>o.geometry?.addEventListener('dispose',()=>freed++));c.dispose();c.dispose();assert.equal(c.root.parent,null);assert.ok(freed>0);assert.equal(c.sync(s,.1),null);
});
