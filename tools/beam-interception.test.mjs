import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {Game} from '../src/engine/game.js';
import {Fighter} from '../src/engine/entity.js';
import {TYPES,clearSlotFx} from '../src/engine/abilities.js';
import {setAttackOverride,applyAttackOverrides,attackFields} from '../src/data/attack-tuning.js';
import {applyProfile,profileFromDef,validateProfile} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(options={}){
  const noop=()=>{},hits=[],rings=[],returned=[],noise=[];
  const game={scene:new THREE.Scene(),time:0,entities:[],world:{cover:[],interiors:[],shake:noop,punch:noop},
    audio:{boom:noop,zap:noop,charge:()=>null},particles:{spawn:noop,burst:noop},noise:(...x)=>noise.push(x),
    vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:l=>returned.push(l),explode:(...x)=>hits.push(x),
      ring:(p,o)=>rings.push([p.clone(),o]),flash:noop,lightning:noop,impact:noop},
    areaDamage:noop,onDrained:noop,onNoKi:noop,isFoe:(a,b)=>b.alive&&a.team!==b.team,
    overlapFoe:Game.prototype.overlapFoe,spawnBeamFor:Game.prototype.spawnBeamFor};
  const owner=team=>({team,alive:true,ki:100,maxKi:100,def:{},powerBuff:1,hitstop:0,staggerT:0,stunT:0,
    pos:new THREE.Vector3(0,45,-10),vel:new THREE.Vector3(),aim3:new THREE.Vector3(0,0,1),
    spendKi:Fighter.prototype.spendKi,muzzle(out){return out.copy(this.pos).add(new THREE.Vector3(0,5,0));}});
  const c=owner(1),enemy=owner(2);c._game=game;
  const manager=game.projectiles=new Projectiles(game);
  const beam=manager.spawnBeam(c,{radius:1,interceptBullets:true,interceptKi:30,investedKi:30,...options});
  beam.resolveLaunch(); // This fixture installs an already-traveled field, not a newborn beam.
  beam.pn=2;beam.path.set([0,50,-10,0,50,10]);
  const bullet=(extra={})=>manager.spawnProjectile(enemy,{pos:new THREE.Vector3(-5,50,0),vel:new THREE.Vector3(600,0,0),
    radius:.25,damage:12,blast:0,ballistic:true,...extra});
  return {game,c,enemy,manager,beam,bullet,hits,rings,returned,noise,close(){for(const p of manager.list)p._dispose(game);clearSlotFx(c);}};
}

for(const hz of [30,60,120])for(const reverse of [false,true])test(`invested beam eats fast ballistic contact at ${hz}Hz / reversed ${reverse}`,()=>{
  const f=fixture();try{const p=f.bullet({vel:new THREE.Vector3(2000,0,0)});if(reverse)f.manager.list.reverse();
    f.manager.update(1/hz,f.game);assert.equal(p.dead,true);assert.equal(f.beam.dead,false);
    assert.ok(Math.abs(p.pos.x+1.25)<1e-6);assert.equal(f.hits.length,0);assert.equal(f.rings.length,1);assert.equal(f.returned.length,1);
  }finally{f.close();}
});
for(const reason of ['off','low energy','nonballistic','ally','interrupted','ended','dry','untraveled','altitude'])test(`beam does not absorb: ${reason}`,()=>{
  const f=fixture();try{
    const p=f.bullet();
    if(reason==='off')f.beam.interceptBullets=false;
    if(reason==='low energy')f.beam.investedKi=29;
    if(reason==='nonballistic')p.ballistic=false;
    if(reason==='ally')p.caster=f.c;
    if(reason==='interrupted')f.c.frozenT=1;
    if(reason==='ended')f.beam.end();
    if(reason==='dry')f.c.ki=0;
    if(reason==='untraveled'){f.beam.pn=2;f.beam.path.set([0,50,-10,0,50,-8]);}
    if(reason==='altitude')p.pos.y=53;
    f.manager.update(1/60,f.game);assert.equal(p.dead,false);assert.equal(f.rings.length,0);
  }finally{f.close();}
});

test('earlier ordinary cover contact beats the beam without neutralization',()=>{
  const f=fixture();try{f.game.world.cover=[{x:-3,z:0,r:.3,h:80}];const p=f.bullet();
    f.manager.update(1/60,f.game);assert.equal(p.dead,true);assert.equal(f.noise.length,1);assert.equal(f.rings.length,0);
    assert.ok(p.pos.x<-3);
  }finally{f.close();}
});

test('a fighter entering a long beam shields the tail before bullet interception runs',()=>{
 const f=fixture(),body=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
 try{
  body.team=2;body.invuln=1;body.pos.set(0,44.8,-5);f.game.entities=[body];
  const p=f.bullet();f.manager.update(1/60,f.game);
  assert.equal(p.dead,false,'The old tail behind the newly entering body cannot absorb a bullet');
  assert.equal(f.rings.length,0,'No interception effect may be paid on absorbed energy');
 }finally{f.close();body.dispose();}
});
test('a newly inserted wall clips the beam field before it can intercept beyond the wall',()=>{
  const f=fixture();try{f.game.world.interiors=[{x:0,z:-5,hx:2,hz:.1,top:80,walls:[{x:0,z:-5,hx:2,hz:.1}]}];
    const p=f.bullet();f.manager.update(1/60,f.game);assert.equal(p.dead,false);assert.equal(f.rings.length,0);
  }finally{f.close();}
});
test('beam-only participants cannot gain ordinary projectile priority',()=>{
  const f=fixture();try{const a=f.bullet(),b=f.manager.spawnProjectile(f.c,{pos:new THREE.Vector3(-3,50,0),vel:new THREE.Vector3(-600,0,0),radius:.25,ballistic:true});
    f.beam.path.set([0,60,-10,0,60,10]);f.manager.update(1/120,f.game);
    assert.equal(a.dead||b.dead,false);
  }finally{f.close();}
});

for(const charge of [false,true])for(const infinite of [false,true])test(`actual beam energy ledger: charged ${charge}, infinite ${infinite}`,()=>{
  const f=fixture();try{
    f.beam._dispose(f.game);f.manager.list=[];f.c.energyInfinite=infinite;
    const def={type:'beam',color:'#ffbb38',cost:20,charge,maxCharge:2,kiChargePerSec:12,kiPerSec:6,interceptBullets:true,interceptKi:30};
    const st={def,cd:0};f.c.slots={lmb:st};
    TYPES.beam(f.c,def,st,f.game,{pressed:true,held:true,dt:.5});
    if(charge)TYPES.beam(f.c,def,st,f.game,{released:true,dt:1/60});
    const b=st.active;assert.equal(b.investedKi,charge?26:20);assert.equal(b.interceptBullets,true);assert.equal(b.interceptKi,30);
    assert.equal(f.c.ki,infinite?100:charge?74:80);
    b.update(.5,f.game);assert.equal(b.investedKi,charge?29:23);
    assert.equal(f.c.ki,infinite?100:charge?71:77);
    b.end();b.update(.01,f.game);assert.equal(b.investedKi,charge?29:23,'released packets cannot add investment');
  }finally{f.close();}
});
test('failed charge drain earns no beam investment',()=>{
  const f=fixture();try{f.beam._dispose(f.game);f.manager.list=[];f.c.ki=27;
    const def={type:'beam',color:'#ffbb38',cost:20,charge:true,maxCharge:2,kiChargePerSec:12},st={def,cd:0};f.c.slots={lmb:st};
    TYPES.beam(f.c,def,st,f.game,{pressed:true,held:true,dt:.5});TYPES.beam(f.c,def,st,f.game,{held:true,dt:.5});
    assert.equal(st.active.investedKi,26);assert.equal(f.c.ki,1);
  }finally{f.close();}
});
test('portable beam controls are opt-in and bounded independently of projectile priority',()=>{
  const def={...ROSTER[0],abilities:{lmb:{type:'beam'}}};
  assert.equal(attackFields(def,'lmb',{}).find(f=>f.key==='interceptBullets')?.value,false);
  const actual=applyAttackOverrides(def,setAttackOverride({},def,'lmb',{interceptBullets:true,interceptKi:40}));
  const restored=applyProfile(def,validateProfile(JSON.parse(JSON.stringify(profileFromDef(actual))),def));
  assert.equal(restored.abilities.lmb.interceptBullets,true);assert.equal(restored.abilities.lmb.interceptKi,40);
  for(const value of [-1,10001,NaN,'30'])assert.throws(()=>setAttackOverride({},def,'lmb',{interceptKi:value}));
  assert.throws(()=>setAttackOverride({},{abilities:{lmb:{type:'projectile'}}},'lmb',{interceptBullets:true}));
});

for(const consumer of ['beam','ordinary beam','orb'])test(`shared caster reserves sustain after earlier ${consumer} payment`,()=>{
  const f=fixture();try{
    f.c.ki=1;f.beam.kiPerSec=60;
    let other;
    if(consumer==='orb')other=f.manager.spawnGrowingOrb(f.c,{kiPerSec:60});
    else {other=f.manager.spawnBeam(f.c,{radius:1,kiPerSec:60,interceptBullets:consumer==='beam',interceptKi:30,investedKi:30});
      other.resolveLaunch();other.pn=2;other.path.set([0,50,15,0,50,25]);}
    const a=f.bullet(),b=f.bullet({pos:new THREE.Vector3(-5,50,20)});
    f.manager.update(1/60,f.game);
    assert.equal(a.dead,false,'unpaid beam cannot intercept using already-reserved energy');
    assert.equal(b.dead,consumer==='beam');assert.equal(f.beam.sustaining,false);assert.equal(f.beam.investedKi,30);assert.equal(f.c.ki,0);
  }finally{f.close();}
});
