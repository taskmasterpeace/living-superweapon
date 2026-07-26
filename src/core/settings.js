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
    up: 'Space', down: 'KeyZ', guard: 'KeyC', item: 'KeyX', strike: 'KeyV', grab: 'KeyG', fly: 'KeyF',
    upLabel: 'SPACE', downLabel: 'Z', guardLabel: 'C / MOUSE4', itemLabel: 'X', swapLabel: 'WHEEL · 1–0', flyLabel: 'F',
    strikeLabel: 'V', grabLabel: 'G',
    blurb: 'What shipped. The wheel (and 1–0) swaps hero · Z descends · C guards · X gadget.',
  },
  pilot: {
    name: 'PILOT', wheel: 'ability', digitsSwap: false,
    up: 'Space', down: 'KeyC', guard: 'KeyX', item: 'KeyZ', strike: 'KeyV', grab: 'KeyG', fly: 'KeyF',
    upLabel: 'SPACE', downLabel: 'C', guardLabel: 'X / MOUSE4', itemLabel: 'Z', swapLabel: '[ ]', flyLabel: 'F',
    strikeLabel: 'V', grabLabel: 'G',
    blurb: 'The wheel picks your POWER and LMB fires it · [ ] swaps hero · SPACE up, C down · X guards, Z gadget.',
  },
  hybrid: {
    name: 'HYBRID', wheel: 'ability', digitsSwap: false,
    up: 'Space', down: 'KeyZ', guard: 'KeyC', item: 'KeyX', strike: 'KeyV', grab: 'KeyG', fly: 'KeyF',
    upLabel: 'SPACE', downLabel: 'Z', guardLabel: 'C / MOUSE4', itemLabel: 'X', swapLabel: '[ ]', flyLabel: 'F',
    strikeLabel: 'V', grabLabel: 'G',
    blurb: 'PILOT’s wheel-select and [ ] hero swap, with guard and gadget left on C and X.',
  },
  // ⚠ BRAWLER — Robert: *"i dont know how to do melee with my keyboard bro its hard."* He is right,
  // and the reason is physical: with fingers on WASD, STRIKE on V is reachable and GRAB on G is not.
  // G is two rows up and three columns right of D — you have to look down and move your whole hand,
  // mid-fight, to use one third of the melee trifecta. This scheme puts all three under the left
  // hand without moving off WASD: **F strike · C guard · V grab**, index / ring / middle.
  // ⚠ It changes NOTHING about the powers. The three-button-mouse melee stance from the design spec
  // is a bigger change (LMB/RMB have to stop being powers) and belongs with the strike-grammar
  // slice; this is the ergonomic half, and it is the half that is stopping him playing today.
  brawler: {
    name: 'BRAWLER', wheel: 'ability', digitsSwap: false,
    up: 'Space', down: 'KeyZ', guard: 'KeyC', item: 'KeyX', strike: 'KeyF', grab: 'KeyV', fly: 'KeyG',
    upLabel: 'SPACE', downLabel: 'Z', guardLabel: 'C / MOUSE4', itemLabel: 'X', swapLabel: '[ ]', flyLabel: 'G',
    strikeLabel: 'F', grabLabel: 'V',
    blurb: 'For fist fights. The whole melee trifecta sits under your left hand — F punch, C guard, V grab — so you never leave WASD.',
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
  look: 'broadcast',
  fxInk: 0.85, fxHalftone: 0.55, fxLevels: 0, fxGrain: 0.30,
  fxTilt: 0, fxDither: 0.35, fxGrade: 1, fxImpact: true, fxSpeedLines: true,
  fxVibrance: 0.35, fxSaturation: 0, fxRim: 0.8,
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
//
// ⚠ THE LADDER IS BUILT ON TEXTURE FETCHES, NOT ON A STOPWATCH, and that is a measured decision.
// Benchmarked with EXT_disjoint_timer_query on an RTX 4090: at 1280x720 every single effect came
// back BELOW THE NOISE FLOOR (negative deltas, which are impossible — the work is real, it is just
// smaller than frame-to-frame variance). Re-measured at 3840x2160 so fragment cost dominates, the
// whole stack still fits inside 0.25ms and only the fetch-heavy presets poke above zero:
//   baseline 2.08ms · CLEAN +0.018 · COMIC PRINT -0.051 · HEAVY INK +0.120 · DIORAMA +0.237
// So a stopwatch cannot rank these on good hardware. What DOES predict cost on weak hardware is how
// many extra texture fetches each effect makes per pixel, and that is countable from the source:
//   ink 8 · tilt-shift 8 · everything else 0 (pure ALU)
// `fetch` below is that count. The adaptive tier spends it, lowest tier first.
//
// ⚠ NAMED FOR WHAT THEY ARE FOR, not LOW/MEDIUM/HIGH. A player choosing between "medium" and "high"
// is guessing; a player choosing between FIELD and SPLASH PAGE knows which one is for playing and
// which is for the screenshot. Same reasoning as the LeFevre threat words and the recovery tiers —
// this project prints a WORD wherever a number would make somebody do arithmetic.
export const LOOK_PRESETS = {
  off:        { _n: 'OFF',        _d: 'The renderer as it ships. The pass switches itself off entirely.', fetch: 0,
                ink: 0, halftone: 0, levels: 0, grain: 0, tilt: 0, dither: 0, grade: 0, vibrance: 0, saturation: 0 },
  street:     { _n: 'STREET',     _d: 'Bare metal for a weak GPU — colour only, no per-pixel work.', fetch: 0,
                ink: 0, halftone: 0, levels: 0, grain: 0, tilt: 0, dither: 0.35, grade: 1, vibrance: 0.25, saturation: 0 },
  field:      { _n: 'FIELD',      _d: 'The working look. Print treatment without the eight-tap edge pass.', fetch: 0,
                ink: 0, halftone: 0.55, levels: 0, grain: 0.30, tilt: 0, dither: 0.35, grade: 1, vibrance: 0.35, saturation: 0 },
  broadcast:  { _n: 'BROADCAST',  _d: 'The identity: halftone in the shadows, ink on the silhouettes, paper over all of it.', fetch: 8,
                ink: 0.85, halftone: 0.55, levels: 0, grain: 0.30, tilt: 0, dither: 0.35, grade: 1, vibrance: 0.35, saturation: 0 },
  splash:     { _n: 'SPLASH PAGE',_d: 'Heavy ink and a limited palette. The screenshot look.', fetch: 8,
                ink: 1.0, halftone: 0.75, levels: 7, grain: 0.42, tilt: 0, dither: 0.30, grade: 1, vibrance: 0.45, saturation: -0.05 },
  diorama:    { _n: 'DIORAMA',    _d: 'Tilt-shift on top — the city reads as a model on a table.', fetch: 16,
                ink: 0.55, halftone: 0.30, levels: 0, grain: 0.18, tilt: 0.85, dither: 0.35, grade: 1, vibrance: 0.30, saturation: 0 },
  custom:     { _n: 'CUSTOM',     _d: 'Your own numbers. Touching any dial lands you here.', fetch: null },
};

// ⚠ THE ADAPTIVE TIER SPENDS THE FETCH BUDGET. A machine that has already been dropped to quality
// tier 0 by the frame-time governor must not still be running two eight-tap passes; but the player's
// CHOICE is never overwritten — this clamps what the shader does, and `SETTINGS.look` still says what
// they asked for, so the moment the GPU recovers they get it back.
export const FETCH_BUDGET = [0, 8, 16];      // by quality tier
export function budgetLook(dials, tier) {
  const cap = FETCH_BUDGET[Math.max(0, Math.min(2, tier | 0))];
  const out = { ...dials };
  let spent = 0;
  if (out.tilt > 0) { if (spent + 8 > cap) out.tilt = 0; else spent += 8; }   // the first to go
  if (out.ink > 0) { if (spent + 8 > cap) out.ink = 0; else spent += 8; }
  return out;
}

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
      w.print.apply(budgetLook({
        ink: SETTINGS.fxInk, halftone: SETTINGS.fxHalftone, levels: SETTINGS.fxLevels,
        grain: SETTINGS.fxGrain, tilt: SETTINGS.fxTilt, dither: SETTINGS.fxDither,
        grade: SETTINGS.fxGrade, vibrance: SETTINGS.fxVibrance, saturation: SETTINGS.fxSaturation,
      }, w._qTier == null ? 2 : w._qTier));
      // the rim is material-level, so it is set on the fighters rather than in the pass
      w._rimK = SETTINGS.fxRim;
    }
    w.qualityOverride = SETTINGS.quality === 'auto' ? null : +SETTINGS.quality;
    if (w.qualityOverride != null && w._qTier !== w.qualityOverride) { w._qTier = w.qualityOverride; w._applyQuality(); }
  }
  if (h) { h.dmgNumbersOff = !SETTINGS.dmgNumbers; if (h.setHintVisible) h.setHintVisible(SETTINGS.hints); }
}
