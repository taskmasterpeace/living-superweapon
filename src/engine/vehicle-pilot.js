// GENERIC VEHICLE PILOT — one driver for the WHOLE fleet. Robert: "everything needs
// a pilot." Given a vehicle actor (a catalog model + a motion class + an envelope
// from data/fleet-handling.js), this runs the right stepper (vehicle-motion.js),
// sweeps the resulting velocity against terrain + cover, and sets the model's
// transform per class. It is the consolidation of the jet/heli (aircraft-piloting)
// and scout (scout-driving) controllers, generalised to all seven motion classes so
// a tank, a mech, a hovercraft or the carrier all board and drive through ONE path.
//
// Pure enough to test headless: pass an actor {cls, motion, env, pos, wrapper?,
// bodyRadius, groundOffset} + a world {heightAt, waterAt, ARENA, cover} + an intent.
import { stepVehicle } from './vehicle-motion.js';
import { rigParts } from './vehicle-rig.js';

const AIR = new Set(['fixedwing', 'rotor']);            // altitude from the stepper's vy
const clampDt = dt => Number.isFinite(dt) && dt > 0 ? Math.min(dt, .1) : 0;

// Fresh per-class motion state (the fields each stepper reads/writes).
export function initVehicleState(cls, yaw = 0) {
  const base = { yaw, vx: 0, vy: 0, vz: 0, rollSpin: 0, rollDir: 1 };
  if (cls === 'fixedwing') return { ...base, speed: 0, roll: 0, pitch: 0, lever: 0, stalled: false, gearDown: true, gearAmount: 1 };
  if (cls === 'rotor') return { ...base, spool: 1, tiltX: 0, tiltZ: 0, rockT: 0 };
  if (cls === 'tracked') return { ...base, speed: 0, turretYaw: 0, turretPitch: 0 };
  if (cls === 'mech') return { ...base, speed: 0, torsoYaw: 0, power: 1, strideT: 0 };
  if (cls === 'hover') return { ...base, speed: 0, lean: 0, bobT: 0 };
  if (cls === 'ship') return { ...base, speed: 0 };
  return { ...base, speed: 0, steerSmooth: 0, yawVel: 0, lean: 0, y: 0, air: false }; // wheeled
}

// An airborne practice spawn must start with matching thrust and airspeed.
// A zero lever silently decelerated the old spawn below its lift threshold.
export function initAirborneVehicleState(env, yaw = 0) {
  const state = initVehicleState('fixedwing', yaw);
  state.speed = Math.min(env.top, Math.max(env.top * .65, env.stall + env.liftRamp + 5));
  state.lever = state.speed / env.top;
  state.vx = Math.sin(yaw) * state.speed;
  state.vz = Math.cos(yaw) * state.speed;
  return state;
}

// The model's Euler pose (order 'YXZ') for a class from its motion state. rollSpin
// (barrel roll) is a SEPARATE channel added to bank/lean — it never turns the body.
export function poseFor(cls, m) {
  if (cls === 'fixedwing') return { rx: -(m.pitch || 0), ry: m.yaw || 0, rz: (m.roll || 0) + (m.rollSpin || 0) };
  if (cls === 'rotor') return { rx: m.tiltX || 0, ry: m.yaw || 0, rz: (m.tiltZ || 0) + (m.rollSpin || 0) };
  if (cls === 'wheeled' || cls === 'hover') return { rx: 0, ry: m.yaw || 0, rz: (m.lean || 0) + (m.rollSpin || 0) };
  return { rx: 0, ry: m.yaw || 0, rz: 0 };              // tracked, mech, ship
}

function heightAt(world, x, z) { return world && world.heightAt ? (world.heightAt(x, z) ?? 0) : 0; }

// Terrain grade (front minus rear over the wheelbase) for a ground vehicle, feeding
// the stepper's grade sap + maxGrade.
function terrain(world, x, z, yaw, span) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  const at = f => heightAt(world, x + s * f, z + c * f);
  return { groundY: (at(-2) + at(0) + at(2)) / 3, grade: (at(span) - at(-span)) / (2 * span) };
}

function clear(world, x, z, y, r, actor) {
  if (!world) return true;
  if (Number.isFinite(world.ARENA) && (Math.abs(x) + r > world.ARENA || Math.abs(z) + r > world.ARENA)) return false;
  // GIANT PLATFORMS (carrier, mothership) ride OVER the scatter — a rock or a spire never stops
  // something that size (Robert's ruling: "it should be over all of that stuff"). Descending into
  // terrain/cover is what hurts them, handled as a descent event, not a horizontal wall.
  if (actor.giant) return true;
  // water stops non-amphibious ground vehicles (ship/hover ride it; air clears by altitude)
  if (world.waterAt && world.waterAt(x, z) && !AIR.has(actor.cls) && actor.cls !== 'ship' && actor.cls !== 'hover') return false;
  for (const c of (world.cover || [])) {
    if (c === actor.cover || c.hp <= 0) continue;
    if (AIR.has(actor.cls) && y > (c.top ?? c.h ?? Infinity) + 1) continue;   // flying over it
    const dx = Math.max(0, Math.abs(x - c.x) - (c.hx ?? c.r ?? 0)), dz = Math.max(0, Math.abs(z - c.z) - (c.hz ?? c.r ?? 0));
    if (dx * dx + dz * dz < r * r) return false;
  }
  return true;
}

// One generic frame: step the class model, sweep the velocity, set the transform.
export function driveActor(actor, intent, dt, world) {
  dt = clampDt(dt); if (!actor || !dt || !intent) return actor;
  const cls = actor.cls, m = actor.motion, e = actor.env, pos = actor.pos, off = actor.groundOffset || 0;
  if (cls === 'fixedwing' && actor.parts?.landingGear?.length) {
    // Protect against a held input toggling once per simulation frame, and do
    // not retract the supports while the aircraft rests on the ground.
    const onGround = pos.y <= heightAt(world, pos.x, pos.z) + off + .5;
    if (intent.gearToggle && !m._gearToggleHeld && !onGround) m.gearDown = !(m.gearDown ?? true);
    m._gearToggleHeld = !!intent.gearToggle;
    const target = m.gearDown === false ? 0 : 1;
    const amount = m.gearAmount ?? 1;
    m.gearAmount = target > amount ? Math.min(target, amount + dt / 1.2) : Math.max(target, amount - dt / 1.2);
  }
  const ground = AIR.has(cls) ? null : terrain(world, pos.x, pos.z, m.yaw || 0, actor.wheelbase || 8);
  const ctx = AIR.has(cls) ? {} : { grade: cls === 'ship' ? 0 : ground.grade, groundY: ground.groundY };
  stepVehicle(cls, m, intent, dt, e, ctx);
  // horizontal sweep in <=1.5u steps so fast motion can't tunnel through cover
  const vx = m.vx || 0, vz = m.vz || 0, dist = Math.hypot(vx, vz);
  const steps = Math.max(1, Math.ceil(dist * dt / 1.5)), sx = vx * dt / steps, sz = vz * dt / steps, r = actor.bodyRadius || 6;
  for (let i = 0; i < steps; i++) {
    const nx = pos.x + sx, nz = pos.z + sz;
    if (!clear(world, nx, nz, pos.y, r, actor)) { m.vx = m.vz = 0; if ('speed' in m) m.speed = 0; break; }
    pos.x = nx; pos.z = nz;
  }
  // vertical: air integrates vy and lands; ground follows the terrain
  if (AIR.has(cls)) {
    pos.y += (m.vy || 0) * dt;
    const floor = heightAt(world, pos.x, pos.z) + off;
    if (pos.y <= floor) { pos.y = floor; if ((m.vy || 0) < 0) m.vy = 0; actor.grounded = true; } else actor.grounded = false;
  } else {
    pos.y = heightAt(world, pos.x, pos.z) + off; actor.grounded = true;
  }
  if (actor.wrapper) {
    const p = poseFor(cls, m);
    actor.wrapper.position.set(pos.x, pos.y, pos.z);
    actor.wrapper.rotation.set(p.rx, p.ry, p.rz, 'YXZ');
  }
  rigParts(actor, dt);   // turret/rotor/wheels/control surfaces from the sim (no-op without .parts)
  return actor;
}
