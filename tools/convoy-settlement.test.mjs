import test from 'node:test';
import assert from 'node:assert/strict';
import {ConvoyOperation} from '../src/engine/convoy-operation.js';
import {CampaignState} from '../src/engine/campaign-state.js';

test('failed reward save preserves outcome, retries once per second and awards once',()=>{
 let blocked=true,writes=0;
 const storage={getItem:()=>null,setItem(){writes++;if(blocked)throw Error('Storage full');}};
 const campaign=new CampaignState(storage),results=[];
 const op=Object.assign(Object.create(ConvoyOperation.prototype),{
  id:'settlement-test',g:{campaign,time:12,player:{},endMatch:r=>results.push(r)},
  state:'travel',cache:true,cargoOwner:{},events:[],hud:{hidden:false},
  vehicle:{speed:18,vx:3,vz:4,yawVel:1},
 });
 op.finish(true,'Extracted');
 assert.equal(op.state,'saving');assert.equal(op.vehicle.speed,0);
 assert.equal(campaign.snapshot().supplies,120);assert.equal(results.length,0);
 assert.match(op.hud.textContent,/RESULT PENDING/);
 // A later failure must not replace the earned victory or its cache reward.
 op.cache=false;op.cargoOwner=null;
 for(let i=0;i<10;i++)op.update(.05);
 assert.equal(writes,1);
 blocked=false;op.update(.6);
 assert.equal(results.length,1);assert.equal(results[0].win,true);
 assert.equal(campaign.snapshot().supplies,190);assert.equal(campaign.snapshot().research,45);
 op.finish(false,'Late death');op.update(2);
 assert.equal(writes,2);assert.equal(results.length,1);
 assert.equal(campaign.snapshot().awarded.length,1);
});
