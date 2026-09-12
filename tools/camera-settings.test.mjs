import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMERA_STORAGE_KEY,CAMERA_OPTION_LIMITS,normalizeCameraPreferences,loadCameraPreferences,setCameraPreferences,resetCameraPreferences} from '../src/core/camera-settings.js';
import {cameraProfileOf,FRONTLINE_CAMERA,POWERWORLD_BACKSIDE_CAMERA} from '../src/data/camera-presets.js';
import {CAMERA_DEFAULTS} from '../src/data/flight-tuning.js';
import {LIMITS} from '../src/tool/studio-profile.js';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
const store=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};

test('PowerWorld defaults to rear-quarter framing while explicit centered preference stays centered',()=>{
 const subject={_openSky:true,def:{}};
 assert.equal(cameraProfileOf(subject),POWERWORLD_BACKSIDE_CAMERA);
 assert.equal(cameraProfileOf(subject).fov,CAMERA_DEFAULTS.fov);
 assert.ok(cameraProfileOf(subject).shoulder>0);
 assert.equal(cameraProfileOf(subject,{mode:'centered'}).shoulder,0);
 assert.equal(cameraProfileOf({def:{}}),undefined,'city default remains independent');
});
test('invalid storage is ignored and numeric values use Studio bounds',()=>{
 const s=store();for(const value of ['broken','[]','null','{"mode":"unknown"}']){s.setItem(CAMERA_STORAGE_KEY,value);assert.equal(loadCameraPreferences(s),null);}
 assert.deepEqual(normalizeCameraPreferences({mode:'shoulder',fov:999,range:-1}),{mode:'shoulder',fov:85,range:18});
 assert.deepEqual(normalizeCameraPreferences({mode:'centered',fov:'75',range:NaN}),{mode:'centered'});
 for(const key of ['fov','range'])assert.deepEqual(CAMERA_OPTION_LIMITS[key],LIMITS.camera[key]);
});
test('save survives a fresh load and reset removes only player preferences',()=>{
 const s=store();s.setItem('lsw.studio.profiles.v1','untouched');setCameraPreferences({mode:'shoulder',fov:71,range:32},s);
 assert.deepEqual(loadCameraPreferences(s),{mode:'shoulder',fov:71,range:32});resetCameraPreferences(s);
 assert.equal(loadCameraPreferences(s),null);assert.equal(s.getItem('lsw.studio.profiles.v1'),'untouched');
});
test('vehicles precede explicit preference; reset restores match/character/default',()=>{
 const authored={fov:65,range:40},subject={def:{model:{camera:authored}}},p={mode:'centered'};
 assert.deepEqual(cameraProfileOf(subject,p),CAMERA_DEFAULTS);assert.equal(cameraProfileOf(subject),authored);
 subject._cameraPreset='frontline';assert.equal(cameraProfileOf(subject),FRONTLINE_CAMERA);assert.deepEqual(cameraProfileOf(subject,p),CAMERA_DEFAULTS);
 subject._scoutVehicle={};assert.equal(cameraProfileOf(subject,p).range,52);
 subject._aircraftVehicle={kind:'jet'};assert.equal(cameraProfileOf(subject,p).range,155);
 assert.deepEqual(authored,{fov:65,range:40});assert.equal(cameraProfileOf({def:{}}),undefined);
});
test('native shoulder camera keeps cover collision after player preference composition',()=>{
 globalThis.innerWidth=1440;globalThis.innerHeight=900;
 const f=new Fighter(ROSTER.find(d=>d.id==='sol')),w=Object.create(World.prototype);
 const camera=new THREE.PerspectiveCamera(73.74,1.6,.6,4200);
 Object.assign(w,{game:{player:f},camera,camChase:camera,camMode:'chase',camPos:new THREE.Vector3(),camTarget:new THREE.Vector3(),camBasis:new THREE.Vector3(),sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(40,60,20),cover:[{x:-10.87,z:-1.63,hx:8.67,hz:8.67,top:14.67}],interiors:[],_lookActive:true,_lookYaw:0,_lookPitch:0,_shake:0,_shakeT:0,_gseg:4,_ghArena:80,ARENA:80,_gh:new Float32Array(25)});
 f._openSky=true;f.pos.set(0,0,0);f.groundY=0;f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.facing=0;
 try{
  setCameraPreferences({mode:'shoulder',fov:85,range:18},store());
  for(const degrees of [0,45,79]){
   w._lookPitch=degrees*Math.PI/180;for(let i=0;i<30;i++)w.chase(f,null,1/60,'bfp');
   const tan=Math.tan(camera.fov*Math.PI/360),pad=camera.near*Math.sqrt(1+tan*tan*(1+camera.aspect*camera.aspect))*1.35;
   assert.ok(w._camNearestT(0,5.4,0,...camera.position.toArray(),pad)>=1-1e-6,`Shoulder camera crossed cover at ${degrees}`);
   assert.ok(Math.abs(camera.fov-85)<1e-6);
  }
 }finally{resetCameraPreferences(store());f.dispose();}
});
