// Explicit open visual witness, not part of the accepted camera regression set.
// Run directly: node --test tools/ground-camera-takeoff-pending.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';
globalThis.innerWidth=1280;globalThis.innerHeight=800;
for(const pitch of [45,60])test(`PENDING: ${pitch}-degree optic takeoff keeps the body clear of the reticle`,()=>{
 const p=spineCombatFixture({source:'eye',motion:'stand'}),{f}=p;
 const camera=new THREE.PerspectiveCamera(73.74,1.6,.6,4200),w=Object.create(World.prototype),hits=[];
 Object.assign(w,{camera,camChase:camera,camMode:'chase',camPos:new THREE.Vector3(),camTarget:new THREE.Vector3(),camBasis:new THREE.Vector3(),
  sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(40,60,20),interiors:[],_lookActive:true,_lookYaw:0,_lookPitch:pitch*Math.PI/180,
  _shake:0,_shakeT:0,_gseg:112,_ghArena:240,ARENA:240,_gh:new Float32Array(113*113),
  cover:[{x:-10.87012740102363,z:-1.62572936057744,hx:8.670127401023638,hz:8.670127401023638,top:14.672523294040003}]});
 try{
  p.aim(0,100*Math.tan(pitch*Math.PI/180));for(let i=0;i<60;i++)p.step();p.start('lmb');
  for(let i=0;i<180;i++){
   const y=i<120?0:(i-120)*.5;f.pos.y=y;f.obj.position.copy(f.pos);f.flying=y>0;f.gait=f.flying?'airborne':'grounded';f.vel.set(0,i>=120?30:0,0);
   p.aim(0,100*Math.tan(pitch*Math.PI/180));p.step();w.chase(f,null,1/60);camera.updateMatrixWorld(true);
   const intersections=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),camera.near,30).intersectObject(f.parts.body,true).filter(h=>{
    for(let o=h.object;o;o=o.parent)if(!o.visible)return false;
    return [].concat(h.object.material).some(m=>!m.transparent);
   });
   if(intersections.length)hits.push({frame:i,height:y});
  }
  assert.deepEqual(hits,[],'Camera still crosses body/hair during the first part of takeoff');
 }finally{p.close();}
});
