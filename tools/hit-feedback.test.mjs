import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {selectHitFeedback} from '../src/engine/hit-feedback.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

const baseOutcome=(extra={})=>({dtype:'ballistic',attackClass:'bullet',healthLost:0,
  absorbed:{plate:0,armor:0,shield:0,nanite:0},guard:'none',deflected:false,
  knockedOut:false,statusesAdded:[],...extra});

test('plate absorption is armor impact rather than directional guard',()=>{
  assert.equal(selectHitFeedback(baseOutcome({absorbed:{plate:8,armor:0,shield:0,nanite:0}})).id,'armor-hit');
});

test('partial armor preserves the actual health loss in its label',()=>{
  const feedback=selectHitFeedback(baseOutcome({healthLost:3.5,absorbed:{plate:0,armor:4.5,shield:0,nanite:0}}));
  assert.equal(feedback.id,'armor-hit');
  assert.match(feedback.label,/3\.5 HP/);
});

test('guard, reflection and knockout have distinct priority outcomes',()=>{
  assert.equal(selectHitFeedback(baseOutcome({guard:'blocked'})).id,'block');
  assert.equal(selectHitFeedback(baseOutcome({deflected:true})).id,'deflect');
  assert.equal(selectHitFeedback(baseOutcome({knockedOut:true,deflected:true,guard:'broken'})).id,'ko');
});

test('cold contact does not fabricate a frozen transition',()=>{
  assert.notEqual(selectHitFeedback(baseOutcome({dtype:'cold'})).id,'frozen');
  assert.equal(selectHitFeedback(baseOutcome({dtype:'cold',statusesAdded:['frozen']})).id,'frozen');
});

function fixture(t,{armor=0,plate=0,shield=0,guard=false}={}){
  const def=structuredClone(ROSTER.find(d=>d.id==='vega'));
  def.armor=plate;
  const f=new Fighter(def);
  Object.assign(f,{invuln:0,armor,_shieldHp:shield,resist:{},_physics(){},_animate(){},_sync(){}});
  f.guarding=guard;f.faceDir(0,1);
  const outcomes=[];
  f._game={onHit(_target,_amount,_opts,_blocked,outcome){outcomes.push(outcome);},
    particles:{burst(){},spawn(){}},vfx:{flash(){},contact(){}},audio:{},world:{},
    melee:{clearInput(){},release(){}}};
  const src={def:{},pos:new Vector3(0,0,10)};
  t.after(()=>f.dispose());
  return {f,outcomes,hit(amount,extra={}){const hp=f.hp,armorBefore=f.armor,shieldBefore=f._shieldHp;
    const dealt=f.takeDamage(amount,{src,ballistic:true,...extra});
    return {dealt,hpLost:hp-f.hp,armorLost:armorBefore-f.armor,shieldLost:shieldBefore-f._shieldHp,outcome:outcomes.at(-1)};
  }};
}

test('native fully stopped bullet reports plate absorption and zero real HP loss',t=>{
  const x=fixture(t,{plate:9});const r=x.hit(4);
  assert.equal(r.hpLost,0);assert.equal(r.dealt,0);assert.equal(r.outcome.healthLost,0);
  assert.equal(r.outcome.absorbed.plate,4);assert.equal(r.outcome.guard,'none');
});

test('native partial armor-pool hit reports exact armor and HP deltas',t=>{
  const x=fixture(t,{armor:2});const r=x.hit(10,{ballistic:false,dtype:'physical'});
  assert.equal(r.outcome.healthLost,r.hpLost);assert.equal(r.outcome.absorbed.armor,r.armorLost);
  assert.ok(r.hpLost>0);assert.ok(r.armorLost>0);
});

test('native shield full soak is not reported as guard',t=>{
  const x=fixture(t,{shield:10});const r=x.hit(5,{ballistic:false,dtype:'energy'});
  assert.equal(r.hpLost,0);assert.equal(r.outcome.absorbed.shield,5);assert.equal(r.outcome.guard,'none');
});

test('native directional guard reports its own resolved state and actual chip',t=>{
  const x=fixture(t,{guard:true});const r=x.hit(5,{ballistic:false,dtype:'physical',strike:true});
  assert.equal(r.outcome.guard,'blocked');assert.equal(r.outcome.healthLost,r.hpLost);
  assert.equal(r.outcome.absorbed.armor,0);assert.ok(r.hpLost>0);
});
