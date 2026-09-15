import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {Highwall} from '../src/engine/highwall.js';
import {HighwallLoot} from '../src/engine/highwall-loot.js';
import {OPERATION_GADGETS} from '../src/data/operation-gadgets.js';
import {writeHighwallSave,readHighwallSave,HIGHWALL_SAVE_KEY} from '../src/engine/highwall-save.js';

test('two casualties sharing a character definition retain separate death ownership',()=>{
 const x=mainCombatFixture(),loot=new HighwallLoot(x.g);try{
  x.g.audio={...x.g.audio,cry:()=>{}}; const a=x.foe({x:3}),b=x.foe({x:8});assert.equal(a.def.id,b.def.id);
  a._highwallLifeId='unit:1';b._highwallLifeId='unit:2';a.state=b.state='ko';
  x.g.hud={feed:()=>{}}; const scope={g:x.g,loot};Highwall.prototype.onKO.call(scope,a);Highwall.prototype.onKO.call(scope,b);
  assert.equal(loot.containers.size,2);Highwall.prototype.onKO.call(scope,a);assert.equal(loot.containers.size,2);
 }finally{loot.dispose();x.close();}
});

test('native issued medkit and shield spend their own charges without energy cost',()=>{
 const x=mainCombatFixture({hero:'sarge'});try{
  x.g.audio={...x.g.audio,sample:()=>true}; const f=x.p;f.items=OPERATION_GADGETS.filter(d=>['medkit','shieldpack'].includes(d.kind)).map(d=>({def:structuredClone(d),charges:d.charges,cd:0,state:'ready'}));
  const ki=f.ki;f.hp=20;
  const med=f.items.findIndex(it=>it.def.kind==='medkit'),shield=f.items.findIndex(it=>it.def.kind==='shieldpack');
  x.g.useItem(f,med);assert.ok(f.hp>20);const healed=f.hp;assert.equal(f.items[med].charges,1);
  x.g.useItem(f,med);assert.equal(f.hp,healed,'Cooldown must reject repeated activation');
  x.g.useItem(f,shield);assert.equal(f._shieldHp,45);assert.equal(f.items[shield].charges,2);assert.equal(f.ki,ki);
 }finally{x.close();}
});

test('local save failure surfaces and corrupted newest save falls back to prior valid session',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const session={schema:1,preset:'systems',units:[{def:{id:'soldier'},human:true,pos:[0,0,0],hp:100}],serial:1};
 writeHighwallSave(storage,session);writeHighwallSave(storage,{...session,serial:2});
 data.set(HIGHWALL_SAVE_KEY,'broken');assert.equal(readHighwallSave(storage).serial,1);
 assert.throws(()=>writeHighwallSave({getItem:()=>null,setItem:()=>{throw Error('disk full');}},session),/disk full/);
});
