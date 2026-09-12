import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {domeAt,domeBlocks,updateDomes} from '../src/engine/systems2.js';
test('independent domes each deploy and collapse once; removal does not replay audio',()=>{
 const calls=[],g={time:1,scene:new Scene(),audio:{sample:(id)=>{calls.push(id);return true;},zap(){throw Error('Duplicate fallback');}},vfx:{ring(){}}},owner={team:1,def:{colors:{accent:'#ffcc33'}}};
 const a=domeAt(g,new Vector3(),8,10,owner),b=domeAt(g,new Vector3(20,0,0),8,10,owner);
 assert.deepEqual(calls,['op.shield.deploy','op.shield.deploy']);
 a.hp=0;b.t=0;updateDomes(g,.016);updateDomes(g,.016);
 assert.deepEqual(calls,['op.shield.deploy','op.shield.deploy','op.shield.collapse','op.shield.collapse']);
 assert.equal(g._domes.length,0);assert.equal(g.scene.children.length,0);
});
test('dome hit audio follows contact, coalesces bursts per instance and yields to collapse',()=>{
 const calls=[],g={time:1,scene:new Scene(),audio:{sample:(id,o)=>{calls.push({id,pos:o.pos?.clone()});return true;},zap(){throw Error('Unthrottled fallback');}},vfx:{ring(){}}},owner={team:1,def:{colors:{accent:'#ffcc33'}}};
 const a=domeAt(g,new Vector3(),8,10,owner),b=domeAt(g,new Vector3(20,0,0),8,10,owner);calls.length=0;
 const shot=(x,team=2,damage=8)=>({pos:new Vector3(x,0,0),caster:{team},damage});
 assert.equal(domeBlocks(g,shot(8,1),a),false);assert.equal(domeBlocks(g,shot(9),a),false);assert.equal(calls.length,0);
 assert.equal(domeBlocks(g,shot(8),a),true);domeBlocks(g,shot(8),a);domeBlocks(g,shot(28),b);
 assert.deepEqual(calls.map(c=>c.id),['op.shield.hit','op.shield.hit']);assert.equal(calls[0].pos.x,8);
 g.time+=.1;domeBlocks(g,shot(8),a);assert.equal(calls.length,3);
 domeBlocks(g,shot(8,2,1000),a);assert.equal(calls.length,3);
 assert.equal(domeBlocks(g,shot(8),a),false);updateDomes(g,.016);
 assert.equal(calls.at(-1).id,'op.shield.collapse');assert.equal(g._domes.length,1);
 b.t=0;updateDomes(g,.016);
});
