import test from 'node:test';
import assert from 'node:assert/strict';
import {beamCatalog,filterBeams} from '../src/tool/beam-library-data.js';
import {setAttackOverride,applyAttackOverrides} from '../src/data/attack-tuning.js';

const make=()=>({id:'test',name:'Test Hero',abilities:{lmb:{type:'beam',name:'Pressure Wave',radius:2,maxLen:150,tipSpeed:300,dps:100,kiPerSec:20,guardChip:.25,build:'torrent'},q:{type:'projectile',name:'Ball'}}});
test('catalog measures actual beam fields and excludes unrelated attacks without mutating definitions',()=>{
 const def=make(),before=JSON.stringify(def),{rows,errors}=beamCatalog([def]);
 assert.equal(rows.length,1);assert.deepEqual(errors,[]);
 assert.equal(rows[0].travel100,1/3);assert.equal(rows[0].guardDps,25);assert.equal(rows[0].shape,'torrent');
 assert.equal(JSON.stringify(def),before);
});
test('the current unsaved draft wins over local saves and is labeled as a draft',()=>{
 const def=make(),saved=setAttackOverride({},def,'lmb',{dps:200}),draft=setAttackOverride({},def,'lmb',{tipSpeed:500,dps:50});
 const {rows}=beamCatalog([def],{load:()=>({attacks:saved}),draft:{heroId:'test',attacks:draft,dirty:true}});
 assert.equal(rows[0].dps,50);assert.equal(rows[0].travel100,.2);assert.equal(rows[0].state,'Unsaved draft');
});
test('a saved override is represented without baking it into shipped defaults',()=>{
 let def=make();const attacks=setAttackOverride({},def,'lmb',{radius:.4,build:'ray'});
 def=applyAttackOverrides(def,attacks);
 const {rows}=beamCatalog([def],{load:()=>({attacks})});
 assert.equal(rows[0].radius,.4);assert.equal(rows[0].shape,'ray');assert.equal(rows[0].state,'Saved local');
 const shipped=beamCatalog([def]).rows[0];assert.equal(shipped.radius,2);assert.equal(shipped.shape,'torrent');
});
test('short beams never advertise arrival at an unreachable comparison distance',()=>{
 const def=make();def.abilities.lmb.maxLen=60;
 assert.equal(beamCatalog([def]).rows[0].travel100,null);
});
test('unreadable profiles and stale attack identity are visible, never silent balance fallbacks',()=>{
 const def=make(),bad=beamCatalog([def],{load:()=>{throw Error('Invalid saved profile');}});
 assert.equal(bad.rows.length,0);assert.match(bad.errors[0],/Invalid saved profile/);
 const attacks=setAttackOverride({},def,'lmb',{dps:200});def.abilities.lmb.name='New beam';
 const stale=beamCatalog([def],{load:()=>({attacks})});
 assert.equal(stale.rows[0].dps,100);assert.match(stale.errors[0],/stale/i);
});
test('search, shape and quantitative sorting operate on effective values',()=>{
 const a=make(),b=make();b.id='other';b.name='Other';b.abilities.lmb={...b.abilities.lmb,name:'Optics',faceOrigin:true,build:'ray',tipSpeed:900};
 const {rows}=beamCatalog([a,b]);
 assert.deepEqual(filterBeams(rows,{query:'optics',shape:'ray'}).map(r=>r.heroId),['other']);
 assert.equal(filterBeams(rows,{sort:'travel'})[0].heroId,'other');
 assert.deepEqual(filterBeams(rows,{query:'not a power'}),[]);
 assert.equal(rows[0].heroId,'test','Sorting must not mutate the catalog');
});
