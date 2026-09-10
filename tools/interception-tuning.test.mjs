import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attackFields,setAttackOverride,applyAttackOverrides,validateAttackOverrides} from '../src/data/attack-tuning.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';
import {runSlot,clearSlotFx} from '../src/engine/abilities.js';
import {Fighter} from '../src/engine/entity.js';
import {Projectiles} from '../src/engine/projectiles.js';

for(const type of ['projectile','charge','volley'])test(`${type}: priority survives portable presentation and preserves genuine source`,()=>{
  const def={...ROSTER[0],id:'interception-fixture',abilities:{lmb:{type}}};
  assert.equal(attackFields(def,'lmb',{}).find(f=>f.key==='collisionPriority')?.value,-1);
  const overrides=setAttackOverride({},def,'lmb',{collisionPriority:2});
  const actual=applyAttackOverrides(def,validateAttackOverrides(JSON.parse(JSON.stringify(overrides)),def));
  const restored=applyProfile(def,validateProfile(JSON.parse(JSON.stringify(profileFromDef(actual))),def));
  assert.equal(restored.abilities.lmb.collisionPriority,2);
  assert.equal(def.abilities.lmb.collisionPriority,undefined);
  const off=applyAttackOverrides(def,setAttackOverride(overrides,def,'lmb',{collisionPriority:-1}));
  assert.equal(off.abilities.lmb.collisionPriority,undefined,'reset restores unmodified source');
});

test('priority validation distinguishes off from active zero and rejects fractions and unrelated power types',()=>{
  const def={abilities:{lmb:{type:'projectile'}}};
  for(const value of [-1,0,1,16])assert.doesNotThrow(()=>setAttackOverride({},def,'lmb',{collisionPriority:value}));
  for(const value of [-2,-.5,.5,17,NaN,Infinity,true])assert.throws(()=>setAttackOverride({},def,'lmb',{collisionPriority:value}));
  for(const type of ['beam','buff'])assert.throws(()=>setAttackOverride({},{abilities:{lmb:{type}}},'lmb',{collisionPriority:2}));
});

function launch(type,priority){
  const noop=()=>{},def={type,cost:10,color:'#ffb534',collisionPriority:priority},st={def,cd:0};
  const c={def:{},team:1,alive:true,ki:100,maxKi:100,powerBuff:1,hitstop:0,staggerT:0,stunT:0,
    pos:new THREE.Vector3(0,80,0),vel:new THREE.Vector3(),aim:new THREE.Vector3(0,0,1),aim3:new THREE.Vector3(0,0,1),
    slots:{lmb:st},spendKi:Fighter.prototype.spendKi,muzzle:out=>out.set(0,85,3)};
  const g={scene:new THREE.Scene(),time:0,entities:[],particles:{spawn:noop,burst:noop},world:{cover:[],punch:noop,shake:noop},
    audio:{charge:()=>null,kiRelease:noop,zap:noop,blast:noop},
    vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,ring:noop,lightning:noop},
    muzzleFlash:noop,chargeGather:noop,onDrained:noop,onNoKi:noop};
  c._game=g;g.projectiles=new Projectiles(g);
  runSlot(c,'lmb',{pressed:true,held:true,released:false,dt:.5},g);
  if(type==='charge')runSlot(c,'lmb',{pressed:false,held:false,released:true,dt:1/60},g);
  const shots=[...g.projectiles.list];clearSlotFx(c);
  for(const shot of shots)shot._dispose(g);
  return shots;
}

for(const type of ['projectile','charge','volley'])test(`${type}: real shared input forwards authored priority to emitted shots`,()=>{
  for(const priority of [undefined,-1,0,2,16]){
    const shots=launch(type,priority);assert.equal(shots.length,1);
    assert.equal(shots[0].collisionPriority,priority===undefined?-1:priority);
  }
});
