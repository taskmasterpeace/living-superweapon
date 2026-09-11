import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attackFields,setAttackOverride,applyAttackOverrides,validateAttackOverrides,resetAttackOverride} from '../src/data/attack-tuning.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {exportCharacter,importCharacter} from '../src/tool/character-package.js';
import {freshPicks,buildDef} from '../src/data/creator.js';
import {ROSTER} from '../src/data/characters.js';
import {Fighter} from '../src/engine/entity.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {StudioPreview} from '../src/tool/studio-preview.js';

const beam=(extra={})=>({abilities:{lmb:{type:'beam',name:'Pose fixture',...extra}}});
const poseField=(def,attacks={})=>attackFields(def,'lmb',attacks).find(field=>field.key==='castStyle');
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};};

test('beam pose choices follow the effective emitter, including explicit false overrides',()=>{
 for(const [source,choices] of [[{},['auto','palm','two-hand']],[{faceOrigin:true},['auto','optic-focus']],[{chest:true},['auto','chest-brace']],[{faceOrigin:true,chest:true},['auto','optic-focus']]]){
  const def=beam(source),field=poseField(def);
  assert.equal(field?.kind,'enum','Beam presentation must be selectable');
  assert.deepEqual(field.options.map(option=>option.value),choices);
  assert.equal(field.value,'auto');
 }
 const face=beam({faceOrigin:true});
 const hand=setAttackOverride({},face,'lmb',{faceOrigin:false,castStyle:'palm'});
 assert.deepEqual(poseField(face,hand).options.map(option=>option.value),['auto','palm','two-hand']);
 assert.equal(applyAttackOverrides(face,hand).abilities.lmb.faceOrigin,false);
 const faceAgain=setAttackOverride(hand,face,'lmb',{faceOrigin:true,castStyle:'auto'});
 assert.deepEqual(faceAgain,{},'Returning to the inferred source is a clean reset');
});

test('incompatible poses reject without rewriting emitter fields or accepting imported invalid pairs',()=>{
 for(const [source,style] of [[{},'optic-focus'],[{},'chest-brace'],[{faceOrigin:true},'two-hand'],[{faceOrigin:true},'palm'],[{chest:true},'optic-focus'],[{chest:true},'palm']]){
  assert.throws(()=>setAttackOverride({},beam(source),'lmb',{castStyle:style}),/castStyle.*emitter/i);
 }
 const def=beam({faceOrigin:true}),attacks=setAttackOverride({},def,'lmb',{castStyle:'optic-focus'}),before=structuredClone(attacks);
 assert.throws(()=>setAttackOverride(attacks,def,'lmb',{faceOrigin:false}),/castStyle.*emitter/i);
 assert.deepEqual(attacks,before);
 const invalid=structuredClone(attacks);invalid.lmb.values.faceOrigin=false;
 assert.throws(()=>validateAttackOverrides(invalid),/castStyle.*emitter/i);
 for(const value of ['unknown',null,1,true])assert.throws(()=>setAttackOverride({},def,'lmb',{castStyle:value}),/castStyle/i);
 assert.equal(applyAttackOverrides(def,attacks).abilities.lmb.faceOrigin,true);
});

test('legacy two-hand defaults can opt into automatic pose then reset to their source',()=>{
 const def=beam({castStyle:'two-hand'});
 assert.equal(poseField(def).value,'two-hand');
 const auto=setAttackOverride({},def,'lmb',{castStyle:'auto'});
 assert.equal(applyAttackOverrides(def,auto).abilities.lmb.castStyle,'auto');
 assert.equal(applyAttackOverrides(def,resetAttackOverride(auto,'lmb')).abilities.lmb.castStyle,'two-hand');
});

test('authored beam poses survive validated profiles and character export/import',()=>{
 for(const [power,style] of [['heatray','palm'],['wavecannon','two-hand'],['opticblast','optic-focus']]){
  const picks={...freshPicks(),name:'POSE TEST',budget:'unbound',slots:{lmb:power,rmb:'kibolt',q:null,e:null,f:null,r:null}};
  const def=buildDef(picks,'cx_pose_test'),profile=profileFromDef(def);
  profile.attacks=setAttackOverride(profile.attacks,def,'lmb',{castStyle:style});
  const validated=validateProfile(JSON.parse(JSON.stringify(profile)));
  assert.equal(applyProfile(def,validated).abilities.lmb.castStyle,style);
  const file=exportCharacter({picks,def},validated),loaded=importCharacter(JSON.parse(JSON.stringify(file)),[],memory());
  assert.equal(loaded.def.abilities.lmb.castStyle,style);
  assert.equal(loaded.def.abilities.lmb.faceOrigin,def.abilities.lmb.faceOrigin);
  assert.equal(profileFromDef(loaded.def).attacks.lmb.values.castStyle,style);
 }
});

test('real Reactor Burst charge offers chest bracing and validates emitter switches',()=>{
 const titan=ROSTER.find(hero=>hero.id==='titan'),field=attackFields(titan,'q').find(field=>field.key==='castStyle');
 assert.equal(field?.kind,'enum','The shipped chest charge must expose attack presentation');
 assert.deepEqual(field.options.map(option=>option.value),['auto','chest-brace']);
 const profile=profileFromDef(titan);profile.attacks=setAttackOverride(profile.attacks,titan,'q',{castStyle:'chest-brace'});
 const applied=applyProfile(titan,validateProfile(JSON.parse(JSON.stringify(profile))));
 assert.equal(applied.abilities.q.castStyle,'chest-brace');assert.equal(applied.abilities.q.chest,true);
 assert.throws(()=>setAttackOverride(profile.attacks,titan,'q',{chest:false}),/castStyle.*emitter/i);
 const hand=setAttackOverride(profile.attacks,titan,'q',{chest:false,castStyle:'palm'});
 assert.deepEqual(attackFields(titan,'q',hand).find(field=>field.key==='castStyle').options.map(option=>option.value),['auto','palm','two-hand']);
 assert.equal(applyAttackOverrides(titan,hand).abilities.q.chest,false);
 const twoHand=setAttackOverride(hand,titan,'q',{castStyle:'two-hand'});
 assert.equal(applyAttackOverrides(titan,twoHand).abilities.q.castStyle,'two-hand');
 assert.throws(()=>setAttackOverride(twoHand,titan,'q',{chest:true}),/castStyle.*emitter/i);
 assert.throws(()=>setAttackOverride({},titan,'q',{castStyle:'optic-focus'}),/castStyle.*emitter/i);
 const bad=structuredClone(hand);bad.q.values.castStyle='chest-brace';
 assert.throws(()=>validateAttackOverrides(bad),/castStyle.*emitter/i);
});

test('Creator Chest Unibeam pose survives character export/import with its real charge emitter',()=>{
 const picks={...freshPicks(),name:'CHEST TEST',budget:'unbound',slots:{lmb:'heatray',rmb:'kibolt',q:'unibeam',e:null,f:null,r:null}};
 const def=buildDef(picks,'cx_chest_test'),profile=profileFromDef(def);
 assert.equal(def.abilities.q.type,'charge');assert.equal(def.abilities.q.chest,true);
 profile.attacks=setAttackOverride(profile.attacks,def,'q',{castStyle:'chest-brace'});
 const file=exportCharacter({picks,def},validateProfile(profile));
 const loaded=importCharacter(JSON.parse(JSON.stringify(file)),[],memory());
 assert.equal(loaded.def.abilities.q.castStyle,'chest-brace');assert.equal(loaded.def.abilities.q.chest,true);
 assert.equal(profileFromDef(loaded.def).attacks.q.values.castStyle,'chest-brace');
 assert.equal(loaded.def.abilities.q.dmgMax,def.abilities.q.dmgMax,'Pose selection must not change the charged attack payload');
});

function encounter(mode='beam',motion='hover'){
 const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),def=structuredClone(ROSTER.find(hero=>hero.id==='sol'));
 // Keep production contact effects real without requesting a browser canvas in Node.
 combat.game.vfx._itex=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 const fighter=new Fighter(def);fighter._openSky=true;fighter.flying=true;fighter.gait='airborne';fighter._flyPose=1;fighter.pos.set(0,80,0);scene.add(fighter.obj);
 combat.shooterMotion=motion;combat.reset(fighter,true,mode);
 return {combat,fighter,close(){combat.game.vfx._itex.dispose();combat.dispose();fighter.dispose();}};
}

test('grounded shooter inspection moves the real Fighter while a stationary target stays fixed',()=>{
 for(const [motion,axis,sign] of [['ground-left','x',-1],['ground-right','x',1],['ground-forward','z',1]]){
  const fixture=encounter('beam',motion),{combat,fighter}=fixture;
  try{
   const target=combat.target.pos.clone();
   for(let frame=1;frame<=72;frame++)combat.step(frame/60,1/60);
   assert.equal(fighter.grounded,true,'Ground review must drive the production ground gait');
   assert.equal(fighter.flying,false);assert.equal(fighter.pos.y,0);assert.ok(sign*fighter.pos[axis]>2);assert.ok(sign*fighter.vel[axis]>2);
   assert.ok(combat.target.pos.distanceTo(target)<1e-8,'Stationary measurement target cannot follow the shooter');
   assert.ok(fighter.aimWorld.distanceTo(target.clone().add(new THREE.Vector3(0,5.2,0)))<1e-8);
   assert.ok(fighter.aim3.dot(target.clone().sub(fighter.pos).normalize())>.999);
   assert.ok(fighter._groundMotion?.take,'Real source gait must run during the production beam');
   assert.ok(Object.values(fighter.slots).some(slot=>slot.def.type==='beam'&&slot.active),'Actual slot input still fires');
   const before=fighter.pos.clone();combat.step(1.2,0);assert.ok(fighter.pos.distanceTo(before)<1e-8,'Paused rendering cannot move the fixture');
   for(const time of [0,2,4,6,8]){combat.place(time);assert.ok(Math.hypot(fighter.pos.x,fighter.pos.z)<=18.001,'Inspection path must remain bounded');}
  }finally{fixture.close();}
 }
});

test('hover inspection preserves the airborne source and target path',()=>{
 const fixture=encounter('attack'),{combat,fighter}=fixture;
 try{
  combat.motion='pass-left';combat.place(2.1);
  assert.equal(fighter.pos.y,80);assert.equal(fighter.flying,true);assert.deepEqual(fighter.vel.toArray(),[0,0,0]);
  assert.ok(Math.abs(combat.target.pos.z-25)<1e-8);assert.equal(combat.target.pos.x,-3);assert.equal(combat.pathVelocity.z,-70);
 }finally{fixture.close();}
});

test('public preview settings accept grounded motion and reject unknown values without changing state',()=>{
 const fixture=encounter(),{combat}=fixture;
 const preview=Object.assign(Object.create(StudioPreview.prototype),{combat,time:0,seek(){}});
 try{
  assert.equal(preview.setCombat({shooterMotion:'ground-left'}),true);assert.equal(combat.shooterMotion,'ground-left');
  assert.equal(preview.setCombat({shooterMotion:'teleport'}),false);assert.equal(combat.shooterMotion,'ground-left');
  assert.equal(preview.setCombat({elevation:-10}),false,'Ground test targets cannot be placed below the stage');
  assert.equal(preview.setCombat({shooterMotion:'hover',elevation:-10}),true);
 }finally{fixture.close();}
});

for(const [motion,axis,sign]of [['air-left','x',-1],['air-right','x',1],['air-forward','z',1]])
test(`${motion} rehearsal moves the production airborne fighter against an anchored target`,()=>{
 const fixture=encounter('beam',motion),{combat,fighter}=fixture;
 const preview=Object.assign(Object.create(StudioPreview.prototype),{combat,time:0,seek(){}});
 try{
  assert.equal(preview.setCombat({shooterMotion:motion,elevation:-20}),true,'airborne review must permit downward shots');
  combat.place(0);const target=combat.target.pos.clone();
  for(let frame=1;frame<=72;frame++)combat.step(frame/60,1/60);
  assert.equal(fighter.flying,true);assert.equal(fighter.grounded,false);assert.equal(fighter.pos.y,80);
  assert.ok(sign*fighter.pos[axis]>2&&sign*fighter.vel[axis]>2,'the airborne rehearsal must actually travel');
  assert.ok(combat.target.pos.distanceTo(target)<1e-8,'stationary target cannot move with the shooter');
  assert.ok(fighter.slots.lmb.active?.sustaining,'the rehearsal must run the real attack');
  const before=fighter.pos.clone();combat.step(1.2,0);assert.ok(fighter.pos.distanceTo(before)<1e-8);
  for(const time of [0,2,4,6,8]){combat.place(time);assert.ok(Math.hypot(fighter.pos.x,fighter.pos.z)<=18.001);assert.equal(fighter.pos.y,80);}
  assert.equal(preview.setCombat({shooterMotion:'ground-left',elevation:-20}),false,'ground target floor validation remains');
 }finally{fixture.close();}
});
