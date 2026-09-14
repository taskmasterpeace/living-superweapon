import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {thrownPropContact,previewPropThrow} from '../src/engine/thrown-prop-contact.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
const shape={radius:1,hitRadius:2,hitHeight:3};
const game=()=>({world:{cover:[],interiors:[]},entities:[],isFoe:(_a,b)=>b.alive});
for(const hz of [30,60,120])test(`fast prop contacts thin cover before a fighter at ${hz}Hz`,()=>{
 const g=game();g.world.cover=[{projectileShape:'box',x:0,z:10,hx:10,hz:.05,top:20}];g.entities=[{alive:true,pos:new THREE.Vector3(0,0,16),radius:2}];
 const a=new THREE.Vector3(0,5,0);let contact;
 for(let i=0;i<hz;i++){const b=a.clone().add(new THREE.Vector3(0,0,1200/hz));contact=thrownPropContact(g,{},a,b,shape);if(contact){assert.equal(contact.kind,'cover');assert.ok(Math.abs(a.z+(b.z-a.z)*contact.t-8.95)<.001);break;}a.copy(b);}
 assert.ok(contact);
});
test('raised native terrain stops a throw above the old zero floor',()=>{
 const g=game();Object.assign(g.world,{_ghTriangles:true,_gh:new Float32Array(9).fill(50),_gseg:2,_ghArena:100,heightAt:()=>50});
 const hit=thrownPropContact(g,{},new THREE.Vector3(0,60,0),new THREE.Vector3(0,40,0),shape);
 assert.equal(hit.kind,'ground');assert.ok(Math.abs(hit.t-.475)<.001);
});
test('earliest fighter contact is independent of entity order and interiors block it',()=>{
 const g=game(),near={alive:true,pos:new THREE.Vector3(0,0,12),radius:2},far={alive:true,pos:new THREE.Vector3(0,0,25),radius:2};g.entities=[far,near];
 const a=new THREE.Vector3(0,5,0),b=new THREE.Vector3(0,5,40);assert.equal(thrownPropContact(g,{},a,b,shape).target,near);
 g.world.interiors=[{x:0,z:10,hx:10,hz:10,top:20,walls:[{x:0,z:5,hx:10,hz:.1}]}];assert.equal(thrownPropContact(g,{},a,b,shape).kind,'interior');
 near.alive=false;g.world.interiors=[];assert.equal(thrownPropContact(g,{},a,b,shape).target,far);
});
test('native throw retires at raised ground and emits damage at contact',()=>{
 const x=mainCombatFixture({mode:'powerworld',height:50});let mesh;
 try{
  x.w._ghTriangles=true;x.p._openSky=true;x.p.pos.y=50;x.p.aim3.set(0,-1,0);
  mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(2),new THREE.MeshBasicMaterial());x.g.scene.add(mesh);mesh.position.set(0,61.5,-1.5);
  x.p._carry={kind:'rock',mesh,w:.12,spd:90,size:2,ratio:2};let impact;
  x.g.areaDamage=(_f,p)=>{impact=p.clone();};x.g.heroYell=()=>{};
  const cue=previewPropThrow(x.p,x.g);assert.ok(cue.contact);assert.ok(x.p._carry,'preview is read-only');
  x.g.throwProp(x.p);assert.equal(x.g._flung.length,1);
  for(let i=0;i<120&&!impact;i++)x.g.vfx.update(1/60);
  assert.ok(impact);assert.ok(Math.abs(impact.y-51)<.01,'contact must be on the raised floor, not y=1.2');assert.equal(x.g._flung.length,0);
  assert.ok(cue.points.at(-1).distanceTo(impact)<.01,'preview shares native launch, gravity and contact');
 }finally{x.close();mesh?.geometry.dispose();mesh?.material.dispose();}
});
