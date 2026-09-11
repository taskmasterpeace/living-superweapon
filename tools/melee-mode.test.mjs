import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleMeleeMode,meleeKeymap} from '../src/core/melee-mode.js';
import {sampleMouseCombat,selectedAttacks} from '../src/core/combat-selection.js';
import {Input} from '../src/core/input.js';
import {KEYMAPS} from '../src/core/settings.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
function fixture(){return {f:{alive:true,slots:{lmb:{},rmb:{},e:{}},_selSlot:'e',_selSecondary:'lmb'},input:new Input()};}
for(const [name,map] of Object.entries(KEYMAPS))test(`${name}: Tab readies both melee hands then restores the selected attacks`,()=>{
 const {f,input}=fixture();assert.equal(toggleMeleeMode(f,input),true);
 const effective=meleeKeymap(f,map);assert.equal(effective.mouseMelee,true);
 const attacks=selectedAttacks(f,effective);assert.equal(attacks.primary,'melee');assert.equal(attacks.secondary,'grab');
 input.mouse.left=input.mouse.leftEdge=true;const sampled=sampleMouseCombat(f,input,effective,1/60);
 assert.equal(sampled.buttons.left.pressed,true);assert.ok(Object.values(sampled.slots).every(s=>!s.pressed&&!s.held));
 assert.equal(toggleMeleeMode(f,input),false,'held trigger cannot switch ownership');
 input.mouse.left=input.mouse.leftEdge=false;
 assert.equal(toggleMeleeMode(f,input),true);assert.equal(f._selSlot,'e');assert.equal(f._selSecondary,'lmb');assert.equal(f._tabMelee,false);
});
test('clinch, reload and active strikes cannot be abandoned with Tab',()=>{
 for(const state of ['grabbing','mstate','_firearmReload','_throwAction']){const {f,input}=fixture();f[state]={};assert.equal(toggleMeleeMode(f,input),false);assert.equal(f._selSlot,'e');}
});
test('native controller routes Tab melee LMB into a punch windup, without firing a power',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  x.g.ms.chaseCam=true;x.p._openSky=true;assert.equal(toggleMeleeMode(x.p,x.g.input),true);
  x.g.input.mouse.left=x.g.input.mouse.leftEdge=true;x.control(1/60);
  assert.ok(x.p.meleeCharge>0);assert.equal(x.g.projectiles.list.length,0);
 }finally{x.close();}
});
