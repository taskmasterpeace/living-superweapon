import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {Game} from '../src/engine/game.js';
import {World} from '../src/engine/world.js';

function fixture(velocity=new THREE.Vector3(0,0,60)){
  const hits=[],returned=[],explosions=[],noop=()=>{};
  const game={scene:new THREE.Scene(),entities:[],world:{cover:[],shake:noop,punch:noop},
    audio:{boom:noop},particles:{burst:noop,spawn:noop},overlapFoe:()=>null,
    vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:l=>returned.push(l),flash:noop,ring:noop,
      explode:(...args)=>explosions.push(args)},areaDamage:(...args)=>hits.push(args)};
  const caster={team:1,alive:true,powerBuff:1,pos:new THREE.Vector3(0,80,0),aim3:new THREE.Vector3(0,0,1)};
  const manager=game.projectiles=new Projectiles(game);
  const parent=manager.spawnProjectile(caster,{pos:new THREE.Vector3(8,95,40),vel:velocity,radius:2,damage:40,blast:16,
    color:'#ffb64a',color2:'#fff4dc',dtype:'energy',splitCount:4,splitSpread:.55,splitSpeed:90,splitHoming:3});
  return {game,manager,parent,caster,hits,returned,explosions,close(){for(const p of manager.list)p._dispose(game);}};
}

test('second press replaces the parent with four owned homing children at its actual position, exactly once',()=>{
  const f=fixture();try{
    const owner={...f.caster,team:2};f.parent.caster=owner;f.parent.team=2;
    f.parent.detonate(f.game);f.parent.detonate(f.game);
    const children=f.manager.list.filter(p=>!p.dead);
    assert.equal(children.length,4);assert.equal(f.parent.dead,true);assert.equal(f.returned.length,1);
    assert.equal(f.explosions.length,0,'split does not also explode its parent');assert.equal(f.hits.length,0);
    for(const child of children){
      assert.equal(child.caster,owner);assert.equal(child.team,2);assert.equal(child.homing,3);
      assert.deepEqual(child.pos.toArray(),[8,95,40]);assert.ok(Math.abs(child.vel.length()-90)<1e-9);
      assert.equal(child.damage,10);assert.equal(child.dtype,'energy');assert.equal(child.color,'#ffb64a');
      assert.equal(child.splitCount,0,'children cannot recursively split');
    }
  }finally{f.close();}
});

for(const travel of [[0,60,0],[0,-60,0],[60,0,0],[0,0,0]])test(`split cone has stable symmetric directions for travel ${travel}`,()=>{
  const f=fixture(new THREE.Vector3(...travel));try{
    f.parent.detonate(f.game);const children=f.manager.list.filter(p=>!p.dead);
    assert.equal(children.length,4);
    const forward=new THREE.Vector3(...travel);if(!forward.lengthSq())forward.copy(f.caster.aim3);forward.normalize();
    const sum=new THREE.Vector3();
    for(const child of children){sum.add(child.vel);assert.ok(child.vel.toArray().every(Number.isFinite));assert.ok(child.vel.dot(forward)>0);}
    assert.ok(sum.clone().cross(forward).length()<1e-8,'lateral emissions balance');
  }finally{f.close();}
});

test('ordinary parent impact still explodes and does not create children',()=>{
  const f=fixture();try{
    f.parent._impact(f.game,false);
    assert.equal(f.manager.list.filter(p=>!p.dead).length,0);assert.equal(f.hits.length,1);assert.equal(f.explosions.length,1);
    assert.equal(f.explosions[0][1].energyShell,false,'ordinary impacts retain their existing presentation');
  }finally{f.close();}
});

test('overlapping split impacts use readable energy shells without changing their damage or blast',()=>{
  const f=fixture();try{
    f.parent.detonate(f.game);
    const children=f.manager.list.filter(p=>!p.dead);
    for(const child of children)child._impact(f.game,false);
    assert.equal(f.explosions.length,4);assert.equal(f.hits.length,4);
    for(const [,visual] of f.explosions){
      assert.equal(visual.energyShell,true,'four impact centers must not become four filled opaque disks');
      assert.equal(visual.radius,8);assert.equal(visual.scorch,false);
    }
    assert.equal(f.returned.length,5,'parent and child lights returned once');
  }finally{f.close();}
});

test('children travel and home using ordinary production physics while retaining authored speed cap',()=>{
  const f=fixture();try{
    f.parent.splitSpeed=160;f.parent.detonate(f.game);
    f.game.nearestFoe=()=>({pos:new THREE.Vector3(40,90,90)});
    const children=f.manager.list.filter(p=>!p.dead),initial=children.map(p=>p.vel.clone());
    f.manager.update(1/60,f.game);
    assert.equal(f.manager.list.length,4,'dead parent pruned while live children advance');
    for(const [i,child] of children.entries()){
      assert.ok(child.pos.distanceTo(new THREE.Vector3(8,95,40))>0);
      assert.ok(child.vel.distanceTo(initial[i])>0,'real homing steers');assert.ok(child.vel.length()>90);
      assert.ok(child.vel.length()<=160.000001,'authored cap is not hardcoded to the legacy90');
    }
  }finally{f.close();}
});

test('split payload divides charge-grown damage and does not multiply blast talents twice',()=>{
  const f=fixture();try{
    f.parent.caster.sheet={blastMult:2};f.parent.blast=32;f.parent.damage=120;f.parent.radius=6;
    f.parent.detonate(f.game);const children=f.manager.list.filter(p=>!p.dead);
    assert.equal(children.reduce((n,p)=>n+p.damage,0),120);
    for(const child of children){assert.equal(child.blast,16);assert.ok(Math.abs(child.radius-6/Math.cbrt(4))<1e-9);}
    for(const child of children)child._dispose(f.game);
    f.manager.update(1/60,f.game);assert.equal(f.manager.list.length,0);assert.equal(f.returned.length,5);
  }finally{f.close();}
});

for(const hz of [30,60,120])for(const speed of [90,2000])test(`split children converge before expiry at ${hz} Hz and ${speed}u/s without tunneling`,()=>{
  const f=fixture();try{
    let contacts=0;
    f.game.entities=[{pos:new THREE.Vector3(8,90,80),team:2,alive:true,radius:2,def:{},takeDamage:()=>contacts++}];
    f.game.isFoe=(a,b)=>b.alive&&a.team!==b.team;
    f.game.nearestFoe=Game.prototype.nearestFoe;f.game.overlapFoe=Game.prototype.overlapFoe;
    f.parent.splitSpeed=speed;f.parent.detonate(f.game);
    for(let i=0;i<hz*4;i++)f.manager.update(1/hz,f.game);
    assert.equal(contacts,4,'all four guided children must actually land, not only circle until timeout');
    assert.equal(f.manager.list.length,0);
  }finally{f.close();}
});

test('zero authored child homing leaves travel direction unchanged',()=>{
  const f=fixture();try{
    f.parent.splitHoming=0;f.parent.detonate(f.game);
    f.game.nearestFoe=()=>assert.fail('unguided children do not acquire targets');
    const children=f.manager.list.filter(p=>!p.dead),velocities=children.map(p=>p.vel.toArray());
    for(let i=0;i<30;i++)f.manager.update(1/60,f.game);
    assert.deepEqual(children.map(p=>p.vel.toArray()),velocities);
  }finally{f.close();}
});

for(const kind of ['interior','cover'])test(`tiny fast children sweep ${kind} obstacles instead of stepping through them`,()=>{
  const f=fixture();try{
    f.parent.pos.set(0,95,0);f.parent.radius=.1;f.parent.splitSpeed=2000;f.parent.splitSpread=0;f.parent.splitHoming=0;
    if(kind==='interior'){
      f.game.world.interiors=[{x:0,z:3,hx:10,hz:.5,top:100,walls:[{x:0,z:3,hx:10,hz:.5}]}];
      f.game.world.hitInteriorWall=World.prototype.hitInteriorWall;
    }else f.game.world.cover=[{x:0,z:3,r:.1,h:100}];
    f.parent.detonate(f.game);f.manager.update(1/60,f.game);
    assert.equal(f.manager.list.length,0,'no child may cross a solid obstacle alive');
    assert.equal(f.explosions.length,4);
    for(const [pos] of f.explosions){assert.ok(pos.z<3);assert.equal(pos.y,95,'airborne wall impact stays at contact height');}
  }finally{f.close();}
});
