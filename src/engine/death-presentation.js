import * as T from 'three';

// ── THE DEATH & REACTION RESOLVER ────────────────────────────────────────────
// Consumes the merged Mac Asset Lab registry (Mission A):
//   public/models/modular-hero/death-reaction-registry.json
// The registry is the SINGLE SOURCE OF TRUTH. Nothing here hard-codes a clip per
// context — the flow is: lethal damage → compatible context → an ACCEPTED authored
// slot → one-shot on the actual modular actor → hold physics through the clip →
// at clip-complete hand off to the RIGID authored-rest ragdoll (holds the settled
// pose, gravity-settles, sleeps — it cannot spin). Only slots whose status is not
// 'awaiting-source' are ever chosen; awaiting-source directions (left/right, prone,
// crouched, rear-knockdown, staggers) fall back to the nearest BUILT slot or to the
// physics ragdoll — never a mirrored or improvised clip. Every fallback is logged.
let DEATH_SLOTS = null, HANDOFF = null, DEATH_CLIPS = null, registryPromise = null;
const notedFallback = new Set();
function noteFallback(reason) {
  if (notedFallback.has(reason)) return;              // once per distinct reason — never a 60Hz spam
  notedFallback.add(reason);
  if (typeof console !== 'undefined') console.info('[death-reaction] fallback → physics ragdoll:', reason);
}

// Loaded once (fetch is a few KB). Kicked at import = boot, so the first KO already
// has the table; until it lands, beginDeathPresentation returns false (safe fallback).
export function loadDeathRegistry(fetchImpl = (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null)) {
  if (DEATH_SLOTS && DEATH_CLIPS) return Promise.resolve(DEATH_SLOTS);
  if (!fetchImpl) return Promise.resolve(null);
  return registryPromise ??= fetchImpl('/models/modular-hero/death-reaction-registry.json')
    .then(r => { if (!r.ok) throw Error('death registry unavailable'); return r.json(); })
    .then(async reg => {
      HANDOFF = reg.handoffDefaults || { blendMs: 120, maxAngularVelocityRadS: 6, settledLinearDamping: 0.92, settledAngularDamping: 0.95 };
      DEATH_SLOTS = {};
      for (const s of reg.slots || []) if (s.status !== 'awaiting-source') DEATH_SLOTS[s.slot] = s;
      // Some accepted UAL clips (e.g. Death02, the rear death) are NOT baked into
      // modular-hero.glb — they live in the motion bank. Parse the ones the accepted
      // slots reference, ONCE (AnimationClip source is immutable, shared across actors).
      DEATH_CLIPS = new Map();
      const warNeeds = new Set(Object.values(DEATH_SLOTS).filter(s => s.bank === 'warworld-motion-bank.json').map(s => s.bankId));
      if (warNeeds.size) {
        try {
          const bank = await fetchImpl('/models/modular-hero/warworld-motion-bank.json').then(r => { if (!r.ok) throw Error('war motion bank unavailable'); return r.json(); });
          for (const e of bank.entries || []) if (warNeeds.has(e.id) && !DEATH_CLIPS.has(e.take)) DEATH_CLIPS.set(e.take, T.AnimationClip.parse(e.clip));
        } catch (e) { noteFallback('war motion bank load failed: ' + e.message); }
      }
      return DEATH_SLOTS;
    })
    .catch(e => { registryPromise = null; noteFallback('registry load failed: ' + e.message); return null; });
}
loadDeathRegistry();

// Copy the accepted death clips onto a modular actor's clip map (idempotent). The
// paid get-ups arrive via modular-character's own paid-bank attach; these are the
// UAL death/knockdown/airborne clips the GLB does not carry.
export function attachDeathClips(c) {
  if (!c || !DEATH_CLIPS) return 0;
  let n = 0;
  for (const [take, clip] of DEATH_CLIPS) if (!c.clips.has(take)) { c.clips.set(take, clip); n++; }
  return n;
}

export function deathReactionReady() { return !!(DEATH_SLOTS && DEATH_CLIPS); }
export function deathHandoffDefaults() { return HANDOFF; }
const slot = id => (DEATH_SLOTS && DEATH_SLOTS[id]) || null;
const clipReady = (f, take) => !!(take && f._modularCharacter?.clips.get(take));

// front vs rear from the KILLING blow relative to the victim's facing. Forward is
// (sin,cos) of facing — the same convention nanite-pose.js uses for "in front".
export function deathDirection(f) {
  const a = f.lastHitBy;
  if (!a || !a.pos) return 'front';
  const dx = a.pos.x - f.pos.x, dz = a.pos.z - f.pos.z;
  return (dx * Math.sin(f.facing) + dz * Math.cos(f.facing)) >= 0 ? 'front' : 'rear';
}

// The context → accepted-slot decision. Never mirrors; an unbuilt direction falls
// back to the nearest built slot (front) with a logged reason, else null (ragdoll).
function chooseDeathSlot(f, { airborne, cause }) {
  if (!DEATH_SLOTS) return null;
  if (airborne) {
    const s = slot('death.airborne.fall');
    if (s && clipReady(f, s.take)) return s;
    noteFallback('airborne fall clip not on actor'); return null;
  }
  if (cause === 'bleed' || cause === 'dot') {          // registry: collapse.weakened is BLEED-OUT only, never a gunshot read
    const s = slot('collapse.weakened');
    if (s && clipReady(f, s.take)) return s;
  }
  const dir = deathDirection(f);
  let s = dir === 'rear' ? slot('death.impact-rear.a') : slot('death.impact-front.a');
  if (s && clipReady(f, s.take)) return s;
  s = slot('death.impact-front.a');                    // rear unavailable → the nearest BUILT slot, not a mirror
  if (s && clipReady(f, s.take)) { noteFallback('rear death slot unavailable; used front'); return s; }
  noteFallback('no accepted grounded death clip on actor');
  return null;
}

// LETHAL DAMAGE HOOK. Returns true when it has taken over presentation (physics/
// ragdoll deferred to the clip-complete handoff); false = the caller ragdolls now.
export function beginDeathPresentation(f, { airborne = false } = {}) {
  const c = f._modularCharacter;
  if (!c) return false;                                                                 // only modular-bodied actors carry the clips
  if (!(f.def.highwallBiological === true || f.def.model?.equipment === 'soldier')) return false;
  if (!DEATH_SLOTS) { noteFallback('registry not loaded yet'); return false; }
  const speed = Math.hypot(f.vel.x, f.vel.y, f.vel.z);
  if (!airborne && speed > 28) { noteFallback('killing impulse too high for a settled death'); return false; }   // a launched body TUMBLES — full ragdoll
  const s = chooseDeathSlot(f, { airborne, cause: f._lastHitKind === 'dot' ? 'dot' : null });
  if (!s) return false;
  const clip = c.clips.get(s.take);
  // The body is committing to the authored death; the fatal blow's own launch is
  // spent. A LATER hit re-arms launchT and correctly abandons to a physics ragdoll.
  f.launchT = 0;
  f._deathPresentation = {
    slot: s.slot, take: s.take, source: s.bank, elapsed: 0, duration: clip.duration,
    airborne: !!airborne, phase: airborne ? 'fall' : 'grounded',
    finalOrientation: s.finalOrientation || 'face-up',
    handoff: s.ragdollHandoff || HANDOFF,
    origin: new T.Vector3().copy(f.pos),
  };
  return true;
}

// Pure poser — samples the current chain take on the actor. Used by the ko tick and
// by modular-character.update() (which skips the rest of its pose while this owns it).
export function sampleDeathPresentation(f) {
  const s = f._deathPresentation, c = f._modularCharacter;
  if (!s || !c) return false;
  c.pose(s.take, Math.min(1, s.elapsed / Math.max(0.001, s.duration)));
  c.actor.updateWorldMatrix(true, true);
  return true;
}

// Advances the presentation one step and poses the actor. Returns:
//   'play'    — still presenting; the caller holds the frame (no physics/ragdoll)
//   'handoff' — clip chain complete; the caller builds the authored-rest ragdoll
//   'abandon' — displaced/struck mid-clip; the caller builds a full physics ragdoll
export function advanceDeathPresentation(f, dt, game) {
  const s = f._deathPresentation, c = f._modularCharacter;
  if (!s || !c) return 'handoff';
  const step = Math.min(dt, 0.05);

  if (s.airborne) {
    const gy = game?.world?.heightAt?.(f.pos.x, f.pos.z) ?? f.groundY ?? 0;
    if (s.phase !== 'impact') {
      // Simulation owns the descent (rootMotionPolicy: in-place). The fall/loop
      // plays while airborne; the impact clip plays on ground contact.
      f.vel.y = (f.vel.y || 0) - 62 * step;
      f.pos.y = Math.max(gy, f.pos.y + f.vel.y * step);
      if (f.obj) f.obj.position.copy(f.pos);
      s.elapsed += step;
      if (s.phase === 'fall' && s.elapsed >= s.duration) {
        const loop = slot('death.airborne.fall.loop');
        if (loop && clipReady(f, loop.take)) { s.phase = 'loop'; s.take = loop.take; s.duration = c.clips.get(loop.take).duration; s.elapsed = 0; }
        else { s.phase = 'loop-hold'; s.elapsed = s.duration; }        // no loop clip → hold the fall's last frame
      } else if (s.phase === 'loop' && s.elapsed >= s.duration) s.elapsed = 0;   // loop while falling
      if (f.pos.y <= gy + 0.4) {                                       // ground contact
        const imp = slot('death.airborne.impact');
        if (imp && clipReady(f, imp.take)) { s.phase = 'impact'; s.take = imp.take; s.duration = c.clips.get(imp.take).duration; s.elapsed = 0; f.pos.y = gy; f.vel.y = 0; if (f.obj) f.obj.position.copy(f.pos); }
        else return 'handoff';                                         // no impact clip → hand off at contact
      }
      sampleDeathPresentation(f);
      return 'play';
    }
    s.elapsed = Math.min(s.duration, s.elapsed + step);
    sampleDeathPresentation(f);
    return s.elapsed >= s.duration ? 'handoff' : 'play';
  }

  // Grounded: the body is still. A fresh knockback/launch or displacement means an
  // external force took over — abandon the authored pose to a full physics ragdoll.
  if (f.launchT > 0 || Math.hypot(f.vel.x, f.vel.y, f.vel.z) > 4 || f.pos.distanceTo(s.origin) > 6) return 'abandon';
  s.elapsed = Math.min(s.duration, s.elapsed + step);
  sampleDeathPresentation(f);
  return s.elapsed >= s.duration ? 'handoff' : 'play';
}

// The accepted GET-UP take for the nonlethal knockdown reaction, by the body's
// resting orientation. Falls back to the shipped Impact_Getup when a paid getup is
// not yet attached — the reaction path always returns control.
export function getupTake(f, orientation) {
  const c = f._modularCharacter;
  if (!c) return null;
  const id = orientation === 'prone' ? 'getup.from-prone' : 'getup.from-supine';
  const s = slot(id);
  if (s && c.clips.get(s.take)) return s.take;
  return c.clips.get('Impact_Getup') ? 'Impact_Getup' : null;
}

export function deathPoseJoints(f) {
  const c = f._modularCharacter; if (!c) return null;
  const names = { head: 'head', chest: 'spine.003', pelvis: 'hips', shL: 'upper_arm.R', shR: 'upper_arm.L', elL: 'forearm.R', elR: 'forearm.L', haL: 'hand.R', haR: 'hand.L', hiL: 'thigh.R', hiR: 'thigh.L', kneeL: 'shin.R', kneeR: 'shin.L', ftL: 'foot.R', ftR: 'foot.L' };
  const out = {}; for (const [key, name] of Object.entries(names)) { const bone = c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-' + name)); if (!bone) return null; out[key] = bone.getWorldPosition(new T.Vector3()); } return out;
}
// Align the hidden native contact meshes before capturing ragdoll local offsets.
// Captured source points alone cannot describe a prone body's mesh baseline.
export function seedDeathContactMeshes(f, j) {
  const p = f.parts, restore = [], up = new T.Vector3(0, 1, 0);
  const put = (mesh, pos, q) => { if (!mesh) return; restore.push({ node: mesh, position: mesh.position.clone(), quaternion: mesh.quaternion.clone() }); mesh.position.copy(pos); if (mesh.parent) mesh.parent.worldToLocal(mesh.position); const parent = mesh.parent?.getWorldQuaternion(new T.Quaternion()).invert(); mesh.quaternion.copy(q); if (parent) mesh.quaternion.premultiply(parent); mesh.updateWorldMatrix(false, true); };
  const direction = (a, b) => new T.Quaternion().setFromUnitVectors(up, new T.Vector3().subVectors(a, b).normalize());
  const torsoQ = direction(j.chest, j.pelvis); put(p.torso, j.chest, torsoQ); put(p.pelvis, j.pelvis, torsoQ); put(p.head, j.head, torsoQ);
  for (const side of ['L', 'R']) {
    const a = p['arm' + side], leg = p['leg' + side].userData; const mid = (a, b) => a.clone().lerp(b, .5);
    put(a.children[0], mid(j['sh' + side], j['el' + side]), direction(j['sh' + side], j['el' + side])); put(a.children[1], mid(j['el' + side], j['ha' + side]), direction(j['el' + side], j['ha' + side])); put(a.children[2], j['ha' + side], torsoQ);
    put(leg.thigh, mid(j['hi' + side], j['knee' + side]), direction(j['hi' + side], j['knee' + side])); put(leg.shin, mid(j['knee' + side], j['ft' + side]), direction(j['knee' + side], j['ft' + side])); put(leg.boot, j['ft' + side], torsoQ); put(leg.kneeCap, j['knee' + side], torsoQ);
  }
  return restore;
}
