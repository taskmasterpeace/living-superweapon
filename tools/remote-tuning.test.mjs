import test from 'node:test';
import assert from 'node:assert/strict';
import {attackFields,setAttackOverride,applyAttackOverrides} from '../src/data/attack-tuning.js';

test('remote trigger is an explicit portable opt-in on supported single attacks only',()=>{
  for(const type of ['beam','projectile','charge']){
    const def={abilities:{lmb:{type}}};
    assert.equal(attackFields(def,'lmb').find(f=>f.key==='remoteDetonate')?.value,false);
    const overrides=setAttackOverride({},def,'lmb',{remoteDetonate:true});
    assert.equal(applyAttackOverrides(def,JSON.parse(JSON.stringify(overrides))).abilities.lmb.remoteDetonate,true);
    assert.throws(()=>setAttackOverride({},def,'lmb',{remoteDetonate:1}));
  }
  assert.throws(()=>setAttackOverride({},{abilities:{lmb:{type:'volley'}}},'lmb',{remoteDetonate:true}));
});

test('beam burst metadata follows real width/damage defaults until an explicit override is authored',()=>{
  const def={abilities:{lmb:{type:'beam',radius:2,dps:90}}};
  const values=(attacks={})=>Object.fromEntries(attackFields(def,'lmb',attacks).map(f=>[f.key,f.value]));
  assert.equal(values().detonateRadius,16);assert.equal(values().detonateDamage,72);
  let edits=setAttackOverride({},def,'lmb',{radius:3,dps:100});
  assert.equal(values(edits).detonateRadius,24);assert.equal(values(edits).detonateDamage,80);
  const fixed=setAttackOverride(edits,def,'lmb',{detonateRadius:16,detonateDamage:72});
  assert.equal(applyAttackOverrides(def,fixed).abilities.lmb.detonateRadius,16,'explicit original burst size must survive a width edit');
  assert.equal(applyAttackOverrides(def,fixed).abilities.lmb.detonateDamage,72,'explicit original damage must survive a DPS edit');
  edits=setAttackOverride(edits,def,'lmb',{detonateRadius:0,detonateDamage:0});
  assert.equal(values(edits).detonateRadius,0);assert.equal(values(edits).detonateDamage,0);
  assert.throws(()=>setAttackOverride({},def,'lmb',{detonateRadius:-1}));
  assert.throws(()=>setAttackOverride({},def,'lmb',{detonateDamage:Infinity}));
});
