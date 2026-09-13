import test from 'node:test';import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {poseHoldPair,clearHoldPreview} from '../src/tool/paired-hold-preview.js';
for(const friendly of [false,true])test(`native paired hold preview remains finite, faces holder and never spends resources (${friendly})`,()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'sol'});try{const f=x.p,v=x.foe({z:6}),hp=v.hp,ki=f.ki;
 for(const t of [0,.5,1,1.5,2]){poseHoldPair(f,v,t,friendly);assert.equal(f.grabbing,v);assert.equal(v.grabbedBy,f);assert(Math.abs(Math.abs(v.obj.rotation.y)-Math.PI)<.001);assert.equal(v.pos.y,friendly?1.8:0);assert.equal(v.hp,hp);assert.equal(f.ki,ki);for(const actor of [f,v])actor.obj.traverse(o=>assert([...o.position,...o.quaternion,...o.scale].every(Number.isFinite)));}
 clearHoldPreview(f);assert.equal(f.grabbing,null);assert.equal(f._personCarry,null);
 }finally{x.close();}
});
