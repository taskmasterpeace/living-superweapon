import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {installFrontlineGround,authorFrontlineRelief,restoreFrontlineGround} from '../src/engine/frontline-ground.js';
import {terrainEntry} from '../src/engine/projectile-contact.js';

const world=Object.create(World.prototype);
Object.assign(world,{ARENA:900,cover:[],interiors:[]});
const stage={g:{world},group:new THREE.Group(),_cover:[]},material=new THREE.MeshBasicMaterial();
installFrontlineGround(stage,material,900,6800);
authorFrontlineRelief(stage);
const far=stage.group.getObjectByName('frontline-distant-ground');
stage.group.updateMatrixWorld(true);
const ray=new THREE.Raycaster();
function renderedHeight(x,z){ray.set(new THREE.Vector3(x,2000,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(far,false)[0]?.point.y;}
function renderedEntry(a,b,meshes=[world.ground,far]){
 const delta=b.clone().sub(a),length=delta.length();ray.set(a,delta.normalize());ray.far=length;
 const hit=ray.intersectObjects(meshes,false)[0];ray.far=Infinity;return hit?hit.distance/length:Infinity;
}
after(()=>{restoreFrontlineGround(stage);stage.group.traverse(o=>o.geometry?.dispose());material.dispose();});

test('outer height uses the rendered triangles instead of clamping to the central field edge',()=>{
 for(const [x,z]of [[1600,50],[-2100,390],[3000,-1200],[-4800,1800],[1100,-1100]]){
  const expected=renderedHeight(x,z);assert.ok(Number.isFinite(expected));
  assert.ok(Math.abs(world.heightAt(x,z)-expected)<1e-5,`${x},${z}: height=${world.heightAt(x,z)} rendered=${expected}`);
 }
});

test('outer-only horizontal shot catches an intervening ridge, not a fictitious central-edge floor',()=>{
 const a=new THREE.Vector3(1800,130,1800),b=new THREE.Vector3(5700,130,1800);
 assert.ok(renderedHeight(a.x,a.z)<a.y&&renderedHeight(b.x,b.z)<b.y,'fixture endpoints must be clear');
 const expected=renderedEntry(a,b);assert.ok(expected>0&&expected<1,'fixture must cross real terrain');
 assert.ok(Math.abs(terrainEntry(world,a,b)-expected)<1e-6);
});

test('central/outer seam crossing agrees with first rendered contact in both travel directions',()=>{
 for(const [a,b]of [
  [new THREE.Vector3(0,220,0),new THREE.Vector3(3500,20,600)],
  [new THREE.Vector3(3500,240,600),new THREE.Vector3(0,-10,0)],
  [new THREE.Vector3(-4000,160,-2500),new THREE.Vector3(4000,30,2500)]
 ]){
  const expected=renderedEntry(a,b);assert.ok(Number.isFinite(expected));
  assert.ok(Math.abs(terrainEntry(world,a,b)-expected)<1e-5,`sweep=${terrainEntry(world,a,b)} ray=${expected}`);
 }
});

test('native crater changes stay live instead of being baked into the static exterior index',()=>{
 const x=0,z=0,before=world.heightAt(x,z),middle=(world._gh.length-1)/2;
 world._gh[middle]-=3;
 assert.ok(Math.abs(world.heightAt(x,z)-(before-3))<1e-5);world._gh[middle]+=3;
});

test('outer query cache is bounded, exact-coordinate and released on theatre restore',()=>{
 assert.ok(world._outerTerrain,'the installed floor must own its collision index');
 const surface=world._outerTerrain;
 for(let i=0;i<1100;i++)world.heightAt(1500+i*.01,40+i*.013);
 assert.ok(surface.cacheSize<=512);
 for(const x of [1500.0001,1500.0002])assert.ok(Math.abs(world.heightAt(x,40)-renderedHeight(x,40))<1e-5);
 restoreFrontlineGround(stage);
 assert.equal(world._outerTerrain,undefined);assert.equal(surface.cacheSize,0);
 assert.equal(surface.heightAt(1500,40),undefined,'disposed surface must not return stale cached geometry');
});
