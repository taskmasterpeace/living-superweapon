import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';

test('game listener uses body height and the refreshed camera-right axis without moving either',()=>{
 const camera=new THREE.PerspectiveCamera(),pos=new THREE.Vector3(20,140,-30),calls=[];
 camera.position.set(0,200,50);camera.lookAt(100,80,50);
 const before=camera.position.clone(),rotation=camera.quaternion.clone();
 const game={player:{pos},world:{camera},audio:{listen:(x,z,y,right)=>calls.push({x,z,y,right:right.clone()})}};
 Game.prototype.updateAudioListener.call(game);
 assert.equal(calls.length,1);assert.deepEqual([calls[0].x,calls[0].y,calls[0].z],pos.toArray());
 const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);assert.ok(calls[0].right.distanceTo(right)<1e-10);
 assert.deepEqual(camera.position,before);assert.deepEqual(camera.quaternion.toArray(),rotation.toArray());
 game.player=null;Game.prototype.updateAudioListener.call(game);assert.equal(calls.length,1);
});
