import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {figure} from '../src/engine/figure.js';
import {ROSTER} from '../src/data/characters.js';
import {HUD} from '../src/engine/hud.js';
import {SpaceFlight} from '../src/engine/spaceflight.js';

for(const owner of ['portrait','spaceflight'])for(const variant of [0,1])
test(`${owner} releases both cached hand shapes when shape ${variant} is active`,()=>{
 const p=figure(ROSTER.find(d=>d.id==='kano')),hand=p.armR.children[2],pair=hand.geometry.palmVariants,counts=[0,0];
 hand.geometry=pair[variant];pair.forEach((g,i)=>g.addEventListener('dispose',()=>counts[i]++));
 if(owner==='portrait')HUD.prototype._selDispose(p.g);
 else{
  const prior=globalThis.window;globalThis.window={removeEventListener(){}};
  try{
   const flight=new SpaceFlight({world:{},running:false});flight.scene=new T.Scene();flight.scene.add(p.g);flight._mats=[];
   flight.finish(false);flight.finish(false);
  }finally{if(prior===undefined)delete globalThis.window;else globalThis.window=prior;}
 }
 assert.deepEqual(counts,[1,1],'the inactive shape is part of the same owned figure');
});
