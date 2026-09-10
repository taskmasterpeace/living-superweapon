import test from 'node:test';
import assert from 'node:assert/strict';
import bundled from '../src/data/locomotion-bank.json' with {type:'json'};
import ual from '../public/authored-assets/motion.hero-ual/v1/pose-bank.json' with {type:'json'};
import ual2 from '../public/authored-assets/motion.hero-ual2/v1/pose-bank.json' with {type:'json'};
import ualManifest from '../public/authored-assets/motion.hero-ual/v1/manifest.json' with {type:'json'};
import ual2Manifest from '../public/authored-assets/motion.hero-ual2/v1/manifest.json' with {type:'json'};
import {bindMotionPackage} from '../src/engine/motion-banks.js';
import {requestReload,updateFirearmReload,firearmAmmo} from '../src/engine/firearm-ammo.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot} from '../src/engine/abilities.js';
import {animateReloadPose} from '../src/engine/reload-presentation.js';
import {animateThrowAction} from '../src/engine/throwable-action.js';

const pack=(ref,clipId,events)=>Object.freeze({ref,packageId:ref,packageHash:'fixture',source:Object.freeze({pack:'fixture'}),
 clips:Object.freeze({[clipId]:bundled.clips.walk}),metadata:Object.freeze({[clipId]:Object.freeze({id:clipId,events:Object.freeze(events)})})});
const realPack=(ref,bank,manifest,id)=>Object.freeze({ref,packageId:ref,packageHash:manifest.packageHash,source:Object.freeze(bank.source),
 clips:Object.freeze({[id]:Object.freeze(bank.clips[id])}),metadata:Object.freeze({[id]:Object.freeze(manifest.clips.find(c=>c.id===id))})});
const q=part=>part.quaternion.toArray();
const angle=(a,b)=>a.quaternion.angleTo(b.quaternion);

test('imported reload markers replace eject/insert timing while chamber remains a labeled procedural fallback',()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p,cues=[];x.g.audio={...x.g.audio,soundLibrary:{play:id=>cues.push(id)}};
 try{
  f.def.model={...f.def.model,assets:{motion:{reload:'fixture.reload@1'}}};
  bindMotionPackage(f,'reload',pack('fixture.reload@1','reload',[{t:.1,type:'mag-out'},{t:1.1,type:'mag-in'}]));
  const ammo=firearmAmmo(f.slots.lmb);ammo.loaded=1;assert.ok(requestReload(f,'lmb',x.g));const d=f._firearmReload.duration;
  updateFirearmReload(f,d*.1,x.g);assert.deepEqual(cues,['reload','reload-eject']);
  updateFirearmReload(f,d*.65,x.g);assert.deepEqual(cues,['reload','reload-eject']);
  updateFirearmReload(f,d*.2,x.g);assert.deepEqual(cues,['reload','reload-eject','reload-insert','reload-chamber']);
  updateFirearmReload(f,d,x.g);assert.equal(cues.filter(x=>x==='reload-chamber').length,1);assert.equal(f._firearmReload,null);
 }finally{x.close();}
});

test('imported grenade release marker changes only pose mapping; native launch and audio still commit once',()=>{
 const x=mainCombatFixture({hero:'sarge',mode:'powerworld'}),f=x.p,cues=[];x.g.audio={...x.g.audio,soundLibrary:{play:id=>cues.push(id)}};
 try{
  f.def.model={...f.def.model,assets:{motion:{grenade:'fixture.grenade@1'}}};
  bindMotionPackage(f,'grenade',pack('fixture.grenade@1','grenade-throw',[{t:.25,type:'grenade-release',side:'R'}]));
  runSlot(f,'rmb',{pressed:true,held:false,released:true,dt:1/60},x.g);const action=f._throwAction;
  for(let i=0;i<120;i++){f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);x.g.projectiles.resolveLaunches(x.g);}
  assert.equal(x.g.projectiles.list.length,1);assert.equal(action.released,true);
  assert.deepEqual(cues,['grenade-prepare','grenade-release']);
 }finally{x.close();}
});

test('real reload sampling changes the free arm while its action mask preserves excluded channels',()=>{
 const imported=mainCombatFixture({hero:'sarge'}),fallback=mainCombatFixture({hero:'sarge'}),a=imported.p,b=fallback.p;
 try{
 a.def.model={...a.def.model,assets:{motion:{reload:'motion.hero-ual@1'}}};
  bindMotionPackage(a,'reload',realPack('motion.hero-ual@1',ual,ualManifest,'reload'));
  for(const f of [a,b]){firearmAmmo(f.slots.lmb).loaded=1;assert.ok(requestReload(f,'lmb',f._game));updateFirearmReload(f,f._firearmReload.duration*.43,f._game);f._riflePose={active:true};}
  const excluded=Object.fromEntries(['body','head','legL','legR','armR'].map(key=>[key,q(a.parts[key])]));
  for(const f of [a,b])animateReloadPose(f);
  assert.ok(angle(a.parts.armL,b.parts.armL)>.01,'mirrored/imported support-arm articulation was not sampled');
  for(const key of Object.keys(excluded))assert.deepEqual(q(a.parts[key]),excluded[key],`${key} escaped the action mask`);
  assert.ok(Math.abs(a._firearmReload.sourcePhase-.43)<1e-12,'reload must sample the native reload clock');
 }finally{imported.close();fallback.close();}
});

test('real grenade sampling mirrors right-hand source onto Sarge left and maps release/recovery exactly',()=>{
 const imported=mainCombatFixture({hero:'sarge',mode:'powerworld'}),fallback=mainCombatFixture({hero:'sarge',mode:'powerworld'}),a=imported.p,b=fallback.p;
 try{
  a.def.model={...a.def.model,assets:{motion:{grenade:'motion.hero-ual2@1'}}};
  bindMotionPackage(a,'grenade',realPack('motion.hero-ual2@1',ual2,ual2Manifest,'grenade-throw'));
  for(const f of [a,b])runSlot(f,'rmb',{pressed:true,held:false,released:true,dt:1/60},f._game);
  const excluded=Object.fromEntries(['body','head','legL','legR','armR'].map(key=>[key,q(a.parts[key])]));
  const releaseEvent=ual2Manifest.clips.find(c=>c.id==='grenade-throw').events.find(e=>e.type==='grenade-release');
  const expectedRelease=releaseEvent.t/ual2.clips['grenade-throw'].duration;
  for(const f of [a,b]){f._throwAction.elapsed=f._throwAction.releaseAt;animateThrowAction(f);}
  assert.ok(angle(a.parts.armL,b.parts.armL)>.01,'right-hand source did not affect the mirrored left throwing arm');
  for(const key of Object.keys(excluded))assert.deepEqual(q(a.parts[key]),excluded[key],`${key} escaped the grenade mask`);
  assert.ok(Math.abs(a._throwAction.sourcePhase-expectedRelease)<1e-9,'configured releaseAt must land exactly on the source release marker');
  a._throwAction.elapsed=a._throwAction.releaseAt+a._throwAction.recovery*.5;animateThrowAction(a);
  assert.ok(Math.abs(a._throwAction.sourcePhase-(expectedRelease+(1-expectedRelease)*.5))<1e-9,'recovery must consume the remaining source take');
 }finally{imported.close();fallback.close();}
});
