import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

for(const status of [null,'stunT','staggerT','sleepT','downedT','frozenT']){
 test(`clinch contact rechecks ${status||'valid hold'} at resolution`,()=>{
  const x=mainCombatFixture({mode:'powerworld'});
  try{
   const f=x.p,v=x.foe({z:3});
   x.g.vfx.impact=()=>{}; // Canvas-only spark; contact and damage stay native.
   f._openSky=true;v._openSky=true;v.invuln=0;
   f.grabbing=v;v.grabbedBy=f;f.grabState='clinch';f.grabT=3;
   f._animate(0);v._animate(0);v.obj.updateMatrixWorld(true);
   const contact=v.parts.torso.getWorldPosition(new T.Vector3());
   f._clinchPunch={t:.15,hit:false,previous:contact.clone()};
   const hp=v.hp;
   // A different actor's contact can impose CC after update but before this
   // actor's deferred contact resolves. Use real anatomical collision/damage.
   if(status)f[status]=1;
   x.g.melee.resolveContact(f);
   if(status){
    assert.equal(v.hp,hp,'interrupted holder dealt a late body blow');
    assert.equal(f._clinchPunch,null);
    assert.equal(v.grabbedBy,null);
    assert.equal(f.grabbing,null);
   }
   else assert.ok(v.hp<hp,'valid held contact must still damage');
  }finally{x.close();}
 });
}
