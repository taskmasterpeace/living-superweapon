import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleFrontlineRelief} from '../src/engine/frontline-ground.js';
import * as THREE from 'three';
import {PowerWorldStage} from '../src/engine/powerworld.js';

const module=await import('../src/engine/frontline-outpost.js').catch(()=>({}));
function fixture(){
 const world={scene:new THREE.Scene(),cover:[],coverAll:[],heightAt:()=>0,refreshFogBoxes(){}};
 const stage=new PowerWorldStage({world});stage.group=new THREE.Group();world.scene.add(stage.group);
 const scene=new THREE.Group();
 for(const name of ['hangar','command','watchtower','barricade']){
  const root=new THREE.Group();root.name=name;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(20,10,12),new THREE.MeshStandardMaterial());mesh.position.y=5;root.add(mesh);scene.add(root);
 }
 return{stage,world,scene};
}

test('loaded military structures register cover that agrees with visible roof and footprint',async()=>{
 assert.equal(typeof module.installFrontlineOutpost,'function','Missing military structure installation');
 const x=fixture();await module.installFrontlineOutpost(x.stage,{loader:{loadAsync:async()=>({scene:x.scene})}});
 const c=x.world.cover.find(c=>c.frontlineBuilding==='command');assert.ok(c);
 assert.equal(c.top,10);assert.equal(c.hx,10);assert.equal(c.hz,6);
 assert.ok(x.world.coverAll.includes(c)&&x.stage._cover.includes(c));
 const ray=new THREE.Raycaster(new THREE.Vector3(c.x,100,c.z),new THREE.Vector3(0,-1,0));
 x.stage.group.updateMatrixWorld(true);assert.equal(ray.intersectObject(c.mesh,true)[0].point.y,c.top);
});

test('leaving during outpost load disposes the unused asset without touching the next stage',async()=>{
 assert.equal(typeof module.installFrontlineOutpost,'function','Missing cancellable military structure installation');
 const x=fixture();let release,disposed=0;
 x.scene.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));
 const loading=module.installFrontlineOutpost(x.stage,{loader:{loadAsync:()=>new Promise(r=>release=r)}});
 x.stage.group=new THREE.Group();release({scene:x.scene});await loading;
 assert.equal(x.stage.group.children.length,0);assert.equal(x.world.cover.length,0);assert.equal(disposed,4);
});

// Catches terrain/art disagreement: an aircraft cannot use a painted runway
// whose native support surface still contains the old canyon undulations.
test('connected military apron and runway have a level physical support surface',()=>{
 for(const [x,z] of [[-100,350],[65,400],[65,700],[-55,190],[-95,100],[-110,55]])
  assert.ok(Math.abs(sampleFrontlineRelief(x,z))<1e-5,`Unlevel military surface at ${x},${z}`);
});

test('runway shoulders meet natural terrain without a vertical step',()=>{
 for(const z of [320,500,750])for(let x=120;x<190;x+=.25)
  assert.ok(Math.abs(sampleFrontlineRelief(x+.25,z)-sampleFrontlineRelief(x,z))<1,`Vertical shoulder at ${x},${z}`);
});
