import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {PracticeProps} from '../src/engine/practice-props.js';import {PowerWorldStage} from '../src/engine/powerworld.js';
test('practice rocks restore their own native records without duplication or shared-resource disposal',()=>{
 const unrelated={dead:true},world={rocks:[unrelated],heightAt:()=>25},game={world,entities:[],_flung:[]};
 const stage=Object.assign(Object.create(PowerWorldStage.prototype),{g:game,group:new THREE.Group(),_geos:[],_mats:[]});
 const props=new PracticeProps(stage,new THREE.Vector3(100,25,100)),ref=props.entries[0].ref,start=ref.mesh.position.clone();
 try{
  assert.ok(start.y>25);ref.dead=true;ref.carried=true;ref.mesh.visible=false;ref.mesh.position.x=500;
  game.entities=[{_carry:{sourceRef:ref}}];assert.equal(props.reset(),false);
  game.entities=[];game._flung=[{sourceRef:ref,dead:true}];assert.equal(props.reset(),false,'intercepted prop still waits for disposal');game._flung=[];
  for(let i=0;i<20;i++)assert.ok(props.reset());assert.equal(world.rocks.length,3);assert.equal(ref.dead,false);assert.ok(ref.mesh.visible&&ref.mesh.position.equals(start));assert.equal(unrelated.dead,true);
  let disposed=false;ref.mesh.geometry.addEventListener('dispose',()=>disposed=true);props.dispose();assert.deepEqual(world.rocks,[unrelated]);assert.equal(disposed,false);
 }finally{props.dispose();stage._geos.forEach(g=>g.dispose());stage._mats.forEach(m=>m.dispose());}
});
