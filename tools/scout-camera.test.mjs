import test from 'node:test';import assert from 'node:assert/strict';import {cameraProfileOf} from '../src/data/camera-presets.js';
test('occupied scout gets an external boom without mutating saved character framing',()=>{const saved={range:20,height:6},p={def:{model:{camera:saved}},_scoutVehicle:{}};assert.ok(cameraProfileOf(p).range>=45);assert.ok(cameraProfileOf(p).height>=14);p._scoutVehicle=null;assert.equal(cameraProfileOf(p),saved);});
test('aircraft chase clears aircraft silhouette and restores character camera on exit',()=>{
 const saved={range:20,height:6},p={def:{model:{camera:saved}},_aircraftVehicle:{kind:'helicopter'}};
 assert.ok(cameraProfileOf(p).range>=70);assert.ok(cameraProfileOf(p).height>=18);
 p._aircraftVehicle={kind:'jet'};assert.ok(cameraProfileOf(p).range>=85);
 p._aircraftVehicle=null;assert.equal(cameraProfileOf(p),saved);
});
