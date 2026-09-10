import test from 'node:test';
import assert from 'node:assert/strict';
import {profileFromDef} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';

test('form editor preserves sparse inheritance and unrelated authored fields',async()=>{
 const {editForm}=await import('../src/tool/studio-progression.js');const p=profileFromDef(ROSTER[0]);
 const next=editForm(p,{level:'4',name:'Ascended',costume:'plated',flightStyle:'',hairColor:'#ffdc70',bulk:'1.3',broad:'',accent:'#ffbb32'},null);
 assert.deepEqual(next.progression.forms[4],{name:'Ascended',model:{costume:'plated',hairColor:'#ffdc70'},frame:{bulk:1.3},colors:{accent:'#ffbb32'}});
 assert.deepEqual(p.progression.forms,{});
 const moved=editForm(next,{level:'7',name:'Solar',costume:'',flightStyle:'',hairColor:'',bulk:'',broad:'',accent:''},'4');
 assert.equal(moved.progression.forms[4],undefined);assert.deepEqual(moved.progression.forms[7],{name:'Solar'});
});
test('form editor rejects duplicate level, noncanonical levels and invalid sparse leaves',async()=>{
 const {editForm}=await import('../src/tool/studio-progression.js');const p=profileFromDef(ROSTER[0]);p.progression.forms[4]={name:'Existing'};
 for(const fields of [{level:'4'},{level:'04'},{level:'1'},{level:'7',bulk:'oops'},{level:'7',costume:'unknown'},{level:'7',accent:'#9900ff'}])assert.throws(()=>editForm(p,fields,null));
 assert.equal(p.progression.forms[4].name,'Existing');
});
