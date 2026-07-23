// Living Superweapon — bootstrap.
import { Input } from './core/input.js';
import { AudioBus } from './core/audio.js';
import { Game, ROSTER } from './engine/game.js';
import { HUD } from './engine/hud.js';
import { runBenchmark } from './bench/benchmark.js';
import { CreatorUI } from './engine/creatorUI.js';
import { runSlot, performEvade } from './engine/abilities.js';
import { loadSettings, applySettings } from './core/settings.js';
import { installCustoms, loadCustoms, freshPicks, buildDef, tally, validate, saveCustom, deleteCustom } from './data/creator.js';
import { applyIdentities } from './data/identities.js';
import { Tutorial } from './engine/tutorial.js';
import { Netplay } from './engine/netplay.js';
import { Tournament } from './engine/tournament.js';

const canvas = document.getElementById('game');
const input = new Input(); input.bind(canvas);
const audio = new AudioBus();
const game = new Game(canvas, input, audio);
const hud = new HUD(game);
game.hud = hud;
game.world.prewarm();   // compile lazy FX shaders up-front — no first-use hitches mid-fight
loadSettings(); applySettings(game);   // player settings (volume/shake/quality/HUD) from localStorage
// GPU sanity — software WebGL turns the game into slow motion; say WHY, loudly
try {
  const glc = game.world.renderer.getContext();
  const dbg = glc.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? glc.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  console.log('[THRESHOLD] GPU:', gpu);
  if (/swiftshader|software|basic render/i.test(String(gpu))) {
    setTimeout(() => hud.feed('⚠ SOFTWARE rendering detected — turn ON hardware acceleration (chrome://settings/system), then relaunch Chrome', '#ff8a6a'), 1200);
  }
} catch { /* diagnostics only */ }

let started = false;

const tutorial = new Tutorial(game, hud);
// ---- ONLINE: rooms + netcode (Supabase Realtime transport) ----
const netplay = new Netplay(game, hud);
game.netplay = netplay; hud.netplay = netplay;
netplay.onMatchStart = (cfg) => enter(cfg);
netplay.onMatchEnd = () => openMenu();
netplay.onLobby = () => { if (hud.onlineEl.style.display === 'flex') hud.renderOnline(); };
function enter(cfg) {
  audio.init(); audio.resume(); applySettings(game);   // master gain exists only after init
  const c = (typeof cfg === 'string') ? { mode: 'training', p1: cfg } : cfg;
  // THE INVITATIONAL: bracket-first flow — seeding view before round 1, standings between rounds,
  // the champion card when it's done. The Tournament object rides in the cfg across matches.
  if (c.mode === 'tournament') {
    if (!c.tourney) c.tourney = new Tournament(ROSTER, c.p1 || 'sol', c.format || '1v1');
    game._lastCfg = c;
    hud.hideEndScreen();
    const m = c.tourney.currentMatch();
    if (!m) { hud.showBracket(c.tourney, { onDone: () => openMenu() }); return; }   // eliminated or crowned
    hud.hideTitle();
    hud.showBracket(c.tourney, { onNext: () => beginMatch(c) });
    return;
  }
  beginMatch(c);
}
function beginMatch(c) {
  // THE THEATER: raise the selected city before the fighters drop into it
  try {
    const plan = hud.resolveTheaterPlan();
    const cur = game.world.plan;
    if (plan && (!cur || cur.name !== plan.name || cur.seed !== plan.seed)) {
      game.world.rebuildCity(plan);
      game.peds.setCity(game.world.ARENA, game.world.waterX);
      hud.feed('Theater: ' + plan.name.toUpperCase() + (plan.country ? ' · ' + plan.country : ''), '#7fb0d0');
    }
  } catch (err) { console.error('theater', err); }
  game.startMode(c.mode || 'training', c);
  hud.setPlayer(ROSTER.find(r => r.id === (c.p1 || 'sol')));
  hud.armHintTimer();          // the control wall shows for ~18s, then folds into a corner chip (F1)
  started = true; game._lastCfg = c;
  hud.hideEndScreen(); hud.hideTitle();
  if (c.tutorial) tutorial.begin(); else tutorial.skip();
}
hud.onBracketContinue = () => { if (game._lastCfg) enter(game._lastCfg); };
hud.onProvingGround = () => enter({ mode: 'training', p1: hud.selectedHero || 'sol' });
function openMenu() { game.running = false; hud.hideEndScreen(); hud.buildTitle(enter); hud.showTitle(); }

// ---- ORIGIN: install saved customs, wire the forge ----
installCustoms(ROSTER);
applyIdentities(ROSTER);   // every weapon is a PERSON from a real place (def.person)
const creator = new CreatorUI(ROSTER);
function afterForge(def, { test } = {}) {
  hud.buildTitle(enter);                                  // rebuild so the new card exists
  if (def && test) { enter({ mode: 'training', p1: def.id }); hud.feed(def.name + ' enters the Danger Room', def.colors.accent); }
  else hud.showTitle();
}
hud.onForge = () => { hud.hideTitle(); creator.show({ onDone: afterForge, onCancel: () => hud.showTitle() }); };
hud.onEditCustom = (def) => {
  const rec = loadCustoms().find(c => c.def.id === def.id); if (!rec) return;
  hud.hideTitle(); creator.show({ edit: rec, onDone: afterForge, onCancel: () => hud.showTitle() });
};

hud.buildTitle(enter);
hud.showTitle();
hud.onRematch = () => {
  if (game._lastCfg && game._lastCfg.net) { openMenu(); hud.showOnline(); return; }   // online rematch = back to the lobby
  if (game._lastCfg) enter(game._lastCfg);
};
hud.onMenu = () => { if (netplay.active) netplay.leave(); openMenu(); };
hud.onResume = () => { game.running = true; hud.setPaused(false); };
hud.onTutorial = () => enter({ mode: 'training', p1: 'sol', tutorial: true });   // SOL teaches every system
hud.onTutorialSkip = () => tutorial.skip();
// first-timers get the manual once (with the LEARN BY DOING funnel inside)
if (!localStorage.getItem('threshold_howto_seen')) hud.showHowto();

game.onKill = (f) => {
  if (game.isHuman(f)) hud.feed((f.name) + ' was KO’d', '#ff6a5a');
  else if (!f.isDummy) hud.feed(f.name + ' was defeated!', f.def.colors.accent);
};

const digits = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Digit0: 9 };
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && hud.overlayOpen()) { hud.closeOverlays(); return; }   // options/how-to first
  if (e.code === 'F1') { e.preventDefault(); hud.toggleHint(); return; }           // controls, on demand
  if (!started) return;
  if (e.code === 'Tab') { e.preventDefault(); if (!hud.titleOpen) openMenu(); else { game.running = true; hud.hideTitle(); } return; }
  if (e.code === 'Escape' && game.player && !hud.titleOpen) { game.running = !game.running; hud.setPaused(!game.running); return; }
  if (game.running === false) return;
  if (e.code === 'KeyB') { const b = game.spawnRival(); hud.feed('A rival ' + b.name + ' enters the arena!', b.def.colors.accent); }
  if (e.code === 'KeyM') { audio.muted = !audio.muted; hud.feed(audio.muted ? 'Muted' : 'Sound on', '#9fb2c9'); }
  if (e.code in digits) { const c = ROSTER[digits[e.code]]; if (c) { game.setPlayerChar(c.id); hud.setPlayer(c); hud.feed('Now piloting ' + c.name + ' · ' + c.title, c.colors.accent); } }
});

function cycleHero(dir) {
  if (!game.player) return;
  const cur = ROSTER.findIndex(r => r.id === game.player.def.id);
  const n = ROSTER[(cur + dir + ROSTER.length) % ROSTER.length];
  game.setPlayerChar(n.id); hud.setPlayer(n); hud.feed('Now piloting ' + n.name + ' · ' + n.title, n.colors.accent);
}
function padSystem() {
  if (!started) return;
  const inMatch = !hud.titleOpen;   // cached flag — no getComputedStyle in the frame loop
  if (game.pad.pressed('start') && inMatch) { game.running = !game.running; hud.setPaused(!game.running); }
  if (game.pad.pressed('select')) { if (inMatch) openMenu(); else { game.running = true; hud.setPaused(false); hud.hideTitle(); } }
  if (inMatch && game.running && game.pad.pressed('swap')) cycleHero(1);
}

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000; last = now;
  try {
    game.update(Math.min(dt, 0.05));
    if (started) {
      hud.update(); padSystem();
      if (game.running) tutorial.update(Math.min(dt, 0.05));
      if (game.running) netplay.update(Math.min(dt, 0.05));
      if (game.running && !hud.titleOpen && input.wheel) cycleHero(Math.sign(input.wheel));   // wheel = swap hero
    }
  }
  catch (err) { console.error(err); }
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// expose for debugging + performance benchmarking
window.LSW = { game, hud, ROSTER, runSlot, performEvade, input, tutorial, netplay, creator: { ui: creator, freshPicks, buildDef, tally, validate, saveCustom, deleteCustom, loadCustoms } };
window.LSW.runBenchmark = (opts) => runBenchmark(game, hud, opts);
if (location.search.includes('bench')) {
  addEventListener('load', () => setTimeout(async () => {
    const r = await runBenchmark(game, hud);
    console.log('%cLSW benchmark', 'font-weight:bold'); console.table({ frame: r.frame, update: r.update, render: r.render, hud: r.hud });
    console.log(JSON.stringify(r, null, 2));
    window.LSW.lastBench = r;
  }, 400));
}
