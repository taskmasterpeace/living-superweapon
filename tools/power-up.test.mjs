import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot} from '../src/engine/abilities.js';
const mod=await import('../src/data/power-up.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('explicit named forms move out of attack slots with their complete authored effects intact',()=>{
 assert.equal(typeof mod.migratePowerUpDef,'function');
 const old={id:'sol',abilities:{lmb:{type:'projectile'},r:{type:'buff',name:'Solar Overload',cost:30,cd:22,mult:1.7,dur:12,heal:40,color:'#ffd24a'}}};
 const next=mod.migratePowerUpDef(old);assert.notEqual(next,old);assert.deepEqual(next.powerUp.ability,old.abilities.r);assert.equal(next.powerUp.sourceSlot,'r');assert.equal(next.abilities.r,undefined);assert.ok(old.abilities.r);assert.equal(mod.migratePowerUpDef(next),next);
 for(const [id,source]of Object.entries(mod.GENERIC_POWER_UPS)){const f=ROSTER.find(f=>f.id===id);assert.equal(f.powerUp.sourceSlot,source.slot,id);assert.equal(f.powerUp.ability.name,source.name,id);assert.equal(f.abilities[source.slot],undefined,id);}
});
test('utility heal, reveal, invulnerability, riposte and TEMPEST storm remain ordinary abilities',()=>{
 for(const [id,slot]of [['apex','f'],['sarge','f'],['sandra','q'],['webline','f'],['ripclaw','f'],['mystward','f'],['tempest','f'],['moses','f'],['breach','f']])assert.ok(ROSTER.find(f=>f.id===id).abilities[slot],id);
 const f={id:'cx_test',abilities:{f:{type:'buff',name:'Counter Stance',riposte:{dmg:30}}}};assert.equal(mod.migratePowerUpDef?.(f),f);
});
test('native second held gesture pays and activates a dedicated power-up exactly once; first hold changes no damage',()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'}),f=x.p;
 try{x.g.audio={...x.g.audio,yell(){}};assert.ok(f.powerUp);assert.equal(f.slots.r,undefined);f.ki=100;f.hp=f.maxHp-60;
 x.g.input.keys.add('ShiftLeft');for(let i=0;i<60;i++){x.control();x.g.input.endFrame();}assert.equal(f.powerBuff,1);assert.equal(f.ki,100);
 x.g.input.keys.clear();x.control();x.g.input.keys.add('ShiftLeft');for(let i=0;i<60;i++){x.control();x.g.input.endFrame();}
 assert.equal(f.ki,70);assert.equal(f.powerBuff,1.7);assert.equal(f.hp,f.maxHp-20);assert.ok(f.powerUp.cd>0);assert.ok(f.powerUp.activeT>0);assert.equal(f.flightTier,3);
 x.g.onMovementPowerupReady(f);assert.equal(f.ki,70,'Cooldown must block repeated requests');
 const power=f.powerBuff;runSlot(f,'r',{pressed:true,held:true,dt:1/60},x.g);assert.equal(f.powerBuff,power);assert.equal(f.ki,70);
 }finally{x.close();}
});
test('native dedicated action retains energy denial, incapacity, boxing and old unlock gates',()=>{
 const x=mainCombatFixture({hero:'kano',mode:'powerworld'}),f=x.p;let denied=0;x.g.onNoKi=()=>denied++;
 try{x.g.audio={...x.g.audio,yell(){}};assert.ok(f.powerUp);f.ki=0;x.g.onMovementPowerupReady(f);assert.equal(denied,1);assert.equal(f.powerUp.cd,0);
 f.ki=100;for(const flag of ['noPowers','staggerT','frozenT','grabbedBy']){f[flag]=true;x.g.onMovementPowerupReady(f);assert.equal(f.ki,100,flag);f[flag]=false;}
 f.def={...f.def,progression:{unlocks:{f:4}}};f.level=1;x.g.onMovementPowerupReady(f);assert.equal(f.ki,100);f.level=4;x.g.onMovementPowerupReady(f);assert.equal(f.ki,74);
 }finally{x.close();}
});
import {advancePowerUp,powerUpStatus} from '../src/core/power-up-state.js';
test('form HUD separates ready, active, cooldown, empty energy and unsupported; KO retires active form',()=>{
 const x=mainCombatFixture({hero:'kano',mode:'powerworld'}),f=x.p;
 try{x.g.audio={...x.g.audio,yell(){}};f.ki=100;assert.equal(powerUpStatus(f).kind,'ready');x.g.onMovementPowerupReady(f);assert.equal(powerUpStatus(f).kind,'active');advancePowerUp(f,12);assert.equal(powerUpStatus(f).kind,'cooldown');advancePowerUp(f,30);f.ki=0;assert.equal(powerUpStatus(f).kind,'energy');assert.equal(powerUpStatus({}).kind,'unsupported');
 f.ki=100;x.g.onMovementPowerupReady(f);assert.ok(f.powerUp.activeT>0);f._ko();assert.equal(f.powerUp.activeT,0);
 }finally{x.close();}
});
import {AI} from '../src/engine/ai.js';
test('native low-health bot requests a held form through the same semantic action',()=>{
 const x=mainCombatFixture({hero:'kano',mode:'powerworld'}),f=x.p;
 try{x.g.audio={...x.g.audio,yell(){}};f.ki=100;f.hp=f.maxHp*.3;f.ai=new AI(f);const target=x.foe({z:20});f.aim.set(0,0,1);f.aim3.set(0,0,1);
 let admitted=false;for(let i=0;i<120;i++){x.g.controlBot(f,1/60);if(f.powerUp.activeT>0){admitted=true;break;}}
 assert.equal(admitted,true);assert.ok(Math.abs(f.ki-(100-26-f.movementGear.holdTime*2))<1e-8,'Pay authored form cost plus ordinary moving gear-II travel');assert.equal(f.powerBuff,1.6);assert.equal(f._slotUse._powerUp,true);
 }finally{x.close();}
});
