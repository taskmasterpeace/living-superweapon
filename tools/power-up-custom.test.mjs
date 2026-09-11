import test from 'node:test';
import assert from 'node:assert/strict';
import {freshPicks,buildDef,tally,loadCustoms,saveCustom,installCustoms,powerById} from '../src/data/creator.js';
import {migratePowerUpPicks} from '../src/data/power-up.js';
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};};
const recipe=()=>({...freshPicks(),name:'ARCHIVE',slots:{lmb:'kibolt',rmb:'heatray',q:null,e:null,f:'powerbuff',r:null}});
test('legacy generic custom recipe frees its old slot while preserving budget, tuned effect and stored source',()=>{
 const p=recipe(),before=tally(p).total,next=migratePowerUpPicks(p);assert.equal(next.slots.f,null);assert.equal(next.powerUp,'powerbuff');assert.equal(tally(next).total,before);
 const old=buildDef({...p,slots:{...p.slots,f:null}},'cx_archive');old.abilities.f={...powerById('powerbuff').ab,mult:1.85};delete old.powerUp;
 const storage=store(),raw=JSON.stringify([{v:1,picks:p,def:old}]);storage.setItem('threshold_customs_v1',raw);
 const [record]=loadCustoms(storage);assert.equal(record.picks.slots.f,null);assert.equal(record.def.abilities.f,undefined);assert.equal(record.def.powerUp.ability.mult,1.85);assert.equal(storage.getItem('threshold_customs_v1'),raw,'Read migration must not rewrite storage');
 const roster=[];installCustoms(roster,storage);assert.equal(roster[0].powerUp.ability.mult,1.85);
 const rebuilt=buildDef(record.picks,record.def.id);saveCustom(record.picks,rebuilt,roster,storage);assert.equal(loadCustoms(storage)[0].def.powerUp.ability.mult,1.85);
});
test('custom utility buffs remain ordinary slots and an explicit form builds outside them',()=>{
 const p=recipe();p.slots.f='counterst';p.powerUp='overload';p.powerUpSourceSlot=null;const d=buildDef(p,'cx_stance');
 assert.equal(d.abilities.f.riposte.dmg,30);assert.equal(d.powerUp.ability.name,'Overload');assert.equal(d.powerUp.ability.heal,40);
});
import {exportCharacter,importCharacter,validateCharacter} from '../src/tool/character-package.js';
import {profileFromDef} from '../src/tool/studio-profile.js';
test('legacy portable v1 recipes migrate and new form recipes roundtrip through strict package validation',()=>{
 const p=recipe();p.budget='unbound';const d=buildDef(p,'cx_archive');const legacy={format:'lsw-character',version:1,sourceId:d.id,picks:structuredClone(p),profile:profileFromDef(d)};delete legacy.picks.powerUp;delete legacy.picks.powerUpSourceSlot;
 const pack=validateCharacter(legacy),imported=importCharacter(pack,[],store());assert.equal(imported.def.powerUp.ability.name,'Power Surge');assert.equal(imported.def.abilities.f,undefined);
 const file=exportCharacter(imported,profileFromDef(imported.def));assert.equal(file.picks.powerUp,'powerbuff');assert.equal(file.picks.slots.f,null);
 const bad=structuredClone(file);bad.picks.powerUp='counterst';assert.throws(()=>validateCharacter(bad));
});
