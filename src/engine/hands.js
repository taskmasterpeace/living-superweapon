// =================================================================================================
// THE HANDS — what you are holding, selected on a number key. Design: docs/THE_HANDS.md
//
// Robert: *"most games you hit 1 it's melee, you hit 2 it's pistol, you hit 3 it's your main
// weapon."* And, on whether that should be a stance: no. A stance is a posture you declare and
// cannot see on an isometric camera. **This is an OBJECT, and an object is visible** — `buildWeapon`
// already mounts a real mesh on the fists and the poses and the ragdoll carry it.
//
// ⚠ BUILT THROUGH `_gearHeld`, NOT BESIDE IT. `game.js:1046` already carries the comment *"hands are
// a slot: swap, don't stack"* — the picked-up-gear path already models exactly one thing in your
// hands, fires it through a synthetic `_gear` slot, applies weapon proficiency and mounts the mesh.
// This adds a SELECTOR over that; it does not add a second way to hold something. (The duplicate
// `Weather` class is why that sentence is at the top of this file.)
//
// ⚠ THE HANDS NEVER TAKE A POWER SLOT. LMB / RMB / Q / E / H / R stay powers, always. You are not
// swapping your kit, you are swapping what your fists are wrapped around — which is exactly why it
// can be a number key instead of a mode.
import { loadLoadout } from './armoryUI.js';
import { weaponById, gearById } from '../data/armory.js';

// ⚠ SLOT 1 IS ALWAYS FISTS AND ALWAYS EXISTS. Everything else is earned from the loadout, so a
// fighter who has never been to the armory has ONE slot and the control silently disappears for
// them — the "most of the roster never sees this button" property, falling out of the data instead
// of a hard gate.
export function handsOf(f) {
  const out = [{ i: 1, id: null, n: 'FISTS', kind: 'fists', two: false }];
  // PURE BOXING: one slot, so the selector disappears by exactly the same route as a fighter who
  // has never been to the armory — no second gate, no special case in the HUD.
  if (f && f.noPowers) return out;
  let L = null;
  try { L = loadLoadout(); } catch (e) { L = null; }
  if (!L) return out;
  const add = (id, kind) => {
    const w = id && weaponById(id);
    if (!w) return;
    // ⚠ TWO-HANDED IS A REAL CONSTRAINT, NOT A LABEL. `oneHand` is already authored on every armory
    // row that has it, and it is what decides whether you can still grab — which is the cost that
    // makes choosing a slot a decision rather than a free upgrade.
    out.push({ i: out.length + 1, id, n: w.n, kind, two: !(w.ab && w.ab.oneHand), w });
  };
  add(L.rmb, 'sidearm');
  add(L.lmb, 'primary');
  if (L.gear && L.gear.length) {
    const g = gearById(L.gear[0]);
    if (g) out.push({ i: out.length + 1, id: g.id, n: g.n, kind: 'gear', two: false, g });
  }
  return out;
}

/**
 * Put slot `i` in a fighter's hands. Returns the slot taken, or null if it refused.
 * ⚠ IT CAN SAY NO, AND IT SAYS WHY — the same law the site survey and the armory keep. Swapping is
 * a committed action: not mid-charge, not mid-clinch, not while carrying a car, not while downed.
 * `canAct` is the gate the melee trifecta already uses, so this needed no new rule.
 */
export function selectHand(game, f, i) {
  if (!f || !f.alive) return null;
  const list = handsOf(f);
  const slot = list.find(s => s.i === i);
  if (!slot) return null;
  if (f._hand === i) return slot;
  const why = !game.melee.canAct(f) ? 'BUSY'
    : f._carry ? 'BOTH HANDS FULL'
    : f.meleeCharge > 0 ? 'MID-SWING'
    : f._disarmT > 0 ? 'DISARMED'
    : null;
  if (why) {
    if (game.hud && game.isHuman(f)) game.hud.feed('CAN’T SWAP — ' + why, '#c9564a');
    return null;
  }
  // ⚠ ONE PATH IN AND OUT. dropGear/equipGear own the mesh, the slot and the proficiency; the
  // selector must never poke `_gearHeld` itself or the two will drift.
  if (f._gearHeld) game.dropGear(f, false);
  f._hand = i;
  f._handT = 0.35;                                   // the draw — a swap costs time, or it is free
  f.strikeCd = Math.max(f.strikeCd || 0, 0.35);
  if (f.guarding) f.guarding = false;                // a swap drops a raised guard, like every commit
  if (slot.id && slot.w) game.equipFrom(f, slot.w);
  if (game.hud && game.isHuman(f)) game.hud.feed('HANDS — ' + slot.n, '#e0b23c');
  if (game.audio && game.audio.sample) game.audio.sample('ui.click', { gain: 0.5 });
  return slot;
}

/** Cycle — the wheel and the D-pad both land here so there is one behaviour, not three. */
export function cycleHand(game, f, dir = 1) {
  const list = handsOf(f);
  if (list.length < 2) return null;
  const cur = list.findIndex(s => s.i === (f._hand || 1));
  const n = list[(cur + dir + list.length) % list.length];
  return selectHand(game, f, n.i);
}

/** What is in these hands right now, for the HUD. Never a number the player has to interpret. */
export function handLabel(f) {
  const list = handsOf(f);
  const s = list.find(x => x.i === (f._hand || 1)) || list[0];
  return { list, cur: s, two: !!s.two };
}
