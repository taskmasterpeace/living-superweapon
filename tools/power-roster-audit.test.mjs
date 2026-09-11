import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRoster} from './power-roster-audit.mjs';

const shot={type:'projectile',damage:12,speed:100,dtype:'fire',name:'A',color:'#ff0000'};
const roster=(a,b)=>[{id:'sample',abilities:{lmb:a,rmb:b}}];
test('cosmetic changes do not disguise an exact mechanical duplicate',()=>{
 const result=auditRoster(roster(shot,{...shot,name:'B',color:'#ffff00'}));
 assert.equal(result.exactDuplicates.length,1);
 assert.deepEqual(result.exactDuplicates[0].slots,['sample.lmb','sample.rmb']);
});
test('range and damage type differences remain mechanically distinct',()=>{
 for(const change of [{dtype:'cold'},{range:200}])
  assert.equal(auditRoster(roster(shot,{...shot,...change})).exactDuplicates.length,0);
});
test('construct subtypes do not become redundant just because they share a handler',()=>{
 assert.equal(auditRoster(roster({type:'construct',construct:'wall'},{type:'construct',construct:'turret'})).sameKitFamilies.length,0);
});
test('audit does not mutate authored data and reports missing handlers',()=>{
 const input=roster(shot,{type:'__missing__'}),before=structuredClone(input);
 const result=auditRoster(input);
 assert.deepEqual(input,before);assert.ok(result.validationProblems.some(p=>p.msg.includes('DEAD')));
});
