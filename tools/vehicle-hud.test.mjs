import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/engine/vehicle-hud.js').catch(()=>({}));
test('vehicle status reports the occupied platform rather than the hidden soldier kit',()=>{
 assert.equal(typeof api.vehicleStatus,'function');
 const aircraft={kind:'helicopter',speed:40,ground:5,wrapper:{position:{y:55}},parked:false};
 const text=api.vehicleStatus({_aircraftVehicle:aircraft});
 assert.match(text,/HELICOPTER/);assert.match(text,/AIRBORNE/);assert.match(text,/LMB/);
 assert.match(api.vehicleStatus({_scoutVehicle:{speed:20,cover:{hp:100,maxHp:120}}}),/BRAKE/);
 assert.equal(api.vehicleStatus({}),null);
});
