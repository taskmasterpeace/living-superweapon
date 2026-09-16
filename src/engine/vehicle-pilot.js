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
const clamp01 = v => Math.max(0, Math.min(1, v));

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

// Terrain support + grade for a ground vehicle. SUPPORT is the HIGHEST contact
// under the body (a rigid vehicle over a crest or a gap rests on the edge, never
// on the mean of the hole) — the old 3-sample AVERAGE turned a sheer cliff into
// a ramp the vehicle stair-stepped down instead of flying off. GRADE looks a
// wheelbase ahead/behind, but a discontinuous drop ahead is NOT a slope you can
// roll down — detect the cliff and ride the slope you are ON, so the launch
// rate (stepWheeled's `vy = |f|·grade`) is the crest's real rate, not a spike
// clamped at -1.2 that slams the nose down before the wheels even leave.
function terrain(world, x, z, yaw, span) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  const at = f => heightAt(world, x + s * f, z + c * f);
  const rear = at(-span), mid = at(0), front = at(span);
  const groundY = Math.max(at(-2), mid, at(2));
  // per-half slopes; a half steeper than the rollable limit (the stepper's own
  // ±1.2 clamp) is a drop-off, not ground — exclude it from the ridden grade
  const back = (mid - rear) / span, fwd = (front - mid) / span;
  const bOk = Math.abs(back) <= 1.2, fOk = Math.abs(fwd) <= 1.2;
  const grade = bOk && fOk ? (back + fwd) / 2 : bOk ? back : fOk ? fwd : 0;
  return { groundY, grade };
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
    // Authored roof slabs are not solid columns. Only actors with a measured
    // body height can claim clearance beneath them; legacy unknowns stay safe.
    if (Number.isFinite(actor.bodyHeight) && y + actor.bodyHeight < (c.bottom ?? 0) - .05) continue;
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
  // The wheeled stepper OWNS its vertical channel (m.y/m.vy/m.air — the motocross
  // ballistic arc). Seed it from the terrain on the first frame so a spawn on high
  // or low ground never opens with a phantom fall from y=0.
  if (cls === 'wheeled' && !m._ySeeded) { m.y = ground.groundY; m._ySeeded = true; }
  const ctx = AIR.has(cls) ? {} : { grade: cls === 'ship' ? 0 : ground.grade, groundY: ground.groundY };
  stepVehicle(cls, m, intent, dt, e, ctx);
  // horizontal sweep in <=1.5u steps so fast motion can't tunnel through cover.
  // A blocked step tries each axis alone first (wall SLIDE) — a graze must not be
  // a full stop; only a head-on with neither axis clear kills the speed.
  const vx = m.vx || 0, vz = m.vz || 0, dist = Math.hypot(vx, vz);
  const steps = Math.max(1, Math.ceil(dist * dt / 1.5)), sx = vx * dt / steps, sz = vz * dt / steps, r = actor.bodyRadius || 6;
  for (let i = 0; i < steps; i++) {
    const nx = pos.x + sx, nz = pos.z + sz;
    if (clear(world, nx, nz, pos.y, r, actor)) { pos.x = nx; pos.z = nz; continue; }
    const xOk = sx !== 0 && clear(world, nx, pos.z, pos.y, r, actor);
    const zOk = sz !== 0 && clear(world, pos.x, nz, pos.y, r, actor);
    if (!xOk && !zOk) { m.vx = m.vz = 0; if ('speed' in m) m.speed = 0; break; }
    const kept = xOk ? Math.abs(vx) : Math.abs(vz);
    if (xOk) pos.x = nx; else pos.z = nz;
    if ('speed' in m && dist > 0) m.speed *= clamp01(kept / dist);   // glancing keeps most of it
  }
  // vertical: air integrates vy and lands; ground follows the terrain
  if (AIR.has(cls)) {
    const rise=(m.vy||0)*dt;
    if(Number.isFinite(actor.bodyHeight)){
      const verticalSteps=Math.max(1,Math.ceil(Math.abs(rise)/1.5)),dy=rise/verticalSteps;
      for(let i=0;i<verticalSteps;i++){
        if(!clear(world,pos.x,pos.z,pos.y+dy,r,actor)){m.vy=0;break;}
        pos.y+=dy;
      }
    }else pos.y += rise;
    const floor = heightAt(world, pos.x, pos.z) + off;
    if (pos.y <= floor) {
      // TOUCHDOWN EVENT — stamped once per arrival with the honest contact
      // numbers; the pilot layer decides landing vs hard landing vs crash.
      if (!actor.grounded) actor.landedImpact = { vy: m.vy || 0, speed: Math.hypot(m.vx || 0, m.vz || 0), gearDown: m.gearDown !== false };
      pos.y = floor; if ((m.vy || 0) < 0) m.vy = 0; actor.grounded = true;
    } else actor.grounded = false;
  } else if (cls === 'wheeled') {
    // THE SUPPORT CONTRACT (the old conflict, fixed): the stepper owns m.y/m.vy/m.air,
    // and the adapter enforces the SAME ground number the stepper reasons about.
    // Before this, the stepper was fed the wheelbase-averaged ground while the
    // adapter pinned pos.y to a point sample — on any sloped ground the two
    // disagreed, the stepper believed it was airborne ~43% of frames (no drive
    // force, no grip), and the whole authored air branch (VEHICLE_GRAV, airSteer,
    // landing scrub, the motocross barrel roll) was dead because pos.y was
    // hard-set to the terrain every frame.
    // The stepper set m.y from the SAME support number we sampled for its ctx —
    // never touch it while grounded (pre-following the ground down is exactly
    // how the cliff became a staircase). Airborne, re-check landing against the
    // support at the SWEPT position (the step integrated against the pre-move one).
    if (m.air) {
      const g2 = terrain(world, pos.x, pos.z, m.yaw || 0, actor.wheelbase || 8).groundY;
      if (m.y <= g2) {                                     // landing here (mirror of the stepper's landing)
        if ((m.vy || 0) < -26) m.speed = (m.speed || 0) * .82;
        m.y = g2; m.vy = 0; m.air = false;
      }
    }
    pos.y = m.y + off; actor.grounded = !m.air;
  } else if (cls === 'hover') {
    // hover rides a cushion: authored hoverH + the stepper's bob, above ground or water
    pos.y = heightAt(world, pos.x, pos.z) + off + (e.hoverH || 0) + (m.bob || 0);
    actor.grounded = true;
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
