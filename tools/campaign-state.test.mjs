import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CampaignState,CAMPAIGN_KEY} from '../src/engine/campaign-state.js';
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
test('supply spending is atomic, durable and deduplicated',()=>{
 const s=storage(),c=new CampaignState(s);assert.equal(c.spend('repair1',10).accepted,true);
 const next=new CampaignState(s);assert.equal(next.spend('repair1',10).reason,'already_spent');assert.equal(next.snapshot().supplies,110);
 assert.equal(next.spend('repair2',1000).reason,'unaffordable');const before=next.snapshot();s.setItem=()=>{throw Error('quota');};assert.throws(()=>next.spend('repair3',10));assert.deepEqual(next.snapshot(),before);
});
test('rewards persist and cannot be claimed twice after reload',()=>{
 const s=storage(),c=new CampaignState(s);c.award('run-1',{supplies:30,research:40});
 const reloaded=new CampaignState(s);assert.equal(reloaded.award('run-1',{supplies:999}).reason,'already_awarded');assert.equal(reloaded.snapshot().supplies,150);
 assert.equal(reloaded.purchase('scanner_efficiency').accepted,true);assert.equal(reloaded.effects().scannerCooldownMult,.8);assert.equal(reloaded.snapshot().research,20);
 assert.equal(new CampaignState(s).purchase('scanner_efficiency').reason,'already_owned');
});
test('sandbox, invalid and unaffordable actions never mutate campaign',()=>{
 const c=new CampaignState(storage()),before=c.snapshot();c.award('lab',{sandbox:true,supplies:999});c.purchase('shield_endurance');assert.throws(()=>c.award('bad',{research:-1}));assert.deepEqual(c.snapshot(),before);
});
test('write failure grants neither a reward nor research',()=>{
 const s=storage(),c=new CampaignState(s);c.award('start',{research:100});const before=c.snapshot();s.setItem=()=>{throw Error('quota');};assert.throws(()=>c.purchase('shield_endurance'),/quota/);assert.deepEqual(c.snapshot(),before);assert.throws(()=>c.award('later',{supplies:10}),/quota/);assert.deepEqual(c.snapshot(),before);
});
test('corrupt save is preserved and transactions blocked until explicit recovery',()=>{
 const s=storage();s.setItem(CAMPAIGN_KEY,'corrupt');const c=new CampaignState(s);assert.ok(c.error);assert.throws(()=>c.award('run',{supplies:10}),/recovery/);assert.equal(s.getItem(CAMPAIGN_KEY),'corrupt');c.reset();assert.equal(c.error,null);
});
test('export/import transfers research and reward deduplication',()=>{
 const c=new CampaignState(storage());c.award('run',{research:50});c.purchase('field_repairs');const other=new CampaignState(storage());other.importSave(c.exportSave());assert.deepEqual(other.snapshot(),c.snapshot());assert.equal(other.award('run',{research:50}).accepted,false);assert.equal(other.effects().repairCostMult,.8);
});
test('unsupported import and unsafe balances leave current state unchanged',()=>{
 const c=new CampaignState(storage()),before=c.snapshot();assert.throws(()=>c.importSave(JSON.stringify({...before,version:2})));assert.throws(()=>c.importSave(JSON.stringify({...before,supplies:Infinity})));assert.deepEqual(c.snapshot(),before);
});
