import test from 'node:test';
import assert from 'node:assert/strict';
import {startThreatScan,updateThreatScan} from '../src/engine/threat-scanner.js';
function fixture(){
 const item={},f={alive:true,pos:{},items:[item]},target={alive:true,pos:{distanceTo:()=>50},_vis:1,def:{name:'Subject'},hp:80,maxHp:100,resist:{fire:.5}};
 let visible=true,commits=0;
 const g={hardLock:target,isFoe:()=>true,canSee:()=>visible,isHuman:()=>false};
 return {g,f,item,target,commit:()=>commits++,get commits(){return commits;},lose:()=>visible=false};
}
test('scan only commits after acquisition, stores a snapshot, expires without live updates',()=>{
 const x=fixture();assert.equal(startThreatScan(x.g,x.f,x.item,x.commit),true);
 updateThreatScan(x.g,x.f,.3);assert.equal(x.commits,0);
 updateThreatScan(x.g,x.f,.4);assert.equal(x.commits,1);assert.equal(x.f._threatScan.snapshot.hp,80);
 x.target.hp=20;updateThreatScan(x.g,x.f,1);assert.equal(x.f._threatScan.snapshot.hp,80);
 updateThreatScan(x.g,x.f,6);assert.equal(x.f._threatScan.phase,'lost');assert.equal(x.commits,1);
 updateThreatScan(x.g,x.f,3);assert.equal(x.f._threatScan,null);
});
test('LOS loss, removed gadget and repeated input cannot spend or duplicate pending scan',()=>{
 for(const mode of ['los','removed','death']){
  const x=fixture();startThreatScan(x.g,x.f,x.item,x.commit);
  assert.equal(startThreatScan(x.g,x.f,x.item,x.commit),false);
  if(mode==='los')x.lose();if(mode==='removed')x.f.items=[];if(mode==='death')x.f.alive=false;
  updateThreatScan(x.g,x.f,1);assert.equal(x.commits,0);
 }
});
