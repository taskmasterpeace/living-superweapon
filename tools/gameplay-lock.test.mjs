import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';

function fixture(angle=0,range=80){
 const camera=new THREE.PerspectiveCamera(60,16/9,.1,2000);camera.position.set(0,5.2,0);camera.lookAt(0,5.2,1);camera.updateMatrixWorld(true);
 const p={pos:new THREE.Vector3(),team:1},a=angle*Math.PI/180;
 const foe={pos:new THREE.Vector3(Math.sin(a)*range,0,Math.cos(a)*range),team:2,alive:true,_vis:1,def:{name:'FOE'},center(out){return out.copy(this.pos).setY(this.pos.y+5.2);}};
 const g={world:{camera},entities:[p,foe],hardLock:null,isFoe:(a,b)=>a.team!==b.team,canSee:()=>true};
 return {p,foe,g,acquire:()=>Game.prototype.cycleLock.call(g,p)};
}
test('T deliberately acquires a near-crosshair foe and always releases on its next press',()=>{
 const f=fixture(4);assert.equal(f.acquire(),f.foe);assert.equal(f.acquire(),null);
});
for(const angle of [20,60,100])test(`T cannot acquire a foe ${angle} degrees away from the crosshair`,()=>{
 const f=fixture(angle);assert.equal(f.acquire(),null);
});
for(const kind of ['cover','hidden','phase','blind','far','banished','inert'])test(`T cannot lock through ${kind}`,()=>{
 const f=fixture();
 if(kind==='cover')f.g.canSee=()=>false;
 if(kind==='hidden')f.foe._vis=0;
 if(kind==='phase')f.foe.phase=true;
 if(kind==='blind')f.p.blindT=1;
 if(kind==='far')f.foe.pos.z=1800;
 if(kind==='banished')f.foe._banished=true;
 if(kind==='inert')f.foe._inert=true;
 assert.equal(f.acquire(),null);
});
for(const kind of ['_banished','_inert'])test(`${kind} breaks an existing lock even with stale visibility`,()=>{
 const f=fixture();f.acquire();f.foe[kind]=true;
 Game.prototype.validateLock.call(f.g,f.p);assert.equal(f.g.hardLock,null);
});
test('lock validation clears an occluded target before it can own this frame\'s aim',()=>{
 const f=fixture();f.acquire();f.g.canSee=()=>false;
 Game.prototype.validateLock.call(f.g,f.p);assert.equal(f.g.hardLock,null);
});
