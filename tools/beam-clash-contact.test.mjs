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

test('manager steering preserves the authoritative clash axis correction',()=>{
 const f=fixture(),dt=1/60;
 try{
  for(let i=0;i<45;i++)f.manager.update(dt,f.game);
  const offset=Math.PI/6;
  f.a.dir.set(Math.sin(offset),0,Math.cos(offset));f.b.dir.copy(f.a.dir).negate();
  f.a.caster.aim3.copy(f.a.dir);f.b.caster.aim3.copy(f.b.dir);
  f.manager.update(dt,f.game);
  assert.ok(f.a.clashing&&f.b.clashing);
  const expected=offset*(1-Math.exp(-f.a.steer*dt));
  assert.ok(Math.abs(f.a.dir.angleTo(new THREE.Vector3(0,0,1))-expected)<1e-6,'Pre-clash prediction state overwrote the clash axis');
 }finally{f.close();}
});

test('fresh traveling beams cannot clash or pay struggle energy before contact',()=>{
  const f=fixture();try{
    f.manager._beamClash(1/60,f.game);
    assert.equal(f.a.clashing,false);assert.equal(f.b.clashing,false);assert.equal(f.a.caster.ki,100);assert.equal(f.b.caster.ki,100);
  }finally{f.close();}
});

for(const kind of ['cover','interior'])test(`intervening ${kind} breaks a clash without extending its clipped stream through the wall`,()=>{
  const f=fixture();try{
    for(let i=0;i<60;i++){f.game.time+=1/60;f.manager.update(1/60,f.game);}
    assert.equal(f.a.clashing,true);
    if(kind==='cover')f.game.world.cover=[{x:0,z:20,r:4,h:100,hp:10000,maxHp:10000}];
    else {
      f.game.world.interiors=[{x:0,z:20,hx:10,hz:4,top:100,walls:[{x:0,z:20,hx:10,hz:4}]}];
      f.game.world.hitInteriorWall=World.prototype.hitInteriorWall;
    }
    for(let i=0;i<12;i++){
      f.game.time+=1/60;f.manager.update(1/60,f.game);
      assert.equal(f.a.blocked,true);assert.equal(f.a.clashing,false);
      assert.ok(f.a.tip.position.z<20,`beam reaches through wall to ${f.a.tip.position.z}`);
    }
  }finally{f.close();}
});

test('curved streams that pass on opposite sides do not clash merely because casters face each other',()=>{
  const f=fixture();try{
    f.path(f.a,[0,85,0,15,85,25,15,85,50]);f.path(f.b,[0,85,80,-15,85,55,-15,85,30]);
    f.manager._beamClash(1/60,f.game);assert.equal(f.a.clashing,false);
  }finally{f.close();}
});

test('real overlapping beam volumes start a struggle',()=>{
  const f=fixture();try{
    f.path(f.a,[0,85,0,0,85,40]);f.path(f.b,[0,85,80,0,85,40]);
    f.manager._beamClash(1/60,f.game);assert.equal(f.a.clashing,true);assert.equal(f.b.clashing,true);assert.ok(f.a.caster.ki<100);
  }finally{f.close();}
});

test('clash contact uses altitude and authored beam width, not XZ-only overlap',()=>{
  const f=fixture();try{
    f.path(f.a,[0,85,0,0,85,50]);f.path(f.b,[0,89,80,0,89,30]);
    f.manager._beamClash(1/60,f.game);assert.equal(f.a.clashing,false,'four-unit vertical separation misses thin streams');
    f.a.radius=3.1;f.manager._beamClash(1/60,f.game);assert.equal(f.a.clashing,true,'charge-grown volume can bridge that gap');
  }finally{f.close();}
});

test('an interrupted remote beam cannot pay an extra struggle tick before its update ends emission',()=>{
  const f=fixture();try{
    f.path(f.a,[0,85,0,0,85,40]);f.path(f.b,[0,85,80,0,85,40]);
    f.a.remoteDetonate=true;f.a.caster.frozenT=1;
    f.manager._beamClash(1/60,f.game);
    assert.equal(f.a.clashing,false);assert.equal(f.a.caster.ki,100);assert.equal(f.b.caster.ki,100);
  }finally{f.close();}
});

test('airborne struggle defeat stays at the loser altitude and attributes world impact to winner',()=>{
  const f=fixture();try{
    f.manager._overpower(f.b,f.a,f.game);
    assert.equal(f.effects[0].y,85);assert.equal(f.worldHits[0][0].y,85);assert.equal(f.worldHits[0][3],f.a.caster);
    assert.equal(f.damage.length,1);assert.equal(f.b.sustaining,false);
    assert.equal(f.groundRings.length,0,'an airborne defeat must not draw a ring on unrelated ground');
  }finally{f.close();}
});

test('curved first contact keeps the flare and both tips at the actual off-axis meeting point',()=>{
  const f=fixture();try{
    f.path(f.a,[0,85,0,12,85,40]);f.path(f.b,[0,85,80,12,85,40]);
    f.manager._beamClash(1/60,f.game);
    assert.deepEqual(f.flares[0],[12,85,40]);
    f.a.update(1/60,f.game);f.b.update(1/60,f.game);
    assert.equal(f.a.tip.position.distanceTo(f.b.tip.position),0);assert.equal(f.a.tip.position.x,12);
  }finally{f.close();}
});

test('capsule contact handles crossing, parallel, endpoint and degenerate segments symmetrically',()=>{
  const beam=(points,radius=.1)=>({path:points,pn:points.length/3,radius});
  const a=beam([0,0,0,10,0,0]);
  for(const [points,expected] of [
    [[5,-5,0,5,5,0],true],[[0,1,0,10,1,0],false],
    [[10.15,0,0,12,0,0],true],[[10.3,0,0,12,0,0],false],
    [[5,0,0,5,0,0],true],[[5,1,0,5,1,0],false],
    [[10,0,0,0,0,0],true],
  ]){
    const b=beam(points);assert.equal(beamPathsTouch(a,b),expected);assert.equal(beamPathsTouch(b,a),expected);
  }
  assert.equal(beamPathsTouch(beam([0,0,0,0,0,0]),beam([0,0,0,0,0,0])),true);
});

for(const hz of [30,60,120])test(`real emitted streams travel before a stable clash at ${hz} Hz`,()=>{
  const f=fixture();try{
    let first=0,clashTicks=0;
    for(let tick=1;tick<=hz;tick++){
      f.game.time=tick/hz;f.manager.update(1/hz,f.game);
      if(f.a.clashing){first ||= tick/hz;clashTicks++;}
    }
    assert.ok(first>.1 && first<.6,`actual first contact ${first}s`);
    assert.ok(clashTicks>hz*.4,`sustained contact only ${clashTicks} ticks`);
  }finally{f.close();}
});

for(const hz of [30,60,120])for(const delay of [0,.35])test(`staggered or unequal-speed streams keep their actual contact at ${hz} Hz, delay ${delay}`,()=>{
  const f=fixture();try{
    f.manager.list=[f.a];f.a.tipSpeed=150;f.b.tipSpeed=delay?150:95;
    let contact=false,gaps=0,maxTipGap=0;
    for(let tick=1;tick<=hz;tick++){
      if(tick===Math.round(delay*hz)+1)f.manager.list.push(f.b);
      f.game.time=tick/hz;f.manager.update(1/hz,f.game);
      if(f.a.clashing){
        contact=true;maxTipGap=Math.max(maxTipGap,f.a.tip.position.distanceTo(f.b.tip.position));
      }else if(contact)gaps++;
    }
    assert.ok(contact);assert.equal(gaps,0,'contact must not drop when one beam starts late');
    assert.ok(maxTipGap<.01,`clashing tips separate by ${maxTipGap}`);
  }finally{f.close();}
});
