import test from 'node:test';
import assert from 'node:assert/strict';
import bundled from '../src/data/locomotion-bank.json' with {type:'json'};
import {bindMotionPackage} from '../src/engine/motion-banks.js';
import {requestReload,updateFirearmReload,firearmAmmo} from '../src/engine/firearm-ammo.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot} from '../src/engine/abilities.js';

const pack=(ref,clipId,events)=>Object.freeze({ref,packageId:ref,packageHash:'fixture',source:Object.freeze({pack:'fixture'}),
 clips:Object.freeze({[clipId]:bundled.clips.walk}),metadata:Object.freeze({[clipId]:Object.freeze({id:clipId,events:Object.freeze(events)})})});

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
