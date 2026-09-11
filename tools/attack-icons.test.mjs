import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {attackSymbol,attackIcon} from '../src/engine/attack-icons.js';
import {POWERS} from '../src/data/creator.js';
import {TYPE_META,HOLD_TYPES,validateRoster} from '../src/engine/abilityMeta.js';
import {TYPES} from '../src/engine/abilities.js';
import {supportsAttackRehearsal} from '../src/tool/studio-combat.js';
test('shipped emitter configuration chooses recognizably different silhouettes',()=>{
 const sol=ROSTER.find(d=>d.id==='sol'),sarge=ROSTER.find(d=>d.id==='sarge');
 assert.equal(attackSymbol(sol.abilities.lmb),'optic');assert.equal(attackSymbol(sol.abilities.rmb),'cone');
 assert.equal(attackSymbol(sarge.abilities.lmb),'rifle');assert.equal(attackSymbol({type:'beam',chest:true}),'chest');
 assert.notEqual(attackIcon(sol.abilities.lmb),attackIcon(sarge.abilities.lmb));
 assert.notEqual(attackIcon(sol.abilities.e),attackIcon(sol.abilities.f),'single shot and volley cannot collapse to identical compact tiles');
 assert.equal(attackSymbol(sarge.abilities.rmb),'grenade');assert.equal(attackSymbol(sarge.abilities.e),'shotgun');assert.equal(attackSymbol(sarge.abilities.q),'blade');
});
test('public nanite modules identify their physical shield and forearm cannon instead of utility',()=>{
 const shield=POWERS.find(p=>p.id==='nanite-shield').ab,cannon=POWERS.find(p=>p.id==='nanite-cannon').ab;
 assert.equal(attackSymbol(shield),'nanite-shield');assert.equal(attackSymbol(cannon),'nanite-cannon');
 assert.notEqual(attackIcon(shield),attackIcon({type:'unknown'}));assert.notEqual(attackIcon(cannon),attackIcon({type:'charge'}));
 assert.notEqual(attackSymbol({type:'naniteShield'}),'nanite-shield','Malformed source does not masquerade as the public module');
});
test('public shield is registered as non-held defense without enrolling malformed ordinary rehearsal',()=>{
 const source=POWERS.find(p=>p.id==='nanite-shield').ab;
 assert.deepEqual(validateRoster([{id:'public-shield',abilities:{q:source}}],TYPES),[]);
 assert.deepEqual(TYPE_META.naniteShield,{family:'defense',req:[],hold:false});assert.equal(HOLD_TYPES.has('naniteShield'),false);
 assert.equal(supportsAttackRehearsal({type:'naniteShield'}),false);assert.equal(supportsAttackRehearsal(source),true);
});
