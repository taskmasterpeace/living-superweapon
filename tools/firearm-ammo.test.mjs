import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import * as ammo from '../src/engine/firearm-ammo.js';
import {setAttackOverride,applyAttackOverrides} from '../src/data/attack-tuning.js';

function fixture(weapon='rifle'){
 const def=structuredClone(ROSTER.find(d=>d.id==='sarge'));
 def.abilities={lmb:{type:'rifle',name:'Test firearm',weapon,magazine:3,reserveAmmo:5,reloadTime:2,cost:0,interval:.1,damage:3,speed:180,recoil:0,spread:0}};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[f];f._game=g;f.ki=0;f.level=10;f.aim3.set(0,0,1);
 const cues=[];g.audio={...g.audio,gunshot(){},soundLibrary:{play:(id)=>cues.push(id)}};
 const fire=()=>{f.slots.lmb.cd=0;runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:.1},g);};
 return {f,g,combat,fire,cues,close(){combat.dispose();f.dispose();}};
}
test('physical magazine fires at zero energy and empty trigger starts reload without extra round',()=>{
 const x=fixture();try{for(let i=0;i<4;i++)x.fire();assert.equal(x.g.projectiles.list.length,3);assert.equal(x.f.ki,0);assert.equal(x.f.slots.lmb.ammo.loaded,0);assert.equal(x.f.slots.lmb.ammo.reserve,5);assert.ok(x.f._firearmReload);assert.equal(x.cues.filter(c=>c==='empty').length,1);}finally{x.close();}
});
test('reload transfers only available reserve at completion and phases occur once',()=>{
 const x=fixture();try{x.fire();assert.equal(ammo.requestReload(x.f,'lmb',x.g),true);for(let i=0;i<19;i++)ammo.updateFirearmReload(x.f,.1,x.g);assert.equal(x.f.slots.lmb.ammo.loaded,2);ammo.updateFirearmReload(x.f,.11,x.g);assert.deepEqual([x.f.slots.lmb.ammo.loaded,x.f.slots.lmb.ammo.reserve],[3,4]);assert.equal(x.f._firearmReload,null);assert.deepEqual(x.cues,['reload','reload-eject','reload-insert','reload-chamber']);}finally{x.close();}
});
test('shotgun spends one shell for its pellet fan, and reload cannot create ammunition',()=>{
 const x=fixture('shotgun');try{x.fire();assert.equal(x.g.projectiles.list.length,8);assert.equal(x.f.slots.lmb.ammo.loaded,2);x.f.slots.lmb.ammo.reserve=1;x.fire();x.fire();ammo.requestReload(x.f,'lmb',x.g);ammo.updateFirearmReload(x.f,3,x.g);assert.deepEqual([x.f.slots.lmb.ammo.loaded,x.f.slots.lmb.ammo.reserve],[1,0]);}finally{x.close();}
});
for(const cause of ['staggerT','frozenT','grabbedBy','_aircraftVehicle'])test(`${cause} interrupts reload without delayed ammo or sound`,()=>{
 const x=fixture();try{x.fire();ammo.requestReload(x.f,'lmb',x.g);x.f[cause]=1;ammo.updateFirearmReload(x.f,3,x.g);assert.equal(x.f._firearmReload,null);assert.equal(x.f.slots.lmb.ammo.loaded,2);assert.deepEqual(x.cues,['reload']);}finally{x.f[cause]=0;x.close();}
});
test('reload holds hands against firing and repeated requests do not restart it',()=>{
 const x=fixture();try{x.fire();ammo.requestReload(x.f,'lmb',x.g);ammo.updateFirearmReload(x.f,.5,x.g);assert.equal(ammo.requestReload(x.f,'lmb',x.g),false);x.fire();assert.equal(x.g.projectiles.list.length,1);assert.equal(x.f._firearmReload.elapsed,.5);}finally{x.close();}
});
test('Studio firearm overrides reach magazine capacity, reserve and reload duration',()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='sarge'));
 const overrides=setAttackOverride({},def,'lmb',{magazine:7,reserveAmmo:21,reloadTime:3});
 const authored=applyAttackOverrides(def,overrides),f=new Fighter(authored);try{const st=ammo.firearmAmmo(f.slots.lmb);assert.deepEqual([st.loaded,st.reserve,st.capacity],[7,21,7]);assert.throws(()=>setAttackOverride({},def,'lmb',{magazine:2.5}));}finally{f.dispose();}
});
test('respawning restores physical ammunition once for the new life',()=>{
 const x=fixture();try{x.fire();x.f.slots.lmb.ammo.reserve=0;x.f.koT=4;x.f._updateKO(0,x.g);assert.deepEqual([x.f.slots.lmb.ammo.loaded,x.f.slots.lmb.ammo.reserve],[3,5]);}finally{x.close();}
});
test('explicit zero-cost energy rifles do not silently cost two energy',()=>{
 const x=fixture();try{delete x.f.slots.lmb.def.magazine;x.fire();assert.equal(x.g.projectiles.list.length,1);assert.equal(x.f.ki,0);}finally{x.close();}
});
test('Studio attack playback advances the same reload instead of leaving a permanent empty gun',()=>{
 const x=fixture();try{x.combat.reset(x.f,true,'attack');x.fire();ammo.requestReload(x.f,'lmb',x.g);for(let i=0;i<130;i++)x.combat.step(10+i/60,1/60);assert.equal(x.f._firearmReload,null);assert.equal(x.f.slots.lmb.ammo.loaded,3);assert.equal(x.f.slots.lmb.ammo.reserve,4);}finally{x.close();}
});
test('restarting Studio rehearsal resets ammunition just as it resets the energy budget',()=>{
 const x=fixture();try{x.combat.reset(x.f,true,'attack');x.fire();x.combat.reset(x.f,true,'attack');assert.equal(x.f.slots.lmb.ammo.loaded,3);}finally{x.close();}
});
