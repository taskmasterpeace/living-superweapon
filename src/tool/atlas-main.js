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
function frame() {
  world.orbit(ui.cam);
  world.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// headless verification handle (mirrors window.LSW on the game page).
// ⚠ BANDS must come from THIS import graph — a dynamic import('/src/core/util.js') in the console
// can resolve to a second, phantom module instance under vite's HMR version stamps.
window.ATLAS = { world, ui, BANDS };
