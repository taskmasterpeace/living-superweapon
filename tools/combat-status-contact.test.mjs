import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {DTYPES} from '../src/data/damage-types.js';

for(const dtype of DTYPES)test(`${dtype} deals typed damage and honors immunity at the receiver`,()=>{
 const f=mainCombatFixture();try{
  const target=f.foe({z:12});target.resist={};target.armor=0;target.hp=target.maxHp=10000;
  const hp=target.hp;target.takeDamage(10,{src:f.p,dtype});assert.ok(target.hp<hp);
  target.resist[dtype]=0;const after=target.hp;
  target.takeDamage(10,{src:f.p,dtype});assert.equal(target.hp,after);
 }finally{f.close();}
});

function contact(payload,{guard=false,immune=false,shock=0}={}){
 const f=mainCombatFixture();
 const target=f.foe({z:12});target.hp=target.maxHp=10000;target.armor=0;target.resist={};target.faceDir(0,-1);
 target._openSky=true;
 target.guarding=guard;target.guardMeter=1;target.ki=target.maxKi;
 if(immune)target.resist.energy=0;
 f.g.vfx.impactStar=()=>{};f.g.vfx.impact=()=>{};f.g.vfx.explode=()=>{};
 const shot=f.g.projectiles.spawnProjectile(f.p,{pos:new Vector3(0,5,3),vel:new Vector3(0,0,120),damage:5,blast:0,payload,shockDuration:shock,color:'#ffe9b0'});
 for(let i=0;i<15&&!shot.dead;i++)shot.update(1/60,f.g);
 return {...f,target,shot};
}
for(const [payload,check] of [['sleep',t=>t.sleepT>0],['flame',t=>t._dots.some(d=>d.kind==='burn')],['poison',t=>t._dots.some(d=>d.kind==='poison')],['acid',t=>t._dots.some(d=>d.kind==='acid')],['teargas',t=>t.blindT>0]]){
 test(`${payload} projectile applies its condition through live contact`,()=>{const f=contact(payload);try{assert.ok(f.shot.dead);assert.ok(check(f.target));}finally{f.close();}});
 test(`${payload} payload cannot bypass full immunity`,()=>{const f=contact(payload,{immune:true});try{assert.equal(check(f.target),false);}finally{f.close();}});
}
test('electric projectile applies shock through contact and guard can stop it',()=>{
 for(const guard of [false,true]){const f=contact(null,{shock:1.1,guard});try{assert.equal(f.target.shockT>0,!guard);}finally{f.close();}}
});
