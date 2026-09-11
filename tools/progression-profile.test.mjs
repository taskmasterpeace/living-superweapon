import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {freshPicks,buildDef,saveCustom,installCustoms} from '../src/data/creator.js';
import {exportCharacter,importCharacter} from '../src/tool/character-package.js';

function progression(){return {unlocks:{q:4,r:7},forms:{4:{name:'Ascended',model:{costume:'plated',hairColor:'#ffdc70'},frame:{bulk:1.3},colors:{accent:'#ffbb32'}},7:{name:'Solar',model:{hairColor:'#f5f5ec'},colors:{primary:'#f1dfc0'}}}};}
test('legacy profiles and all roster definitions keep empty progression',()=>{
  for(const def of ROSTER){const p=profileFromDef(def);delete p.progression;const v=validateProfile(p);
    assert.deepEqual(v.progression,{unlocks:{},forms:{}});assert.equal(def.progression,undefined);
  }
});
test('sparse form patches and slot gates round trip without changing the base fighter',()=>{
  const def=ROSTER.find(d=>d.id==='kano'),base=structuredClone(def),p=profileFromDef(def);p.progression=progression();
  const valid=validateProfile(p),actual=applyProfile(def,valid),restored=profileFromDef(actual);
  assert.deepEqual(restored.progression,p.progression);assert.deepEqual(actual.colors,base.colors);
  assert.deepEqual(actual.progression,p.progression);assert.deepEqual(def,base);
});
test('progression rejects malformed gates, levels, appearances and unsafe names before persistence',()=>{
  const p=profileFromDef(ROSTER.find(d=>d.id==='kano'));p.progression=progression();
  for(const patch of [
    x=>x.unlocks.q=0,x=>x.unlocks.q=11,x=>x.unlocks.q=1.5,x=>x.unlocks.q='4',x=>x.unlocks.unknown=4,
    x=>x.forms['1']={},x=>x.forms['11']={},x=>x.forms['4.5']={},x=>x.forms['04']={},
    x=>x.forms['4'].frame.bulk=4,x=>x.forms['4'].model.costume='missing',x=>x.forms['4'].colors.accent='#9944cc',
    x=>x.forms['4'].name='<img>',x=>x.forms['4'].damage=900,x=>x.forms['4'].model.body='robot',
  ]){const bad=structuredClone(p);patch(bad.progression);assert.throws(()=>validateProfile(bad));}
});
test('new custom package import/reload and ORIGIN kit edit retain progression',()=>{
  const picks={...freshPicks(),name:'ASCENDER',budget:'unbound',slots:{lmb:'heatray',rmb:'kibolt',q:null,e:null,f:null,r:null}};
  const def=buildDef(picks,'cx_progression_fixture'),profile=profileFromDef(def);profile.progression=progression();
  const records=new Map(),store={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)},roster=[];
  const pack=JSON.parse(JSON.stringify(exportCharacter({picks,def},profile))),record=importCharacter(pack,roster,store);
  assert.deepEqual(record.def.progression,profile.progression);
  const reloaded=[];installCustoms(reloaded,store);assert.deepEqual(reloaded[0].progression,profile.progression);
  const edited={...picks,title:'Edited power kit'};saveCustom(edited,buildDef(edited,record.def.id),roster,store);
  assert.deepEqual(roster[0].progression,profile.progression);
});

test('sparse form asset patches merge by family without erasing base equipment',()=>{
  const def=ROSTER.find(d=>d.id==='sarge'),p=profileFromDef(def);
  p.model.assets={body:'body.hero-standard@1',motion:{locomotion:'motion.hero-ual@1',reload:'motion.hero-ual@1'},equipment:{rifle:'equipment.carbine@1',pistol:'equipment.sidearm@1'}};
  p.progression={unlocks:{},forms:{4:{model:{assets:{motion:{grenade:'motion.hero-ual2@1'}}}}}};
  const valid=validateProfile(p),form=valid.progression.forms[4];
  assert.deepEqual(form.model.assets,{motion:{grenade:'motion.hero-ual2@1'}});
  assert.deepEqual(valid.model.assets.equipment,{rifle:'equipment.carbine@1',pistol:'equipment.sidearm@1'});
  assert.doesNotThrow(()=>validateProfile({...valid,model:{...valid.model,assets:{...valid.model.assets,motion:{...valid.model.assets.motion,...form.model.assets.motion}}}}));
});

test('sparse form asset validation rejects malformed maps before merging defaults',()=>{
  for(const assets of [null,[],{motion:null},{motion:[]},{equipment:null},{equipment:[]}]){
    const p=profileFromDef(ROSTER.find(d=>d.id==='sarge'));
    p.model.assets={motion:{locomotion:'motion.hero-ual@1'},equipment:{rifle:'equipment.carbine@1'}};
    p.progression={unlocks:{},forms:{4:{model:{assets}}}};
    assert.throws(()=>validateProfile(p),`malformed sparse assets must not be normalized away: ${JSON.stringify(assets)}`);
  }
});
