import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {bindVehicleParts,rigParts} from '../src/engine/vehicle-rig.js';
import {initAirborneVehicleState,driveActor,initVehicleState} from '../src/engine/vehicle-pilot.js';
import {VEHICLE_ENVELOPES} from '../src/data/vehicle-envelopes.js';
function actualNodes(path){
 const b=fs.readFileSync(new URL(path,import.meta.url));const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 const ns=j.nodes.map(n=>{const o=new THREE.Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);return o;});
 j.nodes.forEach((n,i)=>(n.children||[]).forEach(k=>ns[i].add(ns[k])));
 const root=new THREE.Group(); ns.filter(n=>!n.parent).forEach(n=>root.add(n));return root;
}
test('shipped mech has four bound leg chains that move and return to authored rest',()=>{
 const root=actualNodes('../public/authored-assets/prop.reference-mech-light/v6/model.glb');const parts=bindVehicleParts(root);
 assert.equal(Object.keys(parts.legs).length,4);
 const a={cls:'mech',env:VEHICLE_ENVELOPES['mech-light'],parts,motion:{speed:34,power:1,strideT:.125}};
 for(let i=0;i<60;i++)rigParts(a,1/60);
 const hip=parts.legs[0].hip,other=parts.legs[1].hip;
 assert.ok(hip.rotation.x>hip.userData._restX);assert.ok(other.rotation.x<other.userData._restX);
 const leg=parts.legs[0];assert.ok(Math.abs(leg.hip.rotation.x+leg.knee.rotation.x+leg.ankle.rotation.x-(leg.hip.userData._restX+leg.knee.userData._restX+leg.ankle.userData._restX))<1e-9);
 a.motion.speed=0;for(let i=0;i<120;i++)rigParts(a,1/60);
 assert.ok(Math.abs(hip.rotation.x-hip.userData._restX)<1e-7);
});
test('all fixed-wing practice envelopes sustain hands-off level flight after airborne start',()=>{
 for(const e of Object.values(VEHICLE_ENVELOPES).filter(e=>e.cls==='fixedwing')){
 const a={cls:'fixedwing',env:e,pos:{x:0,y:150,z:0},motion:initAirborneVehicleState(e)};
 for(let i=0;i<600;i++)driveActor(a,{},1/60,{heightAt:()=>0,cover:[]});
 assert.equal(a.motion.stalled,false,e.name);assert.ok(Math.abs(a.pos.y-150)<1e-8,e.name);assert.ok(a.pos.z>500,e.name);
 }
});
test('shipped jet struts retract progressively, held gear input toggles once, ground retraction blocked',()=>{
 const root=actualNodes('../public/authored-assets/prop.reference-jet-a/v15/model.glb');const parts=bindVehicleParts(root);assert.equal(parts.landingGear.length,3);
 const a={cls:'fixedwing',env:VEHICLE_ENVELOPES['jet-a'],parts,pos:{x:0,y:150,z:0},motion:initAirborneVehicleState(VEHICLE_ENVELOPES['jet-a'])};
 const world={heightAt:()=>0,cover:[]};driveActor(a,{gearToggle:true},1/60,world);
 assert.equal(a.motion.gearDown,false);assert.ok(a.motion.gearAmount>0&&a.motion.gearAmount<1);
 for(let i=0;i<90;i++)driveActor(a,{gearToggle:true},1/60,world);
 assert.equal(a.motion.gearAmount,0);assert.ok(parts.landingGear.every(g=>Math.abs(g.rotation.x-Math.PI/2)<1e-8));
 driveActor(a,{},1/60,world);driveActor(a,{gearToggle:true},1/60,world);assert.equal(a.motion.gearDown,true);
 a.pos.y=0;a.motion=initVehicleState('fixedwing');driveActor(a,{gearToggle:true,parked:true},1/60,world);assert.equal(a.motion.gearDown,true);
});
