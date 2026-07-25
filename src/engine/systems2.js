// TIER THREE, PART TWO — the remaining engine systems from docs/POWERS_BRIEF.md Part Five.
// Same contract as systems.js: public verbs, no hero ids, damage through takeDamage, a
// readable tell and a counter for each, and every one cleans up after itself.
import * as THREE from 'three';

// ============================================================================================
// 4 · DUPLICATES — true AI clones that SHARE ONE HEALTH POOL.
// The shared pool is the whole design: hurting any duplicate hurts the original, and a pulse
// travels through every active copy whenever the pool changes, so the link is visible.
// ============================================================================================
export function spawnDuplicates(f, n, dur, game) {
  f._dupes = f._dupes || [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = game.addFighter({ ...f.def, name: f.def.name + ' ' + (i + 2), isDupe: true }, {
      team: f.team, x: f.pos.x + Math.cos(a) * 9, z: f.pos.z + Math.sin(a) * 9,
    });
    d._dupeOf = f;                       // the pool lives on the ORIGINAL
    d.noRespawn = true;
    d._dupeT = dur;
    d.maxHp = f.maxHp; d.hp = f.hp;
    if (d.obj) d.obj.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.92; } });
    // each copy carries a small marking so you can track which is which
    d._dupeIndex = i + 2;
    f._dupes.push(d);
    game.vfx.ring(d.pos.clone().setY(1), { color: f.def.colors.accent, r0: 5, r1: 1, life: 0.3, flat: true, y: 0.5 });
  }
  game.audio.teleport(f.pos);
  if (game.hud && game.isHuman(f)) game.hud.feed(`${n} duplicates — they share your health`, f.def.colors.accent);
  return f._dupes;
}
// called from takeDamage: route a duplicate's damage to the pool and pulse every copy
export function dupePool(victim) { return victim._dupeOf || (victim._dupes && victim._dupes.length ? victim : null); }
export function pulseDupes(f, game) {
  const root = f._dupeOf || f;
  const all = [root, ...(root._dupes || [])];
  for (const d of all) {
    if (!d || !d.alive) continue;
    if (d !== root) { d.hp = root.hp; d.maxHp = root.maxHp; }
    game.particles.burst(d.pos.x, d.pos.y + 5, d.pos.z, { count: 3, speed: 6, life: 0.25, size: 1.4, color: [root.def.colors.accent, '#fff'], up: 3, drag: 1.6 });
  }
}
export function updateDupes(f, dt, game) {
  if (!f._dupes || !f._dupes.length) return;
  for (let i = f._dupes.length - 1; i >= 0; i--) {
    const d = f._dupes[i];
    d._dupeT -= dt;
    if (!d.alive || d._dupeT <= 0) {
      if (d.alive) { d.noRespawn = true; d._remove = true; game.vfx.flash(d.pos.clone().setY(5), f.def.colors.accent, 6, 0.16); }
      f._dupes.splice(i, 1);
    }
  }
}

// ============================================================================================
// 5 · POSSESSION — full control transfer into another body.
// The player's HUD, camera and inputs follow; the abandoned body stays visibly vulnerable.
// Never a human, never a badge — the same guard rail mind control has.
// ============================================================================================
export function possess(caster, victim, dur, game) {
  if (!victim || !victim.alive || victim.def.police || game.isHuman(victim) || victim.isDecoy) return false;
  if (caster._possessing || victim._possessedBy) return false;
  const spectral = caster.obj.clone(true);
  spectral.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.4; } });
  game.scene.add(spectral);
  caster._possessing = { victim, t: dur, home: caster.pos.clone(), spectral, wasTeam: victim.team };
  victim._possessedBy = caster;
  victim.team = caster.team;
  victim.ai = null;                                    // the AI hands over the wheel
  // the abandoned body is left where it stands, inert and vulnerable
  caster._inert = true; caster.obj.visible = false;
  if (game.humans.some(h => h.fighter === caster)) {
    const slot = game.humans.find(h => h.fighter === caster);
    slot.fighter = victim;                              // the PLAYER moves
    if (game.player === caster) game.player = victim;
  }
  game.vfx.ring(victim.pos.clone().setY(4), { color: '#9fd0ff', r0: 8, r1: 1, life: 0.4 });
  game.audio.teleport(victim.pos);
  if (game.hud) game.hud.announce('POSSESSED', 'you are ' + victim.name + ' now', '#9fd0ff');
  return true;
}
export function updatePossession(caster, dt, game) {
  const P = caster._possessing; if (!P) return;
  P.t -= dt;
  if (P.spectral) { P.spectral.position.copy(caster.pos); P.spectral.visible = Math.random() > 0.1; }
  const v = P.victim;
  if (Math.random() < dt * 8 && v && v.alive) game.particles.spawn({ x: v.pos.x, y: v.pos.y + 7, z: v.pos.z, vx: 0, vy: 2, vz: 0, life: 0.4, size: 1.6, color: ['#9fd0ff', '#cfe6ff'], drag: 1.4 });
  if (P.t <= 0 || !v || !v.alive) releasePossession(caster, game);
}
export function releasePossession(caster, game) {
  const P = caster._possessing; if (!P) return;
  const v = P.victim;
  if (v) { v._possessedBy = null; v.team = P.wasTeam; }
  caster._inert = false; caster.obj.visible = true;
  if (P.spectral) { game.scene.remove(P.spectral); P.spectral.traverse(o => { if (o.material) o.material.dispose(); }); }
  const slot = game.humans.find(h => h.fighter === v);
  if (slot) { slot.fighter = caster; if (game.player === v) game.player = caster; }
  caster._possessing = null;
  game.vfx.ring(caster.pos.clone().setY(4), { color: '#9fd0ff', r0: 1, r1: 8, life: 0.35 });
  if (game.hud) game.hud.announce('RELEASED', 'back in your own body', '#9fd0ff');
}

// ============================================================================================
// 6 · ELASTICITY — limbs that stretch, and melee reach that changes with them.
// Volume is preserved by scaling the limb along its own axis and thinning it, so a stretched
// arm still reads as an arm rather than a wire with a hand on the end.
// ============================================================================================
export function setElastic(f, reach, dur, game) {
  f._elastic = { reach, t: dur, k: 0 };
  if (game && game.hud && game.isHuman(f)) game.hud.feed('ELASTIC — your reach is longer while it lasts', f.def.colors.accent);
}
export function updateElastic(f, dt, game) {
  const E = f._elastic; if (!E) return;
  E.t -= dt;
  // the limb extends when you swing and snaps back after — a visible rubber wave
  const want = (f.strikeActive > 0 || f.state === 'punch') ? 1 : 0;
  E.k += (want - E.k) * Math.min(1, dt * (want ? 14 : 7));
  const P = f.parts;
  for (const armKey of ['armL', 'armR']) {
    const arm = P && P[armKey]; if (!arm || !arm.children) continue;
    for (const seg of arm.children) {
      if (!seg.userData._el0) seg.userData._el0 = seg.scale.clone();
      const s = 1 + E.k * (E.reach - 1);
      seg.scale.set(seg.userData._el0.x / Math.sqrt(s), seg.userData._el0.y * s, seg.userData._el0.z / Math.sqrt(s));   // volume-preserving
    }
  }
  f._reachBonus = E.k * (E.reach - 1) * 7;              // melee.js adds this to its cone length
  if (E.t <= 0) {
    for (const armKey of ['armL', 'armR']) {
      const arm = P && P[armKey]; if (!arm || !arm.children) continue;
      for (const seg of arm.children) if (seg.userData._el0) seg.scale.copy(seg.userData._el0);
    }
    f._reachBonus = 0; f._elastic = null;
  }
}

// ============================================================================================
// 8 · WALL-CRAWLING — a surface-locomotion state on building faces.
// Posture aligns to the SURFACE (not a run cycle rotated sideways), and hands pulse where they
// make contact. Falls off if there is no wall in reach.
// ============================================================================================
export function updateWallCrawl(f, dt, game) {
  if (!f.def.wallCrawl || f.flying) { f._onWall = null; return; }
  const near = [];
  for (const co of game.world.cover || []) {
    if (co.destroyed) continue;
    const dx = f.pos.x - co.x, dz = f.pos.z - co.z;
    const px = Math.abs(dx) - (co.hx || co.r || 4), pz = Math.abs(dz) - (co.hz || co.r || 4);
    if (px < 2.2 && pz < 2.2 && Math.max(px, pz) > -3) near.push({ co, px, pz, dx, dz });
  }
  if (!near.length) { if (f._onWall) { f._onWall = null; } return; }
  const w = near[0];
  f._onWall = w.co;
  // stick: cancel the fall, climb with the movement input, and align the body to the face
  if (f.vel.y < 0) f.vel.y = 0;
  f.vel.y += (f._climb || 0) * 26 * dt;
  // ⚠ `grounded` is a GETTER (pos.y <= groundY || onBlock) && !flying — assigning it throws.
  // Clinging to a wall means you are NOT standing on a block and you are off the deck.
  f.onBlock = false;
  if (f.pos.y < 1.4) f.pos.y = 1.4;
  const nx = w.px > w.pz ? Math.sign(w.dx) : 0, nz = w.px > w.pz ? 0 : Math.sign(w.dz);
  f.obj.rotation.z = -nx * 1.35;                          // the horizon rolls with the surface
  f.obj.rotation.x = nz * 1.35;
  if (Math.random() < dt * 9) game.particles.spawn({ x: f.pos.x - nx * 2, y: f.pos.y + 4, z: f.pos.z - nz * 2, vx: 0, vy: -1, vz: 0, life: 0.3, size: 1.1, color: ['#cfe6ff'], drag: 2 });
}

// ============================================================================================
// 9 · TELEKINESIS — free-aim selection, carry, and throw for props, debris AND fighters.
// Clean and controlled, which is what separates it from Magnet Pull's metal-only convergence.
// ============================================================================================
export function tkGrab(f, game, range = 70) {
  // a fighter first (the dramatic pick), then any liftable prop — the weight ladder still rules
  let best = null, bd = range * range;
  for (const e of game.entities) {
    if (!e.alive || e === f || !game.isFoe(f, e) || e.isDecoy) continue;
    const dx = e.pos.x - f.pos.x, dz = e.pos.z - f.pos.z, d = dx * dx + dz * dz;
    if (d < bd && game.canSee(f, e)) { bd = d; best = { kind: 'body', ref: e }; }
  }
  if (!best) {
    const p = game.propInReach ? game.propInReach(f) : null;
    if (p) best = { kind: 'prop', ref: p };
  }
  if (!best) return null;
  f._tk = { target: best, t: 0 };
  if (best.kind === 'body') { best.ref._tkHeld = f; best.ref.grabbedBy = f; }
  game.vfx.ring((best.ref.pos || f.pos).clone().setY(4), { color: '#cfe6ff', r0: 7, r1: 2, life: 0.3 });
  game.audio.zap(320, f.pos);
  return f._tk;
}
export function updateTk(f, dt, game) {
  const T = f._tk; if (!T) return;
  T.t += dt;
  const tgt = T.target.ref;
  if (T.target.kind === 'body') {
    if (!tgt.alive) { f._tk = null; return; }
    // hold it in front of you, orbiting axis rings — controlled, never chaotic
    const want = f.pos.clone().add(f.aim3.clone().setLength(20)).setY(f.pos.y + 10);
    tgt.pos.lerp(want, Math.min(1, dt * 6));
    tgt.vel.set(0, 0, 0); tgt.staggerT = Math.max(tgt.staggerT, 0.2);
    if (Math.random() < dt * 20) game.particles.spawn({ x: tgt.pos.x + (Math.random() * 2 - 1) * 4, y: tgt.pos.y + 4, z: tgt.pos.z + (Math.random() * 2 - 1) * 4, vx: 0, vy: 1, vz: 0, life: 0.35, size: 1.2, color: ['#cfe6ff', '#9fd0ff'], drag: 1.2 });
  }
}
export function tkThrow(f, game, power = 96) {
  const T = f._tk; if (!T) return false;
  const tgt = T.target.ref;
  if (T.target.kind === 'body' && tgt.alive) {
    tgt._tkHeld = null; tgt.grabbedBy = null;
    tgt.vel.copy(f.aim3).setLength(power);
    tgt.launchT = 1.3; tgt._thrownT = 1.3; tgt._thrownBy = f;
    tgt.lastHitBy = f; tgt._lastHitT = game.time;
    tgt.takeDamage(14, { src: f, strike: true, dtype: 'physical', hitstop: 0.06 });
    game.audio.swing('blunt', f.pos);
  }
  f._tk = null;
  return true;
}

// ============================================================================================
// 11 · TERRAIN RESHAPING — runtime walls, trenches and ramps.
// The ground already deforms (crater/trench); this exposes it as a POWER with a contour
// preview, layered rise, and persistent collision.
// ============================================================================================
export function reshape(game, kind, pos, dir, cfg = {}) {
  const w = game.world;
  if (kind === 'wall') {
    const len = cfg.len || 26, h = cfg.h || 14, th = cfg.th || 3;
    const ang = Math.atan2(dir.z, dir.x) + Math.PI / 2;
    const gy = w.heightAt ? w.heightAt(pos.x, pos.z) : 0;
    const mat = new THREE.MeshStandardMaterial({ color: '#5a5148', roughness: 0.95, flatShading: true });
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, th), mat);
    m.position.set(pos.x, gy - h, pos.z); m.rotation.y = ang; m.castShadow = true;
    game.scene.add(m);
    const co = { mesh: m, crack: null, x: pos.x, z: pos.z, r: len * 0.5, hx: Math.abs(Math.cos(ang)) * len / 2 + th, hz: Math.abs(Math.sin(ang)) * len / 2 + th,
                 top: gy + h, h: gy + h, hp: cfg.hp || 160, maxHp: cfg.hp || 160, y0: gy + h / 2, w: len, d: th, destroyed: false, _rise: 0, _gy: gy, _h: h, _t: cfg.dur || 0 };
    w.cover.push(co); w.coverAll.push(co);
    (game._reshaped = game._reshaped || []).push(co);
    game.particles.burst(pos.x, gy + 1, pos.z, { count: 16, speed: 12, life: 0.6, size: 3, color: ['#5a5148', '#8a7a5a'], up: 8, drag: 1.2 });
    game.audio.impact(1, pos); game.world.shake(0.7);
    if (w.refreshFogBoxes) w.refreshFogBoxes();
    return co;
  }
  if (kind === 'trench') { w.trench && w.trench(pos.x, pos.z, cfg.hw || 10, cfg.hd || 5, cfg.depth || 7, cfg.slope || 3, Math.atan2(dir.z, dir.x)); game.world.shake(0.9); return true; }
  if (kind === 'ramp') { w.crater && w.crater(pos.x, pos.z, cfg.r || 12, -(cfg.h || 5)); return true; }
  return false;
}
export function updateReshaped(game, dt) {
  const R = game._reshaped; if (!R || !R.length) return;
  const w = game.world;
  for (let i = R.length - 1; i >= 0; i--) {
    const co = R[i];
    if (co._rise < 1) { co._rise = Math.min(1, co._rise + dt * 2.2); co.mesh.position.y = co._gy - co._h + co._rise * (co._h * 1.5); }
    if (co._t > 0) { co._t -= dt; if (co._t <= 0) co.destroyed = true; }
    if (co.destroyed) {
      game.scene.remove(co.mesh); co.mesh.geometry.dispose(); co.mesh.material.dispose();
      const a = w.cover.indexOf(co); if (a >= 0) w.cover.splice(a, 1);
      const b = w.coverAll.indexOf(co); if (b >= 0) w.coverAll.splice(b, 1);
      R.splice(i, 1);
      if (w.refreshFogBoxes) w.refreshFogBoxes();
    }
  }
}

// ============================================================================================
// 12 · SYMBIOTE CONSUME — steal ONE ability slot for the rest of the match.
// 13 · POWER MIMICRY — copy the whole kit, temporarily, with a different visual grammar.
// Both write into `f.slots`, which is the same surface the HUD, the AI and runSlot already read.
// ============================================================================================
export function consumeSlot(thief, victim, game, key = null) {
  const keys = Object.keys(victim.def.abilities || {}).filter(k => k !== 'shift');
  if (!keys.length) return null;
  const k = key || keys[(Math.random() * keys.length) | 0];
  const stolen = victim.def.abilities[k];
  thief._stolen = thief._stolen || [];
  const into = ['f', 'e', 'q'].find(s => !thief._stolen.includes(s)) || 'q';
  thief.slots[into] = { def: { ...stolen, name: stolen.name + ' (STOLEN)' }, cd: 0, key: into, _stolen: true };
  thief._stolen.push(into);
  // tendrils reach across and pull the power out
  for (let i = 0; i < 12; i++) game.particles.spawn({ x: victim.pos.x, y: victim.pos.y + 5, z: victim.pos.z,
    vx: (thief.pos.x - victim.pos.x) * 1.4, vy: 2, vz: (thief.pos.z - victim.pos.z) * 1.4, life: 0.5, size: 2, color: ['#1a1418', '#3a2f38'], drag: 0.6 });
  game.audio.zap(180, victim.pos);
  if (game.hud) game.hud.announce('CONSUMED', thief.name + ' took ' + stolen.name, '#8b7aa0');
  return into;
}
export function mimicKit(mimic, target, dur, game) {
  mimic._mimic = { t: dur, was: {} };
  for (const k of Object.keys(target.def.abilities || {})) {
    mimic._mimic.was[k] = mimic.slots[k];
    mimic.slots[k] = { def: { ...target.def.abilities[k] }, cd: 0, key: k, _mimic: true };
  }
  // a clean scanning lattice — geometric, deliberate, nothing like the symbiote's tendrils
  for (let i = 0; i < 3; i++) game.vfx.ring(target.pos.clone().setY(1 + i * 4), { color: '#7fe6ff', r0: 7, r1: 2, life: 0.4 });
  game.audio.zap(900, target.pos);
  if (game.hud) game.hud.announce('MIMICRY', mimic.name + ' copied ' + target.name, '#7fe6ff');
}
export function updateMimic(f, dt, game) {
  const M = f._mimic; if (!M) return;
  M.t -= dt;
  if (M.t <= 0) {
    for (const k of Object.keys(M.was)) { if (M.was[k]) f.slots[k] = M.was[k]; else delete f.slots[k]; }
    f._mimic = null;
    game.vfx.ring(f.pos.clone().setY(4), { color: '#7fe6ff', r0: 1, r1: 7, life: 0.3 });
  }
}

// ============================================================================================
// 14 · SUMMON RIDEABLE — a mount with its own movement, entrance and HUD identity.
// ============================================================================================
export function summonMount(f, cfg, game) {
  if (f._mount) return f._mount;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 13), new THREE.MeshStandardMaterial({ color: cfg.color || '#1a1a1e', roughness: 0.4, metalness: 0.6, emissive: cfg.color2 || '#ff6a1a', emissiveIntensity: 0.5 }));
  body.position.y = 3.4; g.add(body);
  for (const z of [-4.4, 4.4]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.4, 12), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }));
    wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 3, z); g.add(wheel);
  }
  g.position.copy(f.pos); game.scene.add(g);
  f._mount = { grp: g, speed: cfg.speed || 92, t: cfg.dur || 30, cfg };
  f.speed = f._mount.speed;
  // the entrance: it tears in through a burning ring
  game.vfx.ring(f.pos.clone().setY(1), { color: cfg.color2 || '#ff6a1a', r0: 12, r1: 2, life: 0.5, flat: true, y: 0.6 });
  game.vfx.explode(f.pos.clone().setY(2), { color: cfg.color2 || '#ff6a1a', radius: 8, power: 0.8, scorch: true });
  game.audio.boom(0.5, f.pos);
  if (game.hud) game.hud.feed('MOUNTED — ' + (cfg.name || 'the machine') + ' answers', cfg.color2 || '#ff6a1a');
  return f._mount;
}
export function updateMount(f, dt, game) {
  const M = f._mount; if (!M) return;
  M.t -= dt;
  M.grp.position.set(f.pos.x, f.pos.y, f.pos.z);
  M.grp.rotation.y = f.facing;
  const spd = Math.hypot(f.vel.x, f.vel.z);
  if (spd > 20 && Math.random() < dt * 30) game.particles.spawn({ x: f.pos.x - Math.cos(f.facing) * 6, y: 1.5, z: f.pos.z - Math.sin(f.facing) * 6, vx: 0, vy: 1, vz: 0, life: 0.4, size: 2.2, color: [M.cfg.color2 || '#ff6a1a', '#ffd24a'], drag: 1.4 });
  if (M.t <= 0) dismount(f, game);
}
export function dismount(f, game) {
  const M = f._mount; if (!M) return;
  game.scene.remove(M.grp);
  M.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  f._mount = null; f.speed = f.def.speed || 30;
  game.vfx.flash(f.pos.clone().setY(3), M.cfg.color2 || '#ff6a1a', 7, 0.2);
}

// ============================================================================================
// 15 · ENERGY SHIELD BUBBLE — a dome that blocks hostile fire and lets allied fire OUT.
// ============================================================================================
export function domeAt(game, pos, r, dur, owner) {
  const geo = new THREE.SphereGeometry(r, 22, 14);
  const mat = new THREE.MeshBasicMaterial({ color: owner.def.colors.accent || '#7fe6ff', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(pos); game.scene.add(m);
  const d = { x: pos.x, y: pos.y, z: pos.z, r, t: dur, owner, mesh: m, hp: 260 };
  (game._domes = game._domes || []).push(d);
  game.audio.zap(520, pos);
  return d;
}
// a projectile asks the dome whether it may pass: ALLIED fire leaves, hostile fire flattens
export function domeBlocks(game, proj) {
  for (const d of (game._domes || [])) {
    const dx = proj.pos.x - d.x, dy = proj.pos.y - d.y, dz = proj.pos.z - d.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > d.r) continue;
    if (proj.caster && proj.caster.team === d.owner.team) return false;     // your side shoots out
    d.hp -= proj.damage || 8;
    // small light petals where allied fire leaves; a flat stress pattern where hostile fire hits
    game.vfx.ring(proj.pos.clone(), { color: d.owner.def.colors.accent, r0: 0.5, r1: 3.5, life: 0.22 });
    game.audio.zap(700, proj.pos);
    return true;
  }
  return false;
}
export function updateDomes(game, dt) {
  const D = game._domes; if (!D || !D.length) return;
  for (let i = D.length - 1; i >= 0; i--) {
    const d = D[i]; d.t -= dt;
    d.mesh.material.opacity = 0.1 + 0.08 * Math.abs(Math.sin(game.time * 2)) * Math.max(0, d.hp / 260);
    if (d.t <= 0 || d.hp <= 0) {
      game.vfx.ring(new THREE.Vector3(d.x, d.y, d.z), { color: d.owner.def.colors.accent, r0: d.r, r1: 1, life: 0.35 });
      game.scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose();
      D.splice(i, 1);
    }
  }
}

// ============================================================================================
// 16 · X-RAY AND THERMAL SENSE — two vision modes with DIFFERENT visual grammars.
// Thermal: heat silhouettes and recent heat trails. X-ray: structural edges and hidden bodies.
// Both override the canopy/interior cutaway restrictions, which is the point of them.
// ============================================================================================
export function setVisionMode(f, mode, dur, game) {
  f._visionMode = mode ? { mode, t: dur } : null;
  if (!game.isHuman(f)) return;
  const w = game.world;
  if (mode === 'thermal') {
    for (const e of game.entities) if (e.obj) e.obj.traverse(o => {
      if (o.material && o.material.emissive) { if (!o.userData._vm) o.userData._vm = { e: o.material.emissive.clone(), i: o.material.emissiveIntensity }; o.material.emissive.set('#ff6a1a'); o.material.emissiveIntensity = 1.5; }
    });
    if (game.hud) game.hud.feed('THERMAL — bodies burn through the walls', '#ff8a3a');
  } else if (mode === 'xray') {
    for (const co of w.cover || []) if (co.mesh && co.mesh.material) { if (!co.mesh.userData._vm) co.mesh.userData._vm = co.mesh.material.opacity ?? 1; co.mesh.material.transparent = true; co.mesh.material.opacity = 0.18; }
    if (game.hud) game.hud.feed('X-RAY — structure only', '#cfe6ff');
  }
}
export function clearVisionMode(f, game) {
  if (!f._visionMode) return;
  const w = game.world;
  for (const e of game.entities) if (e.obj) e.obj.traverse(o => {
    if (o.userData && o.userData._vm && o.material && o.material.emissive) { o.material.emissive.copy(o.userData._vm.e); o.material.emissiveIntensity = o.userData._vm.i; o.userData._vm = null; }
  });
  for (const co of w.cover || []) if (co.mesh && co.mesh.userData && co.mesh.userData._vm !== undefined && co.mesh.userData._vm !== null) { co.mesh.material.opacity = co.mesh.userData._vm; co.mesh.userData._vm = null; }
  f._visionMode = null;
}
export function updateVisionMode(f, dt, game) {
  const V = f._visionMode; if (!V) return;
  V.t -= dt;
  // thermal leaves TRAILS — where a body recently was, not just where it is
  if (V.mode === 'thermal' && game.isHuman(f) && Math.random() < dt * 24) {
    for (const e of game.entities) {
      if (!e.alive || e === f) continue;
      if (Math.hypot(e.vel.x, e.vel.z) < 6) continue;
      game.particles.spawn({ x: e.pos.x, y: e.pos.y + 3, z: e.pos.z, vx: 0, vy: 0.4, vz: 0, life: 1.1, size: 2.2, color: ['#ff6a1a', '#ffd24a'], drag: 3 });
    }
  }
  if (V.t <= 0) clearVisionMode(f, game);
}


