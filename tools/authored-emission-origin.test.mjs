import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROSTER} from '../src/data/characters.js';
import {attackFields,setAttackOverride,applyAttackOverrides,attackOverridesFromDef} from '../src/data/attack-tuning.js';
import {castHandMask} from '../src/engine/cast-channels.js';
import {disjointCombatFixture} from './helpers/disjoint-combat-fixture.mjs';
import {profileFromDef,validateProfile} from '../src/tool/studio-profile.js';
import {freshPicks,buildDef} from '../src/data/creator.js';
import {exportCharacter,importCharacter} from '../src/tool/character-package.js';
import {Fighter} from '../src/engine/entity.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';

test('Studio beam origin chooses physical left-hand data without changing the source kit',()=>{
 const source=structuredClone(ROSTER.find(d=>d.id==='sol')),before=JSON.stringify(source);
 assert.ok(attackFields(source,'lmb').some(f=>f.key==='emissionOrigin'),'Missing physical origin control');
 const overrides=setAttackOverride({},source,'lmb',{emissionOrigin:'left'}),applied=applyAttackOverrides(source,overrides);
 assert.equal(applied.abilities.lmb.faceOrigin,false);assert.equal(applied.abilities.lmb.chest,false);
 assert.equal(applied.abilities.lmb.castHand,'left');assert.equal(applied.abilities.lmb.castStyle,'palm');
 assert.deepEqual(attackOverridesFromDef(applied),overrides);assert.deepEqual(applyAttackOverrides(applied,{}),source);
 assert.equal(JSON.stringify(source),before);
});

for(const body of ['procedural','superhero-male','superhero-female'])for(const origin of ['left','right',undefined])test(`Studio ${origin??'legacy palm'} means the actor's side on ${body}, not a mirrored rig name`,()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.abilities.lmb.faceOrigin=false;def.model={...def.model,body};
 const applied=origin?applyAttackOverrides(def,setAttackOverride({},def,'lmb',{emissionOrigin:origin})):def;
 const f=new Fighter(applied);f.obj.updateMatrixWorld(true);
 try{
  // The face looks along local +Z. Up cross forward is the actor's left.
  const face=f.parts.eyeL.getWorldPosition(new THREE.Vector3()).add(f.parts.eyeR.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
  const head=f.parts.head.getWorldPosition(new THREE.Vector3()),forward=face.sub(head);forward.y=0;forward.normalize();
  const left=new THREE.Vector3(0,1,0).cross(forward).normalize();
  const mask=castHandMask(f,f.slots.lmb.def),arm=mask===1?f.parts.armL:f.parts.armR;
  const shoulder=arm.getWorldPosition(new THREE.Vector3()).sub(f.parts.body.getWorldPosition(new THREE.Vector3()));
  assert.ok(shoulder.dot(left)*(origin==='right'?-1:1)>0,'The editor selected the opposite anatomical shoulder');
  if(body!=='procedural'){
   const bone=f.parts.skin.skeleton.bones.find(b=>b.name===(origin==='right'?'hand_r':'hand_l'));
   assert.ok(bone.getWorldPosition(new THREE.Vector3()).distanceTo(arm.children[2].getWorldPosition(new THREE.Vector3()))<.3,'The selected source-skin hand disagrees with the emitter');
  }
 }finally{f.dispose();}
});

for(const castHand of ['left','right',undefined])test(`native martial charge honors explicit ${castHand??'kit default'} hand through gathering and release`,()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));if(castHand)def.abilities.lmb.castHand=castHand;
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,cover:[],heightAt:()=>0,ARENA:240,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;f._game=g;g.entities=[f];scene.add(f.obj);f._openSky=true;f.energyInfinite=true;
 f.pos.set(0,40,0);f.obj.position.copy(f.pos);f.flying=true;f.gait='airborne';f.aimWorld.set(0,45,100);f.hasAimWorld=true;f.aim3.set(0,0,1);
 const step=()=>{f.advanceActionPose(1/60);f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);g.projectiles.update(1/60,g);};
 const source=()=>{const a=f.parts.armL.children[2].getWorldPosition(new THREE.Vector3()),b=f.parts.armR.children[2].getWorldPosition(new THREE.Vector3());return castHand==='left'?b:castHand==='right'?a:a.add(b).multiplyScalar(.5);};
 try{
  assert.equal(castHandMask(f,f.slots.lmb.def),castHand==='left'?2:castHand==='right'?1:3);
  for(let i=0;i<60;i++)step();
  for(let i=0;i<60;i++){runSlot(f,'lmb',{pressed:i===0,held:true,released:false,dt:1/60},g);step();}
  assert.ok(f.slots.lmb.orb.position.distanceTo(source())<1e-5,'Martial fallback overrode a selected palm');
  runSlot(f,'lmb',{pressed:false,held:false,released:true,dt:1/60},g);for(let i=0;i<60;i++)step();
  const beam=f.slots.lmb.active;assert.ok(beam?.emissionAge>0);assert.equal(beam.combinedHands,!castHand);
  assert.ok(beam.muzzle.distanceTo(source())<1e-5);
 }finally{combat.dispose();f.dispose();}
});

test('Kit default restores original emitter and pose while retaining unrelated damage tuning',()=>{
 const source={abilities:{lmb:{type:'beam',name:'Eyes',faceOrigin:true,castStyle:'optic-focus',dps:60}}};
 let overrides=setAttackOverride({},source,'lmb',{faceOrigin:false,castStyle:'palm',dps:80});
 overrides=setAttackOverride(overrides,source,'lmb',{emissionOrigin:'left'});
 assert.ok(!attackFields(source,'lmb',overrides).some(field=>['faceOrigin','chest'].includes(field.key)),'Ignored legacy emitter switches remain editable');
 overrides=setAttackOverride(overrides,source,'lmb',{emissionOrigin:'auto'});
 assert.deepEqual(overrides.lmb.values,{dps:80});
 assert.deepEqual(applyAttackOverrides(source,overrides).abilities.lmb,{...source.abilities.lmb,dps:80});
});

for(const origin of ['left','right','paired','chest','eyes'])test(`custom-character package preserves ${origin} beam and charged origins`,()=>{
 const picks={...freshPicks(),name:'ORIGIN TEST',budget:'unbound',slots:{lmb:'heatray',rmb:'kibolt',q:'unibeam',e:null,f:null,r:null}};
 const def=buildDef(picks,'cx_emitter_test'),profile=profileFromDef(def);
 for(const slot of ['lmb','q'])profile.attacks=setAttackOverride(profile.attacks,def,slot,{emissionOrigin:origin});
 const file=exportCharacter({picks,def},validateProfile(profile)),data=new Map();
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};
 const loaded=importCharacter(JSON.parse(JSON.stringify(file)),[],storage);
 for(const slot of ['lmb','q']){
  assert.equal(profileFromDef(loaded.def).attacks[slot].values.emissionOrigin,origin);
  const ability=loaded.def.abilities[slot];
  assert.equal(ability.faceOrigin,origin==='eyes');assert.equal(ability.chest,origin==='chest');
  assert.equal(ability.castHand,origin==='left'?'left':'right');
  assert.equal(ability.castStyle,origin==='paired'?'two-hand':origin==='eyes'?'optic-focus':origin==='chest'?'chest-brace':'palm');
  assert.equal(ability.dmgMax,def.abilities[slot].dmgMax,'Emitter choice changes paid power');
 }
});

for(const type of ['beam','charge'])for(const [origin,face,chest,style,hand]of [
 ['left',false,false,'palm','left'],['right',false,false,'palm','right'],['paired',false,false,'two-hand','right'],
 ['chest',false,true,'chest-brace','right'],['eyes',true,false,'optic-focus','right'],
])test(`portable ${type} origin ${origin} reaches native emitter flags and restores its basis`,()=>{
 const source=structuredClone(ROSTER.find(d=>d.id==='sol'));
 source.abilities.lmb={type,name:'Authored power',color:'#ffb844',faceOrigin:true,castStyle:'optic-focus'};
 const overrides=setAttackOverride({},source,'lmb',{emissionOrigin:origin}),applied=applyAttackOverrides(source,overrides),attack=applied.abilities.lmb;
 assert.equal(attack.faceOrigin,face);assert.equal(attack.chest,chest);assert.equal(attack.castStyle,style);assert.equal(attack.castHand,hand);
 assert.deepEqual(attackOverridesFromDef(applied),overrides);
 assert.deepEqual(applyAttackOverrides(applied,{}),source);
 assert.deepEqual(applyAttackOverrides(source,JSON.parse(JSON.stringify(overrides))),applied);
});

for(const motion of ['stand','walk','jog','strafe','hover','fly','rise','descend'])test(`left palm beam originates and braces on the left during ${motion}`,()=>{
 const x=disjointCombatFixture({motion}),{f,dt}=x;
 try{
  f.slots.lmb.def.castHand='left';
  assert.equal(castHandMask(f,f.slots.lmb.def),2,'The anatomical right hand owns a left-hand beam');
  for(let i=0;i<60;i++)x.step();x.start('lmb');const beam=f.slots.lmb.active;
  let emitting=0;
  for(let i=0;i<120;i++){
   x.step();if(beam.pendingLaunch)continue;emitting++;
   const hand=f.parts.armR.children[2],position=hand.getWorldPosition(new THREE.Vector3());
   assert.ok(beam.muzzle.distanceTo(position)<1e-5,'Beam detached from the authored left hand');
   const normal=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(normal.dot(beam.dir)>.99,'Left palm does not face its emitted stream');
   assert.ok(hand.morphTargetInfluences[0]>=.7,'Left beam emits before the palm opens');
  }
  assert.ok(emitting>90,`Left emitter failed to start promptly at ${dt}s steps`);
 }finally{x.close();}
});

for(const motion of ['stand','walk','jog','strafe','hover','fly','rise','descend'])for(const order of ['normal','reverse'])
test(`two separate palm beams retain their own hands: ${motion}, ${order}`,()=>{
 const x=disjointCombatFixture({motion,order}),{f}=x;
 try{
  Object.assign(f.slots.rmb.def,{type:'beam',castHand:'right',steer:12});
  for(let i=0;i<60;i++)x.step();x.start('lmb');x.start('rmb');
  for(let i=0;i<140;i++){
   if(i===70){f.aimWorld.set(30,f.pos.y+20,80);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();}
   x.step();if(i<30)continue;
   for(const [key,arm]of [['lmb',f.parts.armR],['rmb',f.parts.armL]]){
    const beam=f.slots[key].active,hand=arm.children[2];assert.ok(beam&&!beam.pendingLaunch,'A disjoint hand failed to emit');
    assert.ok(beam.muzzle.distanceTo(hand.getWorldPosition(new THREE.Vector3()))<1e-5,'Stream uses another hand');
    const normal=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(normal.dot(beam.dir)>.99,'A stream stole the other palm’s direction');
   }
  }
  const left=f.slots.rmb.active;x.stop('lmb');for(let i=0;i<40;i++)x.step();
  assert.equal(f.slots.rmb.active,left);assert.ok(left.sustaining&&!left.dead,'Releasing one hand stops the other');
 }finally{x.close();}
});

for(const rightFirst of [false,true])test(`charged anatomical right beam waits for its own release brace beside a left stream, right first ${rightFirst}`,()=>{
 const x=disjointCombatFixture({motion:'hover'}),{f}=x;
 try{
  Object.assign(f.slots.rmb.def,{type:'beam',castHand:'right',charge:true,maxCharge:10});
  for(let i=0;i<60;i++)x.step();x.start(rightFirst?'rmb':'lmb');for(let i=0;i<40;i++)x.step();x.start(rightFirst?'lmb':'rmb');
  for(let i=0;i<70;i++)x.step();assert.ok(f.slots.rmb.charging);assert.ok(f.slots.lmb.active?.emissionAge>0);
  x.stop('rmb');const left=f.slots.rmb.active;let fired=false;
  for(let i=0;i<60;i++){
   x.step();if(!left.pendingLaunch){fired=true;assert.ok(f._combatAim.armChannels[0].gather<=.2,'The other beam bypassed this hand’s gathering-to-brace transition');}
  }
  assert.ok(fired,'The released charge remains stuck behind the other beam');
 }finally{x.close();}
});
