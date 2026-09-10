import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';

// Actual production projectile/beam objects. The world services record their
// damage/effect requests without needing a GPU or mutating a live game session.
function fixture(){
  const damage=[],explosions=[],returned=[];
  const g={scene:new THREE.Scene(),entities:[],world:{cover:[],shake(){},punch(){}},
    audio:{boom(){}},vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:l=>returned.push(l),
      explode:(pos,options)=>explosions.push({pos:pos.clone(),options})},
    areaDamage:(...args)=>damage.push(args)};
  const caster={team:1,alive:true,powerBuff:1,pos:new THREE.Vector3(0,80,0),aim3:new THREE.Vector3(0,0,1),muzzle:out=>out.set(0,85,3)};
  const manager=new Projectiles(g);g.projectiles=manager;
  return {g,caster,manager,damage,explosions,returned};
}
test('a remotely detonated projectile uses its real position and current owner once',()=>{
  const f=fixture(),at=new THREE.Vector3(9,86,42);
  const shot=f.manager.spawnProjectile(f.caster,{pos:at,vel:new THREE.Vector3(0,0,60),damage:40,blast:12,power:1});
  try{
    assert.equal(typeof shot.detonate,'function','production projectile needs a detonation entry point');
    const owner={...f.caster,team:2};shot.caster=owner;shot.team=2;
    shot.detonate(f.g);shot.detonate(f.g);
    assert.equal(f.damage.length,1);assert.equal(f.damage[0][0],owner);
    assert.deepEqual(f.damage[0][1].toArray(),at.toArray());
    assert.equal(f.damage[0][2],12);assert.equal(f.damage[0][3],32);
    assert.equal(f.explosions.length,1);assert.equal(f.returned.length,1);assert.equal(shot.dead,true);
    assert.equal(f.g.scene.children.includes(shot.obj),false);
  }finally{shot._dispose(f.g);}
});
test('remote beam explosion follows the traveling tip, not caster aim or origin',()=>{
  const f=fixture(),beam=f.manager.spawnBeam(f.caster,{detonateRadius:18,detonateDamage:75});
  try{
    assert.equal(typeof beam.detonate,'function','production beam needs a tip detonation entry point');
    beam.pn=3;beam.path.set([0,85,3,8,92,15,16,99,32]);
    f.caster.aim3.set(-1,0,0);
    beam.detonate(f.g);beam.detonate(f.g);
    assert.equal(f.damage.length,1);assert.deepEqual(f.damage[0][1].toArray(),[16,99,32]);
    assert.equal(f.damage[0][0],f.caster);assert.equal(f.damage[0][2],18);assert.equal(f.damage[0][3],75);
    assert.equal(beam.sustaining,false);assert.equal(beam.dead,true);assert.equal(f.returned.length,1);
    assert.equal(f.g.scene.children.includes(beam.grp),false);
  }finally{beam._dispose(f.g);}
});
test('externally retired projectiles are pruned before their next simulation step',()=>{
  const f=fixture(),shot=f.manager.spawnProjectile(f.caster,{pos:new THREE.Vector3(0,85,8),vel:new THREE.Vector3(0,0,60)});
  shot._dispose(f.g);
  shot.update=()=>assert.fail('disposed projectile must never run again');
  f.manager.update(1/60,f.g);
  assert.equal(f.manager.list.length,0);assert.equal(f.returned.length,1);
});
