import test from 'node:test';import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {characterSees} from '../src/engine/character-sight.js';
import {AI} from '../src/engine/ai.js';

test('Highwall clear sight is not truncated to the arena visibility radius',()=>{
 const x=mainCombatFixture();try{const {g,w,p}=x,e=x.foe({x:0,z:900});
 g.characterSightRange=Infinity;p.pos.set(0,0,0);p.aim3.set(0,0,1);w.cover=[];
 assert.equal(characterSees(g,p,e),true);
 w.cover=[{x:0,z:400,hx:20,hz:4,bottom:0,top:48,h:48,finiteBuilding:true}];
 assert.equal(characterSees(g,p,e),false);
 p.pos.y=e.pos.y=60;assert.equal(characterSees(g,p,e),true);
 }finally{x.close();}
});

test('an NPC acquires its own visible foe even when the player cannot render that foe',()=>{
 const x=mainCombatFixture();try{const {g,p}=x;p.pos.set(-300,0,-300);p.team=0;
 const bot=x.foe({x:100,z:100,team:1}),target=x.foe({x:100,z:115,team:0});bot._highwallUnit=true;target._vis=0;bot.aim.set(0,0,1);bot.ai=new AI(bot);bot.ai.intent(1/60,g);
 assert.equal(bot.ai._sees,true);assert.ok(Math.abs(bot.ai.belief.z-target.pos.z)<.01);
 }finally{x.close();}
});

test('unseen-target route keeps remembered elevation without reading the new hidden position',()=>{
 const x=mainCombatFixture();try{const {g,p}=x;p.team=0;p.pos.set(100,90,100);
 const bot=x.foe({x:0,z:0,team:1});bot._highwallUnit=true;bot.blindT=2;bot.ai=new AI(bot);
 bot.ai.belief={x:40,y:24,z:60,t:0,src:'sight'};bot.ai._mem=5;
 const it=bot.ai.intent(1/60,g);assert.equal(it.navigationGoal.y,24);assert.notEqual(it.navigationGoal.y,p.pos.y);
 }finally{x.close();}
});
test('character sight rejects nearby allies behind walls and permits genuinely visible airborne targets',()=>{
 const x=mainCombatFixture();try{const {g,w,p}=x,e=x.foe({x:0,z:20});e.team=p.team;
 w.cover=[{x:0,z:10,hx:20,hz:2,bottom:0,top:48,h:48,finiteBuilding:true}];
 assert.equal(characterSees(g,p,e),false);
 p.pos.y=e.pos.y=60;assert.equal(characterSees(g,p,e),true);
 e.pos.z=-60;assert.equal(characterSees(g,p,e),false);
 e.pos.z=-10;assert.equal(characterSees(g,p,e),false,'Orbit cannot reveal someone behind the character, even nearby');
 e.pos.z=60;g.world._freeLook={yaw:Math.PI};assert.equal(characterSees(g,p,e),true,'Orbit must not turn character sight');
 p.blindT=1;assert.equal(characterSees(g,p,e),false);
 }finally{x.close();}
});
