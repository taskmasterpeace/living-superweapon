import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
const vega=()=>structuredClone(ROSTER.find(d=>d.id==='vega'));

test('legacy Vega profiles keep their procedural body and standard surface when new fields are absent',()=>{
 const def=vega(),profile=profileFromDef(def);delete profile.model.surface;delete profile.model.body;
 const applied=applyProfile(def,profile),f=new Fighter(applied);
 try{assert.ok(!f.parts.skin,'A legacy profile must retain procedural anatomy');assert.ok(!f.parts.mats.suit.map,'A legacy profile must retain standard materials');assert.notEqual(f.parts.mats.suit.color.getHexString(),f.parts.mats.suit2.color.getHexString());}
 finally{f.dispose();}
 const normalized=validateProfile(profile);assert.equal(normalized.model.surface,'standard');assert.equal(normalized.model.body,'procedural');
});

test('metal characters can explicitly wear the same field material preset',()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='titan'));def.model={...def.model,surface:'field',costume:'plated'};
 const f=new Fighter(def);try{assert.ok(f.parts.mats.suit.map?.isTexture);assert.ok(f.parts.mats.armor.metalness<.25);assert.ok(!f.obj.getObjectByName('costume-collar'));}finally{f.dispose();}
});

test('default Vega renders source anatomy on native drivers with distinct cloth and ceramic surfaces',()=>{
 const f=new Fighter(vega());
 try{
  assert.equal(f.parts.skin?.id,'superhero-male');
  const palette=f.parts.skin.materials.body.heroPalette;
  assert.equal(palette.skinLegs.value.getHexString(),f.parts.mats.suit.color.getHexString());
  assert.notEqual(palette.skinLegs.value.getHexString(),f.parts.mats.armor.color.getHexString());
  assert.ok(f.parts.mats.armor.metalness<.25);assert.ok(f.parts.mats.suit.map?.isTexture);
  assert.ok(!f.obj.getObjectByName('costume-collar'),'Flight must not hide the head behind a tall metal collar');
  f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=150;f.vel.set(0,0,65);f.aim.set(0,0,1);f.aim3.copy(f.aim);
  for(let i=0;i<120;i++)f._animate(1/60);
  const hands=['armL','armR'].map(k=>f.parts[k].children[2].getWorldPosition(new THREE.Vector3()).z);
  assert.ok(Math.abs(hands[0]-hands[1])>1.5,'Cruise must carry one fist forward and keep the other arm swept back');
 }finally{f.dispose();}
});

test('field surface is portable through the real Studio profile and standard overrides remain distinct',()=>{
 const def=vega(),profile=profileFromDef(def);assert.equal(profile.model.surface,'field');
 const round=validateProfile(JSON.parse(JSON.stringify(profile)));const f=new Fighter(applyProfile(def,round));
 try{assert.ok(f.parts.mats.suit.map?.isTexture);assert.equal(f.parts.skin.id,'superhero-male');}finally{f.dispose();}
 const standard={...profile,model:{...profile.model,surface:'standard',body:'procedural'}};
 const fallback=new Fighter(applyProfile(def,standard));
 try{assert.ok(!fallback.parts.skin);assert.equal(fallback.parts.mats.suit.map,null);assert.notEqual(fallback.parts.mats.suit.color.getHexString(),fallback.parts.mats.suit2.color.getHexString());}finally{fallback.dispose();}
 assert.throws(()=>validateProfile({...profile,model:{...profile.model,surface:'unknown'}}),/surface/i);
});

test('source-rendered Vega face stays exposed at default and extreme supported body proportions',()=>{
 for(const frame of [undefined,{scale:.65,bulk:1.65,head:1.4,neck:.6},{scale:.65,bulk:1.65,head:1.4,neck:1.6}]){
  const f=new Fighter({...vega(),...(frame?{frame}:{})});
  try{
   f._animate(0);f.obj.updateMatrixWorld(true);
   const meshes=[];f.obj.traverseVisible(o=>{if(o.isMesh&&o.layers.isEnabled(0)&&o.material.opacity>0)meshes.push(o);});
   for(const y of [-.49,.05]){
    const start=f.parts.head.localToWorld(new THREE.Vector3(0,y,4));
    const hit=new THREE.Raycaster(start,new THREE.Vector3(0,0,-1).transformDirection(f.parts.head.matrixWorld)).intersectObjects(meshes,false)[0];
    assert.ok(hit?.object.name.startsWith('hero-skin-'),'Face must be the first visible surface, not chest/armor');
    assert.ok(hit.point.y>f.parts.torso.getWorldPosition(new THREE.Vector3()).y,'Ray must reach the face above the chest');
   }
  }finally{f.dispose();}
 }
});
