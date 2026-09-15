import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';
import {HIGHWALL_FLEET_PRESETS} from '../src/data/highwall-fleet.js';
import {highwallLayout} from '../src/data/highwall.js';
import {spawnHighwallFleet,fleetSpawnReason} from '../src/engine/highwall-fleet.js';
import {driveActor,initVehicleState} from '../src/engine/vehicle-pilot.js';
import {VEHICLE_ENVELOPES} from '../src/data/vehicle-envelopes.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/reference-fleet/catalog.json',import.meta.url)));
function fixture(){
 const g=Object.create(Game.prototype),layout=highwallLayout();
 Object.assign(g,{scene:new THREE.Scene(),world:{heightAt:()=>0,waterAt:()=>false,cover:layout.pieces,ARENA:1100},_fleetCat:catalog,hud:{feed(){}},player:{pos:new THREE.Vector3(),aim:new THREE.Vector3(0,0,1)},_highwall:{layout}});
 // Real spawn API with catalog dimensions; GLB geometry loading is the only stub.
 g._fleetLoader={loadAsync:async url=>{const d=catalog.models.find(m=>m.url===url).dimensions,scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(...d.max.map((v,i)=>v-d.min[i])),new THREE.MeshBasicMaterial()));return {scene};}};
 return g;
}

test('four Highwall stations use existing catalog models and safe real spawn/rig API',async()=>{
 const g=fixture();for(const p of HIGHWALL_FLEET_PRESETS.filter(p=>p.highwall)){
  const row=catalog.models.find(m=>m.id===p.id);assert.ok(fs.existsSync(new URL('../public/'+row.url.replace(/^\.\//,''),import.meta.url)));
  const a=await spawnHighwallFleet(g,p.id);assert.equal(a.cls,p.cls);assert.equal(a.motion.yaw,p.yaw);assert.ok(a.bodyHeight>0);assert.equal(fleetSpawnReason(g,a),null);
  assert.equal(a.motion.rollSpin,0);assert.equal(a.operation.aiCrew,false);assert.equal(a.operation.mountedWeapons,false);
 }
});

test('jet remains separate and its flight start retains airspeed and throttle',async()=>{
 const g=fixture();await assert.rejects(spawnHighwallFleet(g,'jet-a'),/separate flight/);g._highwall=null;
 const a=await spawnHighwallFleet(g,'jet-a');assert.equal(a.pos.y,160);assert.ok(a.motion.lever>0);assert.ok(a.motion.speed>a.env.stall+a.env.liftRamp);
 g.world.cover=[];g.world.ARENA=6000;for(let i=0;i<600;i++)driveActor(a,{},1/60,g.world);
 assert.equal(a.motion.stalled,false);assert.ok(Math.abs(a.pos.y-160)<.001);
});

test('invalid station placement is rejected and removes only the new actor',async()=>{
 const g=fixture();await assert.rejects(spawnHighwallFleet(g,'tank',{position:{x:-286,z:-220}}),/solid cover/);assert.equal(g._fleetActors.length,0);
});

test('known-height vehicles pass below roof slabs but cannot pass through low ceilings',()=>{
 const w={heightAt:()=>0,waterAt:()=>false,cover:[{x:0,z:0,hx:15,hz:20,bottom:22,top:26}],ARENA:6000};
 const a={cls:'tracked',env:VEHICLE_ENVELOPES.tank,pos:{x:0,y:0,z:-30},motion:initVehicleState('tracked'),bodyRadius:6,bodyHeight:17};
 for(let i=0;i<180;i++)driveActor(a,{throttle:1},1/60,w);assert.ok(a.pos.z>20);
 a.pos.z=-30;a.motion=initVehicleState('tracked');a.bodyHeight=24;
 for(let i=0;i<180;i++)driveActor(a,{throttle:1},1/60,w);assert.ok(a.pos.z<=-26);
});

test('measured helicopter cannot rise vertically through a shelter roof',()=>{
 const w={heightAt:()=>0,waterAt:()=>false,cover:[{x:0,z:0,hx:40,hz:40,bottom:22,top:26}],ARENA:6000};
 const a={cls:'rotor',env:VEHICLE_ENVELOPES.helicopter,pos:{x:0,y:0,z:0},motion:initVehicleState('rotor'),bodyRadius:10,bodyHeight:18};
 for(let i=0;i<180;i++)driveActor(a,{lift:1,on:true},1/60,w);
 assert.ok(a.pos.y+18<22);assert.equal(a.motion.vy,0);
});
