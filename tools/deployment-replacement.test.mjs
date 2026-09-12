import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {ThreatDeployment} from '../src/engine/threat-deployment.js';
import {DeploymentStock} from '../src/engine/deployment-stock.js';
function fixture(){
 const old={alive:false,def:{id:'kano',archetype:'lsw'}},player={alive:true,team:0};
 const g={player,ms:{squad:{members:[old]}},entities:[],hud:{feed(){}},spawnEnemy(id,opts){const f={alive:true,def:old.def,pos:new Vector3(),vel:new Vector3()};this.entities.push(f);return f;}};
 return Object.assign(Object.create(ThreatDeployment.prototype),{g,state:'field',stock:new DeploymentStock({soldier:0,lsw:1}),manifest:[player,old],deployed:new Set([player,old]),destination:new Vector3(),clearPad:()=>new Vector3(10,0,10)});
}
test('replacement fills one dead slot, consumes one reserve and repeated requests do nothing',()=>{
 const d=fixture();assert.equal(d.requestReplacement(),true);
 assert.equal(d.g.entities.length,1);assert.equal(d.g.ms.squad.members.length,1);
 assert.equal(d.g.ms.squad.members[0]._squadLeader,d.g.player);
 assert.equal(d.stock.remaining.lsw,0);assert.equal(d.requestReplacement(),false);
 assert.equal(d.g.entities.length,1);
});
test('blocked placement leaves reserve and roster unchanged',()=>{
 const d=fixture(),old=d.g.ms.squad.members[0];d.clearPad=()=>null;
 assert.equal(d.requestReplacement(),false);assert.equal(d.stock.remaining.lsw,1);
 assert.equal(d.g.ms.squad.members[0],old);assert.equal(d.g.entities.length,0);
});
