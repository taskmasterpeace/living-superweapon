import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {TouchControls} from '../src/core/touch.js';
test('a touch tap between frames has one press frame then releases',()=>{const pad={},touch=new TouchControls(pad);touch.enabled=true;touch.pressButton('q');touch.releaseButton('q');touch.apply();assert.equal(pad.cur.q,true);touch.apply();assert.equal(pad.cur.q,undefined);assert.equal(pad.prev.q,true);});
test('cancelled touch cannot leave a queued shot',()=>{const pad={},touch=new TouchControls(pad);touch.enabled=true;touch.pressButton('q');touch.cancelButton('q');touch.apply();assert.equal(pad.cur.q,undefined);});
test('touch scope uses selected rifle without firing another ability',()=>{const x=mainCombatFixture({hero:'recon',mode:'powerworld'});try{x.p._openSky=true;x.p._selSlot='q';x.pad.active=true;x.pad.cur={scope:true};x.control();assert.equal(x.p._scopeHeld,true);assert.equal(x.p.slots.rmb.charging,false);x.pad.cur={};x.control();assert.equal(x.p._scopeHeld,false);}finally{x.close();}});
test('touch reload reaches physical selected magazine',()=>{const x=mainCombatFixture({hero:'recon',mode:'powerworld'});try{x.p._openSky=true;x.p._selSlot='q';x.p.slots.q.ammo={loaded:1,capacity:5,reserve:30,dryUntil:0};x.pad.active=true;x.pad.cur={reload:true};x.control();assert.equal(x.p._firearmReload?.key,'q');}finally{x.close();}});
