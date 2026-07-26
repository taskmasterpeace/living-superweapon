// ---- CONTROL SCHEMES — try a layout instead of arguing about one ----
// Every binding a scheme owns lives HERE (engine + help panel both read it), so a scheme can never
// drift out of sync with what the game tells you the buttons are. ⚠ No two keys in one scheme may
// collide — guard and gadget in particular (X was doing both jobs at once before this was data).
//   CLASSIC  — what shipped: the wheel swaps hero.
//   PILOT    — the wheel picks the POWER you fire with LMB; hero swap moves to [ ]; Space/C flight.
//   HYBRID   — PILOT's wheel + bracket swap, but guard/gadget stay on the old C/X muscle memory.
export const KEYMAPS = {
  classic: {
    name: 'CLASSIC', wheel: 'hero', digitsSwap: true,
    up: 'Space', down: 'KeyZ', guard: 'KeyC', item: 'KeyX',
    upLabel: 'SPACE', downLabel: 'Z', guardLabel: 'C / MOUSE4', itemLabel: 'X', swapLabel: 'WHEEL · 1–0',
    blurb: 'What shipped. The wheel (and 1–0) swaps hero · Z descends · C guards · X gadget.',
  },
  pilot: {
    name: 'PILOT', wheel: 'ability', digitsSwap: false,
    up: 'Space', down: 'KeyC', guard: 'KeyX', item: 'KeyZ',
    upLabel: 'SPACE', downLabel: 'C', guardLabel: 'X / MOUSE4', itemLabel: 'Z', swapLabel: '[ ]',
    blurb: 'The wheel picks your POWER and LMB fires it · [ ] swaps hero · SPACE up, C down · X guards, Z gadget.',
  },
  hybrid: {
    name: 'HYBRID', wheel: 'ability', digitsSwap: false,
    up: 'Space', down: 'KeyZ', guard: 'KeyC', item: 'KeyX',
    upLabel: 'SPACE', downLabel: 'Z', guardLabel: 'C / MOUSE4', itemLabel: 'X', swapLabel: '[ ]',
    blurb: 'PILOT’s wheel-select and [ ] hero swap, with guard and gadget left on C and X.',
  },
};
// Resolve a stored scheme name (tolerates the early 'southpaw' build) to a live map.
export function keymap(name) { return KEYMAPS[name] || KEYMAPS[name === 'southpaw' ? 'hybrid' : 'classic'] || KEYMAPS.classic; }


// THRESHOLD — player settings: one tiny persisted store + the appliers that push it
// into the live systems (audio gains, screen shake, render quality, HUD toggles).
const LS = 'threshold_settings_v1';

export const SETTINGS = {
  // ---- THE MIX. One fader per bus, so you can turn the music down without turning the
  // punches down. These multiply the static balance in audio.js BUS_DEFAULT.
  master: 1,        // master volume 0–1
  volMusic: 1,      // score
  volSfx: 1,        // combat, impacts, weapons, the world
  volVoice: 1,      // battle cries AND civilian street voices
  volAmbient: 1,    // the city bed — traffic, wind, surf, crowd murmur
  volUi: 1,         // menus, news stings, broadcast furniture
  voice: 1,         // DBZ battle-cry synth loudness (separate from the voice BUS)
  shake: 1,         // screen-shake multiplier 0–1.5
  dmgNumbers: true, // floating damage numbers
  hints: true,      // bottom-right controls hint panel
  scheme: 'classic',// control layout: classic | pilot | southpaw (see KEYMAPS in hud.js)
  aimAssist: true,  // magnet targeting near the cursor (facing + attacks steer to the pick)
  spacingRings: false,  // THE SPACING UI (manual §38): your three strike reaches, drawn on the ground
  sundial: true,        // the hanging dial: sun, moon, noon/midnight, the day and the time
  // 'aim'    — W goes where the MOUSE points, A/D strafe across it (character-relative; the default)
  // 'camera' — W always goes up-screen regardless of facing (the old fixed-isometric basis)
  moveRelative: 'aim',
  quality: 'auto',  // 'auto' | 2 (high) | 1 (balanced) | 0 (low) — locks the adaptive tier
  opening: 'full',
  // THE PRINT LOOK (the comic-print stack). A preset name plus per-effect overrides, so the player
  // can take the whole look in one click and then argue with any single part of it.
  // ⚠ 'off' is a real preset and it is exactly the pipeline as it shipped — the pass disables itself
  // when nothing is on, so choosing OFF costs a uniform test, not a blit.
  look: 'print',
  fxInk: 0.85, fxHalftone: 0.55, fxLevels: 0, fxGrain: 0.30,
  fxTilt: 0, fxDither: 0.35, fxGrade: 1, fxImpact: true, fxSpeedLines: true,
  heroVoice: false, // DBZ yell/grunt/KO-wail synths — OFF by ruling ('no LSW talking')  // match cold-open: 'full' (cinematic, 1 of 10) | 'quick' (the card) | 'off'
};

export function loadSettings() {
  try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem(LS) || '{}')); } catch { /* fresh */ }
  return SETTINGS;
}
export function saveSettings() {
  try { localStorage.setItem(LS, JSON.stringify(SETTINGS)); } catch { /* storage blocked — session-only */ }
}

// Push the store into the running game. Safe to call any time (audio may not be inited yet).
// ⚠ A PRESET IS A SET OF DIAL POSITIONS, NOT A SECOND SYSTEM. It writes the same `fx*` settings the
// sliders write, so there is exactly one source of truth for what the shader is doing. CUSTOM is the
// absence of a preset — pick it and your own numbers survive.
export const LOOK_PRESETS = {
  off:    { ink: 0, halftone: 0, levels: 0, grain: 0, tilt: 0, dither: 0, grade: 0 },
  clean:  { ink: 0, halftone: 0, levels: 0, grain: 0.12, tilt: 0, dither: 0.35, grade: 1 },
  print:  { ink: 0.85, halftone: 0.55, levels: 0, grain: 0.30, tilt: 0, dither: 0.35, grade: 1 },
  inked:  { ink: 1.0, halftone: 0.75, levels: 7, grain: 0.42, tilt: 0, dither: 0.30, grade: 1 },
  diorama:{ ink: 0.55, halftone: 0.30, levels: 0, grain: 0.18, tilt: 0.85, dither: 0.35, grade: 1 },
  custom: null,
};

export function applySettings(game) {
  const a = game.audio, w = game.world, h = game.hud;
  if (a) {
    a.voiceMult = SETTINGS.voice;
    a.heroVoice = !!SETTINGS.heroVoice;
    if (a.master) a.master.gain.value = 0.32 * SETTINGS.master;
    if (a.setBus) {                       // the per-bus faders (audio.js builds the buses on init)
      a.setBus('music', SETTINGS.volMusic);
      a.setBus('sfx', SETTINGS.volSfx);
      a.setBus('voice', SETTINGS.volVoice);
      a.setBus('ambient', SETTINGS.volAmbient);
      a.setBus('ui', SETTINGS.volUi);
    }
  }
  if (w) {
    w.shakeMult = SETTINGS.shake;
    // ⚠ ONE PLACE decides what the print pass is doing. A preset writes the individual dials, and the
    // dials are what the pass reads — so a preset can never disagree with the sliders under it.
    if (w.print) {
      const P = LOOK_PRESETS[SETTINGS.look] || null;
      if (P) for (const k in P) SETTINGS['fx' + k[0].toUpperCase() + k.slice(1)] = P[k];
      w.print.apply({
        ink: SETTINGS.fxInk, halftone: SETTINGS.fxHalftone, levels: SETTINGS.fxLevels,
        grain: SETTINGS.fxGrain, tilt: SETTINGS.fxTilt, dither: SETTINGS.fxDither,
        grade: SETTINGS.fxGrade,
      });
    }
    w.qualityOverride = SETTINGS.quality === 'auto' ? null : +SETTINGS.quality;
    if (w.qualityOverride != null && w._qTier !== w.qualityOverride) { w._qTier = w.qualityOverride; w._applyQuality(); }
  }
  if (h) { h.dmgNumbersOff = !SETTINGS.dmgNumbers; if (h.setHintVisible) h.setHintVisible(SETTINGS.hints); }
}
