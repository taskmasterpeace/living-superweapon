import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {heroModelOf} from '../src/data/hero-models.js';

test('VEGA is a bald Black man with fitted front and back V marks',()=>{
 const def=ROSTER.find(hero=>hero.id==='vega');
 assert.equal(def.colors.skin,'#5b3829');
 assert.equal(heroModelOf(def).hair,'none');
 assert.equal(heroModelOf(def).insignia,'V');
 const fighter=new Fighter(structuredClone(def));
 try{
  assert.equal(fighter.parts.cowl.visible,false);
  assert.equal(fighter.parts.emblem.visible,false);
  assert.equal(fighter.parts.insigniaFront?.name,'hero-insignia-v-front');
  assert.equal(fighter.parts.insigniaBack?.name,'hero-insignia-v-back');
  const front=fighter.parts.insigniaFront.geometry.attributes.position;
  const back=fighter.parts.insigniaBack.geometry.attributes.position;
  for(let i=0;i<front.count;i++)assert.ok(front.getZ(i)>0,'Front V crossed through the torso');
  for(let i=0;i<back.count;i++)assert.ok(back.getZ(i)<0,'Back V crossed through the torso');
 }finally{fighter.dispose();}
});
