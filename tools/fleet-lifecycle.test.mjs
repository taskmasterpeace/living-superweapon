import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(){
 const g=Object.create(Game.prototype),scene=new THREE.Scene();
 const model=new THREE.Group();model.add(new THREE.Mesh(new THREE.BoxGeometry(4,4,8),new THREE.MeshBasicMaterial()));
 Object.assign(g,{scene,modeId:'powerworld',entities:[],world:{heightAt:()=>0,cover:[],coverAll:[]},
  player:{def:{id:'sol'},pos:new THREE.Vector3(),vel:new THREE.Vector3(),obj:new THREE.Group()},
  hud:{feed(){}},_fleetCat:{models:[{id:'tank',url:'tank.glb'},{id:'motorcycle',url:'bike.glb'}]},
  _fleetLoader:{loadAsync:async()=>({scene:model})}});
 const savedDocument=globalThis.document;
 globalThis.document={getElementById:()=>null,body:{classList:{remove(){}}}};
 return {g,model,close(){globalThis.document=savedDocument;model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
function preparedSim(g){
 g._simUndo=[];g._simCleared=[];
 for(const key of ['_simWalls','_simGate','_simWater','_simSkyRings','_simRing','_simBoxRing','_simMaze','_simDefenses'])g[key]={};
}

test('pending GLB cannot spawn after actual clearTransients',async()=>{
 const x=fixture();try{const d=deferred();x.g._fleetLoader.loadAsync=()=>d.promise;
  const pending=x.g.spawnFleetVehicle('tank');x.g.clearTransients();d.resolve({scene:x.model});
  assert.equal(await pending,null);assert.equal(x.g._fleetActors?.length||0,0);assert.equal(x.g.scene.children.length,0);
 }finally{x.close();}
});

test('catalog response cannot restart proving ground after reset',async()=>{
 const x=fixture(),savedFetch=globalThis.fetch;try{preparedSim(x.g);const d=deferred();x.g._fleetCat=null;
  globalThis.fetch=()=>d.promise;const pending=x.g.deployVehicleSim('tank');
  // Use the real clear path, with no fabricated prop records needing teardown.
  for(const key of ['_simWalls','_simGate','_simWater','_simSkyRings','_simRing','_simBoxRing','_simMaze','_simDefenses'])x.g[key]=null;
  x.g.clearTransients();d.resolve({json:async()=>({models:[{id:'tank',url:'tank.glb'}]})});
  assert.equal(await pending,null);assert.equal(x.g._simActive,false);assert.equal(x.g._fleetActors?.length||0,0);
 }finally{globalThis.fetch=savedFetch;x.close();}
});

test('newer deployment wins even when older GLB resolves last',async()=>{
 const x=fixture();try{preparedSim(x.g);const a=deferred(),b=deferred();
  x.g._fleetLoader.loadAsync=url=>url==='tank.glb'?a.promise:b.promise;
  const old=x.g.deployVehicleSim('tank'),latest=x.g.deployVehicleSim('motorcycle');
  b.resolve({scene:x.model});const newest=await latest;a.resolve({scene:x.model});
  assert.equal(await old,null);assert.equal(x.g._simVehicle,newest);assert.equal(newest.id,'motorcycle');assert.equal(x.g._fleetActors.length,1);
 }finally{x.close();}
});

test('PowerWorld Threat Room enters practice desert before building proving ground',async()=>{
 const x=fixture();try{preparedSim(x.g);x.g._threatRoom={active:true};let transitions=0;
  x.g.startMode=(mode,opts)=>{assert.equal(mode,'powerworld');assert.equal(opts.encounter,'practice');x.g._threatRoom.active=false;transitions++;};
  const a=await x.g.deployVehicleSim('tank');assert.equal(transitions,1);assert.equal(x.g._threatRoom.active,false);assert.ok(a);
 }finally{x.close();}
});

test('deleting one instance never disposes cached or other-instance geometry',async()=>{
 const x=fixture();try{const a=await x.g.spawnFleetVehicle('tank'),b=await x.g.spawnFleetVehicle('tank');
  const original=x.model.children[0].geometry,ag=a.model.children[0].geometry,bg=b.model.children[0].geometry;
  assert.notEqual(ag,original);assert.notEqual(ag,bg);let cachedDisposed=0,otherDisposed=0;
  original.addEventListener('dispose',()=>cachedDisposed++);bg.addEventListener('dispose',()=>otherDisposed++);
  a.wrapper.traverse(o=>o.geometry?.dispose());assert.equal(cachedDisposed,0);assert.equal(otherDisposed,0);
 }finally{x.close();}
});
