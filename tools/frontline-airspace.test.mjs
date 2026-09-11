import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {installFrontlineGround,authorFrontlineRelief,restoreFrontlineGround} from '../src/engine/frontline-ground.js';
import {terrainEntry,coverBoxEntry} from '../src/engine/projectile-contact.js';
import {AI} from '../src/engine/ai.js';
import {HUD} from '../src/engine/hud.js';

const noop=()=>{},world=Object.create(World.prototype),scene=new THREE.Scene();
Object.assign(world,{scene,ARENA:240,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],refreshFogBoxes:noop,setSpace:noop,setSkyWorld:noop});
const stage=new PowerWorldStage({world,scene,entities:[]});stage._hideTheatre();stage.group=new THREE.Group();scene.add(stage.group);
const material=new THREE.MeshBasicMaterial();stage._mats.push(material);
installFrontlineGround(stage,material,900,6800,50000);authorFrontlineRelief(stage);
const far=stage.group.getObjectByName('frontline-distant-ground');
const rock=new THREE.Mesh(new THREE.BoxGeometry(80,120,60),material);rock.position.set(1800,100,700);rock.rotation.y=.35;rock.userData.frontlineDistant=true;stage.group.add(rock);
after(()=>stage.close());

test('airspace extension preserves central ground, original apron vertices and texture scale',()=>{
 const oldWorld=Object.create(World.prototype);Object.assign(oldWorld,{ARENA:900});
 const oldStage={g:{world:oldWorld},group:new THREE.Group(),_cover:[]};
 installFrontlineGround(oldStage,material,900,6800);authorFrontlineRelief(oldStage);
 try{
  assert.deepEqual(world.groundGeo.attributes.position.array,oldWorld.groundGeo.attributes.position.array);
  const oldFar=oldStage.group.getObjectByName('frontline-distant-ground');
  for(const key of ['position','uv'])assert.deepEqual(far.geometry.attributes[key].array.slice(0,oldFar.geometry.attributes[key].array.length),oldFar.geometry.attributes[key].array);
  assert.deepEqual(far.geometry.index.array.slice(0,oldFar.geometry.index.array.length),oldFar.geometry.index.array);
  const expanded=world._outerTerrain;world._outerTerrain=oldWorld._outerTerrain;stage.frontlineAssetsReady=true;
  try{assert.equal(stage._enableAirspace(),false,'loaded assets without sufficient physical terrain must keep the gate closed');assert.equal(world.ARENA,900);}
  finally{world._outerTerrain=expanded;stage.frontlineAssetsReady=false;}
 }finally{restoreFrontlineGround(oldStage);oldStage.group.traverse(o=>o.geometry?.dispose());}
});

test('expanded exterior has rendered and collision ground under all playable far corners',()=>{
 far.updateWorldMatrix(true,true);const ray=new THREE.Raycaster();
 for(const [x,z]of [[32000,32000],[-32000,32000],[32000,-32000],[-32000,-32000],[12000,300]]){
  ray.set(new THREE.Vector3(x,2000,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(far,false)[0];
  assert.ok(hit,`no visible floor at ${x},${z}`);
  assert.ok(Math.abs(world.heightAt(x,z)-hit.point.y)<1e-5);
  const a=new THREE.Vector3(x,hit.point.y+80,z),b=new THREE.Vector3(x,hit.point.y-20,z);
  assert.ok(Math.abs(terrainEntry(world,a,b)-.8)<1e-6);
 }
});

test('airspace opens only after asset readiness and measures the final distant rock once',()=>{
 assert.equal(typeof stage._enableAirspace,'function','stage must coordinate collision before extending bounds');
 assert.equal(stage._enableAirspace(),false);assert.equal(world.ARENA,900);
 stage.frontlineAssetsReady=true;assert.equal(stage._enableAirspace(),true);assert.ok(world.ARENA>=32000);
 assert.equal(world.combatRadius,900);
 const c=world.cover.find(c=>c.mesh===rock);assert.ok(c,'previous scenic rock must physically stop a fast flyer');
 const box=new THREE.Box3().setFromObject(rock,true);
 assert.ok(Math.abs(c.top-box.max.y)<1e-5);assert.ok(c.x-c.hx<=box.min.x&&c.x+c.hx>=box.max.x);
 assert.ok(Number.isFinite(coverBoxEntry(new THREE.Vector3(1600,140,700),new THREE.Vector3(2000,140,700),c,2)));
 assert.equal(stage._enableAirspace(),true);assert.equal(world.cover.filter(c=>c.mesh===rock).length,1);
});

test('local soldier patrol does not adopt a jet-scale random walking destination',()=>{
 const bot={pos:new THREE.Vector3(0,0,0),def:{ai:{style:'zoner'}},slots:{}},ai=new AI(bot);
 for(let i=0;i<50;i++){
  ai._patrol=null;const target=ai._searchGoal({world:{ARENA:32000,combatRadius:900}},.1);
  assert.ok(Math.abs(target.x)<900&&Math.abs(target.z)<900,`patrol wandered to ${target.x},${target.z}`);
 }
});

test('radar keeps nearby cover readable and its player visible in distant airspace',()=>{
 const rects=[],moves=[],ctx=new Proxy({fillRect:(...args)=>rects.push(args),moveTo:(...args)=>moves.push(args)},{get:(o,k)=>o[k]??noop});
 const hud={_radarCtx:ctx,el:{radar:{style:{display:'block'}}}};
 const player={pos:new THREE.Vector3(20000,100,19000),aim:new THREE.Vector3(0,0,1),def:{colors:{accent:'#ffaa44'}},alive:true};
 const game={modeId:'powerworld',fov:true,player,entities:[],world:{ARENA:32000,combatRadius:900,cover:[{x:20000,z:19000,hx:60,hz:40}]}};
 HUD.prototype.updateRadar.call(hud,game);
 assert.ok(rects[1][2]>8,'a nearby 120u structure should not shrink to a 2px dot');
 assert.ok(moves.some(([x,y])=>x>20&&x<132&&y>20&&y<132),'player wedge must remain within the local radar');
});

test('leaving the stage restores prior world extent and removes venue-only combat radius',()=>{
 stage.close();assert.equal(world.ARENA,240);assert.equal(world.combatRadius,undefined);
 assert.equal(world._outerTerrain,undefined);assert.equal(world.cover.length,0);
});
