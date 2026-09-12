import {TimeFields} from '../src/engine/systems.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {beamPathsTouch} from '../src/engine/beam-contact.js';
import {World} from '../src/engine/world.js';

function fixture(){
  const noop=()=>{},effects=[],worldHits=[],damage=[],flares=[],groundRings=[];
  const game={scene:new THREE.Scene(),time:0,entities:[],world:{cover:[],shake:noop,punch:noop,setBlockCracks:noop},
    audio:{boom:noop},particles:{spawn:noop,burst:(x,y,z)=>flares.push([x,y,z])},slowmo:noop,
    vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,lightning:noop,
      explode:(pos)=>effects.push(pos.clone()),shockwave:(pos)=>groundRings.push(pos.clone()),impact:noop},
    worldImpact:(...args)=>worldHits.push(args)};
  const caster=(team,z,dir)=>({team,alive:true,ki:100,maxKi:100,powerBuff:1,pos:new THREE.Vector3(0,80,z),
    aim3:new THREE.Vector3(0,0,dir),vel:new THREE.Vector3(),spendKi(n){this.ki-=n;return true;},
    muzzle(out){return out.copy(this.pos).add(new THREE.Vector3(0,5,0));},takeDamage:(...args)=>damage.push(args)});
  const manager=new Projectiles(game),a=manager.spawnBeam(caster(1,0,1),{radius:1,maxLen:100}),b=manager.spawnBeam(caster(2,80,-1),{radius:1,maxLen:100});
  game.projectiles=manager;
  const path=(beam,points)=>{beam.pn=points.length/3;beam.path.set(points);};
  return {game,manager,a,b,path,effects,worldHits,damage,flares,groundRings,close:()=>{a._dispose(game);b._dispose(game);}};
}

for(const hz of [30,60,120])test('field owner wins clock advantage in a funded clash at '+hz+'Hz',()=>{const f=fixture();try{f.game.audio.zap=()=>{};f.game.timeFields=new TimeFields(f.game);f.game.timeFields.add(f.a.caster.pos,112,5,.4,f.a.caster,{follow:true});f.path(f.a,[0,85,0,0,85,40]);f.path(f.b,[0,85,80,0,85,40]);f.manager._beamClash(1/hz,f.game);assert.ok(f.a.clashing&&f.b.clashing);assert.ok(f.a._clashT>.5);assert.ok(Math.abs(100-f.a.caster.ki-8/hz)<1e-6);assert.ok(Math.abs(100-f.b.caster.ki-3.2/hz)<1e-6);f.game.timeFields.clear();}finally{f.close();}});
