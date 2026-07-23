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
  quality: 'auto',  // 'auto' | 2 (high) | 1 (balanced) | 0 (low) — locks the adaptive tier
};

export function loadSettings() {
  try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem(LS) || '{}')); } catch { /* fresh */ }
  return SETTINGS;
}
export function saveSettings() {
  try { localStorage.setItem(LS, JSON.stringify(SETTINGS)); } catch { /* storage blocked — session-only */ }
}

// Push the store into the running game. Safe to call any time (audio may not be inited yet).
export function applySettings(game) {
  const a = game.audio, w = game.world, h = game.hud;
  if (a) {
    a.voiceMult = SETTINGS.voice;
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
    w.qualityOverride = SETTINGS.quality === 'auto' ? null : +SETTINGS.quality;
    if (w.qualityOverride != null && w._qTier !== w.qualityOverride) { w._qTier = w.qualityOverride; w._applyQuality(); }
  }
  if (h) { h.dmgNumbersOff = !SETTINGS.dmgNumbers; if (h.setHintVisible) h.setHintVisible(SETTINGS.hints); }
}
