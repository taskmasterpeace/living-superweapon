import test from 'node:test';import assert from 'node:assert/strict';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {highwallLayout} from '../src/data/highwall.js';
test('native tracked fleet camera contracts before a decorative panel without adding gameplay cover',()=>{
 const x=mainCombatFixture();try{const layout=highwallLayout();x.w.ARENA=1200;x.w.cover=layout.pieces.map(p=>({...p,h:p.top,finiteBuilding:true,projectileShape:'box'}));x.p._openSky=true;x.p.pos.set(66,2,210);x.p._fleetVehicle={cls:'tracked',span:20,motion:{yaw:Math.PI}};x.w._chaseSnap=true;x.w.chase(x.p,null,1/60);const original=x.w.camera.position.clone();
 x.w.cameraObstacles=layout.signs.map(s=>({x:s.x,z:s.z,hx:s.w/2,hz:.15,bottom:s.y-s.w/8,top:s.y+s.w/8}));x.w._chaseSnap=true;x.w.chase(x.p,null,1/60);const eye=x.w.camera.position,anchor=x.w._flightAnchor;
 assert.ok(eye.distanceTo(original)>1,'panel did not constrain camera');assert.ok(x.w._camNearestT(...anchor.toArray(),...eye.toArray(),0)>=.999,'camera remains behind panel');assert.equal(x.w.cover.length,layout.pieces.length,'camera-only panel leaked into gameplay collision');
 }finally{x.close();}
});
