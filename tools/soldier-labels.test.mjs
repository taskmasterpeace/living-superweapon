import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
const api=await import('../src/engine/soldier-labels.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('soldier identification does not reveal a hidden, occluded, dead or out-of-range fighter',()=>{
 assert.equal(typeof api.canIdentifySoldier,'function');
 const player={pos:new Vector3(),team:0},f={pos:new Vector3(0,0,40),team:1,_vis:1,alive:true,hp:80,obj:{visible:true}},g={player,running:true,canSee:()=>true};
 assert.ok(api.canIdentifySoldier(g,f));
 for(const patch of [{_vis:.2},{alive:false},{hp:0},{pos:new Vector3(0,0,600)},{obj:{visible:false}},{team:0}])assert.equal(api.canIdentifySoldier(g,{...f,...patch}),false);
 assert.equal(api.canIdentifySoldier({...g,canSee:()=>false},f),false);
 assert.equal(api.canIdentifySoldier({...g,running:false},f),false);
});
