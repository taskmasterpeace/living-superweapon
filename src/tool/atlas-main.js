// ATLAS — standalone bootstrap. No Game, no HUD, no audio: a World, the atlas panel, an orbit
// camera. The same module the in-game CITY ATLAS mounts (engine/atlasUI.js) runs the whole page.
import { World } from '../engine/world.js';
import { mountAtlas } from '../engine/atlasUI.js';
import { BANDS } from '../core/util.js';

const canvas = document.getElementById('game');
const world = new World(canvas);
world.setFogEnabled(false);          // fog of war is a combat system — a map tool wants daylight
world.setSim && world.setSim(false);

const ui = mountAtlas(document.body, { world, solo: true });
ui.open();                           // solo mounts go live immediately — the page IS the live view

// The render loop: the panel owns the camera state; we just honour it every frame.
// ⚠ try/catch like main.js — one throw (e.g. a zero-size window while the pane is hidden)
// must not kill the loop forever. But a bare console.error here fires 60×/second: serialising a
// stack object at that rate is itself a freeze, and it buries every other message. Same throttle
// as the game's repeated-error law — log each distinct fault once, then count it.
const _seen = new Map();
function report(err) {
  const key = String((err && err.message) || err) + '|' + String((err && err.stack) || '').split('\n')[1];
  let n = _seen.get(key);
  if (n === undefined) {
    if (_seen.size >= 100) _seen.delete(_seen.keys().next().value);   // the ledger must not leak either
    _seen.set(key, 1); console.error('[ATLAS]', err);
  } else {
    _seen.set(key, ++n);
    if (n === 30) console.error(`[ATLAS] the above has now fired ${n}× — the view is failing every frame`);
  }
}
function frame() {
  try { if (ui.cam) world.orbit(ui.cam); world.render(); } catch (err) { report(err); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// headless verification handle (mirrors window.LSW on the game page).
// ⚠ BANDS must come from THIS import graph — a dynamic import('/src/core/util.js') in the console
// can resolve to a second, phantom module instance under vite's HMR version stamps.
window.ATLAS = { world, ui, BANDS };
