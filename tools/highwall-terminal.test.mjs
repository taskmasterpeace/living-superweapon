import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildHighwallTerminal,HIGHWALL_TERMINAL} from '../src/engine/highwall-interactables.js';

test('terminal housing has a supported human-scale envelope and recessed 16:9 screen',()=>{
 const texture=new THREE.Texture();const {group,face}=buildHighwallTerminal({map:texture});
 const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-HIGHWALL_TERMINAL.width)<1e-6);
 assert.ok(Math.abs(size.y-HIGHWALL_TERMINAL.height)<1e-6);
 assert.ok(Math.abs(size.z-HIGHWALL_TERMINAL.depth)<1e-6);
 assert.ok(Math.abs(box.min.y)<1e-6);assert.equal(face.material.map,texture);
 assert.equal(face.material.side,THREE.FrontSide);
 assert.ok(Math.abs(face.geometry.parameters.width/face.geometry.parameters.height-16/9)<1e-6);
 const lip=new THREE.Box3().setFromObject(group.getObjectByName('left screen bezel'));
 assert.ok(lip.max.z>face.position.z,'solid bezel extends ahead of the image');
 assert.ok(group.getObjectByName('screen cabinet'));
 assert.ok(group.getObjectByName('service cabinet'));
});

test('audio appliance shares the same mounting envelope and uses a physical grille',()=>{
 const display=buildHighwallTerminal(),speaker=buildHighwallTerminal({speaker:true});
 assert.equal(speaker.face,null);
 assert.deepEqual(new THREE.Box3().setFromObject(display.group).getSize(new THREE.Vector3()),new THREE.Box3().setFromObject(speaker.group).getSize(new THREE.Vector3()));
 assert.equal(speaker.group.children.filter(o=>o.name.startsWith('speaker grille')).length,8);
});
