// THE ABILITY PROVING GROUND — fire all 364 slots, prove each one DID something, and pose a frame.
//
// Robert, 2026-07-27: "100% of the powers and abilities need to be tested for looks and
// functionality, the screenshots can be kept and used in manual."
//
// ⚠ THERE WAS NO COMMITTED BATTERY. CLAUDE.md cites "52 heroes × 364 slots fired, 0 console errors"
// in several places, but that was an ad-hoc check typed into a console during a session and thrown
// away — `src/bench/powerworld.js` only ever fires `lmb`, twice, for two specific assertions. A
// number quoted in a doc that no committed test reproduces is a rumour, so this is the harness.
//
// ⚠ NOTHING HERE IS AUTHORED PER ABILITY, AND THAT IS THE WHOLE DESIGN. Driving 364 powers by hand
// would be 364 chances to write a test that agrees with the bug. Instead:
//   · HOW to fire each one comes from `TYPE_META` (engine/abilityMeta.js), which already declares
//     `hold` and `holdT` per TYPE — the same table the roster validator uses.
//   · WHEN to photograph it comes from `TYPE_META.family`, ~14 families, not 364 rows.
//   · WHETHER it worked is a generic before/after diff of the engine's own collections, so an
//     ability type invented tomorrow is covered the day it is added to the roster.
// That means a new power is tested and photographed for free, which is the only version of this
// that stays true.
//
// Entry points (exposed as LSW.abilityList / LSW.stageAbility / LSW.abilitySuite in boot.js):
//   abilityList()                       → every {heroId, slot, type, …} in the roster
//   stageAbility(game, hud, id, slot)   → set up, fire, step to the photogenic moment, FREEZE
//   abilitySuite(game, hud, opts)       → fire everything, return the pass/fail report
import { ROSTER } from '../data/characters.js';
import { TYPE_META } from '../engine/abilityMeta.js';
import { runSlot } from '../engine/abilities.js';

const DT = 1 / 60;
// ⚠ SEVEN SLOTS, NOT SIX. `SLOT_ORDER` in data/characters.js includes `shift` (the kit's movement
// slot) and the first version of this file omitted it — so the sweep reported 312 abilities against
// the 364 the project has always quoted. 52 × 7 = 364, and the 52 missing were one per fighter.
export const SLOT_KEYS = ['lmb', 'rmb', 'shift', 'q', 'e', 'f', 'r'];

// WHEN TO TAKE THE PICTURE, per FAMILY — because a good photograph of a beam and a good photograph
// of a punch are at different moments, and there are ~14 families against 364 abilities.
// `during` means capture while the button is still HELD: a sustained power looks like nothing at
// all once released, so photographing a beam after release yields an empty desert.
const SHOT = {
  // ⚠ A SWING IS NOT INSTANT. At 0.10s the run ended six frames in — before start-up, before the
  // lunge carried the fighter into range, before the active frames. Every melee ability in the game
  // reported itself inert while working perfectly. Long enough to start up, travel and land.
  strike:    { after: 0.55 },
  // ⚠ LONG ENOUGH FOR THE ROUND TO ARRIVE. At 0.30s a projectile fired at a target 30u away was
  // still in the air when the measurement stopped, so a working power reported nothing.
  shot:      { after: 0.60 },
  // ⚠ SUSTAINED FAMILIES NEED A LONG TAIL, and it is not decoration. Several "beams" in this roster
  // CHARGE first and only spawn on release, so the run has to keep stepping long enough for the
  // head to travel the 30u to the target and start ticking. At the old 0.3s default a working
  // beam reported itself inert — the harness was hanging up before the shot arrived.
  beam:      { during: true, at: 0.75, after: 1.30 },
  cone:      { during: true, at: 0.45, after: 0.80 },
  charge:    { during: true, at: 0.95, after: 1.00 },   // the orb at its biggest, then the flight
  nova:      { after: 0.30 },              // the shockwave expanding
  summon:    { after: 0.55 },              // the construct has arrived and settled
  movement:  { after: 0.22 },
  buff:      { after: 0.40 },              // the aura is up
  defense:   { after: 0.40 },
  grapple:   { after: 0.35 },
  trap:      { after: 0.40 },
  control:   { after: 0.40 },
  utility:   { after: 0.30 },
  transform: { after: 0.55 },
  world:     { after: 0.60 },              // weather/gravity/timefield need a beat to read
  _default:  { after: 0.35 },
};
// ⚠ A FEW TYPES NEED MORE THAN THEIR FAMILY GIVES THEM, and each of these was found by a whole
// TYPE failing at once — which is the tell that it is the staging and not the game. Twenty-eight
// broken buffs is not plausible; one wrong field name is.
//   · meteor — the shells spawn at y=90 and fall at 60 u/s, staggered `interval` apart, so a nine
//     shell barrage is airborne for about three seconds. Measured for 0.30s it looked inert.
//   · rush   — a charging attack needs RUNWAY. Staged at a punch's 7u it has nowhere to charge.
const TYPE_SHOT = { meteor: { after: 3.0 }, rush: { after: 0.9 }, mine: { after: 1.2 }, tentacle: { after: 1.0 } };
const TYPE_DIST = { rush: 34, meteor: 30, tentacle: 22, mine: 12, lifedrain: 18 };
const shotFor = (family, type) => TYPE_SHOT[type] || SHOT[family] || SHOT._default;

// ⚠ SOME POWERS ARE RIGHT TO REFUSE IN AN EMPTY DESERT, and calling that a defect would train
// everyone to ignore the report. KNIGHTFALL's Grapnel Line answers "No anchor — aim the line at a
// building face" because this proving ground is open ground with nothing to grapple; a portal needs
// a surface, and mind control needs a mind. These are graded SEPARATELY as NEEDS-CONTEXT, which is
// an honest verdict rather than a pass or a failure — and it names exactly what the arena owes them.
const CONTEXTUAL = {
  grapple: 'needs a wall or building face to anchor to',
  portal: 'needs a surface to place a door on',
  mindcontrol: 'needs a living mind in range — a sim construct is not one',
  possess: 'needs a living target',
  telekinesis: 'needs a loose object in reach',
  consume: 'needs a valid target to consume',
  banish: 'needs a living target',
  quiver: 'changes what is nocked — the effect only shows on the NEXT shot',
};

/** Every ability in the game, as flat rows. The list IS the test plan. */
export function abilityList(roster = ROSTER) {
  const out = [];
  for (const d of roster) {
    for (const k of SLOT_KEYS) {
      const a = d.abilities && d.abilities[k];
      if (!a) continue;
      const meta = TYPE_META[a.type] || null;
      out.push({
        heroId: d.id, heroName: d.name, slot: k,
        type: a.type, name: a.name || k,
        family: meta ? meta.family : 'unknown',
        hold: !!(meta && meta.hold),
        holdT: meta && meta.holdT ? meta.holdT[1] : 0,
        knownType: !!meta,
      });
    }
  }
  return out;
}

/** How many things are in it — array, Map/Set, or plain object. Always a number, never undefined. */
function size(v) {
  if (!v) return 0;
  if (Array.isArray(v)) return v.length;
  if (typeof v.size === 'number') return v.size;
  if (typeof v.length === 'number') return v.length;
  return Object.keys(v).length;
}

/** The engine's own collections — what "something happened" is measured against. */
function snapshot(game) {
  const p = game.player;
  // ⚠ every field must be a NUMBER. One undefined anywhere in here turned the whole `spawns` sum
  // into NaN, and `NaN > 0` is false — so the spawn evidence silently never fired for anything.
  const n = (v) => (Number.isFinite(v) ? v : 0);
  return {
    // ⚠ `size()` not `.length`. `game._timers` is an OBJECT, not an array, so `.length` was
    // `undefined` — and one undefined poisoned the whole `spawns` sum into NaN. Since `NaN > 0` is
    // false, the "spawned" evidence could never fire for ANYTHING, which failed every ability whose
    // only observable is that it puts something in the world: every construct, summon, mine and
    // portal in the roster. A silent NaN is the worst kind of bug in a test — it does not throw,
    // it just quietly answers "no" forever.
    proj: size(game.projectiles && game.projectiles.list),
    ents: size(game.entities),
    minions: size(game.minions),
    constructs: size(game.constructs),
    mines: size(p && Object.values(p.slots).flatMap(s => s.list || [])),
    portals: size(game.portals),
    flung: size(game._flung),
    smoke: size(game._smoke),
    timers: size(game._timers),
    sceneKids: game.world && game.world.scene ? game.world.scene.children.length : 0,
    // the caster's own state — a movement or buff power may add nothing to any list
    px: n(p && p.pos.x), py: n(p && p.pos.y), pz: n(p && p.pos.z),
    ki: n(p && p.ki),
    flying: !!(p && p.flying),
    // self-state powers change WHAT YOU ARE rather than adding anything to the world — intangible,
    // hidden, guarding. Without these their only observable is invisible and they read as inert.
    phase: !!(p && p.phase),
    quiver: n(p && p._quiverIdx),
    invisible: !!(p && (p.invisible || p._invisT > 0)),
    invuln: n(p && p.invuln),
    // ⚠ `buffT` AND `powerBuff` — the real field names. This read `powerBuffT || _buffT`, and
    // NEITHER EXISTS on a Fighter: `abilities.js` sets `c.powerBuff` and `c.buffT`. Both reads
    // compiled, ran, and returned undefined forever, so a buff's only observable was invisible and
    // 28 working buffs across the roster reported themselves inert. The exact shape of the bug the
    // project already documented once as "the identity field is `co`, not `country`".
    buffT: n(p && p.buffT),
    powerBuff: n(p && p.powerBuff),
    // several buffs raise a defensive pool or a shield rather than a damage multiplier
    shield: n(p && p._shieldHp),
    scale: p && p.obj ? n(p.obj.scale.x) : 1,
  };
}

// clearTransients retires zones and timers; match reset separately retires these
// combat collections. Each measurement needs the same isolation as a fresh match.
function clearCombat(game) {
  game.clearTransients();
  for (const list of [game.projectiles.list, game.minions, game.constructs]) {
    for (const item of list) item._dispose?.(game);
    list.length = 0;
  }
  while (game.portals.length) game._closePair(game.portals[0]);
}

/**
 * Put ONE ability on screen and prove it did something.
 * Leaves the sim FROZEN on the photogenic frame so a driver can screenshot it, unless
 * `opts.resume` is true.
 */
export function stageAbility(game, hud, heroId, slot, opts = {}) {
  const errors = [];
  const onErr = (e) => errors.push(String((e && e.message) || e));

  // ==============================================================================================
  // ⚠ TAKE THE CLOCK AND THE CONTROLLER, OR THE PAGE FIGHTS THE TEST — and this was the single
  // biggest lie in the first full sweep, which came back 46% and was almost entirely harness.
  //
  // Two things run underneath a test that does not do this, and both are invisible:
  //   1. boot.js's rAF loop calls `game.update(dt)` UNCONDITIONALLY — it is not gated on
  //      `game.running`. So the world advanced by real time in between every hand-stepped frame,
  //      and nothing in the report could tell that apart from the ability's own doing.
  //   2. `controlPlayer` runs inside that update and REWRITES `aim`/`aim3` FROM THE MOUSE every
  //      frame — after the test sets the aim and before the ability reads it. CLAUDE.md documents
  //      this exact trap (the clinch suite lost four attempts to it) and names the fix.
  // The evidence was unmistakable once looked at: SOL's Heat Ray passed with 10 damage when run on
  // its own and failed as "never billed the player" as the first row of the sweep. Same ability,
  // same code, different neighbours.
  //
  // So the harness owns both: `game.update` is replaced with a no-op that the rAF loop harmlessly
  // calls, and the real one is invoked by hand; `controlPlayer` is stubbed to the documented
  // override. Both are restored in the `finally` below, always, even if an ability throws.
  // ==============================================================================================
  const realUpdate = game.update.bind(game);
  const prevControl = game.controlPlayer;
  const prevRunning = game.running;
  const prevBot = game.controlBot;
  const contextCover = { x: 24, z: 0, hx: 3, hz: 12, r: 12, h: 24, top: 24 };
  game.update = () => {};                 // the page's frame loop now advances nothing
  game.controlPlayer = () => {};          // the mouse no longer rewrites the aim mid-test
  game.controlBot = function (f, dt) { if (!f._abilityFixture) prevBot.call(this, f, dt); };
  try {
    return _stage(game, hud, heroId, slot, { ...opts, contextCover }, errors, onErr, realUpdate);
  } finally {
    game.update = realUpdate;
    game.controlPlayer = prevControl;
    game.running = prevRunning;
    game.controlBot = prevBot;
    const i = game.world.cover.indexOf(contextCover);
    if (i >= 0) game.world.cover.splice(i, 1);
  }
}

function _stage(game, hud, heroId, slot, opts, errors, onErr, realUpdate) {

  // ---- a clean board every time. `clearTransients` is the ONE place that empties it (the reset
  // law) — anything a previous ability left behind would otherwise be counted as this one's work.
  clearCombat(game);
  game.setPlayerChar(heroId);
  const p = game.player;
  if (!p) return { heroId, slot, ok: false, why: 'no player after setPlayerChar', errors };

  const ab = p.def.abilities && p.def.abilities[slot];
  if (!ab) return { heroId, slot, ok: false, why: 'no such slot', errors };
  const meta = TYPE_META[ab.type] || null;

  // ⚠ STAND THE TARGET WHERE THE ABILITY CAN ACTUALLY REACH IT. The first version parked the dummy
  // at a flat 34u for everything, so every melee ability in the game reported "EXECUTED BUT INERT"
  // — a punch with ~11u of reach swinging at a target three body-lengths past it. The harness was
  // wrong, not the game, and a suite that fails 60 working abilities is worse than no suite: it
  // trains you to ignore red. The ability's own numbers decide the range, never a constant.
  // ⚠ DERIVE IT FROM THE FAMILY, NOT FROM `ab.range`. Reading the ability's own range looked more
  // principled and was worse: a 145u beam put the dummy 60u downrange, past the point most rounds
  // survive to, and abilities that had just passed started reporting inert. A ranged power only has
  // to be given somewhere it can plausibly reach — 30u — while a punch needs the target inside its
  // fist. The families are ~14 rows; the ranges are 364 different opinions.
  const famFor = meta ? meta.family : '_default';
  const REACH = { strike: 7, grapple: 12, cone: 18, trap: 14, control: 20, movement: 26 };
  const targetDist = opts.dist ?? TYPE_DIST[ab.type] ??
    (ab.reach ? Math.max(4, ab.reach * 0.75) : (REACH[famFor] || 30));

  // stand the caster still at the origin, facing +x, with a dummy downrange to actually hit
  p.pos.set(-targetDist / 2, 0, 0);
  p.vel.set(0, 0, 0);
  p.aim.set(1, 0, 0); p.aim3.set(1, 0, 0);
  game.aimPoint.set(targetDist / 2, 0, 0);
  p.facing = 0;
  p.staggerT = 0; p.frozenT = 0; p.stunT = 0; p.downedT = 0;
  // ⚠ ONE TARGET, NOT A CROWD. Each call used to spawn another dummy and never remove the last, so
  // after twenty abilities there was a cluster of them — and a punch would land on whichever was
  // nearest while the report measured the health of the one this call created. Melee therefore read
  // as inert across most of the roster. Sweep the old ones first; the newest is the only target.
  for (let i = game.entities.length - 1; i >= 0; i--) {
    const e = game.entities[i];
    if (e && (e.isDummy || e._abilityFixture)) { try { e.dispose && e.dispose(); } catch (err) {} game.scene.remove(e.obj); game.entities.splice(i, 1); }
  }
  const dummy = ab.type === 'mindcontrol' ? game.spawnRival('sol') : game.spawnDummy(targetDist / 2, 0);
  if (ab.type === 'mindcontrol') dummy._abilityFixture = true;
  if (ab.type === 'grapple' && !ab.reel) game.world.cover.push(opts.contextCover);
  if (dummy) { dummy.hp = dummy.maxHp; dummy.invuln = 0; }

  // ⚠ THE COST MUST NOT DECIDE THE TEST. An ability that is merely UNAFFORDABLE fails silently via
  // game.onNoKi and would read exactly like an ability that is broken. Ki is topped up before the
  // press and on every held frame, so what is being measured is the ability, not the wallet.
  const topUp = () => { p.ki = p.maxKi; if (p.slots[slot]) p.slots[slot].cd = 0; };

  const fam = meta ? meta.family : '_default';
  const shot = shotFor(fam, ab.type);
  // ⚠ HOLD FOR AS LONG AS THE ABILITY ITSELF ASKS. `TYPE_META.holdT` is a generic per-TYPE hint
  // (1.9s for a charge), but individual abilities author their own `maxCharge` — and the six charges
  // and three beams that failed the sweep all declare 2.2–2.4s. The generic hold was letting go
  // before they were ready, so they never fired and never billed. The ability's own number wins,
  // plus a beat to cover the release.
  const holdFor = meta && meta.hold
    ? Math.max(meta.holdT ? meta.holdT[1] : 1.0, (ab.maxCharge || 0) + 0.35)
    : 0;
  let fired = false;

  // ==============================================================================================
  // ⚠ TWO DIFFERENT QUESTIONS, AND CONFLATING THEM IS WHAT MADE THE FIRST TWO VERSIONS LIE.
  //
  //   DID THE SLOT EXECUTE?  — ki was spent, or a cooldown was set. Only `runSlot` does either.
  //   DID ANYTHING HAPPEN?   — a projectile exists, the dummy lost health, the caster is flying.
  //
  // They are not the same, and the calibration proved it the hard way: an ability whose `type` the
  // engine does not implement STILL PASSES the first test. `runSlot` pays the cost and stamps the
  // cooldown before it dispatches, so a bogus type bills you, goes on cooldown, and does nothing.
  // (That is a real engine finding, not just a harness one — it is exactly the "silent dead slot"
  // the roster validator exists to catch, and it is why that validator has to keep existing.)
  //
  // So: EXECUTION is necessary but never sufficient. A row is only OK when the slot executed AND
  // at least one thing exists in the world that did not exist before.
  //
  // ⚠ AND THE OBSERVABLES ARE DELIBERATELY DISCRETE. An earlier version diffed loose quantities —
  // the caster's position and the scene's child count — and a deliberately inert buff PASSED on
  // "moved" and "state". Neither was its doing: a fighter settles under gravity whatever you press,
  // and particles come and go on their own. Anything a do-nothing frame can produce is not
  // evidence. Position now has to move SIX UNITS to count, which is a teleport or a dash and not a
  // fighter settling onto the floor.
  // ==============================================================================================
  const runOnce = (doFire, photo) => {
    // the same starting conditions every time, so two rows of the report mean the same thing
    p.pos.set(-targetDist / 2, 0, 0);
    p.vel.set(0, 0, 0);
    p.aim.set(1, 0, 0); p.aim3.set(1, 0, 0);
    p.facing = 0;
    p.staggerT = 0; p.frozenT = 0; p.stunT = 0; p.downedT = 0;
    if (dummy) { dummy.hp = dummy.maxHp; dummy.invuln = 0; dummy.pos.set(targetDist / 2, 0, 0); }
    topUp();

    const before = snapshot(game);
    let peak = { ...before };
    let context = null;
    const observe = () => {
      const s = snapshot(game);
      for (const k of Object.keys(s)) peak[k] = Math.max(peak[k], s[k]);
    };
    // ⚠ A STATEFUL ABILITY MUST BE TICKED EVERY FRAME, NOT JUST PRESSED. Several handlers are
    // little state machines that advance on the intent they are fed — `melee` counts `st.t` down
    // and tests `coneFoe` each frame it is alive, `rush` carries the fighter through its charge,
    // and `meteor` drops one shell per `st.timer` expiry until `st.count` runs out. In the real
    // game `controlPlayer` calls `runSlot` EVERY frame with a neutral intent, so those machines
    // keep running. This harness only called it on press, hold and release — so the machine was
    // started and then never advanced, and three whole ability TYPES reported themselves inert
    // while working perfectly. Feed the neutral intent, exactly as the player's controller does.
    const step = (feedNeutral = true) => {
      if (doFire && feedNeutral) { try { runSlot(p, slot, { pressed: false, held: false, released: false, dt: DT }, game); } catch (e) { onErr(e); } }
      try { realUpdate(DT); } catch (e) { onErr(e); }   // the REAL update — game.update is a no-op now
      observe();
    };
    const press = (o) => {
      if (!doFire) return;
      try { runSlot(p, slot, o, game); fired = true; } catch (e) { onErr(e); }
      observe(); // a construct may trigger/dismiss before the first world tick
    };
    const finish = () => {
      const after = snapshot(game);
      const top = (k) => Math.max(after[k], peak[k]);
      return {
        spawns: top('proj') + top('ents') + top('minions') + top('constructs') + top('flung') +
                top('smoke') + top('mines') + top('portals') -
                (before.proj + before.ents + before.minions + before.constructs + before.flung +
                 before.smoke + before.mines + before.portals),
        move: Math.abs(after.px - before.px) + Math.abs(after.py - before.py) + Math.abs(after.pz - before.pz),
        ki: before.ki - after.ki,
        dmg: dummy ? (dummy.maxHp - dummy.hp) : 0,
        flying: after.flying !== before.flying,
        selfState: (top('phase') > before.phase) || (top('invisible') > before.invisible),
        quiver: top('quiver') !== before.quiver,
        invuln: after.invuln - before.invuln,
        buff: Math.max(after.buffT - before.buffT,
                       after.powerBuff - before.powerBuff,
                       after.shield - before.shield),
        scale: Math.abs(after.scale - before.scale),
        cd: !!(p.slots[slot] && p.slots[slot].cd > 0),
        context,
      };
    };

    if (meta && meta.hold) {
      press({ pressed: true, held: true, released: false, dt: DT });
      const holdFrames = Math.max(1, Math.round(holdFor / DT));
      const captureAt = Math.min(holdFrames, Math.round((shot.at || 0.6) / DT));
      for (let i = 0; i < holdFrames; i++) {
        topUp();                                 // a sustained power must not simply run dry
        press({ pressed: false, held: true, released: false, dt: DT });
        // The held intent already advanced this slot. A second, neutral intent here
        // releases charge-type powers before they reach their minimum charge.
        step(false);
        // ⚠ ONLY A PHOTO STOPS EARLY. Testing must always run the WHOLE lifecycle, because some
        // beams CHARGE first and only spawn on release (abilities.js: st.active = spawnBeamFor on
        // the release branch). Breaking at the photogenic moment meant measuring a beam that did
        // not exist yet, and SOL's Heat Ray — a working ability — reported itself inert.
        if (photo && shot.during && i === captureAt) return finish();
      }
      press({ pressed: false, held: false, released: true, dt: DT });
      const n = Math.max(1, Math.round((shot.after || 0.3) / DT));
      for (let i = 0; i < n; i++) step();
    } else {
      press({ pressed: true, held: false, released: true, dt: DT });
      const n = Math.max(1, Math.round((shot.after || 0.3) / DT));
      for (let i = 0; i < n; i++) step();
    }

    // Context fixtures assert the actual consumer effect, beyond a changed index
    // or a half-open door. These fail if payload propagation, hopping, anchoring,
    // or the allegiance transition stops working.
    if (!photo && ab.type === 'quiver') {
      const bowSlot = SLOT_KEYS.find(k => p.def.abilities[k]?.type === 'bow');
      const expected = (ab.payloads || ['explosive', 'flame', 'poison'])[p._quiverIdx];
      runSlot(p, bowSlot, { pressed: true, held: true, released: false, dt: 0.5 }, game);
      runSlot(p, bowSlot, { pressed: false, held: false, released: true, dt: DT }, game);
      const arrow = game.projectiles.list.find(o => o.caster === p && o.arrow);
      context = { kind: 'quiver', expected, payload: arrow?.payload, ok: !!arrow && arrow.payload === expected && p._quiverIdx !== before.quiver };
    } else if (!photo && ab.type === 'portal') {
      const pair = game.portals.find(pr => pr.owner === p);
      topUp(); game.aimPoint.set(-targetDist / 2, 0, 30);
      press({ pressed: true, held: false, released: false, dt: DT });
      if (pair?.b) {
        p.pos.set(pair.a.x, 0, pair.a.z); p._portalCd = 0;
        const projectile = game.projectiles.spawnProjectile(p, { pos: p.pos.clone().setY(6), vel: p.aim.clone(), radius: 1, damage: 1, color: '#ffd24a' });
        game.updatePortals(DT);
        const fighterHopped = Math.hypot(p.pos.x - pair.b.x, p.pos.z - pair.b.z) < 0.1;
        const projectileHopped = Math.hypot(projectile.pos.x - pair.b.x, projectile.pos.z - pair.b.z) < 0.1;
        context = { kind: 'portal', fighterHopped, projectileHopped, ok: fighterHopped && projectileHopped };
      } else context = { kind: 'portal', ok: false };
    } else if (!photo && ab.type === 'mindcontrol') {
      context = { kind: 'mindcontrol', controlled: !!dummy._controlled, team: dummy.team, casterTeam: p.team, ok: !!dummy._controlled && dummy.team === p.team };
    } else if (!photo && ab.type === 'grapple' && !ab.reel) {
      context = { kind: 'grapple', anchored: !!(p._grapple || p.hanging), ok: !!(p._grapple || p.hanging) && p.pos.x > -targetDist / 2 + 6 };
    }
    return finish();
  };

  // FUNCTION FIRST, always over the whole lifecycle. The photo is a separate, second pass so that
  // stopping early for a good picture can never change what the report says about whether it works.
  const test = runOnce(true, false);
  if (!opts.resume) {
    game.clearTransients();
    if (dummy && !game.entities.includes(dummy)) game.entities.push(dummy);
    runOnce(true, true);
  }

  // ⚠ EXECUTION IS REPORTED, NOT REQUIRED — and dropping it as a gate was a real correction. It
  // cannot be measured honestly here anyway: a sustained power is topped up every held frame so it
  // does not simply run dry, which erases the very ki-spend it would be judged on. A cone that
  // dealt 26.9 damage was being failed for "not executing". And it is redundant: an unimplemented
  // type and an inert buff both produce NO EFFECT, so effect alone already separates them.
  const executed = test.ki > 0.01 || test.cd;

  // ---- DID ANYTHING ACTUALLY HAPPEN? — this is the whole test ----------------------------------
  const evidence = [];
  if (test.spawns > 0) evidence.push('spawned');
  if (test.dmg > 0.01) evidence.push('damaged');
  if (test.move > 6) evidence.push('travelled');     // a dash/teleport, not a fighter settling
  if (test.flying) evidence.push('flight');
  if (test.selfState) evidence.push('self-state');
  if (test.scale > 0.02) evidence.push('resize');
  if (test.buff > 0.01) evidence.push('buff');
  if (test.quiver) evidence.push('quiver-changed');

  if (test.context?.ok) evidence.push(test.context.kind + '-verified');
  const ok = errors.length === 0 && fired && evidence.length > 0 && (!test.context || test.context.ok);
  const needsContext = !ok && !errors.length && !test.context && !!CONTEXTUAL[ab.type];

  // ---- pose the frame -------------------------------------------------------------------------
  // ⚠ THE NEWS CAMERA LEAVES A SCISSOR RECT ON THE RENDERER (its POV renders 320x180 into a corner).
  // A manual render that inherits it comes back black except one corner — a posed shot must clear
  // scissor and viewport first. Cheap, and it has bitten this project before.
  if (!opts.resume) {
    try {
      const r = game.world.renderer;
      r.setScissorTest(false);
      r.setViewport(0, 0, r.domElement.width, r.domElement.height);
      r.setScissor(0, 0, r.domElement.width, r.domElement.height);
    } catch (e) { /* renderer shape differs headlessly */ }
    game.running = false;
    // frame the action through the documented camera channel rather than fighting followHumans
    try {
      game.mapCam = opts.cam || {
        x: 0, y: 26, z: 62, tx: 0, ty: 6, tz: 0,
      };
    } catch (e) {}
    try { game.world.render(); } catch (e) { onErr(e); }
  }

  return {
    heroId, heroName: p.def.name, slot,
    type: ab.type, name: ab.name || slot,
    family: fam, knownType: !!meta,
    ok, evidence, errors, executed, needsContext,
    dmg: +test.dmg.toFixed(1),
    ki: +test.ki.toFixed(1),
    // ⚠ A FAILING ROW MUST DIAGNOSE ITSELF. 364 rows is far too many to debug one at a time by
    // hand; the raw deltas turn "inert" into "spawned nothing and moved 0.2u", which is a lead.
    raw: { spawns: test.spawns, move: +test.move.toFixed(1), dist: targetDist },
    context: test.context,
    why: ok ? ''
      : errors.length ? 'threw'
      : !fired ? 'never fired'
      : needsContext ? 'NEEDS CONTEXT — ' + CONTEXTUAL[ab.type]
      // ⚠ THE INTERESTING FAILURE: the slot ran and nothing appeared in the world. That is a dead
      // slot wearing a working slot's costume, and it is the thing this suite exists to find.
      : executed ? 'INERT — cost paid and/or cooldown set, but nothing observable happened'
      : 'INERT — and it did not even bill the player; the type may not be implemented',
  };
}

/** Fire every ability in the roster and report. `opts.only` filters by hero id. */
export function abilitySuite(game, hud, opts = {}) {
  const list = abilityList().filter((r) => !opts.only || r.heroId === opts.only);
  const rows = [];
  for (const r of list) {
    let res;
    try { res = stageAbility(game, hud, r.heroId, r.slot, { ...opts, resume: true }); }
    catch (e) { res = { ...r, ok: false, evidence: [], errors: [String(e && e.message || e)], why: 'harness threw' }; }
    rows.push(res);
  }
  const ctx = rows.filter((r) => !r.ok && r.needsContext);
  const bad = rows.filter((r) => !r.ok && !r.needsContext);
  const byType = {};
  for (const r of rows) {
    const t = byType[r.type] || (byType[r.type] = { type: r.type, n: 0, ok: 0 });
    t.n++; if (r.ok) t.ok++;
  }
  return {
    total: rows.length,
    ok: rows.filter((r) => r.ok).length,
    failed: bad.length,
    needsContext: ctx.length,
    contextRows: ctx.map((r) => `${r.heroId}.${r.slot} ${r.type} — ${r.why}`),
    unknownType: rows.filter((r) => !r.knownType).map((r) => `${r.heroId}.${r.slot} (${r.type})`),
    failures: bad.map((r) => `${r.heroId}.${r.slot} ${r.type} — ${r.why}${r.errors.length ? ': ' + r.errors[0] : ''}`),
    byType: Object.values(byType).sort((a, b) => a.ok / a.n - b.ok / b.n),
    rows,
  };
}
