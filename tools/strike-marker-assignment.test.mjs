import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,applyProfile,saveProfile,loadProfile} from '../src/tool/studio-profile.js';
import {markerDraft,strikeClipFor,STRIKE_CLIPS} from '../src/data/strike-markers.js';
import {animateAuthoredStrike} from '../src/engine/strike-motion.js';
test('assigned markers round trip through Studio into native strike sampling without changing combat',()=>{
 const def=ROSTER.find(d=>d.id==='vega'),profile=profileFromDef(def);profile.model.strikeMarkers={jab:markerDraft('strike/jab',.1,.4)};
 const values=new Map(),store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};saveProfile(profile,store);
 const applied=applyProfile(def,loadProfile(def.id,store)),f=new Fighter(applied);try {
  Object.assign(f,{mId:'jab',mstate:'active',mT:.07,poseStrike:1,_meleeMotion:{side:1,point:new T.Vector3(0,7,5)}});
  const hp=f.hp,ki=f.ki;assert.ok(animateAuthoredStrike(f,.5,1));assert.equal(f._authoredStrike.time,.25);
  assert.equal(f.hp,hp);assert.equal(f.ki,ki);assert.equal(f.mT,.07);assert.equal(f.mstate,'active');
  assert.equal(strikeClipFor(def,'jab'),STRIKE_CLIPS.jab);assert.equal(strikeClipFor(applied,'cross'),STRIKE_CLIPS.cross);
  assert.equal(profileFromDef(applied).model.strikeMarkers.jab.contactStart,.1);
  assert.deepEqual(applied.abilities,def.abilities);
 }finally{f.dispose();}
});
test('cross-source and stale assignments fail profile validation; malformed runtime data falls back',()=>{
 const def=ROSTER.find(d=>d.id==='vega'),p=profileFromDef(def);p.model.strikeMarkers={jab:markerDraft('strike/cross',.1,.3)};
 assert.throws(()=>applyProfile(def,p),/match/);p.model.strikeMarkers.jab={...markerDraft('strike/jab',.1,.3),duration:999};assert.throws(()=>applyProfile(def,p),/Source/);
 assert.equal(strikeClipFor({model:{strikeMarkers:p.model.strikeMarkers}},'jab'),STRIKE_CLIPS.jab);
});
