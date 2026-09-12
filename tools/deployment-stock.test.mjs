import test from 'node:test';
import assert from 'node:assert/strict';
import {DeploymentStock} from '../src/engine/deployment-stock.js';
import {ThreatDeployment} from '../src/engine/threat-deployment.js';
test('unknown, dead and already deployed actors cannot spend initial stock',()=>{
 const alive={alive:true},dead={alive:false},unknown={alive:true};
 const deployment={manifest:[alive,dead],deployed:new Set([alive]),stock:{commit(){assert.fail('Unexpected debit');}}};
 for(const f of [alive,dead,unknown])ThreatDeployment.prototype.transfer.call(deployment,f);
});
test('separate finite pools debit once per successful deployment identity',()=>{
 const stock=new DeploymentStock({soldier:1,lsw:2});
 assert.equal(stock.commit('a','soldier'),true);
 assert.equal(stock.commit('a','soldier'),true);
 assert.equal(stock.commit('b','soldier'),false);
 assert.equal(stock.commit('a','lsw'),false);
 assert.equal(stock.commit('c','lsw'),true);
 assert.deepEqual(stock.snapshot(),{initial:{soldier:1,lsw:2},remaining:{soldier:0,lsw:1},deployed:{soldier:1,lsw:1}});
});
test('invalid counts or classes cannot corrupt stock',()=>{
 for(const n of [-1,.5,Infinity,NaN])assert.throws(()=>new DeploymentStock({soldier:n,lsw:1}));
 const stock=new DeploymentStock({soldier:1,lsw:1});
 assert.equal(stock.commit('x','magic'),false);assert.equal(stock.commit(null,'lsw'),false);
 assert.equal(stock.snapshot().remaining.lsw,1);
});
