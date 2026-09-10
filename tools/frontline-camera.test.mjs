import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {CAMERA_DEFAULTS} from '../src/data/flight-tuning.js';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';
import {Fighter} from '../src/engine/entity.js';
import {profileFromDef,resetCamera,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
const camera=await import('../src/data/camera-presets.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('front-line camera is explicit and leaves stock BFP plus authored characters unchanged',()=>{
 assert.equal(typeof camera.withCameraPreset,'function');
 const def=structuredClone(ROSTER.find(d=>d.id==='vega'));def.model={camera:{range:37}};
 const next=camera.withCameraPreset(def,'frontline');assert.notEqual(next,def);assert.equal(next.model.camera.range,20);assert.equal(def.model.camera.range,37);
 assert.equal(camera.withCameraPreset(def,'character'),def);assert.equal(camera.withCameraPreset(def,'unknown'),def);assert.equal(CAMERA_DEFAULTS.range,25.5);assert.equal(CAMERA_DEFAULTS.shoulder,0);
});
test('Studio field camera preset changes only camera and stays portable with ordinary reset',()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='vega')),profile=profileFromDef(def),next=resetCamera(profile,'frontline');
 assert.equal(next.camera.range,20);assert.equal(next.camera.shoulder,3.5);assert.deepEqual({...next,camera:profile.camera},profile);
 const round=validateProfile(JSON.parse(JSON.stringify(next)));assert.equal(applyProfile(def,round).model.camera.fov,68);
 assert.deepEqual(resetCamera(next).camera,CAMERA_DEFAULTS);
});

test('a match camera selection survives appearance changes without modifying a saved character',()=>{
 assert.equal(typeof camera.cameraProfileOf,'function');const actor={_cameraPreset:'frontline',def:{model:{camera:{range:37}}}};
 assert.equal(camera.cameraProfileOf(actor).range,20);actor.def={model:{camera:{range:44}}};assert.equal(camera.cameraProfileOf(actor).range,20);
 delete actor._cameraPreset;assert.equal(camera.cameraProfileOf(actor).range,44);
});

test('native hero swapping preserves an explicit match camera, not just an appearance change',()=>{
 const player=new Fighter(ROSTER.find(d=>d.id==='vega'));player._cameraPreset='frontline';
 const game={player,scene:new THREE.Scene(),entities:[player],humans:[{fighter:player}],vfx:{flash(){},ring(){}},addFighter(def){const f=new Fighter(def);this.entities.push(f);return f;}};
 try{Game.prototype.setPlayerChar.call(game,'kano');assert.equal(camera.cameraProfileOf(game.player)?.range,20);assert.equal(game.humans[0].fighter,game.player);assert.equal(game.entities.length,1);}
 finally{game.player.dispose();}
});
