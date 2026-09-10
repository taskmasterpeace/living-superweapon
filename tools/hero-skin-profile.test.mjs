import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,applyProfile,validateProfile,saveProfile,loadProfile} from '../src/tool/studio-profile.js';
import {freshPicks,buildDef} from '../src/data/creator.js';
import {exportCharacter,importCharacter} from '../src/tool/character-package.js';

const base=ROSTER.find(d=>d.id==='sol');
const storage=()=>{const records=new Map();return {getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};};
test('known skinned-body choice survives validation, runtime application and save/reload',()=>{
 const p=profileFromDef(base);p.model.body='superhero-male';const s=storage();
 assert.doesNotThrow(()=>validateProfile(p));saveProfile(p,s);
 assert.equal(applyProfile(base,loadProfile(base.id,s)).model.body,'superhero-male');
 assert.equal(profileFromDef(applyProfile(base,p)).model.body,'superhero-male');
});
test('unknown body URLs and IDs are rejected without writing a save',()=>{
 const s=storage(),p=profileFromDef(base);saveProfile(p,s);const before=s.getItem('lsw.studio.profiles.v1');
 for(const body of ['https://invalid.example/actor.glb','../../actor.glb','unknown',{},null]){
  assert.throws(()=>saveProfile({...p,model:{...p.model,body}},s));assert.equal(s.getItem('lsw.studio.profiles.v1'),before);
 }
});
test('legacy profile without a body selector remains procedural and is not mutated',()=>{
 const p=profileFromDef(base);delete p.model.body;const before=JSON.stringify(p);
 assert.doesNotThrow(()=>validateProfile(p));assert.equal(JSON.stringify(p),before);
 assert.equal(profileFromDef(applyProfile(base,p)).model.body,'procedural');
});
test('sparse progression forms can switch skinned anatomy and return to procedural',()=>{
 const p=profileFromDef(base);p.progression.forms={4:{model:{body:'superhero-female'}},7:{model:{body:'procedural'}}};
 assert.doesNotThrow(()=>validateProfile(p));assert.equal(validateProfile(p).progression.forms[4].model.body,'superhero-female');
});
test('small custom-character package preserves the catalog choice on a fresh import',()=>{
 const picks={...freshPicks(),name:'STARLING',budget:'unbound',slots:{lmb:'heatray',rmb:'kibolt',q:null,e:null,f:null,r:null}},def=buildDef(picks,'cx_skin_fixture'),p=profileFromDef(def);p.model.body='superhero-female';
 const record={picks,def},pack=exportCharacter(record,p),s=storage(),roster=[];
 assert.ok(JSON.stringify(pack).length<100000,'catalog reference must not embed mesh data');
 const imported=importCharacter(pack,roster,s);assert.equal(imported.def.model.body,'superhero-female');
 assert.notEqual(imported.def.id,def.id);
});
