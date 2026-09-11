import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TYPES,clearSlotFx} from '../src/engine/abilities.js';
import {Fighter} from '../src/engine/entity.js';

for(const type of ['beam','charge','growingorb','facebomb','nova'])test(`${type} charge sound follows the caster's live position`,()=>{
 const def={type,cost:20,charge:true,cd:.8,maxCharge:2,kiPerSec:12,color:'#ffbb40'},st={def,cd:0},positions=[];
 const c={def:{},pos:new THREE.Vector3(20,140,-30),vel:new THREE.Vector3(),aim3:new THREE.Vector3(0,0,1),ki:100,maxKi:100,hitstop:0,staggerT:0,stunT:0,slots:{lmb:st},spendKi:Fighter.prototype.spendKi,muzzle:out=>out.copy(c.pos).add(new THREE.Vector3(0,5,0))};
 const g={scene:new THREE.Scene(),audio:{charge:p=>{positions.push(p);return {ramp(){},stop(){}};}},world:{shake(){}},chargeGather(){},projectiles:{spawnGrowingOrb:()=>({charge01:.1,dead:false,end(){},dispose(){}})}};c._game=g;
 try{TYPES[type](c,def,st,g,{pressed:true,held:true,released:false,dt:1/60});
  assert.equal(positions.length,1);assert.equal(positions[0],c.pos,'retain the live position reference, not a fixed snapshot or no position');
  c.pos.y=220;assert.equal(positions[0].y,220);
 }finally{clearSlotFx(c);}
});
