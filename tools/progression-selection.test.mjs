import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/data/progression.js').catch(()=>({}));
const def={progression:{unlocks:{q:4,r:7},forms:{4:{name:'Ascended'},7:{name:'Solar'},10:{name:'Limit'}}}};
test('slot gates are opt-in and use actual level without altering definitions',()=>{
  assert.equal(typeof api.slotUnlocked,'function');
  for(const [level,q,r] of [[1,false,false],[3,false,false],[4,true,false],[7,true,true],[10,true,true]]){
    assert.equal(api.slotUnlocked({def,level},'q'),q);assert.equal(api.slotUnlocked({def,level},'r'),r);
    assert.equal(api.slotUnlocked({def,level},'lmb'),true);
  }
  assert.equal(api.slotUnlocked({def:{}},'q'),true);assert.equal(api.unlockLevel(def,'q'),4);
});
test('form selection uses highest reached appearance and caps infinite-core visuals at tier II',()=>{
  assert.equal(typeof api.formAt,'function');
  for(const [level,key] of [[1,0],[3,0],[4,4],[6,4],[7,7],[9,7],[10,10]]){
    const result=api.formAt(def,level);assert.equal(result.level,key);assert.equal(result.form,key?def.progression.forms[key]:null);
  }
  assert.equal(api.formAt(def,10,true).level,4);assert.equal(api.formAt({},10).form,null);
});
