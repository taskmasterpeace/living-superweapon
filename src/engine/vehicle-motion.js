// VEHICLE MOTION — seven pure steppers, one per motion class. No scene, no
// collision, no three.js: each advances a plain state from intents + an envelope
// row (data/vehicle-envelopes.js) + a context {grade, wind:{x,z}}, and the
// controller that owns a vehicle does the sweeping/collision exactly like
// scout-driving does for ground-driving. Everything here is headlessly testable —
// tools/vehicle-stats.mjs measures every registry row through these steppers.
//
// Conventions (the engine's): heading forward = (sin(yaw), cos(yaw)); steer > 0
// increases yaw (controllers map screen handedness). WIND is a velocity field
// (u/s); a class feels `windK` of it — steel tracks feel none, hovercraft ride it.
// All rates are 1/s or u/s²; dt is clamped; a poisoned state resets, never NaNs.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approach = (v, t, amt) => v < t ? Math.min(t, v + amt) : Math.max(t, v - amt);
const ease = (v, t, k, dt) => v + (t - v) * (1 - Math.exp(-k * dt));
const fin = (s, keys) => { let ok = true; for (const k of keys) if (!Number.isFinite(s[k])) { s[k] = 0; ok = false; } return ok; };
const dtc = dt => Number.isFinite(dt) && dt > 0 ? Math.min(dt, .1) : 0;
const G = (ctx) => clamp(Number.isFinite(ctx?.grade) ? ctx.grade : 0, -1.2, 1.2);

// WIND is a WORLD CARRY, never a force inside the stepper: a vehicle's own
// velocity (what it DOES) is unchanged by wind; wind only moves where it ends up.
// The controller (and the stats bench) sweep position with `own vel + windCarry`,
// so it can never feed back into the grip/lateral channel. `windK` per vehicle in
// the registry decides susceptibility — steel ≈ 0, hovercraft rides it.
export function windCarry(e, ctx) {
  const w = (ctx && ctx.wind) || null, k = e?.windK ?? 0;
  return w ? { x: (w.x || 0) * k, z: (w.z || 0) * k } : { x: 0, z: 0 };
}

// BARREL ROLL — a full 360° roll about the travel axis, on a SEPARATE channel
// (rollSpin) the view ADDS to any bank/lean, so it NEVER feeds a turn. `allowed`
// gates WHEN a class may roll (airborne, spooled, moving…). ANY vehicle with
// e.barrel can carry it — the pipeline, not a per-class special case. Re-arms on
// completion, so one input = one clean 360.
export function barrelRoll(s, i, e, dt, allowed) {
  if (!s.rolling && i && i.barrel && e && e.barrel && allowed) {
    s.rolling = true;
    s.rollDir = clamp(i.steer || 0, -1, 1) < -0.001 ? -1 : 1;
    s.rollSpin = s.rollSpin || 0;
  }
  if (s.rolling) {
    s.rollSpin = (s.rollSpin || 0) + (s.rollDir || 1) * (e.rollRate || 7.4) * dt;
    if (Math.abs(s.rollSpin) >= Math.PI * 2) { s.rollSpin = 0; s.rolling = false; }
  } else if (s.rollSpin) s.rollSpin = 0;
}

// ---- WHEELED — jeep/humvee/cargo/bike/ATV. Bikes LEAN (e.lean > 0), and wheels
// CATCH AIR (Robert: "dirt bikes and motocross?" — yes, and no rigid-body sim
// needed): grounded, y rides the terrain the controller reports (ctx.groundY)
// and the terrain-following vertical rate is speed × grade; when the ground
// falls away the vehicle keeps that rate and flies a plain ballistic arc under
// the world's gravity (58 u/s²), momentum kept, steering reduced to airSteer,
// and lands with a small speed cost on a hard hit. Same arcade grammar as the
// fighters' launch physics — a flyer ramming an airborne bike is just the
// existing knockback impulse applied to this state. --------------------------
export const VEHICLE_GRAV = 58;
export function stepWheeled(s, i, dt, e, ctx) {
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'steerSmooth', 'yawVel', 'lean', 'y', 'vy', 'rollSpin', 'rollDir']); dt = dtc(dt); if (!dt || !i) return s;
  const th = clamp(i.throttle || 0, -1, 1), st = clamp(i.steer || 0, -1, 1), grade = G(ctx);
  const groundY = Number.isFinite(ctx?.groundY) ? ctx.groundY : 0;
  // Departure test: a wheel following a downhill is NOT airborne — while
  // grounded, s.vy is the terrain-follow rate, so the expected drop next frame
  // is |vy|·dt. Only ground falling away FASTER than the follow rate (a crest,
  // a cliff) is a launch. A fixed .08 epsilon made every ordinary downhill
  // frame at speed read as airborne (drive force and grip skipped).
  const airborne = s.air = s.y > groundY + .08 + Math.abs(s.vy || 0) * dt * 1.5;
  let f = s.speed;
  if (!airborne) {                                   // drive forces only reach the ground
    if (i.brake) f = approach(f, 0, e.brake * dt);
    else if (Math.abs(th) < .001) f *= Math.exp(-e.coast * dt);
    else f = approach(f, th > 0 ? e.top * th : -e.reverse * Math.abs(th), (f * th < -.01 ? e.brake : th > 0 ? e.accel : e.accel * .7) * dt);
    // grade saps within ability; PAST maxGrade the climb genuinely dies (never a wall)
    f -= grade * e.slopePull * dt;
    if (grade > (e.maxGrade ?? .6) && f > 0) f = approach(f, 0, e.slopePull * 1.5 * dt);
    f = clamp(f, -e.reverse, e.top);
  }
  const sp01 = clamp(Math.abs(f) / e.top, 0, 1), auth = (1 + ((e.hiSteer ?? .5) - 1) * sp01) * (airborne ? (e.airSteer ?? .15) : 1);
  s.steerSmooth = ease(s.steerSmooth, st * auth, 8, dt);
  const roll = clamp(Math.abs(f) / (e.top * .26), .05, 1), rev = f < -.05 ? -1 : 1;
  s.yawVel = ease(s.yawVel, s.steerSmooth * e.turnRate * roll * rev, 10, dt);
  if (Math.abs(st) < .001) s.yawVel *= Math.exp(-6 * dt);
  s.yaw += s.yawVel * dt;
  const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  const lat = (c * s.vx - sn * s.vz) * Math.exp(-(airborne ? 0 : e.grip) * dt);   // no tyre grip in the air
  s.vx = sn * f + c * lat; s.vz = c * f - sn * lat;
  if (!airborne && !i.brake && Math.abs(th) < .001 && Math.hypot(s.vx, s.vz) < .08) { f = 0; s.vx = s.vz = 0; }
  s.speed = f;  // wind is applied at the sweep (windCarry), never into the grip channel
  // ---- the vertical axis: terrain-follow on the ground, ballistic in the air --
  if (airborne) {
    s.vy -= VEHICLE_GRAV * dt; s.y += s.vy * dt;
    if (s.y <= groundY) {                             // LANDING
      if (s.vy < -26) s.speed = f = f * .82;          // a hard slam scrubs speed (suspension bottoms)
      s.y = groundY; s.vy = 0; s.air = false;
    }
  } else { s.y = groundY; s.vy = Math.abs(f) * grade; }  // riding the slope IS the launch rate at a crest
  s.lean = ease(s.lean, clamp(s.yawVel / Math.max(e.turnRate, .01), -1, 1) * (e.lean || 0) * sp01, 6, dt);
  barrelRoll(s, i, e, dt, airborne);  // wheeled roll only in the air — the motocross whip
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'steerSmooth', 'yawVel', 'lean', 'y', 'vy', 'rollSpin', 'rollDir']); return s;
}

// ---- TRACKED — tanks. Pivot-turns at a stand; THE TURRET IS ITS OWN CHANNEL. -
export function stepTracked(s, i, dt, e, ctx) {
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'turretYaw', 'turretPitch']); dt = dtc(dt); if (!dt || !i) return s;
  const th = clamp(i.throttle || 0, -1, 1), st = clamp(i.steer || 0, -1, 1), grade = G(ctx);
  let f = s.speed;
  if (i.brake) f = approach(f, 0, e.brake * dt);
  else if (Math.abs(th) < .001) f = approach(f, 0, e.brake * .4 * dt);
  else f = approach(f, th > 0 ? e.top * th : -e.reverse * Math.abs(th), e.accel * dt);
  f -= grade * e.slopePull * dt;
  if (grade > (e.maxGrade ?? .7) && f > 0) f = approach(f, 0, e.slopePull * 1.5 * dt);
  f = clamp(f, -e.reverse, e.top);
  const rate = Math.abs(f) < 2 ? e.pivot : e.moveTurn;                 // neutral steer on the spot
  s.yaw += st * rate * dt * (f < -.05 ? -1 : 1);
  s.vx = Math.sin(s.yaw) * f; s.vz = Math.cos(s.yaw) * f; s.speed = f; // tracks do not slide
  // the turret slews independently of everything the hull is doing
  s.turretYaw += clamp(i.turretX || 0, -1, 1) * e.turretRate * dt;
  s.turretPitch = clamp(s.turretPitch + clamp(i.turretY || 0, -1, 1) * e.turretPitchRate * dt, e.turretPitchMin, e.turretPitchMax);
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'turretYaw', 'turretPitch']); return s;
}

// ---- FIXEDWING — jets/bomber/transports. Airspeed buys lift; wind moves the
// ground track, never the airframe's own numbers. Burner only where burnTop > 0.
export function stepFixedwing(s, i, dt, e, ctx) {
  fin(s, ['speed', 'yaw', 'roll', 'pitch', 'lever', 'rollSpin', 'rollDir']); dt = dtc(dt); if (!dt || !i) return s;
  const parked = !!i.parked;
  s.lever = clamp(s.lever + clamp(i.throttle || 0, -1, 1) * e.throttleRate * dt, parked ? 0 : .12, 1);
  const burn = e.burnTop > 0 && !!i.burner && !parked && s.lever > .85;
  const max = burn ? e.burnTop : e.top;
  const bleed = clamp(1 - Math.max(0, s.pitch) * e.climbBleed, .15, 1);   // climbing bleeds; diving never does
  s.speed = clamp(approach(s.speed, s.lever * max * bleed, e.thrust * (burn ? 2 : 1) * dt), 0, max);
  if (parked) s.speed = Math.max(0, s.speed - 4 * dt);
  s.stalled = s.speed < e.stall && !parked;
  const auth = s.stalled ? .3 : 1;
  s.roll = parked ? 0 : clamp(s.roll + clamp(i.steer || 0, -1, 1) * e.bank * auth * dt, -e.bankCap, e.bankCap);
  if (!i.steer) s.roll *= Math.exp(-1.6 * dt);
  // BARREL ROLL (aircraft): airborne, not stalled/parked, above rotate speed.
  barrelRoll(s, i, e, dt, !s.stalled && !parked && s.speed > e.rotate);
  s.yaw -= (clamp(i.rudder || 0, -1, 1) * (parked ? .4 : .55) * auth * Math.min(1, s.speed / 35) + e.turnK * Math.tan(s.roll) / Math.max(60, s.speed)) * dt;
  const pin = clamp(i.pitch || 0, -1, 1);
  s.pitch = clamp(s.pitch + pin * e.pitchRate * auth * dt, -e.pitchCap, e.pitchCap);
  if (s.stalled) s.pitch = approach(s.pitch, -e.pitchCap, .7 * dt);      // the nose falls; dive to recover
  else if (Math.abs(pin) < .001) s.pitch = ease(s.pitch, 0, .8, dt);    // TRIM: hands off, the nose eases to level (so cruise holds top speed, not a stuck dive)
  if (parked && s.speed < e.rotate) s.pitch = 0;
  const lift = clamp((s.speed - e.stall) / e.liftRamp, 0, 1), cp = Math.cos(s.pitch);
  s.vx = Math.sin(s.yaw) * s.speed * cp;
  s.vy = s.speed * Math.sin(s.pitch) * lift - (1 - lift) * e.sink;
  s.vz = Math.cos(s.yaw) * s.speed * cp;
  fin(s, ['speed', 'yaw', 'roll', 'pitch', 'lever', 'vx', 'vy', 'vz', 'rollSpin', 'rollDir']); return s;
}

// ---- ROTOR — helicopters. Spool-up before lift; LEANS into travel; a subtle,
// deliberate rock in the hover (Robert: "rock a little, very little, subtle"). --
export function stepRotor(s, i, dt, e, ctx) {
  fin(s, ['yaw', 'vx', 'vy', 'vz', 'spool', 'tiltX', 'tiltZ', 'rockT', 'rollSpin', 'rollDir']); dt = dtc(dt); if (!dt || !i) return s;
  s.spool = clamp(s.spool + (i.on === false ? -1 : 1) * dt / e.spool, 0, 1);
  s.rockT += dt;
  if (s.spool >= 1) {
    const gain = 1 - Math.exp(-e.accelK * dt), th = clamp(i.throttle || 0, -1, 1);
    const tx = Math.sin(s.yaw) * th * e.top, tz = Math.cos(s.yaw) * th * e.top;
    const ax = (tx - s.vx) * gain, az = (tz - s.vz) * gain;
    s.vx += ax; s.vz += az;
    s.vy = ease(s.vy, clamp(i.lift || 0, -1, 1) * (i.lift > 0 ? e.climb : e.sinkMax), 2, dt);
    s.yaw += clamp(i.steer || 0, -1, 1) * e.turn * dt;
    // lean INTO the acceleration + the subtle hover rock
    const c = Math.cos(s.yaw), sn = Math.sin(s.yaw), fwdA = (sn * ax + c * az) / Math.max(dt, 1e-4);
    s.tiltX = ease(s.tiltX, clamp(fwdA * e.leanK, -e.lean, e.lean) + Math.sin(s.rockT * Math.PI * 2 * e.rockHz) * e.rock, 5, dt);
    s.tiltZ = ease(s.tiltZ, -clamp(i.steer || 0, -1, 1) * e.lean * .6 + Math.cos(s.rockT * Math.PI * 2 * e.rockHz * .77) * e.rock * .6, 5, dt);
  } else { s.vx *= Math.exp(-3 * dt); s.vz *= Math.exp(-3 * dt); s.vy = Math.min(0, s.vy); s.tiltX = ease(s.tiltX, 0, 3, dt); s.tiltZ = ease(s.tiltZ, 0, 3, dt); }
  barrelRoll(s, i, e, dt, s.spool >= 1);  // a heli can roll once it's spooled up
  fin(s, ['yaw', 'vx', 'vy', 'vz', 'spool', 'tiltX', 'tiltZ', 'rollSpin', 'rollDir']); return s;
}

// ---- HOVER — hoverboard / hover transport. Low grip, big drift, RIDES the wind.
export function stepHover(s, i, dt, e, ctx) {
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'lean', 'bobT', 'rollSpin', 'rollDir']); dt = dtc(dt); if (!dt || !i) return s;
  const th = clamp(i.throttle || 0, -1, 1), st = clamp(i.steer || 0, -1, 1);
  s.bobT += dt;
  let f = s.speed;
  if (i.brake) f = approach(f, 0, e.brake * dt);
  else f = approach(f, th * e.top, (Math.abs(th) > .001 ? e.accel : e.brake * .25) * dt);
  f = clamp(f, -e.top * .35, e.top);
  s.yaw += st * e.turnRate * dt * clamp(Math.abs(f) / e.top + .35, 0, 1);
  const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  const lat = (c * s.vx - sn * s.vz) * Math.exp(-e.grip * dt);            // it SLIDES — that is the fun (wind carry added at the sweep)
  s.vx = sn * f + c * lat; s.vz = c * f - sn * lat; s.speed = f;
  s.lean = ease(s.lean, clamp(st, -1, 1) * (e.lean || 0) * clamp(Math.abs(f) / e.top, 0, 1), 6, dt);
  s.bob = Math.sin(s.bobT * Math.PI * 2 * e.bobHz) * e.bob;
  barrelRoll(s, i, e, dt, true);  // a hoverboard is a trick vehicle — always
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'lean', 'rollSpin', 'rollDir']); return s;
}

// ---- MECH — walkers. POWERED DOWN IS PARKED (nothing answers); the torso
// twists independently of the legs, like a tank turret standing up. -----------
export function stepMech(s, i, dt, e, ctx) {
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'torsoYaw', 'power', 'strideT']); dt = dtc(dt); if (!dt || !i) return s;
  const grade = G(ctx);
  s.power = clamp(s.power + (i.powerOn === false ? -1 : 1) * dt / e.powerTime, 0, 1);
  if (s.power < 1) {                                                     // spinning up or down: legs locked
    s.speed = approach(s.speed, 0, e.brake * dt);
    s.vx = Math.sin(s.yaw) * s.speed; s.vz = Math.cos(s.yaw) * s.speed;
    fin(s, ['speed', 'yaw', 'vx', 'vz', 'torsoYaw', 'power']); return s;
  }
  const th = clamp(i.throttle || 0, -1, 1);
  let f = i.brake ? approach(s.speed, 0, e.brake * dt)
    : Math.abs(th) < .001 ? approach(s.speed, 0, e.brake * .6 * dt)
    : approach(s.speed, th * e.top * (th < 0 ? .4 : 1), e.accel * dt);
  f -= grade * e.slopePull * dt;
  if (grade > (e.maxGrade ?? .85) && f > 0) f = approach(f, 0, e.slopePull * 1.5 * dt);
  s.yaw += clamp(i.steer || 0, -1, 1) * e.turn * dt;
  s.torsoYaw = clamp(s.torsoYaw + clamp(i.torsoX || 0, -1, 1) * e.torsoRate * dt, -e.torsoMax, e.torsoMax);
  s.vx = Math.sin(s.yaw) * f; s.vz = Math.cos(s.yaw) * f; s.speed = f;
  s.strideT += Math.abs(f) * dt * e.stride / Math.max(e.top, 1);          // gait phase for the view
  fin(s, ['speed', 'yaw', 'vx', 'vz', 'torsoYaw', 'power', 'strideT']); return s;
}

// ---- SHIP — the carrier. Enormous inertia; the turn is a commitment. ---------
export function stepShip(s, i, dt, e, ctx) {
  fin(s, ['speed', 'yaw', 'vx', 'vz']); dt = dtc(dt); if (!dt || !i) return s;
  const th = clamp(i.throttle || 0, -1, 1);
  s.speed = clamp(approach(s.speed, th > 0 ? th * e.top : th * e.reverse, (i.brake ? e.brake : e.accel) * dt), -e.reverse, e.top);
  s.yaw += clamp(i.steer || 0, -1, 1) * e.turn * dt * clamp(Math.abs(s.speed) / e.top, .15, 1);
  s.vx = Math.sin(s.yaw) * s.speed; s.vz = Math.cos(s.yaw) * s.speed;
  fin(s, ['speed', 'yaw', 'vx', 'vz']); return s;
}

export const STEPPERS = { wheeled: stepWheeled, tracked: stepTracked, fixedwing: stepFixedwing, rotor: stepRotor, hover: stepHover, mech: stepMech, ship: stepShip };
export function stepVehicle(cls, s, i, dt, e, ctx) { const f = STEPPERS[cls]; return f ? f(s, i, dt, e, ctx) : s; }
