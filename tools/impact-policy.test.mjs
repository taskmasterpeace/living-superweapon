import test from 'node:test';
import assert from 'node:assert/strict';
import {ImpactPolicy,impactView} from '../src/engine/impact-policy.js';
test('self status stays prominent, unrelated actor damage is compact and named',()=>{
 const player={name:'SOL'},other={name:'SARGE'},g={player},f={priority:76,word:'STUNNED!'};
 assert.equal(impactView(g,player,other,f).owner,'YOU');
 assert.equal(impactView(g,player,other,f).word,'STUNNED!');
 assert.equal(impactView(g,other,{},f).word,'');
 assert.equal(impactView(g,other,{},f).owner,'SARGE');
 assert.ok(impactView(g,player,other,f).size>impactView(g,other,{},f).size);
 assert.equal(impactView(g,other,player,f).relevant,true);
});
test('same actor repeats throttle while critical transition and other actor survive',()=>{
 const p=new ImpactPolicy(),a={},b={};
 assert.equal(p.admit(a,'hit',20,1),true);
 assert.equal(p.admit(a,'hit',20,1.4),false);
 assert.equal(p.admit(a,'stunned',76,1.1),true);
 assert.equal(p.admit(a,'hit',20,1.2),false);
 assert.equal(p.admit(b,'hit',20,1.2),true);
 assert.equal(p.admit(a,'stunned',76,2),true);
 p.clear();assert.equal(p.admit(a,'stunned',76,2),true);
});
