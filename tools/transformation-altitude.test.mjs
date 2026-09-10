import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';
import {Fighter} from '../src/engine/entity.js';

function fixture(level,height,infinite=false){
  const effects=[],particles=[],noop=()=>{};
  const f={name:'Ascender',level,xpNext:100,levelMult:1,powerBuff:1,buffT:0,maxHp:100,hp:60,maxKi:100,
    tier:level>=4?2:1,energyInfinite:infinite,pos:new THREE.Vector3(12,height,18),def:{colors:{accent:'#ffbe43'}}};
  f.gait=height>0?'airborne':'grounded';Object.defineProperty(f,'airborne',Object.getOwnPropertyDescriptor(Fighter.prototype,'airborne'));
  const record=kind=>(pos,opt)=>effects.push({kind,pos:pos.clone(),opt});
  const g={vfx:{explode:record('explode'),shockwave:record('shockwave'),lightning:record('lightning'),ring:record('ring')},
    particles:{spawn:p=>particles.push({...p})},world:{punch:noop,shake:noop},audio:{power:noop,boom:noop},
    heroYell:noop,slowmo:noop,isHuman:()=>false};
  return {f,g,effects,particles};
}

for(const level of [1,3])test(`level ${level+1} airborne ceremony stays with the ascending fighter`,()=>{
  const {f,g,effects,particles}=fixture(level,140);Game.prototype.levelUp.call(g,f);
  assert.ok(effects.length>0);
  assert.ok(effects.every(e=>e.pos.y>=140&&e.pos.y<=146),'no effect may be anchored to world-ground height');
  assert.ok(effects.every(e=>e.kind!=='shockwave'),'a flying ascension must not fabricate a ground shockwave');
  assert.ok(effects.every(e=>e.opt.y===undefined||e.opt.y>=140),'ring override must not pull the effect back to ground');
  assert.ok(particles.every(p=>p.y>=140&&p.y<=146));
  assert.equal(f.hp,86.75);assert.equal(f.maxHp,107);assert.equal(f.maxKi,104);
});

test('ground tier ceremony retains its ground pressure wave',()=>{
  const {f,g,effects}=fixture(3,0);Game.prototype.levelUp.call(g,f);
  assert.equal(effects.filter(e=>e.kind==='shockwave').length,1);
  assert.equal(effects.find(e=>e.kind==='shockwave').pos.y,.2);
});

test('low hovering fighter keeps the tier ceremony in the air',()=>{
  const {f,g,effects}=fixture(3,5);f.flying=true;Game.prototype.levelUp.call(g,f);
  assert.ok(effects.every(e=>e.kind!=='shockwave'));
  assert.ok(effects.every(e=>e.pos.y>=5));
  assert.equal(effects.find(e=>e.kind==='explode').opt.energyShell,true);
});

for(const [gait,height,flying,wantAir] of [['airborne',3,false,true],['grounded',0,true,false]])
test(`ceremony respects ${gait} ownership at y${height}, flying flag ${flying}`,()=>{
  const {f,g,effects}=fixture(3,height);f.gait=gait;f.flying=flying;Game.prototype.levelUp.call(g,f);
  assert.equal(effects.some(e=>e.kind==='shockwave'),!wantAir);
  assert.equal(effects.find(e=>e.kind==='explode').opt.energyShell,wantAir);
});

for(const level of [1,3])test(`level ${level+1} rooftop ceremony stays on the standing surface`,()=>{
  const {f,g,effects}=fixture(level,140);f.gait='grounded';Game.prototype.levelUp.call(g,f);
  assert.ok(effects.every(e=>e.pos.y>=140));assert.ok(effects.every(e=>e.opt.y===undefined||e.opt.y>=140));
  assert.equal(effects.find(e=>e.kind==='explode').opt.energyShell,false);
  assert.ok(effects.some(e=>e.kind==='ring'&&e.pos.y<141));
});

test('quiet leveling and infinite-core tier cap remain unchanged',()=>{
  const {f,g,effects,particles}=fixture(6,220,true);Game.prototype.levelUp.call(g,f,true);
  assert.equal(f.level,7);assert.equal(f.tier,2);assert.equal(effects.length,0);assert.equal(particles.length,0);
});
