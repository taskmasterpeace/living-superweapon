import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
const windowModule=await import('../src/engine/burst-window.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

// Plan/ownership: prove rolling-window failure here, implement standalone
// burst-window.js, then (only after main's source-edit grant) wire the existing
// Fighter accounting/reset hooks. No threshold, stun-duration or immunity tuning.
// Damage admission, update status clocks and applyStun are production methods.
// World motion / rendering are isolated: neither should decide a damage window.
function fixture(t){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')));
 Object.assign(f,{invuln:0,armor:0,resist:{},flying:true,flyHeld:true,
   _physics(){},_animate(){},_sync(){}});
 const src={def:{},pos:new THREE.Vector3(0,0,10)};
 const hit=(amount,opts={})=>f.takeDamage(amount,{src,dot:true,hitstop:0,dtype:'energy',...opts});
 const advance=(seconds,hz=60)=>{const steps=Math.round(seconds*hz);for(let i=0;i<steps;i++)f.update(seconds/steps,null);};
 t.after(()=>f.dispose());return{f,src,hit,advance};
}

for(const hz of [30,60,120])test(`slow chip never earns burst stun (${hz}Hz)`,t=>{
 const {f,hit,advance}=fixture(t);
 // Five 6HP hits span7.6s. Any trailing2s contains12HP, below Vega's28.8HP threshold.
 for(let i=0;i<5;i++){if(i)advance(1.9,hz);hit(6);assert.equal(f.stunT,0,'old chip was counted as recent burst damage');assert.equal(f.flying,true);}
 assert.equal(f.hp,90);assert.ok(Math.abs(f._burst-12)<1e-8);
});

test('concentrated admitted damage still stuns and drops flight at the unchanged threshold',t=>{
 const {f,hit,advance}=fixture(t);for(let i=0;i<4;i++){if(i)advance(.3);hit(6);assert.equal(f.stunT,0);}
 advance(.3);hit(6);assert.equal(f.hp,90);assert.equal(f.stunT,1.7/f.sheet.ccRecover);assert.equal(f.flying,false);assert.equal(f.flyHeld,false);assert.equal(f._burst,0);
});

test('each hit expires independently, including while hitstop owns the frame',t=>{
 const {f,hit}=fixture(t);hit(6);f.hitstop=8;f.update(1,null);hit(8);f.hitstop=8;f.update(1,null);
 assert.equal(f._burst,8,'the t=0 hit expires at2s despite the newer hit and hitstop');
 f.update(1,null);assert.equal(f._burst,0);assert.equal(f.stunT,0);
});

test('the trailing window crosses the first-hit boundary rather than resetting a fixed bucket',t=>{
 const {f,hit,advance}=fixture(t);hit(1);advance(1.9);hit(15);advance(.2);hit(15);
 assert.ok(f.stunT>0,'recent30HP must count together despite old first hit expiring');assert.equal(f.flying,false);
});

test('no simulation time means no aging, and a full quiet window removes all history',t=>{
 const {f,hit}=fixture(t);hit(12);for(let i=0;i<10;i++)f.update(0,null);assert.equal(f._burst,12);
 // No wall clock is consulted. A paused game does not advance Fighter.update.
 f.update(2.01,null);assert.equal(f._burst,0);hit(18);assert.equal(f.stunT,0);
});

test('post-stun immunity retains its duration but cannot bank expired damage',t=>{
 const {f,hit,advance}=fixture(t);hit(30);while(f.stunT>0)f.update(.01,null);assert.equal(f._stunImmune,4);
 for(let i=0;i<4;i++){if(i)advance(1);hit(6);assert.equal(f.stunT<=0,true);}
 advance(1.1);hit(6);assert.equal(f.stunT<=0,true,'damage that expired during immunity cannot stun after it');assert.ok(Math.abs(f._burst-12)<1e-8);
 hit(18);assert.ok(f.stunT>0,'a fresh real burst still stuns after immunity');
});

test('frozen status still ages old contacts before the fighter can be stunned again',t=>{
 const {f,hit,advance}=fixture(t);f.frozenT=3.5;
 for(let i=0;i<5;i++){if(i)advance(1);hit(6);assert.equal(f.stunT,0);}
 assert.ok(f.frozenT<=0);assert.ok(Math.abs(f._burst-12)<1e-8);
});

test('dummy, self, null-source, blocked and rejected hits never populate the burst history',t=>{
 for(const kind of ['dummy','self','null','guard','invulnerable','phase']){
  const {f,hit}=fixture(t);let opts={};
  if(kind==='dummy')f.isDummy=true;if(kind==='self')opts.src=f;if(kind==='null')opts.src=null;
  if(kind==='guard'){f.guarding=true;f.faceDir(0,1);}if(kind==='invulnerable')f.invuln=1;if(kind==='phase')f.phase=true;
  hit(30,opts);assert.equal(f._burst,0,kind);assert.equal(f.stunT,0,kind);assert.equal(f.flying,true,kind);
 }
});

test('KO and respawn cannot carry a previous life damage history',t=>{
 const {f,hit}=fixture(t);hit(12);f._ko();assert.equal(f._burst,0);
 f._updateKO(3.5,{vfx:{flash(){}}});f.invuln=0;f.flying=true;hit(18);
 assert.equal(f.stunT,0);assert.equal(f._burst,18);assert.equal(f.flying,true);
});

test('direct stun resets the burst history before another eligible contact',t=>{
 const {f,hit}=fixture(t);hit(12);f.applyStun();assert.equal(f._burst,0);hit(6);
 assert.equal(f._burst,6,'pre-stun history was cleared, not only its cached total');
});

test('window helper expires exact boundary contacts, coalesces simultaneous hits and clears on reset',()=>{
 const {recordBurstDamage:hit,advanceBurstWindow:step,resetBurstWindow:reset}=windowModule;
 assert.equal(typeof hit,'function');assert.equal(typeof step,'function');assert.equal(typeof reset,'function');
 const f={_burst:0,_burstT:0};hit(f,4);hit(f,5);step(f,1.9999);assert.equal(f._burst,9);
 step(f,.0001);assert.equal(f._burst,0);assert.equal(f._burstT,0);
 hit(f,7);step(f,NaN);step(f,-1);assert.equal(f._burst,7);reset(f);hit(f,3);step(f,1);assert.equal(f._burst,3);step(f,1);assert.equal(f._burst,0);
});

test('long continuous helper traffic keeps only the trailing window through queue compaction',()=>{
 const {recordBurstDamage:hit,advanceBurstWindow:step}=windowModule;assert.equal(typeof hit,'function');
 const f={_burst:0,_burstT:0};for(let i=0;i<4000;i++){step(f,.01);hit(f,1);}
 assert.equal(f._burst,200);step(f,2);assert.equal(f._burst,0);hit(f,2);assert.equal(f._burst,2);
});
