import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

test('Studio simulated melee uses the same solid-body contact as gameplay',()=>{
 const scene=new Scene(),world={scene,camera:new PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')));
 try{
  f._openSky=true;scene.add(f.obj);combat.reset(f,true,'melee');
  combat.target.pos.copy(f.pos);combat.target._sync();
  combat.step(.1,1/60);
  assert.ok(f.pos.distanceTo(combat.target.pos)>1,'Editor must not leave coincident bodies that gameplay separates');
 }finally{combat.dispose();f.dispose();}
});
