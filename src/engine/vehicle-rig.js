// VEHICLE RIG — drive a model's movable SUB-PARTS from the sim state, so a tank's
// turret slews, a helicopter's rotors spin, a jet's ailerons/elevators deflect, wheels
// roll, and a mech's torso twists — all off the same motion the generic driver produces.
// Parts are found by the reference-fleet naming convention (verified live off the real
// GLBs). THREE-free: it only reads/writes node.rotation on nodes handed to it, so it
// no-ops cleanly on a headless stub actor with no parts.

// material/detail variants and the model root are never articulated
const isVariant = n => /-painted$|-glazing$|-fleet-|^propreference/.test(n);
const stashRest = o => { const u = o.userData || (o.userData = {}); if (u._restX == null) { u._restX = o.rotation.x || 0; u._restY = o.rotation.y || 0; } };

// Traverse a loaded model and collect the drivable nodes. Call once at spawn.
export function bindVehicleParts(model) {
  const parts = { wheels: [], rotors: [], tailRotors: [], ailerons: {}, elevators: {}, legs: {}, landingGear: [] };
  if (!model || !model.traverse) return parts;
  model.traverse(o => {
    const n = o.name || ''; if (!n || isVariant(n)) return;
    if (n === 'turret') { parts.turret = o; stashRest(o); }
    else if (n === 'barrel' || n === 'cannon-recoil' || n === 'machine-gun-pitch') { if (!parts.barrel) { parts.barrel = o; stashRest(o); } }
    else if (n === 'mech-torso') { parts.torso = o; stashRest(o); }
    else if (/^mech-(hip|knee|ankle)-\d+$/.test(n)) {
      const [, joint, id] = n.match(/^mech-(hip|knee|ankle)-(\d+)$/);
      (parts.legs[id] ||= {})[joint] = o; stashRest(o);
    }
    else if (/^landing-gear-(nose|left|right)$/.test(n)) { parts.landingGear.push(o); stashRest(o); }
    else if (n === 'rotor-main') parts.rotors.push(o);
    else if (n === 'tail-rotor') parts.tailRotors.push(o);
    else if (/^wheel-/.test(n) || /^gear-wheel-/.test(n)) parts.wheels.push(o);
    else if (n === 'aileron-left') { parts.ailerons.l = o; stashRest(o); }
    else if (n === 'aileron-right') { parts.ailerons.r = o; stashRest(o); }
    else if (n === 'elevator-left') { parts.elevators.l = o; stashRest(o); }
    else if (n === 'elevator-right') { parts.elevators.r = o; stashRest(o); }
  });
  parts.bound = !!(parts.turret || parts.rotors.length || parts.wheels.length || parts.ailerons.l || parts.torso);
  return parts;
}

// Drive the bound parts from the actor's motion. Called each frame by driveActor.
export function rigParts(actor, dt) {
  const p = actor && actor.parts, m = actor && actor.motion; if (!p || !m || !(dt > 0)) return;
  const cls = actor.cls;
  // articulated aim: turret yaw + barrel pitch (relative to rest so a canted mount holds)
  if (p.turret) p.turret.rotation.y = (p.turret.userData._restY || 0) + (m.turretYaw || 0);
  if (p.barrel) p.barrel.rotation.x = (p.barrel.userData._restX || 0) - (m.turretPitch || 0);
  if (p.torso) p.torso.rotation.y = (p.torso.userData._restY || 0) + (m.torsoYaw || 0);
  // The authored walker has four joint chains. Preserve its bent rest pose;
  // diagonal pairs alternate, and the ankle cancels the upper-chain rotation.
  if (cls === 'mech' && p.legs) {
    const target = Math.min(1, Math.abs(m.speed || 0) / Math.max(1, (actor.env?.top || 34) * .6)) * (m.power ?? 1);
    p.gaitWeight = (p.gaitWeight || 0) + (target - (p.gaitWeight || 0)) * (1 - Math.exp(-10 * dt));
    for (const [id, leg] of Object.entries(p.legs)) {
      const diagonal = Number(id) === 0 || Number(id) === 3;
      const phase = (m.strideT || 0) * Math.PI * 2 + (diagonal ? 0 : Math.PI);
      const hip = Math.sin(phase) * .28 * p.gaitWeight * (m.speed < 0 ? -1 : 1);
      const knee = Math.max(0, Math.cos(phase)) * .36 * p.gaitWeight;
      if (leg.hip) leg.hip.rotation.x = leg.hip.userData._restX + hip;
      if (leg.knee) leg.knee.rotation.x = leg.knee.userData._restX + knee;
      if (leg.ankle) leg.ankle.rotation.x = leg.ankle.userData._restX - hip - knee;
    }
  }
  // Rotate the real strut pivots into the hull; no mesh visibility teleport.
  for (const gear of (p.landingGear || [])) gear.rotation.x = gear.userData._restX + (1 - (m.gearAmount ?? 1)) * Math.PI / 2;
  // rotors spin while the aircraft is spooled up (framerate-based, not a pose)
  if (cls === 'rotor') {
    const w = 42 * (m.spool == null ? 1 : Math.max(0, m.spool));
    for (const r of p.rotors) r.rotation.y += w * dt;
    for (const t of p.tailRotors) t.rotation.x += w * 1.4 * dt;
  }
  // wheels roll with ground speed
  const gs = Math.hypot(m.vx || 0, m.vz || 0);
  if (p.wheels.length && gs > 0.01) { const roll = (gs / 2.2) * dt * (m.speed < 0 ? -1 : 1); for (const w of p.wheels) w.rotation.x += roll; }
  // fixed-wing control surfaces deflect with bank + pitch
  if (p.ailerons.l) p.ailerons.l.rotation.x = (p.ailerons.l.userData._restX || 0) + (m.roll || 0) * 0.5;
  if (p.ailerons.r) p.ailerons.r.rotation.x = (p.ailerons.r.userData._restX || 0) - (m.roll || 0) * 0.5;
  const ev = (m.pitch || 0) * 0.5;
  if (p.elevators.l) p.elevators.l.rotation.x = (p.elevators.l.userData._restX || 0) + ev;
  if (p.elevators.r) p.elevators.r.rotation.x = (p.elevators.r.userData._restX || 0) + ev;
}
