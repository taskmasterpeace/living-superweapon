import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLDIER_FOUNDATION,SOLDIER_PRESETS,createSoldierFamilyDefinition,soldierLoadout} from '../src/data/soldier-family.js';
import {heroModelOf} from '../src/data/hero-models.js';
import {styleOf} from '../src/data/martial.js';
import {validateModularRecipe} from '../src/engine/modular-costume.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {characterRecipeOf} from '../src/engine/modular-character.js';

test('all presets share current soldier foundation with valid distinct modular appearances',()=>{
 const defs=SOLDIER_PRESETS.map(createSoldierFamilyDefinition);
 assert.equal(new Set(defs.map(d=>d.id)).size,4);
 assert.equal(new Set(defs.map(d=>JSON.stringify(d.modularRecipe))).size,4);
 for(const d of defs){
  assert.equal(heroModelOf(d).body,'faceted-v1');assert.equal(heroModelOf(d).equipment,'soldier');
  assert.equal(validateModularRecipe(d.modularRecipe).skin,d.colors.skin);
  assert.equal(d.archetype,'soldier');assert.equal(d.hp,SOLDIER_FOUNDATION.hp);
  assert.equal(d.flightTier,0);assert.equal(d.ai.fly,0);assert.deepEqual(d.items,[]);
  assert.equal(d.abilities.lmb.type,'rifle');assert.deepEqual(Object.keys(d.abilities),['lmb','shift']);
  assert.equal(d.overdrive,undefined);assert.equal(d.guardStrong,undefined);
  assert.equal(d.abilities.lmb.magazine,soldierLoadout(d).ab.magazine);
 }
});

test('appearance, allegiance, role and training can vary independently without shared mutation',()=>{
 const a=createSoldierFamilyDefinition({appearance:'desert',role:'marksman',training:'judo',team:0,faction:'allied'});
 const b=createSoldierFamilyDefinition({appearance:'desert',role:'breacher',training:'boxing',team:2,faction:'opposing'});
 for(const key of ['primary','secondary','skin','headwear','hair'])assert.equal(a.modularRecipe[key],b.modularRecipe[key]);assert.equal(a.loadoutId,'m24');assert.equal(b.loadoutId,'pump');
 assert.notEqual(a.modularRecipe.emblemColor,b.modularRecipe.emblemColor);
 assert.equal(a.team,0);assert.equal(b.team,2);assert.equal(styleOf(a).n,'JUDO');assert.equal(styleOf(b).n,'BOXING');
 a.colors.skin='#ffffff';a.model.body='procedural';a.abilities.lmb.damage=999;a.items.push({kind:'jetcell'});a.talents.push('commander');
 const clean=createSoldierFamilyDefinition({appearance:'desert',role:'marksman'});
 assert.notEqual(clean.colors.skin,a.colors.skin);assert.equal(clean.model.body,'faceted-v1');assert.equal(clean.abilities.lmb.damage,46);assert.deepEqual(clean.items,[]);
 const row=soldierLoadout(clean);row.ab.damage=999;assert.equal(soldierLoadout(clean).ab.damage,46);
});

test('unknown roles, training, appearance or invalid teams fail before creating a unit',()=>{
 for(const options of [{role:'wizard'},{appearance:'invisible'},{training:'flying-kick'},{team:-1},{team:1.5},{faction:''}])assert.throws(()=>createSoldierFamilyDefinition(options));
});

test('blue and red allegiance marks stay readable across every uniform without changing capabilities',()=>{
 for(const preset of SOLDIER_PRESETS){const blue=createSoldierFamilyDefinition({...preset,team:0}),red=createSoldierFamilyDefinition({...preset,team:1});
  assert.equal(blue.modularRecipe.emblemColor,'#4e93c9');assert.equal(red.modularRecipe.emblemColor,'#c95a4f');
  assert.equal(blue.modularRecipe.emblemPlacement,'both');assert.equal(red.modularRecipe.regionColors.belt,'#c95a4f');
  assert.deepEqual(blue.colors,red.colors);assert.deepEqual(blue.abilities,red.abilities);assert.equal(blue.hp,red.hp);
 }
});

test('native addFighter and equipFrom accept every family role with loaded ammo and ordinary physics',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  for(const preset of SOLDIER_PRESETS){
   const def=createSoldierFamilyDefinition({...preset,team:2});
   const f=x.g.addFighter(def,{team:def.team,x:20,z:20});
   assert.equal(f.team,2);assert.equal(f.def.art,def.art);assert.equal(f.flightTier,0);
   assert.ok(x.g.equipFrom(f,soldierLoadout(def),{primary:true}));
   assert.equal(f.slots.lmb,f.slots._gear);assert.equal(f._gearHeld.rowId,def.loadoutId);
   assert.equal(f.slots._gear.ammo.loaded,def.abilities.lmb.magazine);
   assert.ok(f.parts.rig);assert.equal(f.items.length,0);
  }
 }finally{x.close();}
});

test('current model and portrait recipe selection uses saved edits, authored family then roster fallback',()=>{
 const def=createSoldierFamilyDefinition({appearance:'urban'}),saved={...def.modularRecipe,primary:'#123456'};
 assert.equal(characterRecipeOf(def,{read:()=>saved}).primary,'#123456');
 assert.equal(characterRecipeOf(def,{read:()=>null}).primary,def.colors.primary);
 assert.equal(characterRecipeOf(def,{read:()=>null}).headwear,'helmet');
 assert.ok(characterRecipeOf({id:'sarge'},{read:()=>null}));
 const fallback={name:'fallback'};assert.equal(characterRecipeOf({id:'unknown'},{read:()=>null,fallback}),fallback);
 assert.throws(()=>characterRecipeOf({...def,modularRecipe:{schema:9}},{read:()=>null}));
});
