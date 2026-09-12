import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
import {syncFlightBoard} from '../src/engine/board-flight.js';
for(const hz of [30,60,120])test(`RIME feet remain on deck through flight and guard at ${hz}Hz`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='rime'));
 try{Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1});f.pos.set(0,90,0);
 const b=f.parts.iceBoard=new T.Mesh(new T.BoxGeometry(3.6,.35,6.2),new T.MeshBasicMaterial());f.obj.add(b);
 for(const velocity of [[0,0,90],[0,75,90],[0,-75,90],[70,0,0],[0,0,0]]){
 f.vel.set(...velocity);for(let i=0;i<hz;i++){f.animT+=1/hz;f._animate(1/hz);}
 assert.ok(b.visible);assert.ok(Math.abs(f.obj.rotation.x)<.4,'rider tipped into prone flight');
 f.obj.updateMatrixWorld(true);const inv=f.obj.matrixWorld.clone().invert();
 for(const side of ['L','R']){const boot=f.parts['leg'+side].userData.boot,box=new T.Box3();boot.traverse(m=>{if(!m.isMesh)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld)));});assert.ok(Math.abs(box.min.y-(b.position.y+.175))<.06,`sole gap ${box.min.y-b.position.y-.175}`);}
 assert.deepEqual(f.vel.toArray(),velocity);assert.deepEqual(f.pos.toArray(),[0,90,0]);
 }
 f.guarding=true;f.poseGuard=1;f._animate(1/hz);assert.ok(b.visible);assert.ok(f.parts.armL.rotation.x<0);
 for(const key of ['launchT','stunT','grabbedBy']){f[key]=1;syncFlightBoard(f);assert.equal(b.visible,false);f[key]=0;syncFlightBoard(f);assert.equal(b.visible,true);}
 f.flying=false;f.gait='grounded';f.pos.y=0;f._animate(1/hz);assert.equal(b.visible,false);
 }finally{f.dispose();}
});
