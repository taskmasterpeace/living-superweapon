import test from 'node:test';
import assert from 'node:assert/strict';
import {POWERS,freshPicks,buildDef,installCustoms} from '../src/data/creator.js';
import {attackFields,attackSource,attackIdentity,setAttackOverride,resetAttackOverride,applyAttackOverrides,reconcileAttackOverrides,validateAttackOverrides} from '../src/data/attack-tuning.js';
import {profileFromDef,applyProfile,saveProfile,loadProfile} from '../src/tool/studio-profile.js';
import {exportCharacter,importCharacter} from '../src/tool/character-package.js';
import {powerNumbers} from '../src/engine/creatorUI.js';
import {describeAbility} from '../src/engine/hudUtil.js';
const source=(kind='wall')=>({id:'cx_construct_fixture',abilities:{q:{type:'construct',construct:kind,name:'Fixture',cost:12,cd:7,duration:9}}});
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
test('wall tuning is sparse, source-bound, mode-exclusive and reset restores timed semantics',()=>{
 const def=source(),before=structuredClone(def),attacks=setAttackOverride({},def,'q',{constructLifetime:'damage',constructKiPerDamage:2,constructKiPerSec:5});
 const result=applyAttackOverrides(def,attacks);assert.equal(result.abilities.q.constructLifetime,'damage');assert.equal(result.abilities.q.constructKiPerDamage,2);
 assert.equal(result.abilities.q.cost,12);assert.equal(result.abilities.q.cd,7);assert.equal(result.abilities.q.construct,'wall');assert.deepEqual(def,before);
 assert.deepEqual(applyAttackOverrides(def,{}).abilities,def.abilities);assert.deepEqual(applyAttackOverrides(result,resetAttackOverride(attacks,'q')).abilities,def.abilities);
 const timed=setAttackOverride(attacks,def,'q',{constructLifetime:'timed'});assert.equal(applyAttackOverrides(def,timed).abilities.q.constructLifetime,undefined);
});
test('construct metadata exposes units, active mode and inactive saved controls without cost or origin overrides',()=>{
 const def=source(),attacks=setAttackOverride({},def,'q',{constructLifetime:'upkeep',constructKiPerSec:5}),fields=Object.fromEntries(attackFields(def,'q',attacks).map(f=>[f.key,f]));
 assert.equal(fields.constructLifetime.value,'upkeep');assert.equal(fields.constructKiPerSec.unit,'ki/s');assert.equal(fields.constructKiPerDamage.unit,'ki/hp');
 assert.equal(fields.constructKiPerSec.disabled,false);assert.equal(fields.constructKiPerDamage.disabled,true);assert.equal(fields.duration.disabled,true);
 assert.equal(fields.duration.value,9);for(const key of ['cost','cd','construct','emissionOrigin','damage','moveSpeed'])assert.equal(fields[key],undefined);
 const timed=Object.fromEntries(attackFields(def,'q').map(f=>[f.key,f]));assert.equal(timed.duration.disabled,false);assert.equal(timed.constructKiPerSec.disabled,true);assert.equal(timed.constructKiPerDamage.disabled,true);
});
for(const patch of [{constructLifetime:'forever'},{constructLifetime:null},{constructKiPerSec:0},{constructKiPerSec:100.1},{constructKiPerSec:NaN},{constructKiPerDamage:0},{constructKiPerDamage:10.01},{constructKiPerDamage:Infinity},{duration:0},{duration:61},{construct:'tank'},{cost:1},{cd:0},{emissionOrigin:'eyes'},{hp:100},{onConstructHit:'code'}])test(`invalid or source-owned construct patch rejects ${JSON.stringify(patch)}`,()=>{
 assert.throws(()=>setAttackOverride({},source(),'q',patch));
});
for(const kind of ['fist','hammer','turret','unknown',null])test(`resource authoring rejects unsupported source form ${kind}`,()=>{
 const def=source(kind);assert.deepEqual(attackFields(def,'q'),[]);assert.throws(()=>setAttackOverride({},def,'q',{constructLifetime:'upkeep'}));
 const attack=def.abilities.q;assert.throws(()=>validateAttackOverrides({q:{identity:attackIdentity(attack),source:attack,values:{constructLifetime:'damage'}}}));
});
test('tank fields carry bounded native fallbacks and cannot hide a muzzle-origin bypass',()=>{
 const def=source('tank'),fields=Object.fromEntries(attackFields(def,'q').map(f=>[f.key,f]));
 assert.deepEqual([fields.moveSpeed.min,fields.moveSpeed.max,fields.moveSpeed.value],[1,40,12]);assert.deepEqual([fields.turnRate.min,fields.turnRate.max,fields.turnRate.value],[.1,6,1.8]);
 assert.deepEqual([fields.blast.min,fields.blast.max,fields.blast.value],[1,30,6]);assert.deepEqual([fields.damage.min,fields.damage.max,fields.damage.value],[1,120,18]);
 for(const key of ['muzzle','barrelLength','emissionOrigin','cost','cd'])assert.equal(fields[key],undefined);
 for(const patch of [{moveSpeed:0},{turnRate:7},{blast:0},{speed:181},{range:161},{damage:121},{interval:.01}])assert.throws(()=>setAttackOverride({},def,'q',patch));
});
test('a changed source or slot cannot inherit a wall resource override',()=>{
 const def=source(),attacks=setAttackOverride({},def,'q',{constructLifetime:'damage'}),next=source('tank');
 assert.deepEqual(reconcileAttackOverrides(next,attacks),{});assert.deepEqual(applyAttackOverrides(next,attacks).abilities,next.abilities);
 const moved={...def,abilities:{e:def.abilities.q}};assert.deepEqual(reconcileAttackOverrides(moved,attacks),{});
});
test('new genuine willtank catalog starts timed and preserves existing command picks',()=>{
 const tank=POWERS.find(p=>p.id==='willtank');assert.ok(tank,'Missing native tank catalog pick');
 assert.equal(tank.cat,'command');assert.equal(tank.cost,28);assert.equal(tank.ab.cost,24);assert.equal(tank.ab.cd,8);assert.equal(tank.ab.duration,12);assert.equal(tank.ab.construct,'tank');assert.equal(tank.ab.constructLifetime,undefined);
 const old=POWERS.find(p=>p.id==='wall');assert.deepEqual(old.ab,{type:'construct',name:'Force Wall',cost:12,cd:7,construct:'wall',duration:9,holdTrigger:true,color:'#7dff9e'});
 assert.equal(POWERS.find(p=>p.id==='willfist').ab.construct,'fist');assert.equal(POWERS.find(p=>p.id==='sentry').ab.construct,'turret');
});
test('real ORIGIN tank profile save/export/import/reload preserves native source identity and tuning',()=>{
 const picks={...freshPicks(),name:'BULWARK',budget:'unbound',slots:{lmb:'kibolt',rmb:'heatray',q:'willtank',e:'wall',f:null,r:null}},def=buildDef(picks,'cx_tank'),profile=profileFromDef(def);
 assert.equal(def.abilities.q?.construct,'tank','Catalog recipe must build a real tank source');
 profile.attacks=setAttackOverride({},def,'q',{constructLifetime:'damage',constructKiPerDamage:2,moveSpeed:15,interval:1.5});
 const s=storage();saveProfile(profile,s);const loaded=loadProfile(def.id,s);assert.deepEqual(loaded.attacks,profile.attacks);
 const file=exportCharacter({picks,def},loaded),roster=[],imported=importCharacter(structuredClone(file),roster,s);
 assert.notEqual(imported.def.id,def.id);assert.deepEqual(imported.def.abilities,applyProfile(def,profile).abilities);assert.equal(attackSource(imported.def,'q').cost,24);assert.equal(attackSource(imported.def,'q').cd,8);
 const installed=[];installCustoms(installed,s);assert.deepEqual(installed[0].abilities,imported.def.abilities);
 const bad=structuredClone(file);bad.profile.attacks.q.source.cost=1;bad.profile.attacks.q.identity=attackIdentity(bad.profile.attacks.q.source);
 const safe=importCharacter(bad,[],storage());assert.equal(safe.def.abilities.q.cost,24);assert.equal(safe.def.abilities.q.constructLifetime,undefined,'Forged source is stripped, never executed');
});
test('creator and gameplay descriptions distinguish energy-backed life from source duration',()=>{
 const damage={...source('wall').abilities.q,constructLifetime:'damage',constructKiPerDamage:2};
 const upkeep={...damage,constructLifetime:'upkeep',constructKiPerSec:5};
 assert.match(powerNumbers(damage),/2 ki\/hp/);assert.doesNotMatch(powerNumbers(damage),/9s/);
 assert.match(describeAbility(damage),/damage.*2 ki\/hp/i);assert.match(describeAbility(upkeep),/5 ki\/s/);
 const tank={...damage,construct:'tank'};assert.match(describeAbility(tank),/holds.*fire/i);assert.match(powerNumbers(tank),/cannon/i);
});
for(const [kind,invalid] of [['wall',{constructKiPerSec:0}],['wall',{constructKiPerDamage:11}],['wall',{constructLifetime:'forever'}],['tank',{moveSpeed:0}],['tank',{damage:121}],['tank',{blast:0}]])test(`merged ${kind} source must satisfy native policy/settings before unrelated tuning ${JSON.stringify(invalid)}`,()=>{
 const def=source(kind);Object.assign(def.abilities.q,invalid);
 assert.throws(()=>setAttackOverride({},def,'q',{duration:10}));
 const entry={source:def.abilities.q,identity:attackIdentity(def.abilities.q),values:{duration:10}};
 assert.throws(()=>validateAttackOverrides({q:entry}));assert.throws(()=>applyAttackOverrides(def,{q:entry}));
});
