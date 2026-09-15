// THE VEHICLE STATS BENCH — runs EVERY registry row through its pure stepper and
// MEASURES it: top speed, 0→top, brake distance, 180° turn + circle, climb,
// stall, turret/torso slew, power-up, spool, storm-crosswind drift. "Don't stop
// until you've got stats for everything" — this is the instrument. CLI writes
// docs/VEHICLE_STATS.md; tools/vehicle-motion.test.mjs asserts on the SAME
// measurements (one source of truth, the gauge can't drift from the gate).
//   node tools/vehicle-stats.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VEHICLE_ENVELOPES } from '../src/data/vehicle-envelopes.js';
import { STEPPERS, windCarry } from '../src/engine/vehicle-motion.js';

const KMH = u => u * 0.684;
const DT = 1 / 60;
const STORM = { x: 40, z: 0 };                       // a storm-grade crosswind, u/s

function fresh(cls) {
  return cls === 'fixedwing' ? { speed: 0, yaw: 0, roll: 0, pitch: 0, lever: 0 }
    : cls === 'rotor' ? { yaw: 0, vx: 0, vy: 0, vz: 0, spool: 0, tiltX: 0, tiltZ: 0, rockT: 0 }
    : cls === 'mech' ? { speed: 0, yaw: 0, vx: 0, vz: 0, torsoYaw: 0, power: 0, strideT: 0 }
    : cls === 'tracked' ? { speed: 0, yaw: 0, vx: 0, vz: 0, turretYaw: 0, turretPitch: 0 }
    : { speed: 0, yaw: 0, vx: 0, vz: 0, steerSmooth: 0, yawVel: 0, lean: 0, bobT: 0 };
}
const CRUISE = { // full-power straight-line intent per class
  fixedwing: { throttle: 1 }, rotor: { throttle: 1, on: true }, mech: { throttle: 1, powerOn: true },
  wheeled: { throttle: 1 }, tracked: { throttle: 1 }, hover: { throttle: 1 }, ship: { throttle: 1 },
};
const groundSpeed = (s) => Math.hypot(s.vx || 0, s.vz || 0);

function run(cls, e, s, intent, seconds, ctx = {}, each = null) {
  const step = STEPPERS[cls]; const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) { step(s, intent, DT, e, ctx); if (each && each(s, i) === false) return i * DT; }
  return seconds;
}

export function measureRow(id) {
  const e = VEHICLE_ENVELOPES[id], cls = e.cls, out = { id, cls, name: e.name };
  // TOP SPEED + 0→95%
  { const s = fresh(cls); let t95 = null;
    run(cls, e, s, CRUISE[cls], 40, {}, (st, i) => { if (t95 === null && groundSpeed(st) >= (e.top ?? 1) * .95) t95 = i * DT; });
    out.top = groundSpeed(s); out.to95 = t95; }
  // BURNER top (fixedwing with burnTop)
  if (cls === 'fixedwing' && e.burnTop > 0) { const s = fresh(cls); run(cls, e, s, { throttle: 1, burner: true }, 40); out.burnTop = groundSpeed(s); }
  // BRAKE distance from top (ground classes)
  if (['wheeled', 'tracked', 'hover', 'mech', 'ship'].includes(cls)) {
    const s = fresh(cls); run(cls, e, s, CRUISE[cls], cls === 'ship' ? 90 : 30);
    let d = 0; run(cls, e, s, { ...CRUISE[cls], throttle: 0, brake: true }, 60, {}, (st) => { d += groundSpeed(st) * DT; return groundSpeed(st) > .5; });
    out.brakeDist = d; }
  // 180° TURN at speed (+ circle diameter for steady turns)
  { const s = fresh(cls); run(cls, e, s, CRUISE[cls], cls === 'ship' ? 90 : 20);
    const h0 = { x: Math.sin(s.yaw), z: Math.cos(s.yaw) }; let tT = null;
    run(cls, e, s, { ...CRUISE[cls], steer: 1 }, 240, {}, (st, i) => {
      const sp = groundSpeed(st); if (sp < .5) return true;
      if (tT === null && (st.vx * h0.x + st.vz * h0.z) / sp < -.9) { tT = i * DT; return false; } });
    out.turn180 = tT; out.circleD = tT != null ? (out.top * tT) / Math.PI : null; }
  // CLIMB (air)
  if (cls === 'fixedwing') { const s = fresh(cls); run(cls, e, s, CRUISE[cls], 20); let peak = 0;
    run(cls, e, s, { throttle: 1, pitch: 1 }, 12, {}, st => { peak = Math.max(peak, st.vy || 0); }); out.climb = peak; }
  if (cls === 'rotor') { const s = fresh(cls); run(cls, e, s, CRUISE[cls], 8); let peak = 0;
    run(cls, e, s, { throttle: 0, lift: 1, on: true }, 8, {}, st => { peak = Math.max(peak, st.vy || 0); }); out.climb = peak; }
  // STALL (fixedwing): cut the lever level — the speed where lift dies
  if (cls === 'fixedwing') { const s = fresh(cls); run(cls, e, s, CRUISE[cls], 20); let stallAt = null;
    run(cls, e, s, { throttle: -1 }, 60, {}, st => { if (stallAt === null && st.vy < -2) { stallAt = st.speed; return false; } });
    out.stallSpeed = stallAt; }
  // TURRET / TORSO 90° slew
  if (cls === 'tracked') { const s = fresh(cls); let t = null;
    run(cls, e, s, { turretX: 1 }, 20, {}, (st, i) => { if (t === null && st.turretYaw >= Math.PI / 2) { t = i * DT; return false; } }); out.turret90 = t; }
  if (cls === 'mech') { const s = fresh(cls); run(cls, e, s, { powerOn: true }, e.powerTime + 1); let t = null;
    run(cls, e, s, { powerOn: true, torsoX: 1 }, 20, {}, (st, i) => { if (t === null && st.torsoYaw >= Math.min(Math.PI / 2, e.torsoMax) ) { t = i * DT; return false; } }); out.torso90 = t; }
  // POWER-UP / SPOOL
  if (cls === 'mech') { const s = fresh(cls); let t = null;
    run(cls, e, s, { powerOn: true }, 20, {}, (st, i) => { if (t === null && st.power >= 1) { t = i * DT; return false; } }); out.powerUp = t; }
  if (cls === 'rotor') { const s = fresh(cls); let t = null;
    run(cls, e, s, { on: true }, 20, {}, (st, i) => { if (t === null && st.spool >= 1) { t = i * DT; return false; } }); out.spool = t; }
  // STORM CROSSWIND drift — position is swept with own velocity + windCarry, the
  // way the controller does it; the lateral offset over 5 s in a 40 u/s crosswind.
  { const carry = windCarry(e, { wind: STORM }); out.windDrift = carry.x * 5; }
  return out;
}

export function measureAll() { return Object.keys(VEHICLE_ENVELOPES).map(measureRow); }

const f1 = v => v == null ? '—' : (Math.round(v * 10) / 10).toString();
export function statsMarkdown(rows = measureAll()) {
  const L = [];
  L.push('# VEHICLE STATS — measured, not authored', '',
    `Generated by \`node tools/vehicle-stats.mjs\` on ${new Date().toISOString().slice(0, 10)} from`,
    '`data/vehicle-envelopes.js` (the ONE editable surface — change a number there, re-run, this table',
    'moves). Speeds in u/s with km/h in parens (1u = 0.19 m). Wind column = lateral drift after 5 s of',
    'cruise in a 40 u/s storm crosswind — steel ignores it, hovercraft ride it. ⚠ All envelopes are',
    'tunable proposals pending the flight-speed-scale ratification (#44).', '');
  const grp = {};
  for (const r of rows) (grp[r.cls] = grp[r.cls] || []).push(r);
  const cols = {
    fixedwing: ['top', 'burnTop', 'to95', 'stallSpeed', 'climb', 'turn180', 'windDrift'],
    rotor: ['top', 'to95', 'climb', 'spool', 'turn180', 'windDrift'],
    wheeled: ['top', 'to95', 'brakeDist', 'turn180', 'circleD', 'windDrift'],
    tracked: ['top', 'to95', 'brakeDist', 'turn180', 'turret90', 'windDrift'],
    hover: ['top', 'to95', 'brakeDist', 'turn180', 'windDrift'],
    mech: ['top', 'to95', 'powerUp', 'torso90', 'turn180', 'windDrift'],
    ship: ['top', 'to95', 'brakeDist', 'turn180', 'windDrift'],
  };
  const label = { top: 'top u/s', burnTop: 'burner u/s', to95: '0→95% s', brakeDist: 'brake u', stallSpeed: 'stall u/s', climb: 'climb u/s', turn180: '180° s', circleD: 'circle u', turret90: 'turret 90° s', torso90: 'torso 90° s', powerUp: 'power-up s', spool: 'spool s', windDrift: 'storm drift u' };
  for (const cls of Object.keys(cols)) {
    if (!grp[cls]) continue;
    L.push(`## ${cls.toUpperCase()}`, '', `| vehicle | ${cols[cls].map(c => label[c]).join(' | ')} |`, `|---|${cols[cls].map(() => '---:').join('|')}|`);
    for (const r of grp[cls]) {
      const cells = cols[cls].map(c => c === 'top' || c === 'burnTop' ? (r[c] ? `${f1(r[c])} (${f1(KMH(r[c]))} km/h)` : '—') : f1(r[c]));
      L.push(`| ${r.name} | ${cells.join(' | ')} |`);
    }
    L.push('');
  }
  L.push('Drones (swarm/gun/kamikaze) are measured by `tools/drone-swarm.test.mjs`: 30 / 26 / 120 u/s,',
    '180° reversal 1.20 / 1.25 / 1.47 s, ground→hover 1.67 s, 64 drones 0.026 ms/tick.', '');
  return L.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === (await import('node:path')).resolve(process.argv[1])) {
  const rows = measureAll();
  const md = statsMarkdown(rows);
  writeFileSync(new URL('../docs/VEHICLE_STATS.md', import.meta.url), md);
  console.log(md);
}
