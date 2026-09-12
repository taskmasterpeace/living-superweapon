import test from 'node:test';
import assert from 'node:assert/strict';
import {attackGuide,resistanceGuide,attackMatchup} from '../src/engine/combat-guide.js';
import {DTYPES,resistOf} from '../src/data/damage-types.js';
import {bakeSheet} from '../src/data/ranks.js';
import {ROSTER} from '../src/data/characters.js';
import {selectHitFeedback} from '../src/engine/hit-feedback.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {applyAbilityMeleeHit} from '../src/engine/ability-melee-hit.js';
import {runSlot,TYPES} from '../src/engine/abilities.js';

test('damage and status are separate; cold and generic shockwaves do not promise control',()=>{
 assert.deepEqual(attackGuide({type:'beam',dtype:'cold',dps:20}).effects,[]);
 assert.deepEqual(attackGuide({type:'projectile',damage:20,shock:true}).effects,[]);
 assert.ok(attackGuide({type:'cone',cold:true,dps:20}).effects.includes('FREEZE'));
 assert.ok(attackGuide({type:'projectile',damage:20,shockDuration:1}).effects.includes('SHOCK'));
 assert.deepEqual(attackGuide({type:'rifle',damage:5}).types,['ballistic']);
 assert.equal(attackGuide({type:'dash',dtype:'energy',power:90}).label,'');
});
test('quiver readout only names current payload in combat',()=>{
 const a={type:'bow',dmgMax:30,payloads:['flame','sleep','acid']};
 assert.deepEqual(attackGuide(a,'sleep').effects,['SLEEP']);
 assert.deepEqual(attackGuide(a).effects,['BURN','SLEEP','CORRODE']);
});
test('selection resistances match every live roster table',()=>{
 assert.equal(DTYPES.length,8);
 for(const def of ROSTER){const table=resistOf(def,bakeSheet(def));for(const r of resistanceGuide(def))assert.equal(r.mult,table[r.type]);}
 const metal={metal:true};assert.ok(resistanceGuide(metal).some(r=>r.type==='toxic'&&r.kind==='immune'));
 assert.ok(resistanceGuide(metal).some(r=>r.type==='acid'&&r.kind==='weak'));
});
test('resolved resistance feedback cannot invent statuses',()=>{
 const base={dtype:'cold',healthLost:4,absorbed:{},statusesAdded:[]};
 assert.equal(selectHitFeedback({...base,resistance:0}).label,'COLD IMMUNE');
 assert.match(selectHitFeedback({...base,resistance:.5}).label,/COLD RESISTED/);
 assert.match(selectHitFeedback({...base,resistance:1.5}).label,/VULNERABLE/);
 assert.notEqual(selectHitFeedback(base).id,'frozen');
});
test('selected attack matchup uses current target resistance and clears without a target',()=>{
 const a={type:'beam',dtype:'fire',dps:20};
 assert.equal(attackMatchup(a,{resist:{fire:0}}),'FIRE IMMUNE');
 assert.equal(attackMatchup(a,{resist:{fire:.6}}),'FIRE RESISTED');
 assert.equal(attackMatchup(a,{resist:{fire:1.5}}),'FIRE VULNERABLE');
 assert.equal(attackMatchup(a,null),'');
});
test('elemental melee respects immunity through the actual contact handler',()=>{
 const f=mainCombatFixture();try{
  f.g.vfx.impact=()=>{}; // Canvas-only decoration; native hit resolution remains live.
  const foe=f.foe({z:10});foe.resist.fire=0;const hp=foe.hp;
  applyAbilityMeleeHit(f.p,{damage:20,dtype:'fire'},{hit:new Set()},f.g,foe);
  assert.equal(foe.hp,hp);
 }finally{f.close();}
});
test('VOLT static field applies a real shock and blocks repeated application',()=>{
 const f=mainCombatFixture({hero:'volt'});try{
  const foe=f.foe({z:12});foe.invuln=0;
  runSlot(f.p,'e',{pressed:true,held:true,released:false,dt:.1},f.g);
  assert.ok(foe.shockT>0);assert.ok(foe.staggerT>0);const duration=foe.shockT;
  foe.addShock(5,f.p);assert.equal(foe.shockT,duration);
 }finally{f.close();}
});

test('authored life-drain type controls damage admission and prevents healing from immune targets',()=>{
 const f=mainCombatFixture();try{
  const foe=f.foe({z:12});foe.resist.magic=0;foe.invuln=0;
  f.p.hp=50;const hp=foe.hp;
  TYPES.lifedrain(f.p,{type:'lifedrain',dtype:'magic',dps:20,range:30},{},f.g,{held:true,dt:.1});
  assert.equal(foe.hp,hp);assert.equal(f.p.hp,50);
 }finally{f.close();}
});
