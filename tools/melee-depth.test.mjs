import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {MeleeSystem,punchWeight} from '../src/engine/melee.js';
import {ROSTER} from '../src/data/characters.js';
import {stepMelee} from '../src/tool/studio-melee.js';

// Real fighters, damage, guard and melee state machine; rendering/audio are ports.
function fixture(strength=5) {
  const make=(id,str)=>{const def=structuredClone(ROSTER.find(d=>d.id==='sol'));Object.assign(def,{id,strength:str,art:'boxing',meleePace:1,meleeTiers:3});return new Fighter(def);};
  const a=make('attacker',strength),b=make('victim',5),hits=[],labels=[];
  const noop=()=>{},game={entities:[a,b],scene:new THREE.Scene(),isHuman:()=>false,
    world:{shake:noop,punch:noop,heightAt:()=>0,ARENA:240,cover:[],interiors:[]},audio:{swing:noop,grunt:noop,impact:noop,meleeHit:noop,zap:noop,hit:noop,teleport:noop,land:noop},
    vfx:{impact:noop,impactStar:noop,ring:noop,flash:noop,contact:noop},particles:{spawn:noop,burst:noop},
    hud:{damageNumber:(p,s)=>labels.push(s),flashScreen:noop},ui:noop,trail:noop,heroYell:noop,slowmo:noop,afterimage:noop,
    coneFoe:f=>f===a?b:a,isFoe:(f,o)=>f!==o,onHit:(v,n,o,blocked)=>hits.push({v,n,o,blocked})};
  const m=game.melee=new MeleeSystem(game);
  for(const f of [a,b]){f._game=game;f.hp=f.maxHp=10000;f.invuln=0;f.isDummy=true;game.scene.add(f.obj);}
  a.pos.set(0,80,0);b.pos.set(0,80,5);a.faceDir(0,1);b.faceDir(0,-1);a.aim3.set(0,0,1);
  function step(t){for(let i=0;i<Math.ceil(t*120);i++) {for(const f of [a,b]){f.hitstop=Math.max(0,f.hitstop-1/120);f.strikeCd=Math.max(0,f.strikeCd-1/120);f.comboWin=Math.max(0,f.comboWin-1/120);}m.update(a,1/120);}}
  function clinch(){m.grab(a);step(.2);assert.equal(a.grabbing,b);a.grabT=a._clinchMax=3;}
  return {a,b,m,game,hits,labels,step,clinch,close(){a.dispose();b.dispose();}};
}
function withFixture(fn,str=5){const x=fixture(str);try{return fn(x);}finally{x.close();}}

for(const action of ['strike','chargeStart','grab'])test(`native ${action} takes pose ownership from a released ranged attack`,()=>withFixture(({a,m})=>{
 a._castPoseRanged=true;m[action](a);
 assert.equal(a.state,'cast');assert.equal(a._castPoseRanged,false,'Native melee inherited the beam recovery owner');
}));

for(const openSky of [false,true])test(`a blocked jab cannot spend the hit-confirm window to cancel its punishable recovery (openSky ${openSky})`,()=>withFixture(({a,b,m,step})=>{
  a._openSky=b._openSky=openSky;b.guarding=true;m.strike(a);m._resolveLight(a,openSky?b:null);step(.34);
  assert.ok(a.strikeCd>0,'blocked jab still owes recovery');
  assert.equal(a.mstate,null,'animation has released while punishment timer remains');
  m.strike(a);assert.equal(a.mstate,null,'new punch cannot bypass the guarded-hit recovery');
  step(.3);m.strike(a);assert.equal(a.mstate,'startup','a fresh punch is available after recovery');
}));
test('a tap late in recovery buffers the next light without cancelling recovery',()=>withFixture(({a,m,step})=>{
  m.strike(a);step(.22);assert.equal(a.mstate,'recover');const idx=a.strikeIdx;
  m.chargeStart(a);m.chargeRelease(a);assert.equal(a.mstate,'recover');step(.11);
  assert.equal(a.mstate,'startup');assert.equal(a.strikeIdx,idx+1);
}));
test('queued hold starts charging only after recovery, not during a free windup',()=>withFixture(({a,m,step})=>{
  m.strike(a);step(.21);m.chargeStart(a);step(.04);assert.equal(a.meleeCharge,0);
  step(.09);assert.ok(a.meleeCharge>0&&a.meleeCharge<.08);m.chargeRelease(a);assert.equal(a.mKind,'light');
}));
test('repeated inputs cannot skip heavy recovery or bank a stale attack',()=>withFixture(({a,m,step})=>{
  m._beginHeavy(a,'power',1,true);step(.51);assert.equal(a.mstate,'recover');
  m.chargeStart(a);m.chargeRelease(a);step(.4);assert.equal(a.mstate,null);
}));
test('real damage clears buffered input and charge so it cannot attack after the hit',()=>withFixture(({a,b,m,step})=>{
  m.strike(a);step(.22);m.chargeStart(a);m.chargeRelease(a);
  assert.ok(a._meleeBuffer>0);a.takeDamage(1,{src:b,hitstop:.08,strike:true});
  assert.equal(a._meleeBuffer,null,'the hit clears input immediately, not after buffer expiry');
  step(.5);
  assert.equal(a.mstate,null);assert.equal(a.meleeCharge,0);assert.equal(a._meleeBuffer,null);
}));
test('sleep cancels eligible non-dummy input and a pending clinch without throwing',()=>withFixture(({a,b,m,clinch,step})=>{
  clinch();m.chargeStart(a);step(.6);m.chargeRelease(a);a.isDummy=false;a._meleeQueuedHeld=true;
  assert.doesNotThrow(()=>a.addSleep(1,b));assert.ok(a.sleepT>0);
  assert.equal(!!a.grabbing,false);assert.equal(!!b.grabbedBy,false);assert.equal(a._clinchFinisher,null);assert.equal(a._meleeQueuedHeld,false);
}));
test('thorn damage hurts a holder without silently cancelling its clinch',()=>withFixture(({a,b,m,clinch})=>{
  clinch();b.thorns=8;const hp=a.hp;m.chargeStart(a);m.update(a,1/60);
  assert.ok(a.hp<hp);assert.equal(a.grabbing===b,true);assert.ok(a.meleeCharge>0);
}));
test('real frozen update releases a pending finisher and clears queued holds',()=>withFixture(({a,b,m,game,clinch,step})=>{
  clinch();m.chargeStart(a);step(.6);m.chargeRelease(a);a._meleeQueuedHeld=true;
  a.addFrost(10,b);a.update(.1,game);
  assert.equal(!!a.grabbing,false);assert.equal(!!b.grabbedBy,false);assert.equal(a._clinchFinisher,null);assert.equal(a._meleeQueuedHeld,false);
}));
test('a fatal drive-down transfers downward launch to the actual ragdoll',()=>withFixture(({a,b,m,clinch})=>{
  clinch();b.hp=1;m._slamFinish(a);assert.equal(b.state,'ko');
  for(const key of ['pelvis','chest','head']){const p=b.ragdoll.P[key];assert.ok((p.pos.y-p.prev.y)*60 < -40,`${key} must travel down, not receive a KO pop`);}
  assert.equal(!!a.grabbing,false);assert.equal(!!b.grabbedBy,false);
}));
test('a fatal aimed throw transfers the authored horizontal launch to the ragdoll',()=>withFixture(({a,b,m,clinch})=>{
  clinch();a.aim3.set(1,0,0);b.hp=1;m.grab(a);assert.equal(b.state,'ko');
  const p=b.ragdoll.P.pelvis;assert.ok((p.pos.x-p.prev.x)*60>30,'KO captures launch before zeroing fighter velocity');
}));
test('frozen and carrying characters cannot start punches or grabs',()=>withFixture(({a,m})=>{
  for(const key of ['frozenT','_carry']){a[key]=1;m.chargeStart(a);m.grab(a);assert.equal(a.meleeCharge,0);assert.equal(a.grabState,null);a[key]=0;}
}));
test('strength changes light damage, hitstop and displacement, not just its label',()=>{
  const hit=str=>withFixture(({a,b,m,hits})=>{m.strike(a);m._resolveLight(a);return {damage:10000-b.hp,stop:a.hitstop,kb:hits[0].o.kb.z};},str);
  const light=hit(2),strong=hit(10);assert.ok(strong.damage>light.damage*1.3);assert.ok(strong.stop>light.stop);assert.ok(strong.kb>light.kb*1.4);
});
test('heavy fists and guard crush both scale with attacker strength',()=>{
  const hit=(str,guard)=>withFixture(({a,b,m,hits})=>{b.guarding=guard;m._beginHeavy(a,'power',1,true);m._resolveHeavy(a);return {damage:10000-b.hp,kb:hits[0].o.kb.z};},str);
  for(const guard of [false,true]) {const weak=hit(2,guard),strong=hit(10,guard);assert.ok(strong.damage>weak.damage*1.5);assert.ok(strong.kb>weak.kb*1.5);}
});
test('strength scales shove inside the established strongest-punch launch envelope',()=>{
  assert.equal(punchWeight({def:{strength:10}},true).push,1,'preserve standing-heavy teleport-intercept counterplay');
  assert.ok(punchWeight({def:{strength:2}},true).push<.7);
});
test('catching an exposed windup or recovery rewards a counter; idle and guard do not',()=>{
  const hit=state=>withFixture(({a,b,m,labels})=>{b.mstate=state;b.mId='power';b.mT=.2;m.strike(a);m._resolveLight(a);return {damage:10000-b.hp,labels};});
  const base=hit(null);for(const state of ['startup','recover']){const result=hit(state);assert.ok(result.damage>base.damage);assert.equal(result.labels.length,1);}
  assert.equal(base.labels.length,0);
});
test('heavy startup grants no free invulnerability',()=>withFixture(({a,m})=>{m._beginHeavy(a,'power',1,true);assert.equal(a.invuln,0);}));
test('clinch tap delivers a body blow with a cooldown and spends hold time',()=>withFixture(({a,b,m,clinch,step})=>{
  clinch();const t=a.grabT,hp=b.hp;m.chargeStart(a);m.chargeRelease(a);
  assert.equal(b.hp,hp,'body blow has a visible windup');step(.15);
  assert.ok(b.hp<hp);assert.equal(a.grabbing===b,true);assert.ok(a.grabT<t);
  const after=b.hp;m.chargeStart(a);m.chargeRelease(a);step(.1);assert.equal(b.hp,after);
}));

test('throw pressed in the last part of a body blow waits for recovery, then throws once',()=>withFixture(({a,b,m,clinch,step,hits})=>{
 clinch();m.chargeStart(a);m.chargeRelease(a);step(.15);m.grab(a);
 assert.equal(a.grabbing,b,'a queued throw must not cancel body-blow recovery');
 step(.2);assert.equal(!!a.grabbing,false);assert.equal(!!b.grabbedBy,false);
 assert.equal(hits.filter(h=>h.o.meleeMove==='throw').length,1);
 step(.4);assert.equal(hits.filter(h=>h.o.meleeMove==='throw').length,1);
}));

test('breaking a clinch discards a buffered throw instead of applying it to the next victim',()=>withFixture(({a,b,m,clinch,step,hits})=>{
 clinch();m.chargeStart(a);m.chargeRelease(a);step(.15);m.grab(a);m.release(a);step(.4);
 assert.equal(b.grabbedBy,null);assert.equal(hits.filter(h=>h.o.meleeMove==='throw').length,0);
 a.strikeCd=0;clinch();step(.25);assert.equal(a.grabbing,b);
}));
test('held clinch strike winds up then drives the victim downward at its actual altitude',()=>withFixture(({a,b,m,clinch,step})=>{
  clinch();m.chargeStart(a);step(.6);m.chargeRelease(a);assert.equal(a.grabbing,b,'windup is visible, not instant teleport');
  step(.35);assert.equal(a.grabbing,null);assert.equal(b.grabbedBy,null);assert.ok(b.vel.y < -40);assert.ok(b.pos.y>=a.pos.y);assert.equal(b.flying,false);assert.ok(b.launchT>0);assert.equal(b._thrownBy,a);
}));
test('the existing second grab press still makes an aimed throw',()=>withFixture(({a,b,m,clinch})=>{
  clinch();a.aim3.set(1,.1,0);m.grab(a);assert.equal(a.grabbing,null);assert.ok(b.vel.x>30);assert.ok(b.vel.y>0);
}));
test('short struggle can expire during a slam windup; no guaranteed escape bypass',()=>withFixture(({a,b,m,clinch,step})=>{
  clinch();m.chargeStart(a);step(.6);a.grabT=.05;m.chargeRelease(a);step(.1);
  assert.equal(a.grabbing,null);assert.equal(b._thrownBy,null);assert.ok(b.invuln>0);
}));
test('release from either end and disposal clear every pending clinch follow-up',()=>{
  for(const kind of ['holder','victim','dispose'])withFixture(({a,b,m,clinch,step})=>{
    clinch();m.chargeStart(a);step(.6);m.chargeRelease(a);
    if(kind==='dispose')a.dispose();else m.release(kind==='holder'?a:b);
    assert.equal(a.grabbing,null);assert.equal(b.grabbedBy,null);assert.equal(a._clinchFinisher,null);assert.equal(a.meleeCharge,0);
  });
});
test('a downward launch hits a roof surface even when a fast frame crosses its top',()=>withFixture(({b,a,game,hits})=>{
  Object.assign(game.world,{heightAt:()=>0,ARENA:240,interiors:[],cover:[{x:0,z:0,hx:30,hz:30,top:20}]});
  b.flying=false;b.gait='fall';b.pos.set(0,25,0);b.vel.set(0,-150,0);b.launchT=2;b.lastHitBy=a;b.lastHitT=0;
  b._physics(.05,game);
  assert.equal(b.pos.y,20);assert.ok(hits.some(h=>h.o.slam),'roof contact routes real slam damage');
}));
test('Studio reports a falling throw after its damage window, until the body lands',()=>withFixture(({a,b,game})=>{
  const stage={game,fighter:a,target:b,meleeEvents:[],meleeSequence:'throw'};
  b.flying=false;b.groundY=0;b.pos.y=20;b.launchT=0;
  stepMelee(stage,2.25,0);assert.equal(stage.phase,'falling');
  b.pos.y=0;stepMelee(stage,4,0);assert.equal(stage.phase,'recovered');
}));
