// PER-CLASS CAMERA GATE — every motion class gets a finite 3rd-person boom, and the
// boom grows with the vehicle's size so a carrier / mothership is pulled way back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraForClass } from '../src/data/camera-presets.js';

const CLASSES = ['fixedwing', 'rotor', 'wheeled', 'tracked', 'hover', 'mech', 'ship'];

test('every class returns a finite range/height/fov boom', () => {
  for (const c of CLASSES) {
    const cam = cameraForClass(c, 12);
    assert.ok(Number.isFinite(cam.range) && cam.range > 0, `${c} range`);
    assert.ok(Number.isFinite(cam.height) && cam.height > 0, `${c} height`);
    assert.ok(Number.isFinite(cam.fov) && cam.fov > 30 && cam.fov < 120, `${c} fov`);
  }
});

test('a giant pulls the camera way back — the carrier is not framed like a bike', () => {
  const bike = cameraForClass('wheeled', 3);
  const carrier = cameraForClass('ship', 330);       // ~660u-long aircraft carrier
  const mothership = cameraForClass('rotor', 300);   // huge flying capital ship
  assert.ok(carrier.range > bike.range * 4, `carrier boom (${carrier.range}) dwarfs the bike (${bike.range})`);
  assert.ok(carrier.height > 120, `carrier camera rides high (${carrier.height}u)`);
  assert.ok(mothership.range > 400, `mothership pulled far back (${mothership.range}u)`);
  assert.ok(carrier.range <= 700 && carrier.height <= 240, 'but stays within sane clamps');
});

test('a normal vehicle uses its class boom, not a blown-up one', () => {
  const tank = cameraForClass('tracked', 12);
  assert.ok(tank.range >= 58 && tank.range < 100, `tank boom is class-sized (${tank.range})`);
});
