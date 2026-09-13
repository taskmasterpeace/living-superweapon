import test from 'node:test';
import assert from 'node:assert/strict';
import {freshPicks,buildDef,saveCustom,installCustoms} from '../src/data/creator.js';
import {profileFromDef} from '../src/tool/studio-profile.js';
const pkg=await import('../src/tool/character-package.js').catch(()=>({}));
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const recipe=()=>({...freshPicks(),name:'STARLING',budget:'unbound',flightTier:3,slots:{lmb:'heatray',rmb:'kibolt',q:null,e:null,f:null,r:null}});
test('portable character restores powers, flight and authored presentation into an empty roster',()=>{
 assert.equal(typeof pkg.exportCharacter,'function','Custom-character export is missing');
 const picks=recipe(),def=buildDef(picks,'cx_starling'),profile=profileFromDef(def);
 profile.frame.bulk=1.2;profile.camera.height=7;profile.camera.cutaway=.37;profile.poses.hover.kneeL=.6;
 profile.model.heavyStrikes='procedural';
 const file=pkg.exportCharacter({picks,def},profile),s=store(),roster=[];
 const imported=pkg.importCharacter(JSON.parse(JSON.stringify(file)),roster,s);
 assert.notEqual(imported.def.id,def.id);assert.equal(imported.def.abilities.lmb.type,'beam');
 assert.equal(imported.def.abilities.rmb.type,'projectile');assert.equal(imported.def.flightTier,3);
 assert.equal(imported.def.frame.bulk,1.2);assert.equal(imported.def.model.camera.height,7);
 assert.equal(imported.def.model.camera.cutaway,.37);
 assert.equal(imported.def.model.poses.hover.kneeL,.6);assert.deepEqual(imported.picks,picks);
 assert.equal(imported.def.model.heavyStrikes,'procedural','portable characters keep their independent heavy motion choice');
 const reloaded=[];installCustoms(reloaded,s);assert.deepEqual(reloaded[0],imported.def);
 const again=pkg.importCharacter(file,roster,s);assert.notEqual(again.def.id,imported.def.id);assert.equal(roster.length,2);
});
test('malformed or executable recipes cannot enter the roster',()=>{
 assert.equal(typeof pkg.validateCharacter,'function');
 const picks=recipe(),def=buildDef(picks,'cx_starling'),file=pkg.exportCharacter({picks,def},profileFromDef(def));
 for(const edit of [p=>p.picks.attrs.vig=999,p=>p.picks.slots.lmb='missing',p=>p.picks.palette=-1,p=>p.picks.gifts=['missing'],p=>p.picks.name='<img onerror=alert(1)>',p=>p.picks.attrs.agl=null,p=>p.version=99,p=>p.profile.heroId='sol']){
  const bad=structuredClone(file);edit(bad);assert.throws(()=>pkg.validateCharacter(bad));
 }
 const unsafe=JSON.parse(JSON.stringify(file).replace('"picks":{','"picks":{"__proto__":{},'));
 assert.throws(()=>pkg.validateCharacter(unsafe));
});
test('failed saves do not announce persistence by changing the in-memory roster',()=>{
 const picks=recipe(),def=buildDef(picks,'cx_starling'),roster=[];
 assert.throws(()=>saveCustom(picks,def,roster,{getItem:()=>null,setItem:()=>{throw Error('Storage full');}}),/Storage full/);
 assert.deepEqual(roster,[]);
});
test('corrupt custom storage is preserved instead of replaced by a new save',()=>{
 const s=store();s.setItem('threshold_customs_v1','not json');
 assert.throws(()=>saveCustom(recipe(),buildDef(recipe(),'cx_starling'),[],s),/storage/i);
 assert.equal(s.getItem('threshold_customs_v1'),'not json');
});
test('editing an imported power recipe keeps embedded presentation without requiring a separate Studio save',()=>{
 const picks=recipe(),def=buildDef(picks,'cx_starling'),profile=profileFromDef(def);profile.frame.bulk=1.2;profile.colors.primary='#123456';
 const s=store(),roster=[],rec=pkg.importCharacter(pkg.exportCharacter({picks,def},profile),roster,s);
 const edited={...rec.picks,title:'New kit title'};saveCustom(edited,buildDef(edited,rec.def.id),roster,s);
 assert.equal(roster[0].frame.bulk,1.2);assert.equal(roster[0].colors.primary,'#123456');assert.equal(roster[0].title,'New kit title');
});
test('denied localStorage access does not prevent shipped roster boot',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('SecurityError');}});
 try{const roster=[];assert.doesNotThrow(()=>installCustoms(roster));assert.deepEqual(roster,[]);}
 finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
});

test('imported approach and environment survive recipe edits and a second export',()=>{
 const picks=recipe(),def=buildDef(picks,'cx_starling'),profile=profileFromDef(def);profile.combat.groundApproach='tackle';profile.environment.massKg=240;
 const s=store(),roster=[],rec=pkg.importCharacter(pkg.exportCharacter({picks,def},profile),roster,s);
 const edited={...rec.picks,title:'Edited powers'};saveCustom(edited,buildDef(edited,rec.def.id),roster,s);
 assert.equal(roster[0].combat?.groundApproach,'tackle');assert.equal(roster[0].environment?.massKg,240);
 const reloaded=[];installCustoms(reloaded,s);assert.equal(reloaded[0].combat.groundApproach,'tackle');
 const second=pkg.exportCharacter({picks:edited,def:reloaded[0]},profileFromDef(reloaded[0]));const round=pkg.importCharacter(second,[],store());assert.equal(round.def.combat.groundApproach,'tackle');assert.equal(round.def.environment.massKg,240);
 const replacement={...buildDef(edited,rec.def.id),combat:{groundApproach:'step'},environment:{...profile.environment,massKg:100}};saveCustom(edited,replacement,roster,s);assert.equal(roster[0].combat.groundApproach,'step');assert.equal(roster[0].environment.massKg,100);
});
