import test from 'node:test';
import assert from 'node:assert/strict';
import {attackFields,setAttackOverride,applyAttackOverrides,validateAttackOverrides} from '../src/data/attack-tuning.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';

for(const type of ['projectile','charge'])test(`${type}: split controls persist with source identity and reach the real ability`,()=>{
  const def={...ROSTER[0],id:'split-fixture',name:'Split fixture',abilities:{lmb:{type}}};
  const fields=attackFields(def,'lmb',{});
  assert.equal(fields.find(f=>f.key==='splitCount').value,0);
  let attacks={};for(const [key,value] of Object.entries({remoteDetonate:true,splitCount:4,splitSpread:.6,splitSpeed:140,splitHoming:4}))
    attacks=setAttackOverride(attacks,def,'lmb',{[key]:value});
  const actual=applyAttackOverrides(def,validateAttackOverrides(JSON.parse(JSON.stringify(attacks)),def));
  assert.equal(actual.abilities.lmb.splitCount,4);assert.equal(actual.abilities.lmb.splitSpeed,140);
  assert.equal(def.abilities.lmb.splitCount,undefined,'catalog basis stays untouched');
  const profile=profileFromDef(actual);const loaded=validateProfile(JSON.parse(JSON.stringify(profile)),def);
  assert.equal(applyProfile(def,loaded).abilities.lmb.splitHoming,4);
});

test('split validation rejects fractional, one-child, excessive and out-of-range configurations',()=>{
  const def={abilities:{lmb:{type:'projectile'}}};
  for(const value of [-1,1,2.5,9,NaN,Infinity])assert.throws(()=>setAttackOverride({},def,'lmb',{splitCount:value}));
  for(const [key,value] of [['splitSpread',-1],['splitSpread',1.5],['splitSpeed',19],['splitSpeed',2001],['splitHoming',-1]])
    assert.throws(()=>setAttackOverride({},def,'lmb',{[key]:value}));
  for(const value of [0,2,4,8])assert.doesNotThrow(()=>setAttackOverride({},def,'lmb',{splitCount:value}));
  for(const type of ['beam','volley'])assert.throws(()=>setAttackOverride({},{abilities:{lmb:{type}}},'lmb',{splitCount:4}));
});
