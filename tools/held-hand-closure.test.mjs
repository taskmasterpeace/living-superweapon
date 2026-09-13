import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {bladeById} from '../src/data/armory.js';
import {animateHands} from '../src/engine/hero-hand.js';

for(const variant of [0,1])for(const id of ['bat','claws'])test(`${id}: acquiring equipment closes palm variant ${variant} immediately`,()=>{
 const x=mainCombatFixture({hero:'merc'}),{p,g}=x;
 try{
  for(const arm of [p.parts.armL,p.parts.armR]){
   const hand=arm.children[2];hand.geometry=hand.geometry.palmVariants[variant];hand.morphTargetInfluences[0]=1;
  }
  g.equipFrom(p,bladeById(id),{primary:true});animateHands(p,1/60);
  const hands=id==='claws'?[p.parts.armL.children[2],p.parts.armR.children[2]]:[p.parts.armR.children[2]];
  for(const hand of hands){
   assert.equal(hand.morphTargetInfluences[0],0,'a visible weapon cannot remain in an open palm');
   assert.equal(hand.geometry,hand.geometry.palmVariants[0]);
  }
 }finally{x.close();}
});
