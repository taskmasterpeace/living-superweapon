// WAR WORLD: ASCENDANTS — CONTROLLER GLYPHS.
//
// The help panel used to print WASD and LMB whether or not a pad was plugged in, which on a Steam
// Deck is telling the player about keys that do not exist. This maps every action to the right
// glyph for whatever they are actually holding, and the panel re-renders when that changes.
//
// PlayStation is the default pad face set because that is what Robert asked for (PS2 layout) and
// what the game's own MAP in gamepad.js is modelled on. Xbox is detected from the pad id string.

export const PAD_PS = {
  cross: '✕', circle: '○', square: '□', triangle: '△',
  l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', l3: 'L3', r3: 'R3',
  start: 'START', select: 'SELECT',
  dup: '↑', ddown: '↓', dleft: '←', dright: '→', dpad: 'D-PAD',
  lstick: 'L-STICK', rstick: 'R-STICK',
};
export const PAD_XB = {
  cross: 'A', circle: 'B', square: 'X', triangle: 'Y',
  l1: 'LB', r1: 'RB', l2: 'LT', r2: 'RT', l3: 'LS', r3: 'RS',
  start: 'MENU', select: 'VIEW',
  dup: '↑', ddown: '↓', dleft: '←', dright: '→', dpad: 'D-PAD',
  lstick: 'L-STICK', rstick: 'R-STICK',
};

// Which pad control performs each action. Mirrors MAP in core/gamepad.js — if you rebind there,
// rebind here, or the panel starts lying again.
export const PAD_ACTION = {
  move: 'lstick', aim: 'rstick',
  lmb: 'r2', rmb: 'l2', dash: 'r1', guard: 'l1',
  strike: 'square', grab: 'circle', fly: 'cross', descend: 'l3', ult: 'triangle',
  q: 'dup', e: 'dright', f: 'dleft', swap: 'ddown',
  pause: 'start', roster: 'select',
  confirm: 'cross', back: 'circle', item: 'square',
};

// Is a pad the ACTIVE input device? A pad that is merely plugged in shouldn't rewrite the panel
// for someone playing on keyboard — gamepad.js already tracks "has it actually been used".
export function padActive(pad) { return !!(pad && pad.connected && pad.active); }

// PS or Xbox faces, from the connected pad's id string.
export function padFaces(pad) {
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const id = (p.id || '').toLowerCase();
      if (/xbox|xinput|microsoft/.test(id)) return PAD_XB;
      return PAD_PS;                       // DualShock, DualSense, Deck, and anything unlabelled
    }
  } catch (e) { /* no gamepad API */ }
  return PAD_PS;
}

// glyph(action, pad) → the label to print for that action right now.
export function glyph(action, pad) {
  const F = padFaces(pad);
  const key = PAD_ACTION[action];
  return (key && F[key]) || String(action).toUpperCase();
}
