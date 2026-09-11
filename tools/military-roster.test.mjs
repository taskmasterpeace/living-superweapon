import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {Fighter} from '../src/engine/entity.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';

test('military kits instantiate equipped firearms and remain editable without acquiring superhuman traits',()=>{
 for(const id of ['merc','breach','recon']){
  const def=ROSTER.find(d=>d.id===id);assert.ok(def,`${id} is selectable`);
  const f=new Fighter(def);try{
   assert.equal(f.parts.armR.children[2].userData.gripOccupied,true,`${id} needs an actual held firearm`);
   assert.equal(f.def.flightTier,0);assert.ok(f.def.strength<=4);assert.ok(!f.def.energyInfinite);
   const p=validateProfile(profileFromDef(def));assert.equal(p.model.costume,'tactical');
   p.camera.cutaway=.4;const rebuilt=new Fighter(applyProfile(def,p));
   try{assert.equal(rebuilt.parts.armR.children[2].userData.gripOccupied,true);assert.equal(rebuilt.def.model.camera.cutaway,.4);}
   finally{rebuilt.dispose();}
  }finally{f.dispose();}
 }
});
