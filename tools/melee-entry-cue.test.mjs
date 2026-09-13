import test from 'node:test';import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {meleeEntryCue} from '../src/engine/melee-entry-cue.js';
test('cue uses native family reach and disappears when combat is unavailable',()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'webline'});
 try{const {g,p}=x;g.running=true;const t=x.foe({z:27});p.aim3.set(0,0,1);
 assert.equal(meleeEntryCue(g).family,'pounce');t.pos.z=61;assert.equal(meleeEntryCue(g),null);t.pos.z=27;
 for(const [key,value]of [['guarding',true],['mstate','recover'],['stunT',1],['_carry',{}],['strikeCd',1],['_scoutVehicle',{}],['sleepT',1],['downedT',1]]){const old=p[key];p[key]=value;assert.equal(meleeEntryCue(g),null,key);p[key]=old;}
 t._vis=0;assert.equal(meleeEntryCue(g),null);t._vis=1;g.canSee=()=>false;assert.equal(meleeEntryCue(g),null);
 }finally{x.close();}
});
