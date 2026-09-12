import test from 'node:test';
import assert from 'node:assert/strict';
import {dtypeOf,applyDtypes} from '../src/data/visual.js';
import {ROSTER} from '../src/data/characters.js';
import {attackGuide} from '../src/engine/combat-guide.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot} from '../src/engine/abilities.js';
import {installCustoms} from '../src/data/creator.js';

test('boot preserves ordinary weapon and body-contact damage semantics',()=>{
 assert.equal(dtypeOf({type:'rifle',damage:8}),'ballistic');
 for(const type of ['melee','rush','grab','bow','tentacle'])
  assert.equal(dtypeOf({type,damage:20}),'physical',type);
 assert.equal(dtypeOf({type:'melee',dtype:'fire'}),'fire');
 assert.equal(dtypeOf({type:'melee',cold:true}),'cold');
 assert.equal(dtypeOf({type:'beam',material:'air'}),'physical');
});

test('complete boot roster and player guide agree on rifles and plain punches',()=>{
 const roster=structuredClone(ROSTER);applyDtypes(roster);
 let rifles=0,punches=0;
 for(const hero of roster)for(const [key,a] of Object.entries(hero.abilities)){
  const source=ROSTER.find(h=>h.id===hero.id).abilities[key];
  if(source.dtype||source.material||source.cold||source.frost||source.freeze)continue;
  if(a.type==='rifle'){assert.equal(a.dtype,'ballistic',`${hero.id}.${key}`);rifles++;}
  if(a.type==='melee'||a.type==='rush'){assert.equal(a.dtype,'physical',`${hero.id}.${key}`);punches++;}
  if(['rifle','melee','rush'].includes(a.type))assert.ok(attackGuide(a).types.includes(a.dtype));
 }
 assert.ok(rifles>0&&punches>0);
});

test('newly authored attacks show the same type before and after boot classification',()=>{
 for(const hero of ROSTER)for(const [key,a]of Object.entries(hero.abilities)){
  const stamped={...a,dtype:dtypeOf(a)};
  assert.deepEqual(attackGuide(a),attackGuide(stamped),`${hero.id}.${key}`);
 }
});

test('saved custom kits retain explicit types and acquire correct defaults on loading',()=>{
 const def=structuredClone(ROSTER[0]);def.id='cx_damage_audit';def.isCustom=true;
 def.abilities={lmb:{type:'rifle',damage:8},rmb:{type:'melee',damage:20},q:{type:'projectile',damage:10,dtype:'magic'}};
 const raw=JSON.stringify([{v:1,def,picks:{}}]),storage={getItem:()=>raw};
 const roster=[];installCustoms(roster,storage);assert.equal(roster.length,1);
 applyDtypes(roster);
 assert.deepEqual(Object.values(roster[0].abilities).map(a=>attackGuide(a).types[0]),['ballistic','physical','magic']);
 assert.equal(storage.getItem(),raw,'read/classify never overwrites the saved recipe');
});

test('boot-classified service rifle emits ballistic ordnance through the real handler',()=>{
 const f=mainCombatFixture({hero:'sarge'});
 try{
  applyDtypes([f.p.def]);
  const key=Object.keys(f.p.slots).find(k=>f.p.slots[k].def.type==='rifle');
  assert.ok(key);
  // Fighter slots retain the same ability definitions that boot stamps.
  f.p.slots[key].def.dtype=dtypeOf(f.p.slots[key].def);
  runSlot(f.p,key,{pressed:true,held:true,released:false,dt:.1},f.g);
  assert.ok(f.g.projectiles.list.length>0);
  for(const shot of f.g.projectiles.list)assert.equal(shot.dtype,'ballistic');
 }finally{f.close();}
});
