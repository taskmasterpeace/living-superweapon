import test from 'node:test';
import assert from 'node:assert/strict';
const units=await import('../src/core/world-units.js').catch(()=>({}));
test('distance, velocity and acceleration share the established physical scale',()=>{
 assert.equal(units.METERS_PER_UNIT,.19);
 for(const n of [0,.5,9.6,210,260,1800]){
  assert.ok(Math.abs(units.metersToUnits(units.unitsToMeters(n))-n)<1e-9);
  assert.ok(Math.abs(units.kmhToUnitsPerSecond(units.unitsPerSecondToKmh(n))-n)<1e-9);
 }
 assert.equal(units.unitsToMeters(100),19);
 assert.equal(units.unitsPerSecondToKmh(260),177.84);
});
test('range/time and stopping distance use simulation seconds, not display kilometres',()=>{
 assert.equal(units.travelSeconds(520,260),2);
 assert.equal(units.travelSeconds(20,0),Infinity);
 assert.equal(units.stoppingDistance(100,20),250);
 assert.equal(units.stoppingDistance(100,0),Infinity);
});
test('vehicle telemetry converts velocity and altitude through the same contract',async()=>{
 const {vehicleStatus}=await import('../src/engine/vehicle-hud.js');
 const text=vehicleStatus({_aircraftVehicle:{kind:'jet',speed:260,ground:10,wrapper:{position:{y:110}},parked:false}});
 assert.match(text,/178 km\/h/);assert.match(text,/ALT 19 m/);
 assert.match(vehicleStatus({_scoutVehicle:{speed:-40,cover:{hp:120}}}),/27 km\/h/);
});
