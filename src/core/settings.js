// THRESHOLD — player settings: one tiny persisted store + the appliers that push it
// into the live systems (audio gains, screen shake, render quality, HUD toggles).
const LS = 'threshold_settings_v1';

export const SETTINGS = {
  master: 1,        // master volume 0–1 (scales the AudioBus master gain)
  voice: 1,         // DBZ voice synth loudness 0–1 (yell/grunt/cry)
  shake: 1,         // screen-shake multiplier 0–1.5
  dmgNumbers: true, // floating damage numbers
  hints: true,      // bottom-right controls hint panel
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
  if (a) { a.voiceMult = SETTINGS.voice; if (a.master) a.master.gain.value = 0.32 * SETTINGS.master; }
  if (w) {
    w.shakeMult = SETTINGS.shake;
    w.qualityOverride = SETTINGS.quality === 'auto' ? null : +SETTINGS.quality;
    if (w.qualityOverride != null && w._qTier !== w.qualityOverride) { w._qTier = w.qualityOverride; w._applyQuality(); }
  }
  if (h) { h.dmgNumbersOff = !SETTINGS.dmgNumbers; if (h.setHintVisible) h.setHintVisible(SETTINGS.hints); }
}
