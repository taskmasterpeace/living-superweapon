import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
import {poseHoldPair} from '../src/tool/paired-hold-preview.js';
import {animateHeldGrip,heldGripTarget} from '../src/engine/held-grip-pose.js';
for(const [hero,held]of [['vega','merc'],['vega','rage'],['rage','vega']])test(`hold contact adapts to torso ${hero}/${held}`,()=>{
 const x=mainCombatFixture({mode:'powerworld',hero});try{const v=new Fighter(ROSTER.find(d=>d.id===held));x.g.entities.push(v);x.g.scene.add(v.obj);
 poseHoldPair(x.p,v,1,true);x.p.obj.updateMatrixWorld(true);v.obj.updateMatrixWorld(true);
 const pos=x.p.pos.clone(),receiverPos=v.pos.clone();
 for(const arm of [x.p.parts.armL,x.p.parts.armR]){const wanted=heldGripTarget(x.p,v,arm,new THREE.Vector3()),hand=arm.children[2].getWorldPosition(new THREE.Vector3());assert(hand.distanceTo(wanted)<.6,`hand/contact gap ${hand.distanceTo(wanted)}`);}
 assert(x.p.pos.equals(pos));assert(v.pos.equals(receiverPos));
 x.p._clinchPunch={t:.1};const right=x.p.parts.armR.quaternion.clone();animateHeldGrip(x.p);assert(x.p.parts.armR.quaternion.equals(right));
 x.p._clinchFinisher={t:.1};const left=x.p.parts.armL.quaternion.clone();animateHeldGrip(x.p);assert(x.p.parts.armL.quaternion.equals(left));
 }finally{x.close();}
});
