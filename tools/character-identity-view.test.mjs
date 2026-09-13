import test from 'node:test';import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {characterIdentityView} from '../src/engine/character-identity-view.js';
test('identity labels reflect current traversal without deriving class from power rank',()=>{
 const view=id=>characterIdentityView(ROSTER.find(d=>d.id===id));
 assert.equal(view('volt').movement,'Momentum glide');assert.equal(view('rage').movement,'Charged leap');
 assert.equal(view('webline').movement,'Grapple');assert.equal(view('sol').movement,'Flight');
 assert.equal(view('sarge').classLabel,'Soldier');assert.equal(view('sol').classLabel,'LSW');
 assert.equal(characterIdentityView({archetype:'soldier',flightTier:0,threat:'Extreme'}).classLabel,'Soldier');
 assert.equal(characterIdentityView({flightTier:2,glider:true}).movement,'Levitation / Glide');
 assert.equal(characterIdentityView({}).movement,'Flight');
 for(const def of ROSTER)assert.ok(characterIdentityView(def).shortMovement);
});
