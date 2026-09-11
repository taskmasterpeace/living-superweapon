import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,applyProfile,saveProfile,loadProfile,DraftHistory} from '../src/tool/studio-profile.js';
import {setAttackOverride} from '../src/data/attack-tuning.js';
import {Fighter} from '../src/engine/entity.js';
import {AI} from '../src/engine/ai.js';
import {runSlot} from '../src/engine/abilities.js';
import {combatChoices} from '../src/core/combat-selection.js';
import {cfAbilityRows} from '../src/engine/hudUtil.js';

const catalog=await import('../src/data/pilot-kit-alternatives.js').catch(()=>({}));
const hero=id=>ROSTER.find(def=>def.id===id);

test('pilot defaults leave the cut slots empty and preserve the former powers in the authoring catalog',()=>{
 assert.equal(typeof catalog.kitAlternativesFor,'function','Pilot alternative catalog is missing');
 assert.equal(hero('webline').abilities.r,undefined);
 assert.equal(hero('apex').abilities.r,undefined);
 assert.equal(hero('vanguard').abilities.f,undefined);
 assert.deepEqual(catalog.kitAlternativesFor('webline','r'),[
  {id:'maximum-spider',name:'Maximum Spider',ability:{type:'rush',name:'Maximum Spider',cost:18,cd:12,range:70,hits:10,interval:.06,damage:8,finisher:36,color:'#eaffff'}},
 ]);
 assert.deepEqual(catalog.kitAlternativesFor('apex','r'),[
  {id:'perfect-wave',name:'Perfect Wave',ability:{type:'beam',material:'air',name:'Perfect Wave',cost:24,cd:14,radius:3.4,tipSpeed:648,maxLen:170,dps:128,kiPerSec:30,charge:true,maxCharge:2,kiChargePerSec:20,chargePower:2,chargeWidth:true,steer:6,color:'#9dff5a',color2:'#ffffff'}},
 ]);
 assert.deepEqual(catalog.kitAlternativesFor('vanguard','f'),[
  {id:'invincible',name:'Invincible',ability:{type:'buff',name:'Invincible',cost:22,cd:18,mult:1.4,dur:4,invuln:2.5,color:'#ffd24a',color2:'#fff'}},
 ]);
});

test('curated pilots retain their identity powers without duplicate beam or defensive defaults',()=>{
 const webline=hero('webline'),apex=hero('apex'),vanguard=hero('vanguard');
 assert.deepEqual(Object.values(webline.abilities).map(ability=>ability.name),['Web Snare','Spider Flurry','Web Darts','Sting Kick','Danger Sense','Web Zip']);
 assert.deepEqual(Object.values(apex.abilities).filter(ability=>ability.type==='beam').map(ability=>ability.name),['Wave Cannon']);
 assert.deepEqual(Object.values(vanguard.abilities).filter(ability=>ability.type==='buff').map(ability=>ability.name),['Unbreakable']);
 const generic=hero('torch').abilities.f;assert.equal(generic.type,'volley');assert.equal(generic.webControl,undefined);
});

test('empty curated slots are safe for Fighter construction, native dispatch, AI, HUD, and wheel choices',()=>{
 for(const [heroId,emptySlot] of [['webline','r'],['apex','r'],['vanguard','f'],['decibel','r'],['talon','r'],['moses','r']]){
  const fighter=new Fighter(structuredClone(hero(heroId)));
  try{
   assert.equal(fighter.slots[emptySlot],undefined);assert.doesNotThrow(()=>runSlot(fighter,emptySlot,{pressed:true,held:true,released:false,dt:1/60},{}));
   assert.doesNotThrow(()=>new AI(fighter));assert.ok(!combatChoices(fighter,{mouseMelee:true}).includes(emptySlot));
   assert.ok(!cfAbilityRows(fighter.def).some(row=>row.slot===(emptySlot==='f'?'H':emptySlot.toUpperCase())));
  }finally{fighter.dispose();}
 }
});

const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value))};};

test('named pilot alternatives survive Studio profile save/load and can be undone to the safe empty default',()=>{
 assert.equal(typeof catalog.selectKitAlternative,'function','Kit selector API is missing');
 for(const [heroId,slot,alternativeId,name] of [
  ['webline','r','maximum-spider','Maximum Spider'],
  ['apex','r','perfect-wave','Perfect Wave'],
  ['vanguard','f','invincible','Invincible'],
  ['decibel','r','canary-cry','THE CANARY CRY'],
  ['talon','r','finale-routine','Finale Routine'],
  ['moses','r','full-bond','FULL BOND'],
 ]){
  const def=hero(heroId),base=profileFromDef(def),selected=catalog.selectKitAlternative(base,heroId,slot,alternativeId),history=new DraftHistory(base);
  assert.deepEqual(base.kit,{});history.push(selected);
  const s=storage();saveProfile(history.value,s);const loaded=loadProfile(heroId,s),effective=applyProfile(def,loaded);
  assert.equal(effective.abilities[slot].name,name);assert.equal(effective._kitSelections[slot],alternativeId);
  history.undo();assert.equal(applyProfile(def,history.value).abilities[slot],undefined);
 }
});

test('kit selection keeps unrelated saved custom attack source snapshots byte-for-byte',()=>{
 const def=hero('webline'),base=profileFromDef(def);
 base.attacks=setAttackOverride(base.attacks,def,'q',{damage:6});
 const before=structuredClone(base.attacks.q.source),selected=catalog.selectKitAlternative(base,'webline','r','maximum-spider');
 assert.deepEqual(selected.attacks.q.source,before);
 const roundtrip=JSON.parse(JSON.stringify(selected));
 assert.deepEqual(applyProfile(def,roundtrip)._attackTuning.sources.q,before);
});

test('unequipping and re-equipping an alternative preserves its dormant custom source snapshot',()=>{
 const def=hero('apex'),base=profileFromDef(def);
 let selected=catalog.selectKitAlternative(base,'apex','r','perfect-wave');
 selected.attacks=setAttackOverride(selected.attacks,catalog.applyKitAlternatives(def,selected.kit),'r',{radius:3.8});
 const snapshot=structuredClone(selected.attacks.r);
 const empty=catalog.selectKitAlternative(selected,'apex','r','');
 assert.deepEqual(empty.attacks.r,snapshot);assert.equal(applyProfile(def,empty).abilities.r,undefined);
 selected=catalog.selectKitAlternative(empty,'apex','r','perfect-wave');
 assert.deepEqual(selected.attacks.r,snapshot);assert.equal(applyProfile(def,selected).abilities.r.radius,3.8);
});

test('empty selection removes an installed tuned alternative without its metadata resurrecting the slot',()=>{
 const def=structuredClone(hero('apex')),base=profileFromDef(def);
 let selected=catalog.selectKitAlternative(base,'apex','r','perfect-wave');
 selected.attacks=setAttackOverride(selected.attacks,catalog.applyKitAlternatives(def,selected.kit),'r',{radius:3.8});
 Object.assign(def,applyProfile(def,selected));
 const empty=catalog.selectKitAlternative(selected,'apex','r','');
 assert.equal(applyProfile(def,empty).abilities.r,undefined);
});

test('legacy profiles without kit selections still load without rewriting stored data',()=>{
 const p=profileFromDef(hero('apex'));delete p.kit;const s=storage(),raw=JSON.stringify({apex:p});s.setItem('lsw.studio.profiles.v1',raw);
 const loaded=loadProfile('apex',s);assert.deepEqual(loaded.kit,{});assert.equal(s.getItem('lsw.studio.profiles.v1'),raw);
});
