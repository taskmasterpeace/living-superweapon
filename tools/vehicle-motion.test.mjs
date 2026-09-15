// VEHICLE MOTION GATE — asserts the handling contract for all seven classes and
// every registry row, THROUGH the stats bench (one source of truth; the printed
// stats and this gate read the same measurements). Movement-first: no weapons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ENVELOPES, VEHICLE_CLASSES } from '../src/data/vehicle-envelopes.js';
import { STEPPERS, stepVehicle, windCarry } from '../src/engine/vehicle-motion.js';
import { measureRow, measureAll } from './vehicle-stats.mjs';

const ids = Object.keys(VEHICLE_ENVELOPES);

test('every class has a stepper; every row names a real class', () => {
  for (const c of VEHICLE_CLASSES) assert.equal(typeof STEPPERS[c], 'function', `stepper for ${c}`);
  for (const id of ids) assert.ok(VEHICLE_CLASSES.includes(VEHICLE_ENVELOPES[id].cls), `${id} class`);
});

test('EVERY vehicle reaches ~its envelope top speed (measured)', () => {
  for (const r of measureAll()) {
    const e = VEHICLE_ENVELOPES[r.id];
    assert.ok(Math.abs(r.top - e.top) < e.top * 0.08, `${r.name}: measured ${r.top.toFixed(1)} vs envelope ${e.top}`);
  }
});

test('ground vehicles come to a full stop under brake (finite distance)', () => {
  for (const r of measureAll()) {
    if (!['wheeled', 'tracked', 'hover', 'mech', 'ship'].includes(r.cls)) continue;
    assert.ok(r.brakeDist > 0 && r.brakeDist < 400, `${r.name}: brake ${r.brakeDist?.toFixed(1)}u`);
  }
});

test('every drivable turns — a 180° reversal completes for all', () => {
  for (const r of measureAll()) assert.ok(r.turn180 != null && r.turn180 > 0, `${r.name} completes a 180°`);
});

test('FIXEDWING: burner exceeds dry top; a stall speed exists below cruise; it climbs', () => {
  for (const r of measureAll()) {
    if (r.cls !== 'fixedwing') continue;
    const e = VEHICLE_ENVELOPES[r.id];
    if (e.burnTop > 0) assert.ok(r.burnTop > r.top + 20, `${r.name} burner ${r.burnTop?.toFixed(0)} > top ${r.top.toFixed(0)}`);
    assert.ok(r.stallSpeed > 0 && r.stallSpeed < r.top, `${r.name} stall ${r.stallSpeed?.toFixed(0)} below top ${r.top.toFixed(0)}`);
    assert.ok(r.climb > 5, `${r.name} climbs (${r.climb?.toFixed(0)} u/s)`);
  }
});

test('TRACKED: turret slews independent of the hull, and the hull never slides', () => {
  const s = { speed: 0, yaw: 0, vx: 0, vz: 0, turretYaw: 0, turretPitch: 0 };
  const e = VEHICLE_ENVELOPES['tank'];
  for (let i = 0; i < 120; i++) stepVehicle('tracked', s, { throttle: 1, turretX: 1 }, 1 / 60, e);
  assert.ok(s.turretYaw > 0.5, 'turret rotated while driving');
  const heading = Math.atan2(s.vx, s.vz);
  assert.ok(Math.abs(((heading - s.yaw + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.02, 'velocity follows hull heading exactly (no slide)');
  assert.ok(measureAll().filter(r => r.cls === 'tracked').every(r => r.turret90 > 0 && r.turret90 < 3), 'turret 90° in a usable time');
});

test('MECH: powered down is PARKED — no input moves it until it powers back up', () => {
  const e = VEHICLE_ENVELOPES['mech-medium'];
  const s = { speed: 0, yaw: 0, vx: 0, vz: 0, torsoYaw: 0, power: 0, strideT: 0 };
  for (let i = 0; i < 300; i++) stepVehicle('mech', s, { powerOn: true }, 1 / 60, e);   // power up
  assert.ok(s.power >= 1, 'reaches full power');
  for (let i = 0; i < 300; i++) stepVehicle('mech', s, { powerOn: false, throttle: 1, steer: 1 }, 1 / 60, e);  // power DOWN + full stick
  assert.ok(s.power <= 0, 'powered down'); assert.ok(Math.hypot(s.vx, s.vz) < 0.2, 'a powered-down mech does not move');
  // torso twists free of the legs while powered
  const s2 = { speed: 0, yaw: 0, vx: 0, vz: 0, torsoYaw: 0, power: 1, strideT: 0 };
  for (let i = 0; i < 60; i++) stepVehicle('mech', s2, { powerOn: true, torsoX: 1 }, 1 / 60, e);
  assert.ok(s2.torsoYaw > 0.3 && Math.abs(s2.yaw) < 1e-6, 'torso turned, legs did not');
});

test('ROTOR: spools up before it can move; leans; a subtle hover rock exists', () => {
  const e = VEHICLE_ENVELOPES['helicopter'];
  const s = { yaw: 0, vx: 0, vy: 0, vz: 0, spool: 0, tiltX: 0, tiltZ: 0, rockT: 0 };
  for (let i = 0; i < 30; i++) stepVehicle('rotor', s, { throttle: 1, on: true }, 1 / 60, e);   // still spooling
  assert.ok(s.spool < 1 && Math.hypot(s.vx, s.vz) < 3, 'no real thrust before spool-up');
  // lean shows while ACCELERATING (steady cruise has no forward accel to lean into)
  const hov = { yaw: 0, vx: 0, vy: 0, vz: 0, spool: 1, tiltX: 0, tiltZ: 0, rockT: 0 };
  let maxLean = 0; for (let i = 0; i < 60; i++) { stepVehicle('rotor', hov, { throttle: 1, on: true }, 1 / 60, e); maxLean = Math.max(maxLean, Math.abs(hov.tiltX)); }
  assert.ok(maxLean > 0.05, `leans into forward acceleration: peaked ${maxLean.toFixed(3)} rad`);
  // hover in place: the rock keeps the body alive (never dead-flat)
  let minTilt = 1, maxTilt = -1; const h = { yaw: 0, vx: 0, vy: 0, vz: 0, spool: 1, tiltX: 0, tiltZ: 0, rockT: 0 };
  for (let i = 0; i < 300; i++) { stepVehicle('rotor', h, { throttle: 0, on: true }, 1 / 60, e); minTilt = Math.min(minTilt, h.tiltX); maxTilt = Math.max(maxTilt, h.tiltX); }
  assert.ok(maxTilt - minTilt > 0.01 && maxTilt - minTilt < 0.15, `subtle rock: ${(maxTilt - minTilt).toFixed(3)} rad peak-to-peak`);
});

test('WIND is a carry that scales with windK: steel ~0, aircraft/hover ride it', () => {
  const carry = e => windCarry(e, { wind: { x: 40, z: 0 } }).x;
  assert.equal(carry(VEHICLE_ENVELOPES['tank']), 0, 'a tank ignores wind');
  assert.ok(carry(VEHICLE_ENVELOPES['jet-b']) > 30, 'a jet rides the crosswind');
  assert.ok(carry(VEHICLE_ENVELOPES['hoverboard']) > 15, 'the hoverboard drifts');
  assert.ok(carry(VEHICLE_ENVELOPES['armored-scout']) < 4, 'a jeep barely feels it');
});

test('WHEELED: grade past maxGrade kills the climb (the #47 hill fix is data now)', () => {
  const e = VEHICLE_ENVELOPES['armored-scout'];
  const climb = grade => { const s = { speed: 0, yaw: 0, vx: 0, vz: 0, steerSmooth: 0, yawVel: 0, lean: 0 }; for (let i = 0; i < 600; i++) stepVehicle('wheeled', s, { throttle: 1 }, 1 / 60, e, { grade }); return s.speed; };
  assert.ok(climb(0) > 40, 'flat: near top speed');
  assert.ok(climb(0.3) > 8, 'a 30% grade is climbable (the Jeep-stops bug: fixed)');
  assert.ok(climb(0.9) < 6, 'past its 62% max, the climb genuinely dies');
});

test('dt-stable (30/60/120 Hz) and NaN-proof across every class', () => {
  for (const id of ids) {
    const e = VEHICLE_ENVELOPES[id], cls = e.cls;
    const tops = [1 / 30, 1 / 60, 1 / 120].map(dt => {
      const s = {}; const intent = { throttle: 1, on: true, powerOn: true };
      for (let t = 0; t < 30; t += dt) stepVehicle(cls, s, intent, dt, e, {});
      return Math.hypot(s.vx || 0, s.vz || 0);
    });
    assert.ok(Math.max(...tops) - Math.min(...tops) < e.top * 0.12, `${id} dt-stable: ${tops.map(t => t.toFixed(1))}`);
    const s = {}; stepVehicle(cls, s, { throttle: 1, on: true, powerOn: true }, 1 / 60, e, {});
    stepVehicle(cls, s, { throttle: NaN, steer: NaN }, NaN, e, {});
    for (const k of Object.keys(s)) assert.ok(Number.isFinite(s[k]) || typeof s[k] === 'boolean', `${id}.${k} finite`);
  }
});

// ---- WHEELED CATCHES AIR (Robert: "dirt bikes and motocross?" — yes) ---------
// The controller reports ctx.groundY; a crest (ground falling away) launches the
// vy the slope loaded, the vehicle flies a ballistic arc under VEHICLE_GRAV with
// momentum kept, then lands. A flyer ramming it in the air is just knockback on
// the same state — no rigid-body sim.
test('WHEELED catches air off a crest, flies a ballistic arc, lands with momentum (motocross)', () => {
  const e = VEHICLE_ENVELOPES['motorcycle'];
  const s = { speed: 0, yaw: 0, vx: 0, vz: 0, steerSmooth: 0, yawVel: 0, lean: 0, y: 0, vy: 0 };
  for (let i = 0; i < 240; i++) stepVehicle('wheeled', s, { throttle: 1 }, 1 / 60, e, { grade: 0, groundY: 0 });
  const cruise = s.speed;
  assert.ok(cruise > 60 && !s.air, `up to speed on the flat (${cruise.toFixed(1)}u/s, grounded)`);
  // a ramp (grade within its climb ability) loads the launch rate vy = speed×grade
  for (let i = 0; i < 12; i++) stepVehicle('wheeled', s, { throttle: 1 }, 1 / 60, e, { grade: 0.45, groundY: 0 });
  // THE CREST: the ground drops 10u away under the wheels
  let peakY = 0, tookOff = false, landed = false;
  for (let i = 0; i < 240; i++) {
    stepVehicle('wheeled', s, { throttle: 1 }, 1 / 60, e, { grade: 0, groundY: -10 });
    if (s.air) { tookOff = true; peakY = Math.max(peakY, s.y); }
    else if (tookOff) { landed = true; break; }
  }
  assert.ok(tookOff && peakY > 1, `launches UP off the crest (peak ${peakY.toFixed(1)}u)`);
  assert.ok(landed && Math.abs(s.y - (-10)) < 0.5, `lands on the ground below (y ${s.y.toFixed(1)})`);
  assert.ok(s.speed > cruise * 0.6, `momentum largely kept through the jump (${s.speed.toFixed(1)} vs cruise ${cruise.toFixed(1)})`);
});

test('WHEELED in the air: reduced steering authority (airSteer) and no tyre grip', () => {
  const e = VEHICLE_ENVELOPES['motorcycle'];
  const run = high => {
    const s = { speed: 60, yaw: 0, vx: 0, vz: 60, steerSmooth: 0, yawVel: 0, lean: 0, y: high ? 400 : 0, vy: 0 };
    for (let i = 0; i < 30; i++) stepVehicle('wheeled', s, { throttle: 1, steer: 1 }, 1 / 60, e, { grade: 0, groundY: 0 });
    return { yaw: Math.abs(s.yaw), air: s.air };
  };
  const ground = run(false), air = run(true);
  assert.ok(air.air, 'high above the reported ground = airborne');
  assert.ok(ground.yaw > air.yaw * 2, `steering bites far less in the air (ground ${ground.yaw.toFixed(3)} vs air ${air.yaw.toFixed(3)})`);
});

// ---- BARREL ROLL (Robert: "make sure we can do the barrel rolls") ------------
// A nimble jet completes a full 360° aileron roll on one input; the spin is a
// SEPARATE channel from the bank, so the flight path does NOT turn during it.
// Heavy craft (no e.barrel) refuse.
test('FIXEDWING BARREL ROLL: a jet completes a 360° roll without turning; a bomber refuses', () => {
  const e = VEHICLE_ENVELOPES['jet-b'];
  const s = { speed: 0, yaw: 0, roll: 0, pitch: 0, lever: 0 };
  for (let i = 0; i < 200; i++) stepVehicle('fixedwing', s, { throttle: 1 }, 1 / 60, e, {}); // straight & fast
  const yaw0 = s.yaw, spd0 = s.speed;
  stepVehicle('fixedwing', s, { throttle: 1, barrel: true }, 1 / 60, e, {});                 // ONE pulse
  assert.ok(s.rolling, 'the roll started on the barrel input');
  let peak = 0, completed = false;
  for (let i = 0; i < 120; i++) { stepVehicle('fixedwing', s, { throttle: 1 }, 1 / 60, e, {}); peak = Math.max(peak, Math.abs(s.rollSpin)); if (!s.rolling) { completed = true; break; } }
  assert.ok(peak > Math.PI * 1.5, `swept most of a full turn (peak ${peak.toFixed(2)} rad)`);
  assert.ok(completed && Math.abs(s.rollSpin) < 1e-6, 'roll completed, rollSpin back to 0 (re-armed)');
  assert.ok(Math.abs(s.yaw - yaw0) < 0.05, `flight path held through the roll (Δyaw ${(s.yaw - yaw0).toFixed(3)} rad)`);
  assert.ok(s.speed > spd0 * 0.9, 'speed kept through the roll');
  const b = VEHICLE_ENVELOPES['bomber'], sb = { speed: 0, yaw: 0, roll: 0, pitch: 0, lever: 0 };
  for (let i = 0; i < 200; i++) stepVehicle('fixedwing', sb, { throttle: 1 }, 1 / 60, b, {});
  for (let i = 0; i < 30; i++) stepVehicle('fixedwing', sb, { throttle: 1, barrel: true }, 1 / 60, b, {});
  assert.ok(!sb.rolling && (sb.rollSpin || 0) === 0, 'a heavy bomber has no aileron authority to barrel roll');
});

// Robert: "of course all vehicles can do barrel rolls" — it's a fleet capability
// (helis, hovercraft, and bikes WHILE AIRBORNE — the whip); ground-locked refuse.
test('BARREL ROLL is a fleet capability: heli, hoverboard, airborne bike roll; grounded bike & tank refuse', () => {
  const finish = (cls, e, s, ctx) => { let peak = Math.abs(s.rollSpin || 0), done = false; for (let k = 0; k < 200; k++) { stepVehicle(cls, s, { throttle: 1, on: true }, 1 / 60, e, ctx); peak = Math.max(peak, Math.abs(s.rollSpin || 0)); if (!s.rolling) { done = true; break; } } return { peak, done }; };

  const he = VEHICLE_ENVELOPES['helicopter'];
  const hs = { yaw: 0, vx: 0, vy: 0, vz: 0, spool: 1, tiltX: 0, tiltZ: 0, rockT: 0 };
  stepVehicle('rotor', hs, { throttle: 1, on: true, barrel: true }, 1 / 60, he, {});
  assert.ok(hs.rolling, 'a spooled helicopter starts a barrel roll');
  const h = finish('rotor', he, hs, {}); assert.ok(h.peak > Math.PI * 1.5 && h.done, `helicopter completes a 360 (peak ${h.peak.toFixed(2)})`);

  const bo = VEHICLE_ENVELOPES['hoverboard'];
  const os = { speed: 40, yaw: 0, vx: 0, vz: 40, lean: 0, bobT: 0 };
  stepVehicle('hover', os, { throttle: 1, barrel: true }, 1 / 60, bo, {});
  assert.ok(os.rolling, 'a hoverboard starts a barrel roll');
  const o = finish('hover', bo, os, {}); assert.ok(o.peak > Math.PI * 1.5 && o.done, `hoverboard completes a 360 (peak ${o.peak.toFixed(2)})`);

  const be = VEHICLE_ENVELOPES['motorcycle'], flat = { grade: 0, groundY: 0 };
  const air = { speed: 60, yaw: 0, vx: 0, vz: 60, steerSmooth: 0, yawVel: 0, lean: 0, y: 400, vy: 0 };
  stepVehicle('wheeled', air, { throttle: 1, barrel: true }, 1 / 60, be, flat);
  assert.ok(air.rolling, 'an AIRBORNE bike starts a barrel whip');
  const w = finish('wheeled', be, air, flat); assert.ok(w.peak > Math.PI * 1.5 && w.done, `airborne bike completes a whip (peak ${w.peak.toFixed(2)})`);

  const gnd = { speed: 60, yaw: 0, vx: 0, vz: 60, steerSmooth: 0, yawVel: 0, lean: 0, y: 0, vy: 0 };
  for (let k = 0; k < 30; k++) stepVehicle('wheeled', gnd, { throttle: 1, barrel: true }, 1 / 60, be, flat);
  assert.ok(!gnd.rolling && (gnd.rollSpin || 0) === 0, 'a GROUNDED bike does not roll — only in the air');

  const te = VEHICLE_ENVELOPES['tank'], ts = { speed: 0, yaw: 0, vx: 0, vz: 0, turretYaw: 0, turretPitch: 0 };
  for (let k = 0; k < 120; k++) stepVehicle('tracked', ts, { throttle: 1, barrel: true }, 1 / 60, te, {});
  assert.ok(!ts.rolling && (ts.rollSpin || 0) === 0, 'a tank (no e.barrel) never barrel rolls');
});

// The jet's piloted motion IS this model now (aircraft-piloting.js drives stepFixedwing
// with exactly this intent shape). Prove the full flight arc a pilot flies.
test('FIXEDWING piloting profile: takeoff roll → climb → bank-turn → descent', () => {
  const e = VEHICLE_ENVELOPES['jet-b'];
  const m = { speed: 0, yaw: 0, roll: 0, pitch: 0, lever: 0, rollSpin: 0, rollDir: 1 };
  const step = (intent, n) => { for (let k = 0; k < n; k++) stepVehicle('fixedwing', m, intent, 1 / 60, e, {}); };
  step({ throttle: 1, parked: true }, 300);                       // takeoff roll on the ground
  assert.ok(m.speed > e.rotate, `builds past rotate speed on the ground (${m.speed.toFixed(0)} > ${e.rotate})`);
  step({ throttle: 1, pitch: 1 }, 120);                           // rotate + climb
  assert.ok(m.vy > 5, `pitch up produces climb (vy ${m.vy.toFixed(1)})`);
  const yaw0 = m.yaw;
  step({ throttle: 1, steer: 1 }, 120);                           // bank
  assert.ok(Math.abs(m.yaw - yaw0) > 0.3, `banking turns the flight path (Δyaw ${(m.yaw - yaw0).toFixed(2)})`);
  const spd = m.speed;
  step({ throttle: -1, pitch: -1 }, 180);                         // throttle back + nose down
  assert.ok(m.speed < spd, `cutting throttle bleeds speed (${m.speed.toFixed(0)} < ${spd.toFixed(0)})`);
  assert.ok(m.vy < 0, `nose-down descends (vy ${m.vy.toFixed(1)})`);
});
