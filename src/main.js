// WAR WORLD: ASCENDANTS — bootstrap.
import { Input } from './core/input.js';
import { DevConsole } from './engine/devconsole.js';
import { Comic } from './engine/comic.js';
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
import { playOpening } from './engine/opening.js';
import { Netplay } from './engine/netplay.js';
import { Tournament } from './engine/tournament.js';
import { TouchControls, isTouchDevice } from './core/touch.js';
import { UINav } from './core/uinav.js';
import { Soundscape } from './core/soundscape.js';
import { validateRoster } from './engine/abilityMeta.js';
import { validateVis, applyDtypes } from './data/visual.js';
import { TYPES } from './engine/abilities.js';
import { PW_KB } from './core/util.js';   // the POWERWORLD knockback dial — tunable live from the console
import { loadCareer, saveCareer, clearCareer, newCareer, genSlate, acceptCfg, resolveOffer, restWeek, payClinic, fmtMoney } from './data/career.js';
import { CareerUI } from './engine/careerUI.js';
import { cityList } from './data/cities.js';
import { org as loadOrg } from './data/org.js';
import { openHQGlobe } from './engine/hqglobe.js';
import { openArmory } from './engine/armoryUI.js';
import { selectHand, cycleHand, handLabel, handsOf } from './engine/hands.js';

const canvas = document.getElementById('game');
const input = new Input(); input.bind(canvas);
const audio = new AudioBus();
const game = new Game(canvas, input, audio);
const hud = new HUD(game);
game.hud = hud;
game.world.prewarm();   // compile lazy FX shaders up-front — no first-use hitches mid-fight
loadSettings(); applySettings(game);   // player settings (volume/shake/quality/HUD) from localStorage
// THE DEV CONSOLE — ` or the >_ button. Mounted at boot because the things worth debugging (a gate
// that refuses silently, a band that doesn't match the buildings) happen before you'd think to ask.
// THE COMIC LAYER — captions, balloons and SFX. Ticked from the HUD's own frame rather than the
// sim, so a caption can never reach the game loop; `clearTransients` empties it with everything
// else that must not outlive a match (the reset law).
const comic = new Comic(game);
game.comic = comic;

const dev = new DevConsole(game, hud);
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
// PHONE MODE (Robert's ruling 2026-07-24: "the screen on iPhone is waaay too crowded") — a
// coarse-pointer device with a phone-sized short edge gets the stripped HUD (body.phone: the
// thumb zones own the corners; radar/hints/chips/pip get out of the way) and a lower pixel
// budget (a phone GPU at DPR 3 drowns in the full 2.6MP cap).
// ⚠ iPadOS Safari masquerades as macOS — never sniff the UA; coarse pointer + touch points
// is the honest signal. The ladder: PHONE (short edge ≤500) · TABLET (≤1100) · desktop.
const touchy = () => matchMedia('(pointer: coarse)').matches || isTouchDevice() || navigator.maxTouchPoints > 1;
function applyPhoneMode() {
  const short = Math.min(innerWidth, innerHeight);
  const phone = touchy() && short <= 500;
  const tablet = touchy() && !phone && short <= 1100;
  // STEAM DECK: Valve's browser carries the token; a 1280x800 window with a pad plugged in is
  // the same machine wearing a different hat. 7-inch panel = the TYPE gets bigger, not the HUD.
  const padIn = !!(navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean));
  const deck = !phone && !tablet && (/steam ?deck/i.test(navigator.userAgent) || (padIn && innerWidth === 1280 && innerHeight === 800));
  document.body.classList.toggle('phone', phone);
  document.body.classList.toggle('tablet', tablet);
  document.body.classList.toggle('deck', deck);
  // ⚠ `_pixelBudget`, NOT `_pixelCap`. `_pixelCap` is the clamp METHOD; this is the BUDGET it reads.
  // Assigning a number over the method made `Math.min(fn || 2.6e6, …)` evaluate to NaN and then
  // broke every later call — the game did not boot at all on a phone (the throw landed at module
  // top level and the rAF loop below never started) and the quality governor was pinned on iPad.
  // Neither cap had ever actually applied. See the comment on `_pixelCap` in world.js.
  if (phone) {
    game.world._pixelBudget = Math.min(game.world._pixelBudget || 2.6e6, 1.35e6);
    if (game.world._qTier > 1 && !game.world.qualityOverride) { game.world._qTier = 1; game.world._applyQuality && game.world._applyQuality(); }
  } else if (tablet) {
    game.world._pixelBudget = Math.min(game.world._pixelBudget || 2.6e6, 2.0e6);   // retina tablets drown at full budget too
  } else {
    game.world._pixelBudget = 2.6e6;   // back to the desktop budget if the window grew past a tablet
  }
  if (deck && game.pad) game.pad.preferGlyphs = true;   // the hint panel already speaks pad when one is active
}
applyPhoneMode();
addEventListener('resize', applyPhoneMode);
window.LSW_phone = applyPhoneMode;   // headless verification hook

// CONTROLLER MENU NAVIGATION — makes every screen drivable from a pad (Steam Deck).
const uinav = new UINav(game, hud);
game.uinav = uinav;
// THE SOUNDSCAPE — city ambience + civilian voices. Starts on the first audio unlock.
const soundscape = new Soundscape(audio);
game.soundscape = soundscape;
game.peds.soundscape = soundscape;
game.peds.audio = game.audio;          // the sample bank, for recorded screams and gasps

const tutorial = new Tutorial(game, hud);
// ---- ONLINE: rooms + netcode (Supabase Realtime transport) ----
const netplay = new Netplay(game, hud);
game.netplay = netplay; hud.netplay = netplay; game.soundscape = soundscape;   // the ambience director reads the fight (manual §20)
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
    // ⚠ THE THEATER SIGNATURE. This used to compare NAME AND SEED only, so every other thing the
    // map maker can change — grid size, cell size, population preset, coastline, and every painted
    // cell — silently failed to reach the match: you authored a city and then fought in the old one.
    const sig = (p) => p && [p.name, p.seed, p.N, p.cell, p.waterCols, p.popType, p.flagship,
      p.cells ? p.cells.flat().map(c => c ? c.t + (c.v ?? '') : '-').join('') : ''].join('|');
    if (plan && sig(cur) !== sig(plan)) {
      game.world.rebuildCity(plan);
      // THE VIGILANTISM LAW: the country decides how this street reacts to a superweapon.
      game.peds.setVigilantism((countryOf(plan.country) || {}).vigilantism);
      hud.feed('Theater: ' + plan.name.toUpperCase() + (plan.country ? ' · ' + plan.country : ''), '#7fb0d0');
    }
  } catch (err) { console.error('theater', err); }
  if (!c.career) game._careerOffer = null;   // the stamp belongs to career bouts only
  savePrefs(c);                // (3) remember this loadout for next launch
  // hand LAST match's footage to the opening director BEFORE startMode wipes it — the broadcast
  // opener replays your own previous coverage ("a previous news report with them in it")
  if (game.news && game.news.clips && game.news.clips.length) { game._openingClips = game.news.clips; game.news.clips = []; }
  game.startMode(c.mode || 'training', c);
  hud.setPlayer(ROSTER.find(r => r.id === (c.p1 || 'sol')));
  hud.armHintTimer();          // the control wall shows for ~18s, then folds into a corner chip (F1)
  touch.show(isTouchDevice());  // thumb controls belong to the match, not the menus
  document.body.classList.add('playing');
  started = true; game._lastCfg = c;
  hud.hideEndScreen(); hud.hideTitle();
  soundscape.music('combat');
  // THE OPENING — cinematic (1 of 10, the director) · quick (the establishing card) · off.
  // The Danger Room keeps its holo boot card; tutorials and net matches stay quick for sync.
  try {
    const plan = game.world.plan;
    if (plan) {
      const sim = (c.mode || 'training') === 'training';
      const C = countryOf(plan.country) || {};
      const co = c.career && game._careerOffer;   // the fight carries the career fiction
      const kicker = c.mode === 'tournament' ? 'THE INVITATIONAL · THEATER'
        : co ? 'THE CIRCUIT · ' + co.label + ' · PURSE ' + fmtMoney(co.stake ? co.purse * 2 : co.purse) + (co.stake ? ' — DOUBLE OR NOTHING' : '')
        : 'THEATER OF OPERATIONS';
      if (!sim && !c.tutorial && !c.net && SETTINGS.opening === 'full' && !game._traveling) {
        playOpening(game, hud, plan, { kicker }, null);
      } else if (sim || SETTINGS.opening !== 'off') {
        hud.showEstablishing(plan, { sim, country: C, eta: game.police ? Math.round(game.police._responseDelay()) : null, kicker });
      }
    }
  } catch (err) { console.error('opening', err); }
  // THE DENIABLE OPERATION (data/career.js POSTURES): you are in a country your own state has no
  // standing in, so the law is looking for you from the opening bell rather than after the first
  // civilian goes down. Booked through the police system's own heat map — no second mechanism.
  if (c.govFlagged && game.police && game.player) {
    try { game.police.heat.set(game.player, 40); hud.feed('NO COVER — local services are not expecting you', '#c9503a'); }
    catch (err) { game.reportError(err, 'govFlagged'); }
  }
  if (c.tutorial) tutorial.begin(); else tutorial.skip();
}
hud.onBracketContinue = () => { if (game._lastCfg) enter(game._lastCfg); };
// LOW ORBIT TRAVEL (manual §17): the depart gate opens the world map; picking a city plays the
// transit cinematic (the loading screen), swaps the theater, and re-enters the same mode there.
game.onDepart = () => { game.running = false; hud.showDepart(game); };
game.onTravel = (city, cityId, planetId) => {
  hud.theater = planetId
    ? { planet: planetId, name: city.name, country: city.country, seed: 1 + ((Math.random() * 97) | 0) }
    : { cityId, name: city.name, country: city.country, seed: 1 + ((Math.random() * 97) | 0) };
  try { localStorage.setItem('threshold_theater_v1', JSON.stringify(hud.theater)); } catch (e) {}
  game._departing = false; game._traveling = true;
  try { enter(game._lastCfg || { mode: 'training', p1: game.player ? game.player.def.id : 'sol' }); }
  finally { game._traveling = false; }
};
hud.onProvingGround = () => enter({ mode: 'training', p1: hud.selectedHero || 'sol' });
// THE SKY FOLLOWS THE THEATRE. One notification point — the world tells us it rebuilt, we tell it
// which world it is standing on, so a Mars match gets Mars' sky and a return trip gets Earth's back.
const _prevRebuilt = game.world.onRebuilt;
game.world.onRebuilt = (plan) => {
  if (_prevRebuilt) _prevRebuilt(plan);
  const t = hud.theater;
  game.world.setSkyWorld((t && t.planet) || 'earth');
};
// ---- THE CIRCUIT: the single-player career loop (data/career.js + engine/careerUI.js) ----
const careerUI = new CareerUI(ROSTER);
function openDesk() {
  let C = loadCareer();
  if (C && !ROSTER.find(d => d.id === C.heroId)) { /* orphaned custom — the desk offers retirement */ }
  else if (!C) {
    // THE STATE YOU ANSWER TO. A firm's country if one has been founded, otherwise the fighter's
    // own homeland — every hero has one (data/identities.js), so government contracts work from
    // week one without waiting on the founding flow.
    const hid = hud.selectedHero || (game._lastCfg && game._lastCfg.p1) || 'sol';
    const hd = ROSTER.find(r => r.id === hid);
    C = newCareer(hid, (hd && hd.person && hd.person.co) || null); saveCareer(C);   // `co`, not `country`
  }
  if (!C.slate) { C.slate = genSlate(C, ROSTER); saveCareer(C); }
  hud.hideTitle(); hud.hideEndScreen();
  careerUI.show(C, {
    onAccept: (offer) => {
      const cfg = acceptCfg(C, offer);
      game._careerOffer = offer;
      careerUI.hide();
      const cur = game.world.plan || {};
      const moving = offer.city && !(cur.name === offer.city.name && cur.country === offer.city.country);
      if (offer.city) {
        const idx = cityList().findIndex(x => x.name === offer.city.name && x.country === offer.city.country);
        if (idx >= 0) {
          hud.theater = { cityId: idx, name: offer.city.name, country: offer.city.country, seed: 1 + ((C.seed + C.week * 13) % 97) };
          try { localStorage.setItem('threshold_theater_v1', JSON.stringify(hud.theater)); } catch (e) {}
        }
      }
      if (moving) {
        // the transit cinematic IS the loading screen between career theaters (manual §17)
        game._traveling = true;
        hud._playTransit(game, { name: cur.name || 'THE WHITE CITY', country: cur.country || 'USA' }, offer.city,
          () => { try { enter(cfg); } finally { game._traveling = false; } });
      } else enter(cfg);
    },
    onStakeToggle: () => saveCareer(C),
    onRest: () => { const h = restWeek(C, ROSTER); saveCareer(C); if (h && h.cleared) hud.feed('MEDICAL: ' + h.name + ' healed — cleared to fight', '#8fe08a'); careerUI.render(C); },
    onClinic: () => { const h = payClinic(C); if (h) { saveCareer(C); hud.feed('THE CLINIC: ' + h.name + (h.cleared ? ' healed' : ' treated'), '#8fe08a'); } careerUI.render(C); },
    onRetire: () => { clearCareer(); careerUI.hide(); openMenu(); },
    onClose: () => { careerUI.hide(); openMenu(); },
  });
}
hud.onCircuit = openDesk;

// THE FIRM's front door. ⚠ The whole company — payroll, the four kinds of person, the research tree
// — was reachable only from the dev console, which means it was not shipped. Incorporation now
// happens ON THE GLOBE, because two dropdowns make it an administrative step and a planet makes it
// a geopolitical one: you can see that choosing Zurich over Mogadishu is choosing a set of
// neighbours. Already founded → the same globe, framed on your own headquarters.
// THE ARMORY's door. 35 rows of real weapons and gear with their own measured audio signatures, and
// until now the only way to see any of it was `arm <id>` in the dev console.
hud.onArmory = () => openArmory(game, hud);

hud.onFirm = () => {
  const g = openHQGlobe(game, hud, (res) => {
    if (res && res.ok) {
      hud.feed('INCORPORATED: ' + res.firm + ' · ' + res.city + ', ' + res.country, '#e0b23c');
      if (res.stateNamed) hud.feed('THE STATE NAMED YOUR FIRM — ' + res.why, '#c9564a');
      hud.buildTitle(enter);                           // the banner reads the save, so rebuild it
    }
  });
  // frame it on the existing headquarters if there is one
  try {
    const o = loadOrg();
    if (g && o && o.founded) {
      const L = cityList();
      const i = L.findIndex(c => c.name === o.city && c.country === o.country);
      if (i >= 0) g.select(i);
    }
  } catch (e) {}
};
hud.onCareerContinue = () => { soundscape.music('menu'); game.running = false; touch.show(false); document.body.classList.remove('playing'); openDesk(); };
// a decided career bout books itself the moment the match ends — even if the player
// goes straight to the main menu from the news screen, the week has turned
game.onMatchEnd = (result) => {
  const offer = game._careerOffer;
  if (!offer || offer._booked) return;
  offer._booked = true;
  const C = loadCareer(); if (!C) return;
  const out = resolveOffer(C, offer, !!result.win, ROSTER);
  saveCareer(C);
  hud.feed('THE CIRCUIT: ' + (result.win ? 'WIN' : 'LOSS') + ' booked — paid ' + fmtMoney(out.paid) + ' · renown +' + out.ren, '#ffd24a');
  if (offer.kind === 'title' && result.win) hud.announce('NEW CHAMPION', 'The belt changes hands — the cold open will say your name', '#ffd24a');
};
function openMenu() { soundscape.music('menu'); game.running = false; touch.show(false); document.body.classList.remove('playing'); hud.hideEndScreen(); hud.buildTitle(enter); hud.showTitle(); }

// ---- ORIGIN: install saved customs, wire the forge ----
installCustoms(ROSTER);
applyIdentities(ROSTER);   // every weapon is a PERSON from a real place (def.person)
// THE VISUAL CONTRACT closes the damage-type loop (manual §3 + §24): only five abilities in
// the roster ever declared a `dtype`, so cold cones dealt ENERGY and frostResist did nothing.
// MATERIAL already knows what a power is made of — stamp the type from it, once, at boot.
console.log('[THRESHOLD] damage types derived for', applyDtypes(ROSTER), 'abilities');
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

// THE ROSTER VALIDATOR (code review item 1): a typo'd ability type is a silent dead slot
// forever. Check the whole roster — customs included — once at boot, and SAY so.
try {
  const problems = validateRoster(ROSTER, TYPES).concat(validateVis(ROSTER));
  if (problems.length) {
    console.error('[THRESHOLD] ROSTER VALIDATION — %d problem(s):', problems.length);
    for (const p of problems) console.error(`  ${p.id}.${p.slot}: ${p.msg}`);
    setTimeout(() => hud.feed(`⚠ ROSTER: ${problems.length} ability problem(s) — see console`, '#ff8a6a'), 1500);
  } else console.log('[THRESHOLD] roster OK —', ROSTER.length, 'weapons,',
    ROSTER.reduce((n, d) => n + Object.keys(d.abilities || {}).length, 0), 'slots validated');
  window.LSW_validate = () => validateRoster(ROSTER, TYPES);
} catch (e) { console.error('roster validation', e); }

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
  // ⚠ THE CONSOLE EATS THE KEYBOARD WHILE IT IS FOCUSED. Without this, typing `hero sol` also
  // throws a punch, guards, and cycles the roster — every letter is a binding somewhere.
  if (dev && dev.open && document.activeElement === dev.in) return;
  if (e.code === 'Backquote') { e.preventDefault(); dev && dev.toggle(); return; }
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
  // ⚠ NOT IN THE BLUE ROOM. Its entire promise is that nothing in it will attack you; a hotkey that
  // drops a rival on top of a player still learning to walk would break that on the first mistyped key.
  if (e.code === 'KeyB') {
    if (game.lab && game.lab.room === 'blue') hud.feed('Not in the blue room — the console opens the white room next door.', '#7fe6ff');
    else { const b = game.spawnRival(); hud.feed('A rival ' + b.name + ' enters the arena!', b.def.colors.accent); }
  }
  // ORDER A TRAINING BOT — the Danger Room starts empty now; targets appear on command
  if (e.code === 'KeyN' && (game.modeId === 'training' || game.modeId === 'freeroam') && game.player) {
    const p = game.player, a = Math.random() * Math.PI * 2;
    game.spawnDummy(p.pos.x + Math.cos(a) * 16, p.pos.z + Math.sin(a) * 16);
    hud.feed('Sim Construct deployed', '#7fe6ff');
  }
  // THE WHITE ROOM — N is the dummy's temperament: a bag that stands still, or a partner that
  // fights back. The same attack measures differently against a raised guard, which is the point.
  if (e.code === 'KeyN' && game.modeId === 'lab' && game.lab) {
    if (game.lab.room === 'blue') hud.feed('The blue room keeps a passive bag. Use the console for the white room.', '#7fe6ff');
    else {
      const on = game.lab.setAggressive(!game.lab.aggressive);
      hud.feed(on ? 'DUMMY: SPARRING — it fights back' : 'DUMMY: PASSIVE — it stands and takes it',
               on ? '#ff5a4a' : '#7fe6ff');
    }
  }
  if (e.code === 'KeyR' && e.shiftKey && game.modeId === 'lab' && game.lab) {
    game.lab.telemetry.reset(); hud.feed('Test log cleared', '#8fe08a');
  }
  if (e.code === 'KeyM') { audio.muted = !audio.muted; try { localStorage.setItem('threshold_muted', audio.muted ? '1' : '0'); } catch {} hud.feed(audio.muted ? '🔇 Muted (M)' : '🔊 Sound on (M)', '#9fb2c9'); }
  // ⚠ REVIEW ITEM 13 — DIGIT PAGING. Number keys reached only 10 of 52 heroes, so 42 of them
  // were TAB-only forever. SHIFT pages the digit bank (1-10 / 11-20 / …), so every hero on the
  // roster is two keys away instead of unreachable. The page wraps and is announced.
  // ⚠ THE DIGITS BELONG TO WHICHEVER SCHEME ASKED FOR THEM, and `digitsSwap` already decides.
  // CLASSIC keeps 1–0 for hero swap; the other three schemes leave them free, so THE HANDS take
  // them there. One flag, no new branch, and the two features can never both claim a key.
  if (!KM.digitsSwap && e.code in digits && game.running && game.player) {
    const i = digits[e.code] + 1;
    if (i <= 4) { selectHand(game, game.player, i); hud.updateHands && hud.updateHands(game.player); }
  }
  if (KM.digitsSwap && e.code in digits) {
    const page = e.shiftKey ? ((game._digitPage = ((game._digitPage || 0) + 1) % Math.ceil(ROSTER.length / 10))) : (game._digitPage || 0);
    const idx = page * 10 + digits[e.code];
    const c = ROSTER[idx];
    if (e.shiftKey) hud.feed(`ROSTER PAGE ${page + 1}/${Math.ceil(ROSTER.length / 10)} — keys 1-0 now select ${page * 10 + 1}-${Math.min(ROSTER.length, page * 10 + 10)}`, '#ffd24a');
    else if (c) { game.setPlayerChar(c.id); hud.setPlayer(c); hud.feed('Now piloting ' + c.name + ' · ' + c.title, c.colors.accent); }
    else hud.feed(`No weapon in slot ${idx + 1}`, '#8b8577');
  }
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
  // A bad frame must never stop the loop, and must never flood the console at 60Hz either —
  // game.reportError dedupes, counts, and tells the player once. See the repeated-error law.
  catch (err) { game.reportError(err, 'frame'); }
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Anything thrown OUTSIDE the frame (a timer, a promise, an event handler) never reaches the
// catch above. Funnel those through the same throttle so one broken callback can't flood either.
window.addEventListener('error', (e) => { if (e && e.error) game.reportError(e.error, 'window'); });
window.addEventListener('unhandledrejection', (e) => game.reportError(e && e.reason, 'promise'));

// expose for debugging + performance benchmarking
window.LSW = { dev, comic, game, hud, ROSTER, runSlot, performEvade, input, tutorial, netplay, uinav, soundscape, SETTINGS, KEYMAPS, playOpening, PW_KB, hands: { handsOf, selectHand, cycleHand, handLabel }, creator: { ui: creator, freshPicks, buildDef, tally, validate, saveCustom, deleteCustom, loadCustoms } };
window.LSW.runBenchmark = (opts) => runBenchmark(game, hud, opts);
// POWERWORLD's own suite (manual §47) — the throwable/destructible stage, the knockback dial, and
// the city-is-unchanged control. Lazy so the bench never costs the boot a byte.
window.LSW.pwSuite = async (opts) => (await import('./bench/powerworld.js')).pwSuite(game, hud, opts);
if (location.search.includes('bench')) {
  addEventListener('load', () => setTimeout(async () => {
    const r = await runBenchmark(game, hud);
    console.log('%cLSW benchmark', 'font-weight:bold'); console.table({ frame: r.frame, update: r.update, render: r.render, hud: r.hud });
    console.log(JSON.stringify(r, null, 2));
    window.LSW.lastBench = r;
  }, 400));
}

