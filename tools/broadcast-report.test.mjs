import test from 'node:test';
import assert from 'node:assert/strict';
import {BroadcastMixin} from '../src/engine/hudBroadcast.js';
import {buildReport} from '../src/data/news.js';

for(const modeId of ['powerworld','ascendance'])test(`${modeId} end screen omits unrelated city claims`,()=>{
 const make=(id,name)=>({def:{id,colors:{accent:'#dca944'}},name,kills:0,level:1,tier:1,alive:true});
 const a=make('sol','SOL'),b=make('vega','VEGA');
 const g={modeId,player:a,entities:[a,b],ms:{enemy:b},isHuman:f=>f===a,world:{dayT:.3},audio:{sting(){}}};
 const result={win:true,title:'VICTORY'};g.matchReport=buildReport(g,result);
 const nodes=new Map(),end={style:{},classList:{add(){}},innerHTML:'',querySelector(id){
  if(!nodes.has(id))nodes.set(id,{style:{},appendChild(){}});return nodes.get(id);
 }};
 const hud={game:g,el:{end},_startTV(){},_typeScript(script,done){this.script=script;done();}};
 BroadcastMixin._showBroadcast.call(hud,result,g);
 assert.match(end.innerHTML,/Arena report/);
 assert.match(end.innerHTML,/nboards arena-report/);
 assert.doesNotMatch(end.innerHTML,/City desk|DAMAGE ASSESSMENT|Civilians treated|Early estimate/);
 assert.notEqual(nodes.get('#nWit').style.display,'block');
 assert.ok(hud.script.length>0);
 assert.equal(typeof nodes.get('#eRematch').onclick,'function');
});
