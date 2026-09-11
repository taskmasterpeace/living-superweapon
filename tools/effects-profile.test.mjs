import test from 'node:test';
import assert from 'node:assert/strict';
import {profileFromDef,validateProfile,applyProfile,saveProfile,loadProfile} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';
import {freshPicks,buildDef,saveCustom,installCustoms} from '../src/data/creator.js';
import {exportCharacter,importCharacter} from '../src/tool/character-package.js';

const hero=ROSTER.find(d=>d.id==='aurum');
test('effect settings survive actual Studio save, load and application without changing powers',()=>{
 const p=profileFromDef(hero);p.effects={shield:{intensity:.7,rippleDuration:.6},charge:{intensity:.8},construct:{assemblyTime:1.1,density:.5}};
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 saveProfile(p,storage);const loaded=loadProfile(hero.id,storage),applied=applyProfile(hero,loaded);
 assert.deepEqual(applied.effects,p.effects);assert.deepEqual(applied.abilities,hero.abilities);
});

test('custom effect authoring survives package import, kit editing and reload',()=>{
 const picks={...freshPicks(),name:'EMERALD',budget:'unbound',slots:{lmb:'heatray',rmb:'kibolt',q:null,e:null,f:null,r:null}};
 const def=buildDef(picks,'cx_effects'),profile=profileFromDef(def);
 profile.effects.construct.assemblyTime=1.25;profile.effects.shield.rippleDuration=1.1;
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},roster=[];
 const pack=JSON.parse(JSON.stringify(exportCharacter({def,picks},profile))),record=importCharacter(pack,roster,storage);
 assert.deepEqual(record.def.effects,profile.effects);
 const edited={...picks,title:'Edited power kit'};
 saveCustom(edited,buildDef(edited,record.def.id),roster,storage);
 const loaded=[];installCustoms(loaded,storage);
 assert.deepEqual(loaded[0].effects,profile.effects,'Editing a power recipe must not lose portable VFX authoring');
});
test('legacy profiles acquire independent effect defaults without modifying the input',()=>{
 const p=profileFromDef(hero);delete p.effects;const q=validateProfile(p);
 assert.ok(q.effects?.construct,'A legacy character must receive usable construct settings');
 assert.equal(q.effects.construct.assemblyTime,.65);assert.equal(q.effects.construct.density,1);
 q.effects.construct.density=0;assert.equal(validateProfile(p).effects.construct.density,1);
 assert.equal(p.effects,undefined);
});
for(const effects of [{construct:{density:Infinity}},{construct:{density:3}},{shield:{rippleDuration:0}}, {charge:{intensity:-1}}, {construct:{bogus:1}}, {unknown:{}}])
 test(`invalid effect data is rejected: ${JSON.stringify(effects)}`,()=>{
  const p=profileFromDef(hero);p.effects=effects;assert.throws(()=>validateProfile(p));
 });
