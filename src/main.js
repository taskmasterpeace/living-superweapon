// Living Superweapon — bootstrap.
import { Input } from './core/input.js';
import { AudioBus } from './core/audio.js';
import { Game, ROSTER } from './engine/game.js';
import { HUD } from './engine/hud.js';
import { runBenchmark } from './bench/benchmark.js';
import { CreatorUI } from './engine/creatorUI.js';
import { runSlot, performEvade } from './engine/abilities.js';
import { loadSettings, applySettings, SETTINGS, KEYMAPS, keymap } from './core/settings.js';
import { installCustoms, loadCustoms, freshPicks, buildDef, tally, validate, saveCustom, deleteCustom } from './data/creator.js';
import { applyIdentities } from './data/identities.js';
import { countryOf } from './data/countries.js';
import { Tutorial } from './engine/tutorial.js';
import { Netplay } from './engine/netplay.js';
import { Tournament } from './engine/tournament.js';
import { TouchControls, isTouchDevice } from './core/touch.js';
import { UINav } from './core/uinav.js';
import { Soundscape } from './core/soundscape.js';

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

// ---- TOUCH (iPhone / iPad): the on-screen controls feed game.pad, so every existing
// control path works unchanged. Visible only in a match, only on a touch device.
const touch = new TouchControls(game.pad);
// ⚠ ORDER: game.update() polls pad.update() first, and that CLEARS cur/lx/ly when no physical
// pad is present — so touch must merge in AFTER the poll, not before. Wrap it.
const _padUpdate = game.pad.update.bind(game.pad);
game.pad.update = () => { _padUpdate(); touch.apply(); };
if (isTouchDevice()) {
  document.body.classList.add('is-touch');
  touch.mount();
  addEventListener('orientationchange', () => setTimeout(() => game.world.resize(), 250));
}
game.touch = touch;

// CONTROLLER MENU NAVIGATION — makes every screen drivable from a pad (Steam Deck).
const uinav = new UINav(game, hud);
game.uinav = uinav;
// THE SOUNDSCAPE — city ambience + civilian voices. Starts on the first audio unlock.
const soundscape = new Soundscape(audio);
game.soundscape = soundscape;
game.peds.soundscape = soundscape;

const tutorial = new Tutorial(game, hud);
// ---- ONLINE: rooms + netcode (Supabase Realtime transport) ----
const netplay = new Netplay(game, hud);
game.netplay = netplay; hud.netplay = netplay;
netplay.onMatchStart = (cfg) => enter(cfg);
netplay.onMatchEnd = () => openMenu();
netplay.onLobby = () => { if (hud.onlineEl.style.display === 'flex') hud.renderOnline(); };
function enter(cfg) {
  audio.init(); audio.resume(); applySettings(game); soundscape.start();   // buses exist only after init
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
      // THE VIGILANTISM LAW: the country decides how this street reacts to a superweapon.
      game.peds.setVigilantism((countryOf(plan.country) || {}).vigilantism);
      hud.feed('Theater: ' + plan.name.toUpperCase() + (plan.country ? ' · ' + plan.country : ''), '#7fb0d0');
    }
  } catch (err) { console.error('theater', err); }
  savePrefs(c);                // (3) remember this loadout for next launch
  game.startMode(c.mode || 'training', c);
  hud.setPlayer(ROSTER.find(r => r.id === (c.p1 || 'sol')));
  hud.armHintTimer();          // the control wall shows for ~18s, then folds into a corner chip (F1)
  touch.show(isTouchDevice());  // thumb controls belong to the match, not the menus
  document.body.classList.add('playing');
  started = true; game._lastCfg = c;
  hud.hideEndScreen(); hud.hideTitle();
  soundscape.music('combat');
  // THE ESTABLISHING SHOT — the city names itself before you're standing in it.
  try {
    const plan = game.world.plan;
    if (plan) {
      const sim = (c.mode || 'training') === 'training';
      const C = countryOf(plan.country) || {};
      hud.showEstablishing(plan, { sim, country: C, eta: game.police ? Math.round(game.police._responseDelay()) : null,
        kicker: c.mode === 'tournament' ? 'THE INVITATIONAL · THEATER' : 'THEATER OF OPERATIONS' });
    }
  } catch (err) { console.error('establishing', err); }
  if (c.tutorial) tutorial.begin(); else tutorial.skip();
}
hud.onBracketContinue = () => { if (game._lastCfg) enter(game._lastCfg); };
hud.onProvingGround = () => enter({ mode: 'training', p1: hud.selectedHero || 'sol' });
function openMenu() { soundscape.music('menu'); game.running = false; touch.show(false); document.body.classList.remove('playing'); hud.hideEndScreen(); hud.buildTitle(enter); hud.showTitle(); }

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
// ---------- QUALITY OF LIFE ----------
// (1) AUTO-PAUSE on tab blur — you should never come back to a corpse because you alt-tabbed.
addEventListener('blur', () => {
  if (started && game.running && !hud.titleOpen && !game.matchOver) { game.running = false; hud.setPaused(true); game._blurPaused = true; }
});
// (2) AUDIO UNLOCK — browsers block sound until a gesture; take the first one we get.
const unlock = () => { try { audio.init(); audio.resume(); applySettings(game); soundscape.start(); } catch {} };
addEventListener('pointerdown', unlock, { once: true });
addEventListener('keydown', unlock, { once: true });
// (3) REMEMBER THE LAST LOADOUT — hero, mode and tournament format survive a reload.
const PREF = 'threshold_prefs_v1';
function savePrefs(c) { try { localStorage.setItem(PREF, JSON.stringify({ p1: c.p1, mode: c.mode, format: c.format, two: c.twoPlayer })); } catch {} }
export function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF) || 'null'); } catch { return null; } }
hud.prefs = loadPrefs();
// (4) MUTE PERSISTS and says so, instead of silently forgetting between sessions.
try { audio.muted = localStorage.getItem('threshold_muted') === '1'; } catch {}

addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && hud.overlayOpen()) { hud.closeOverlays(); return; }   // options/how-to first
  if (e.code === 'F1') { e.preventDefault(); hud.toggleHint(); return; }           // controls, on demand
  if (e.code === 'F2') { e.preventDefault(); hud.toggleTelemetry(); return; }      // (5) telemetry in ANY mode
  // (6) END SCREEN KEYS — Enter takes the rematch, Esc goes to the menu. No mouse hunt.
  if (started && game.matchOver && hud.el.end.style.display !== 'none') {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { const b = hud.el.end.querySelector('#eRematch'); if (b) { b.click(); return; } }
    if (e.code === 'Escape') { const b = hud.el.end.querySelector('#eMenu'); if (b) { b.click(); return; } }
  }
  // (7) "/" jumps to the roster search instead of reaching for the mouse
  if (e.key === '/' && hud.titleOpen) { const q = document.querySelector('#fQ'); if (q) { e.preventDefault(); q.focus(); q.select(); return; } }
  if (!started) return;
  if (e.code === 'Tab') { e.preventDefault(); if (!hud.titleOpen) openMenu(); else { game.running = true; hud.hideTitle(); } return; }
  if (e.code === 'Escape' && game.player && !hud.titleOpen) { game.running = !game.running; hud.setPaused(!game.running); return; }
  if (game.running === false) return;
  // brackets swap hero in the non-classic schemes (the wheel is busy selecting powers there)
  const KM = keymap(SETTINGS.scheme);
  if (KM.wheel !== 'hero') {
    if (e.code === 'BracketRight') { cycleHero(1); return; }
    if (e.code === 'BracketLeft') { cycleHero(-1); return; }
  }
  if (e.code === 'KeyB') { const b = game.spawnRival(); hud.feed('A rival ' + b.name + ' enters the arena!', b.def.colors.accent); }
  if (e.code === 'KeyM') { audio.muted = !audio.muted; try { localStorage.setItem('threshold_muted', audio.muted ? '1' : '0'); } catch {} hud.feed(audio.muted ? '🔇 Muted (M)' : '🔊 Sound on (M)', '#9fb2c9'); }
  if (KM.digitsSwap && e.code in digits) { const c = ROSTER[digits[e.code]]; if (c) { game.setPlayerChar(c.id); hud.setPlayer(c); hud.feed('Now piloting ' + c.name + ' · ' + c.title, c.colors.accent); } }
});

// WHEEL-SELECT: step through the hero's power slots and fire the chosen one with LMB. The HUD
// slot lights up so the wheel has a visible consequence instead of being a silent state change.
const ABIL_ORDER = ['lmb', 'rmb', 'q', 'e', 'f', 'r'];
function cycleAbility(dir) {
  const p = game.player; if (!p) return;
  const have = ABIL_ORDER.filter(k => p.slots[k]);
  if (!have.length) return;
  const cur = have.indexOf(have.includes(p._selSlot) ? p._selSlot : have[0]);
  const next = have[(cur + dir + have.length) % have.length];
  p._selSlot = next;
  hud.selectSlot(next);
  hud.feed('▸ ' + (p.slots[next].def.name || next).toUpperCase(), 'var(--gold)');
}
function cycleHero(dir) {
  if (!game.player) return;
  const cur = ROSTER.findIndex(r => r.id === game.player.def.id);
  const n = ROSTER[(cur + dir + ROSTER.length) % ROSTER.length];
  game.setPlayerChar(n.id); hud.setPlayer(n); hud.feed('Now piloting ' + n.name + ' · ' + n.title, n.colors.accent);
  if (game.player) game.player._selSlot = 'lmb';   // a new kit means a new slot list — never point at a stale power
  hud.selectSlot('lmb');
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
    if (!started) { game.pad.update(); uinav.update(Math.min(dt, 0.05)); }   // menus are drivable before the first match
    if (started) {
      hud.update(); padSystem();
      uinav.update(Math.min(dt, 0.05));
      // The help panel must follow the DEVICE. Plug a pad in mid-match and the glyphs swap.
      { const p = !!(game.pad && game.pad.connected && game.pad.active);
        if (p !== hud._hintPad) hud.buildHintBody(); }
      if (game.running) soundscape.update(Math.min(dt, 0.05), game);
      if (game.running) tutorial.update(Math.min(dt, 0.05));
      if (game.running) netplay.update(Math.min(dt, 0.05));
      // WHEEL: classic swaps hero; the other schemes cycle your selected POWER instead, which is
      // what you reach for mid-fight (hero swap moves to the brackets).
      if (game.running && !hud.titleOpen && input.wheel) {
        if (keymap(SETTINGS.scheme).wheel === 'hero') cycleHero(Math.sign(input.wheel));
        else cycleAbility(Math.sign(input.wheel));
      }
    }
  }
  catch (err) { console.error(err); }
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// expose for debugging + performance benchmarking
window.LSW = { game, hud, ROSTER, runSlot, performEvade, input, tutorial, netplay, uinav, soundscape, SETTINGS, KEYMAPS, creator: { ui: creator, freshPicks, buildDef, tally, validate, saveCustom, deleteCustom, loadCustoms } };
window.LSW.runBenchmark = (opts) => runBenchmark(game, hud, opts);
if (location.search.includes('bench')) {
  addEventListener('load', () => setTimeout(async () => {
    const r = await runBenchmark(game, hud);
    console.log('%cLSW benchmark', 'font-weight:bold'); console.table({ frame: r.frame, update: r.update, render: r.render, hud: r.hud });
    console.log(JSON.stringify(r, null, 2));
    window.LSW.lastBench = r;
  }, 400));
}
