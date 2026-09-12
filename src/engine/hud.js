import {meleeEntryCue,meleeSequenceCue} from './melee-entry-cue.js';
// WAR WORLD: ASCENDANTS — DOM HUD + character-select screen.
import { CodexMixin } from './hudCodex.js';
import {attackGuide,attackMatchup} from './combat-guide.js';
import {damageBadges} from './damage-symbols.js';
import {playerStatus} from './player-status.js';
import {unitsToMeters} from '../core/world-units.js';
import {firearmStatus} from './firearm-ammo.js';
import {firearmSightZoom} from './firearm-aim.js';
import { rankOf, rankBandOf } from '../data/scale.js';
import { playSpaceFlight } from './spaceflight.js';
import { BroadcastMixin } from './hudBroadcast.js';
import { TitleMixin } from './hudTitle.js';
import { SelectMixin } from './hudSelect.js';
import { esc, fileNoOf, fileDate, agoStr, isSynthDef, cfAbilityRows, cfCounterNotes, CF_BUILD, describeEvade, describeAbility, slotFacts } from './hudUtil.js';
import { ROSTER, SLOT_ORDER } from '../data/characters.js';
import {slotUnlocked,unlockLevel} from '../data/progression.js';
import {remoteAttack} from './remote-control.js';
import {combatView,combatLookActive} from './combat-view.js';
import { climateLine } from '../data/climate.js';
import { PLANETS, AU_KM, HELIOPAUSE_AU, TERMINATION_SHOCK_AU, SCALE_LADDER, NEAR_STARS, transitSecsFor, worldEnv } from '../data/planets.js';
import { clockStr } from '../data/news.js';
import { GEO_ATTRIBUTION, cityLatLon } from '../data/citycoords.js';
import { gameDate, dateStr } from '../data/orbits.js';
import { CSS, CODEX_MOBILE, PHONE_CSS, TABLET_CSS, DECK_CSS, POWERWORLD_CSS } from './hud.styles.js';
import { DTYPES, DTYPE_INFO, resistOf, bandOf } from './entity.js';
import { handLabel } from './hands.js';
import { glyph, padActive, padFaces } from '../core/glyphs.js';
import { MODES, hasCity } from '../data/modes.js';
import { visOf, visLine } from '../data/visual.js';
import { districtLine } from '../data/districts.js';
import { loadCareer, fmtMoney } from '../data/career.js';
import { clamp, TAU } from '../core/util.js';
import { ATTR_DEFS, TALENTS, deriveAttrs, heroTalents, rankName, rankColor, RANKS, bakeSheet } from '../data/ranks.js';
import { LOOK_PRESETS, SETTINGS, saveSettings, applySettings, KEYMAPS, keymap } from '../core/settings.js';
import {CAMERA_OPTION_LIMITS,getCameraPreferences,setCameraPreferences,resetCameraPreferences} from '../core/camera-settings.js';
import {cameraProfileOf} from '../data/camera-presets.js';
import {CAMERA_DEFAULTS} from '../data/flight-tuning.js';
import { identityOf } from '../data/identities.js';
import { icon, ATTR_ICON, ICON_MEANING } from './icons.js';
import { writeBroadcast, tapeRows, llmPunchUp, titleCase, money, causeLine, mulberry } from '../data/news.js';
import { injuryOf, recOf, snapshotTable, rankingTable, recentIncidents, championId, tournamentNo } from '../data/rankings.js';
import { cityList } from '../data/cities.js';
import { generatePlan, thresholdPlan, galleryPlan, TILE_INFO, VARIANTS, popLabel, CELL, CELL_RANGE, POP_TYPES, TILE_FOOT, TILE_SIZES, NO_RESCUE, applyPlanEdits, regionOf, ROAD, validatePlan } from '../data/cityplan.js';
import { mountAtlas } from './atlasUI.js';
import {attackIcon} from './attack-icons.js';
import {attackEntryCost} from './hand-emission.js';
import {selectedAttacks} from '../core/combat-selection.js';
import {DUAL_TRIGGER_CSS} from './dual-trigger.styles.js';
import {PlayerStatusView} from './player-status-view.js';


// ---- THRESHOLD REGISTRY paperwork: file numbers, country codes, deterministic file dates ----

// (KEYMAPS live in core/settings.js so game.js can read them without importing the HUD)

// ---- THE CODEX: case-file generators — every line derived from the REAL kit data ----
// countermeasure doctrine — what the Treaty would actually brief a responder

// (stylesheet lives in hud.styles.js — extracted 2026-07-24)


// Derive a 0–10 stat profile + trait tags from a character's raw data.
export function heroStats(d) {
  const A = Object.values(d.abilities || {});
  const maxOf = (fn) => A.reduce((m, a) => Math.max(m, fn(a) || 0), 0);
  const maxDmg = maxOf(a => a.dmgMax || a.damage || a.finisher || (a.dps ? a.dps * 0.5 : 0));
  const maxRange = maxOf(a => a.maxLen || (a.speed ? a.speed * 0.4 : 0) || a.range);
  const hasBlink = A.some(a => a.type === 'teleport') || d.teleEscape;
  const hasDash = A.some(a => a.type === 'dash');
  const n = (v, mx) => Math.max(1, Math.min(10, Math.round(v / mx * 10)));
  const tags = [];
  if (d.beamMight >= 1.2) tags.push('Beam Master');
  if (A.some(a => a.type === 'construct')) tags.push('Constructs');
  if (A.some(a => a.type === 'summon')) tags.push('Summoner');
  if (A.some(a => a.type === 'meteor')) tags.push('Artillery');
  if (A.some(a => a.type === 'charge')) tags.push('Charge');
  if (A.some(a => a.type === 'nova')) tags.push('Supernova');
  if (A.some(a => a.type === 'mindcontrol')) tags.push('Dominator');
  if (d.thorns) tags.push('Thorns');
  if (d.phase) tags.push('Phase');
  if (d.grabHeal) tags.push('Absorb');
  if (d.tentacles) tags.push('Tentacles');
  if (A.some(a => a.type === 'portal')) tags.push('Portals');
  if (A.some(a => a.type === 'rifle')) tags.push('Gunner');
  if (d.metal) tags.push('Armored');
  if (d.guardStrong) tags.push('Shield');
  if (d.energyInfinite) tags.push('∞ Core');
  if (d.flightTier === 0) tags.push('Grounded');
  else if (d.flightTier === 1) tags.push('Clumsy Flier');
  else if (d.flightTier === 2) tags.push('Levitator');
  if (d.flyStyle === 'ice') tags.push('Rider');
  if (d.flyStyle === 'fire') tags.push('Fire Wake');
  if ((d.items || []).length) tags.push('Gadgeteer');
  if (hasBlink) tags.push('Blink');
  if (A.some(a => a.fly) || d.speed >= 40) tags.push('Aerial');
  return {
    power: n(maxDmg, 90), range: n(maxRange, 170),
    mobility: Math.min(10, Math.round(d.speed / 45 * 6) + (hasBlink ? 3 : 0) + (hasDash ? 1 : 0)),
    defense: Math.min(10, Math.round(d.hp / 150 * 7) + (d.phase ? 2 : 0) + (d.thorns ? 1 : 0)),
    health: n(d.hp, 150), energy: n(d.ki, 130), speed: n(d.speed, 45),
    strength: d.strength ?? 5,
    tags: tags.slice(0, 7),
  };
}

// LeFevre Threat Level scale (Threshold Treaty)
export const THREAT_COLORS = { 'Low': 'var(--good)', 'Moderate': 'var(--gold)', 'High': '#ff9a3a', 'Very High': 'var(--danger)', 'Extreme': '#ff2f2f' };

// "What am I getting into?" — a mechanical AT-A-GLANCE derived from the ACTUAL kit, so it can
// never drift from the data. Returns [iconName, text, lead?] chips.
// RECOVERY on the LeFevre pattern — a tiered WORD, never a number (Robert 2026-07-24: "I don't
// want numbers cause it's hard to see how that relates to other things"). Derived from the live
// sheet multiplier, so it can never drift from what the engine actually regenerates.
export function recoveryTier(def) {
  if (def.energyInfinite) return '∞ CORE';
  const m = (bakeSheet(def).kiRegenMult) || 1;
  return m < 0.9 ? 'SLOW' : m < 1.05 ? 'STANDARD' : m < 1.25 ? 'QUICK' : m < 1.5 ? 'RAPID' : 'PRODIGIOUS';
}

export function kitFacts(def) {
  const A = Object.values(def.abilities || {});
  const st = heroStats(def);
  const has = (t) => A.some(a => a.type === t);
  const STYLE = {
    rusher: ['mobility', 'RUSHDOWN — closes fast, fights in your face'],
    beamer: ['energy', 'BEAM PRESSURE — sustained energy at range'],
    artillery: ['power', 'ARTILLERY — big shells from a distance'],
    zoner: ['range', 'ZONER — controls space, punishes approach'],
    bruiser: ['strength', 'BRUISER — mid-range brawling'],
    trickster: ['mobility', 'TRICKSTER — teleports & mixups'],
    grappler: ['might', 'GRAPPLER — seizes you and slams you'],
    summoner: ['person', 'COMMANDER — minions do the fighting'],
  };
  const out = [];
  const s = STYLE[def.ai && def.ai.style] || ['strength', 'BRAWLER'];
  out.push([s[0], s[1], true]);
  out.push(['range', st.range >= 7 ? 'LONG range' : st.range >= 4 ? 'MID range' : 'CLOSE range']);
  const str = def.strength ?? 5;
  // THE DESIGNATION, at a glance — the band a character sits in is the single most useful thing
  // you can tell someone about them before a fight, so it goes on the select screen, not just the
  // case file. Reads the ladder, so a def.rank override shows up here first.
  const _rk = rankOf(def), _rb = rankBandOf(_rk);
  out.push(['might', _rb.name.toUpperCase() + ' — RANK ' + _rk, true]);
  out.push(['fighting', str >= 7 ? 'HEAVY fists' : str >= 4 ? 'solid fists' : 'light fists']);
  const ft = def.flightTier ?? 3;
  out.push(['flight', ft === 0 ? 'grounded' : ft === 1 ? 'clumsy flier' : ft === 2 ? 'levitates' : 'full flight']);
  out.push(['energy', recoveryTier(def) + ' recovery']);
  if (def.guardType === 'deflect') out.push(['defense', 'DEFLECT guard — bullets bounce back']);
  else if (def.guardType === 'barrier') out.push(['defense', 'BARRIER guard — blocks 360°, costs ki']);
  // what they actually carry
  const nBeams = A.filter(a => a.type === 'beam').length;
  if (nBeams) out.push(['energy', nBeams > 1 ? nBeams + ' beams' : 'a beam']);
  if (has('rifle')) out.push(['range', 'guns']);
  if (has('bow')) out.push(['range', 'a payload bow']);
  if (has('charge')) out.push(['power', 'a charge bomb — hold to grow it']);
  if (has('growingorb')) out.push(['power', 'a giant channeled orb']);
  if (has('meteor')) out.push(['power', 'an airstrike ult']);
  if (has('summon')) out.push(['person', 'summons']);
  if (has('construct')) out.push(['might', 'solid-light constructs']);
  if (has('tentacle')) out.push(['might', 'a grab-chain — drag & slam']);
  if (has('portal')) out.push(['mobility', 'portals']);
  if (A.some(a => a.type === 'cone' && a.cold)) out.push(['defense', 'a FREEZE cone']);
  else if (has('cone')) out.push(['strength', 'a force cone']);
  if (has('mine')) out.push(['threat', 'proximity mines']);
  if (has('lifedrain')) out.push(['health', 'a life siphon']);
  if (has('rush')) out.push(['fighting', 'a multi-hit rush']);
  if (has('teleport')) out.push(['mobility', 'a teleport']);
  if (has('phase')) out.push(['defense', 'intangibility']);
  if (has('facebomb')) out.push(['threat', 'a homing seeker bomb']);
  if (has('nova')) out.push(['energy', 'a SUPERNOVA — the whole tank, one blast']);
  if (has('mindcontrol')) out.push(['intellect', 'a mind leash — one foe fights for them']);
  if ((def.items || []).length) out.push(['intellect', 'gadgets: ' + def.items.map(i => i.name).join(', ')]);
  return out;
}



// The edit layer lives in the PLANNER now (it has to re-derive sockets and the road graph after a
// paint). Re-exported here because the atlas and everything that resolves a theater import it from
// the HUD — one code path, no drift.
export { applyPlanEdits } from '../data/cityplan.js';

// Zero visibility is hidden, not a missing/default value. All target chrome
// shares this gate so the crosshair, health bar and edge bearing cannot disagree.
function visibleTarget(g,f) { return !!(f&&f.alive&&(!g.fov||(f._vis??1)>.35)); }

export class HUD {
  constructor(game) {
    this.game = game;
    // THE CODEX ON A PHONE (Robert 2026-07-24: "cluttered as a motherfucker, the mobile is
    // horrible"). Below 640px the case-file rows stack label-over-value instead of fighting for
    // a 148px label column, the armament table scrolls sideways instead of clipping, and the
    // pager/close controls grow to thumb size. Steam Deck (1280×800) uses the desktop layout.
    
    const s = document.createElement('style'); s.textContent = CSS + CODEX_MOBILE + PHONE_CSS + TABLET_CSS + DECK_CSS + POWERWORLD_CSS + DUAL_TRIGGER_CSS; document.head.appendChild(s);
    this.root = document.getElementById('hud');
    this.title = document.getElementById('title');
    this.feedLines = [];
    this._build();
  }

  _build() {
    this.root.innerHTML = `
    <div class="wrap">
      <div class="vignette"></div>
      <div id="hFieldRec" class="field-recorder" hidden role="status" aria-label="Field camera recording status"><i aria-hidden="true"></i><span>FIELD CAM</span></div>
      <div class="panel feed" id="hFeed"></div>
      <div class="panel foe" id="hFoe" style="display:none">
        <div class="fn" id="foeName">RIVAL</div>
        <div class="bar"><i class="fhpF" id="foeHp" style="width:100%"></i></div><div class="foe-conditions"></div>
      </div>
      <div class="status-dock">
      <div class="panel pl">
        <div class="nm" id="plName">—</div>
        <div class="wantedrow" id="plWanted" style="display:none"></div>
        <div class="wantedrow" id="plWounds" style="display:none;color:#c9564a"></div>
        <div class="rl" id="plRole">—</div>
        <div class="lab">HEALTH</div><div class="bar"><i class="hpF" id="plHp"></i></div>
        <div class="lab">KI / ENERGY<span class="kistate" id="kiState">DRAINED</span><span class="kiover" id="kiOver">⚡ OVERDRIVE — FISTS REFILL</span></div><div class="bar" id="kiBar"><i class="kiF" id="plKi"></i></div>
        <div class="lab">GUARD</div><div class="bar gd"><i class="gdF" id="plGd"></i></div>
        <div class="xpwrap"><span class="lvl" id="plLvl">1</span><span class="tierb" id="plTier">TIER I</span><span class="xp"><i id="plXp" style="width:0%"></i></span></div>
      </div>
      <div class="panel kit" id="hKit" style="display:none"><div class="kh" id="hKitH">KIT</div><div class="chips" id="hKitChips"></div></div>
      </div>
      <div class="panel modebar" id="hMode" style="display:none"></div>
      <div class="announce" id="hAnn"><div class="at" id="hAnnT"></div><div class="as" id="hAnnS"></div></div>
      <div class="endscr" id="hEnd"></div>
      <div class="combo" id="hCombo"><div class="n" id="hComboN">0</div><div class="l">Hits</div></div>
      <div class="dmgwrap" id="hDmg"></div>
      <div class="combat-dock">
        <div class="panel hint" id="hHint" tabindex="0" aria-label="Controls help">
          <div class="hintchip">❓ <b>F1</b> CONTROLS</div>
          <div class="hintbody" id="hHintBody"></div>
        </div>
        <div class="panel hands" id="hHands" style="display:none"><div class="hhl">HANDS</div><div class="hrow" id="hHandsRow"></div></div>
        <div class="panel charge" id="hCharge"><i style="width:0%"></i></div>
        <div class="panel slots" id="hSlots"></div>
      </div>
      <div class="foearrow" id="hFoeArrow"><i></i><u></u><span></span></div>
      <div class="rotate" id="hRotate"><div><div class="ri riphone"></div><div style="font-size:18px;font-weight:800;letter-spacing:.1em;color:var(--gold)">ROTATE YOUR DEVICE</div><div style="font-size:13px;color:var(--text-3);margin-top:6px">The arena plays in landscape.</div></div></div>
      <div class="panel tut" id="hTut" style="display:none">
        <span class="tskip" id="hTutSkip">skip ✕</span>
        <div class="tact" id="hTutAct"></div>
        <div class="tstep" id="hTutStep"></div>
        <div class="tobj" id="hTutObj"></div>
        <div class="tdist" id="hTutDist"></div>
        <div><span class="tkeys" id="hTutKeys"></span></div>
        <div class="ttip" id="hTutTip"></div>
        <div class="tdots" id="hTutDots"></div>
      </div>
      <div class="paused" id="hPaused"><div class="pwrap">
        <div class="t">PAUSED</div>
        <button data-p="resume">▶ Resume</button>
        <button data-p="newsroom" class="ghost" aria-label="Newsroom">▣ Newsroom</button>
        <button data-p="codex" class="ghost">📁 Case File</button>
        <button data-p="options" class="ghost">⚙ Options</button>
        <button data-p="hud-layout" class="ghost hud-layout-button">HUD position & size</button>
        <button data-p="howto" class="ghost">❓ How to Play</button>
        <button data-p="menu" class="ghost">Main Menu</button>
        <button data-p="quit" class="ghost" id="pQuit" style="display:none">⏻ Quit Game</button>
      </div></div>
      <div class="hitflash" id="hFlash"></div>
      <div class="danger" id="hDanger"></div>
      <div class="hitring" id="hHits"></div>
      <div class="panel radar" id="hRadar"><div class="rlab">Radar</div><canvas id="hRadarC" width="152" height="152"></canvas></div>
      <div class="panel pip" id="hPip" style="display:none"><div class="pipcap"><span class="pipdot"></span><span>ON AIR — KMK 9</span></div></div>
      <!-- THE CROSSHAIR. A chase camera aims where it LOOKS, so the aim marker belongs at screen
           centre, not on the floor. CSS-only (no canvas, no sprite, no draw call) and shown only in
           PowerWorld, where the camera is behind you — see POWERWORLD_CSS. -->
      <div id="hCross" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div>
      <div class="cityplate" id="hCity" style="display:none"></div>
      <div class="sundial" id="hSun" style="display:none"></div>
      <div class="simfx"><div class="simgrid"></div><div class="simscan"></div><div class="simsweep"></div>
        <span class="simc c1"></span><span class="simc c2"></span><span class="simc c3"></span><span class="simc c4"></span>
        <div class="simtag"><i></i>THRESHOLD SIMULATION — DANGER ROOM · SUBJECT IS LIVE, ALL ELSE PROJECTED</div></div>
      <div class="telem" id="hTelem"></div>
      <div class="kobanner" id="hKO"><div class="kob" id="hKOt">K.O.</div><div class="kos" id="hKOs"></div></div>
    </div>`;
    this.playerStatusView=new PlayerStatusView(this.root.querySelector('.wrap'));
    this.el = {
      feed: this.root.querySelector('#hFeed'),
      foe: this.root.querySelector('#hFoe'), foeName: this.root.querySelector('#foeName'), foeHp: this.root.querySelector('#foeHp'),
      name: this.root.querySelector('#plName'), role: this.root.querySelector('#plRole'),
      hp: this.root.querySelector('#plHp'), ki: this.root.querySelector('#plKi'), gd: this.root.querySelector('#plGd'),
      kiBar: this.root.querySelector('#kiBar'), kiState: this.root.querySelector('#kiState'), kiOver: this.root.querySelector('#kiOver'),
      charge: this.root.querySelector('#hCharge'), chargeI: this.root.querySelector('#hCharge > i'),
      slots: this.root.querySelector('#hSlots'),
      combo: this.root.querySelector('#hCombo'), comboN: this.root.querySelector('#hComboN'),
      dmg: this.root.querySelector('#hDmg'), paused: this.root.querySelector('#hPaused'),
      flash: this.root.querySelector('#hFlash'),
      lvl: this.root.querySelector('#plLvl'), xp: this.root.querySelector('#plXp'), tier: this.root.querySelector('#plTier'),
      plPanel: this.root.querySelector('.pl'),
      statusDock: this.root.querySelector('.status-dock'),
      mode: this.root.querySelector('#hMode'), ann: this.root.querySelector('#hAnn'), annT: this.root.querySelector('#hAnnT'), annS: this.root.querySelector('#hAnnS'),
      kit: this.root.querySelector('#hKit'), kitChips: this.root.querySelector('#hKitChips'), end: this.root.querySelector('#hEnd'),
      hands: this.root.querySelector('#hHands'), handsRow: this.root.querySelector('#hHandsRow'),
      radar: this.root.querySelector('#hRadar'), radarC: this.root.querySelector('#hRadarC'),
      pip: this.root.querySelector('#hPip'),
      fieldRecorder: this.root.querySelector('#hFieldRec'),
      city: this.root.querySelector('#hCity'), telem: this.root.querySelector('#hTelem'),
      sundial: this.root.querySelector('#hSun'),
      wanted: this.root.querySelector('#plWanted'),
      cross: this.root.querySelector('#hCross'),
      hits: this.root.querySelector('#hHits'), danger: this.root.querySelector('#hDanger'),
      ko: this.root.querySelector('#hKO'), koT: this.root.querySelector('#hKOt'), koS: this.root.querySelector('#hKOs'),
      hint: this.root.querySelector('#hHint'), foeArrow: this.root.querySelector('#hFoeArrow'),
      tut: this.root.querySelector('#hTut'), tutStep: this.root.querySelector('#hTutStep'), tutObj: this.root.querySelector('#hTutObj'),
      tutAct: this.root.querySelector('#hTutAct'), tutDist: this.root.querySelector('#hTutDist'),
      tutKeys: this.root.querySelector('#hTutKeys'), tutTip: this.root.querySelector('#hTutTip'), tutDots: this.root.querySelector('#hTutDots'),
    };
    this.root.querySelector('#hTutSkip').onclick = () => { this.hideTutorial(); this.onTutorialSkip && this.onTutorialSkip(); };
    this._radarCtx = this.el.radarC.getContext('2d');
    // pause menu actions
    this.el.paused.querySelectorAll('button').forEach(b => b.onclick = () => {
      const a = b.dataset.p;
      if (a === 'resume') { this.setPaused(false); this.onResume && this.onResume(); }
      else if (a === 'newsroom') this.onNewsroom && this.onNewsroom();
      // 📁 CASE FILE — the ASCENDANTS Codex, opened for the hero you are piloting. The overlay is
      // data-driven and mode-agnostic (`showCodex(def)` reads only the def), so the SAME dossier
      // works in PowerWorld: the pause menu is the one entry point present in every mode and on the
      // Steam Deck (no keyboard needed). Robert, 2026-07-28: "can we use the same Codex in PowerWorld?"
      else if (a === 'codex') { const d = this.game && this.game.player && this.game.player.def; if (d) this.showCodex(d); }
      else if (a === 'options') this.showOptions();
      else if (a === 'hud-layout') this.playerStatusView.edit(this);
      else if (a === 'howto') this.showHowto();
      else if (a === 'menu') { this.setPaused(false); this.onMenu && this.onMenu(); }
      // CONTROLLER-ONLY NEEDS A WAY OUT. On a Steam Deck there is no keyboard and no window
      // chrome, so without this the player is trapped in a fullscreen app.
      else if (a === 'quit' && window.LSW_DESKTOP) window.LSW_DESKTOP.quit();
    });
    if (window.LSW_DESKTOP) { const q = this.el.paused.querySelector('#pQuit'); if (q) q.style.display = ''; }
    this._buildOverlays();
    this.buildHintBody();   // the static wall is gone — the grouped panel is the ONLY format
  }

  // ---- options + how-to-play overlays (on <body> so they stack above the title screen) ----
  _buildOverlays() {
    const mk = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'lswovl'; document.body.appendChild(d); return d; };
    this.optionsEl = mk('hOptions'); this.howtoEl = mk('hHowto'); this.onlineEl = mk('hOnline'); this.damageEl = mk('hDamage'); this.visualEl = mk('hVisual');
    this.establishEl = document.createElement('div'); this.establishEl.id = 'hEstablish'; this.establishEl.className = 'establish';
    this.establishEl.style.display = 'none'; document.body.appendChild(this.establishEl);
    this.rankingsEl = mk('hRankings'); this.bracketEl = mk('hBracket'); this.atlasEl = null;   // created by mountAtlas on first open
    this.codexEl = mk('hCodex'); this.codexEl.classList.add('codex');
    try { this.theater = JSON.parse(localStorage.getItem('threshold_theater_v1') || 'null') || { flagship: true, seed: 1 }; } catch { this.theater = { flagship: true, seed: 1 }; }
  }

  // ---- THE CITY ATLAS: 1,050 real cities off the world sheet → pick a theater, preview its plan ----
  resolveTheaterPlan() {
    const t = this.theater || { flagship: true };
    if (t.gallery) return galleryPlan();
    // OFF-WORLD THEATERS (manual §17): a planet is a settlement row through the SAME planner —
    // the difference is environmental data (relief/biome), never a second map architecture.
    if (t.planet) {
      const P = PLANETS.find(p => p.id === t.planet);
      if (P && P.settlement) {
        const S = P.settlement;
        const row = { name: S.name, country: P.name, pop: S.pop, popType: S.popType, popLabel: S.popLabel, types: S.types || [], crime: S.crime ?? 20, safety: S.safety ?? 60 };
        // ⚠ AND HAND THE PLANNER THE WORLD. Without this the generator has no way to know it is
        // not on Earth and grows trees, crops, lawns and songbirds on a vacuum world — which is
        // exactly what it did. worldEnv derives both facts from the planet data (planets.js).
        const E = worldEnv(P.id);
        return generatePlan(row, t.seed || 1, { popType: S.popType, relief: S.relief, biome: S.biome,
          world: P.id, biosphere: E.life, atmosphere: E.air });
      }
    }
    if (t.flagship || t.cityId == null) return thresholdPlan();
    const city = cityList()[t.cityId];
    if (!city) return thresholdPlan();
    const plan = generatePlan(city, t.seed || 1, { N: t.N, waterCols: t.waterCols, cell: t.cell, popType: t.popType, humanH: t.humanH || undefined, roomScale: t.roomScale || undefined });
    return applyPlanEdits(plan, t.edits);   // hand-painted cells win over the generator
  }
  // --- THE ATLAS — extracted to engine/atlasUI.js (one module, two mounts: this in-game screen
  // and the standalone atlas.html tool). The hud owns only THEATER persistence and the game-side
  // furniture: hiding the title/root and handing the orbit camera to game.update via game.mapCam.
  showAtlas() {
    if (!this._atlasUI) {
      this._atlasUI = mountAtlas(document.body, {
        world: this.game.world, game: this.game,
        theater: this.theater,
        feed: (m, c) => this.feed(m, c),
        onTheater: (t, label) => {
          this.theater = t;
          try { localStorage.setItem('threshold_theater_v1', JSON.stringify(t)); } catch {}
          const tt = this.title.querySelector('#termTheater'); if (tt) tt.textContent = label;
          this.feed('Theater set — ' + label, '#7fb0d0');
        },
        onProvingGround: () => { this.theater = { gallery: true }; this.onProvingGround && this.onProvingGround(); },
        onLiveChange: (on, cam) => {
          const g = this.game;
          if (on) {
            g.mapCam = cam;
            this._titleWasShown = this.title && this.title.style.display !== 'none';
            if (this.title) this.title.style.display = 'none';
            if (this.root) this.root.style.display = 'none';   // radar, feed, kit chips — match furniture
          } else {
            g.mapCam = null;
            if (this.root) this.root.style.display = '';
            if (this._titleWasShown && this.title) this.title.style.display = '';
          }
        },
      });
      this.atlasEl = this._atlasUI.el;      // overlayOpen()/closeOverlays() read this
    }
    this._atlasUI.open();
  }
  // Headless recipes and older callers reach the validator here; the ONE implementation lives in
  // data/cityplan.js (exported), so the tool and the sweep can never disagree.
  _validatePlan(plan) { return validatePlan(plan); }


  // ---- the KMK 9 SPORTS DESK power board — every match (AI or piloted) moves the book ----
  showRankings() {
    const rows = rankingTable(ROSTER);
    const champ = championId();
    this.rankingsEl.innerHTML = `<div class="obox" style="width:min(780px,94vw)">
      <div class="rkhead">
        <div class="n9">9</div>
        <div class="rt"><b>ASCENDANT POWER RANKINGS</b><span>KMK 9 sports desk · the official book</span></div>
        <div class="rkmeta">INVITATIONAL #${tournamentNo()}<br/>SOURCED: AI-v-AI + PILOTED BOUTS</div>
      </div>
      <table class="rk"><tr><th>#</th><th>Δ</th><th>Weapon</th><th>Rating</th><th>Record</th><th>KO</th><th>LeFevre</th></tr>
      ${rows.map((r) => {
        const mv = r.moved > 0 ? `<td class="mv up">▲${r.moved}</td>` : r.moved < 0 ? `<td class="mv dn">▼${-r.moved}</td>` : '<td class="mv fl">—</td>';
        const tc = THREAT_COLORS[r.threat] || 'var(--text-4)';
        return `<tr data-cid="${esc(r.id)}" title="Open the case file"><td class="rkn">${String(r.rank).padStart(2, '0')}</td>${mv}
          <td class="who" style="--hc:${esc(r.colors.accent)}"><i></i>${esc(r.name)}${r.id === champ ? '<span class="crown" title="Reigning Invitational champion">🏆</span>' : ''}</td>
          <td class="elo">${r.elo}</td><td class="rec">${r.played ? r.w + '–' + r.l : 'UNTESTED'}</td>
          <td class="rec">${r.ko}/${r.kod}</td><td class="thr" style="color:${tc}">${esc(r.threat || '—')}</td></tr>`;
      }).join('')}</table>
      <div class="rkfoot">RATINGS SEED FROM THE LEFEVRE SCALE · EVERY KNOCKDOWN AND DECIDED MATCH MOVES THE BOOK · KO = SCORED/CONCEDED</div>
      <button class="odone">Done</button>
    </div>`;
    this.rankingsEl.querySelector('.odone').onclick = () => { this.rankingsEl.style.display = 'none'; };
    this.rankingsEl.querySelectorAll('tr[data-cid]').forEach(tr => tr.onclick = () => {
      const d = ROSTER.find(r2 => r2.id === tr.dataset.cid);
      if (d) this.showCodex(d);
    });
    this.rankingsEl.style.display = 'flex';
  }

  // ---- THE INVITATIONAL bracket — seeding view, between-rounds view, and the champion card ----
  showBracket(T, opts = {}) {
    const live = T.currentMatch();
    const sideRow = (idx, m) => {
      if (idx == null) return `<div class="bs"><span class="seed">—</span><span class="bn btbd">AWAITING WINNER</span></div>`;
      const s = T.sides[idx], d = T.def(s.ids[0]);
      const won = m.winner != null && m.winner === idx, lost = m.winner != null && m.winner !== idx;
      const score = won && m.score ? `<span class="bscore">${m.score[0]}–${m.score[1]}</span>${m.sim ? '<span class="bsim">SIM</span>' : ''}` : '';
      return `<div class="bs${won ? ' win' : ''}${lost ? ' lose' : ''}" style="--hc:${d ? esc(d.colors.accent) : 'var(--text-5)'}">
        <span class="seed">S${s.seed}</span><i></i><span class="bn">${esc(T.sideName(s))}</span>${s.human ? '<span class="ychip">YOU</span>' : ''}${score || `<span class="belo">${T.sideElo(s)}</span>`}
      </div>`;
    };
    const cellHtml = (m) => `<div class="bm${m === live ? ' live' : ''}">${sideRow(m.a, m)}${sideRow(m.b, m)}</div>`;
    T._resolveLinks();
    const champ = T.champion();
    const champD = champ ? T.def(champ.ids[0]) : null;
    const fmtLabel = { '1v1': 'LONE WOLF · 1v1', '2v2': 'DUOS · 2v2', '1v2': 'UNDERDOG · 1 vs 2' }[T.format] || T.format;
    this.bracketEl.innerHTML = `<div class="obox" style="width:min(1040px,96vw)">
      <div class="rkhead">
        <div class="n9" style="background:linear-gradient(180deg,var(--gold),var(--gold-warm));color:var(--on-gold)">🏆</div>
        <div class="rt"><b>${esc(T.label)}</b><span>single elimination · best-of-3 elimination rounds · team damage LIVE</span></div>
        <div class="rkmeta">FORMAT: ${fmtLabel}<br/>SANCTION: THRESHOLD TREATY OFFICE</div>
      </div>
      <div class="brsub">&gt; SEEDED FROM THE <b>POWER RANKINGS</b> — EVERY RESULT BOOKS BACK INTO THE LEDGER</div>
      <div class="brwrap">
        <div class="brcol"><div class="brh">Quarterfinals</div>${T.rounds[0].map(cellHtml).join('')}</div>
        <div class="brcol"><div class="brh">Semifinals</div>${T.rounds[1].map(cellHtml).join('')}</div>
        <div class="brcol"><div class="brh">Grand Final</div>${T.rounds[2].map(cellHtml).join('')}</div>
        <div class="brcol champ"><div class="brh">Champion</div>
          <div class="bchamp${champ ? '' : ' tbd'}">
            <div class="tro">🏆</div>
            <div class="cn" style="${champD ? `color:${esc(champD.colors.accent)}` : ''}">${champ ? esc(T.sideName(champ)) : 'TO BE DECIDED'}</div>
            <div class="cl">${champ ? (champ.human ? 'YOUR CITY NOW' : 'THE BOOK CLOSES') : 'WINNER TAKES THE BOOK'}</div>
          </div>
        </div>
      </div>
      ${live
        ? `<button class="odone" id="brNext">⚔ ${esc(T.roundName())} — ${esc(T.sideName(T.playerFoeSide(live)))} — FIGHT</button>`
        : `<button class="odone" id="brDone">${champ && champ.human ? '🏆 TAKE THE BELT — BACK TO THE REGISTRY' : 'BACK TO THE REGISTRY'}</button>`}
    </div>`;
    const next = this.bracketEl.querySelector('#brNext');
    if (next) next.onclick = () => { this.hideBracket(); opts.onNext && opts.onNext(); };
    const done = this.bracketEl.querySelector('#brDone');
    if (done) done.onclick = () => { this.hideBracket(); opts.onDone && opts.onDone(); };
    this.bracketEl.style.display = 'flex';
  }
  hideBracket() { this.bracketEl.style.display = 'none'; }

  // ---- ONLINE: rooms, lobby, the wire ----
  showOnline() { this.renderOnline(); this.onlineEl.style.display = 'flex'; }
  renderOnline() {
    const np = this.netplay; if (!np) return;
    const net = np.net, inLobby = net.state === 'lobby';
    const hero = (id) => { const d = ROSTER.find(r => r.id === id); return d ? d.name : '—'; };
    let body;
    if (!inLobby) {
      body = `
        <div class="orow"><span class="ol">Callsign</span><input type="text" id="onName" maxlength="14" spellcheck="false" value="${net.identity.name || ''}" placeholder="PILOT" style="flex:1;font-family:inherit;font-size:var(--t-lg);font-weight:700;color:var(--text);background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.14);border-radius:var(--r-2);padding:9px 11px;outline:none;"></div>
        <div class="oline2">Playing as <b style="color:var(--gold)">${hero(this.selectedHero || 'sol')}</b> — pick a different hero on the title screen first.</div>
        <button class="odone" id="onCreate">Create Room</button>
        <div class="orow" style="margin-top:6px"><input type="text" id="onCode" maxlength="4" spellcheck="false" placeholder="CODE" style="width:110px;text-transform:uppercase;font-family:inherit;font-size:18px;font-weight:800;letter-spacing:.3em;color:var(--gold);background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.14);border-radius:var(--r-2);padding:9px 11px;outline:none;text-align:center;"><button class="odone oghost" id="onJoin" style="flex:1;margin-top:0">Join Room</button></div>
        <div class="oline2" id="onStatus"></div>`;
    } else {
      const me = `<div class="netp"><b>${net.identity.name || 'PILOT'}</b><span>${hero(net.heroId)}</span><em>${net.isHost ? 'HOST' : 'CHALLENGER'}</em></div>`;
      const them = net.peer
        ? `<div class="netp"><b>${net.peer.name}</b><span>${hero(net.peer.heroId)}</span><em>${net.peer.host ? 'HOST' : 'CHALLENGER'}</em></div>`
        : `<div class="netp wait"><b>Waiting for a challenger…</b><span>send them the code</span></div>`;
      body = `
        <div class="roomcode">ROOM <b>${net.room}</b></div>
        <div class="netvs">${me}<span class="vs2">VS</span>${them}</div>
        ${net.isHost
          ? `<button class="odone" id="onFight" ${net.peer ? '' : 'disabled'}>⚔ FIGHT</button>`
          : `<div class="oline2">Waiting for the host to start the duel…</div>`}
        <button class="odone oghost" id="onLeave">Leave Room</button>`;
    }
    this.onlineEl.innerHTML = `<div class="obox"><div class="oh">🌐 Online Duel</div>${body}<button class="odone oghost" id="onClose" style="margin-top:6px">Close</button></div>`;
    const $ = (s) => this.onlineEl.querySelector(s);
    $('#onClose').onclick = () => { this.onlineEl.style.display = 'none'; };
    const status = (t, err) => { const el = $('#onStatus'); if (el) { el.textContent = t; el.style.color = err ? 'var(--danger-2)' : 'var(--good)'; } };
    if (!inLobby) {
      $('#onName').oninput = (e) => np.net.setName(e.target.value);
      $('#onCreate').onclick = async () => {
        try { status('Connecting…'); np.net.setName($('#onName').value); await np.hostRoom(this.selectedHero || 'sol'); this.renderOnline(); }
        catch (err) { status('Could not create room: ' + err.message, true); }
      };
      $('#onJoin').onclick = async () => {
        try { status('Joining…'); np.net.setName($('#onName').value); await np.joinRoom($('#onCode').value, this.selectedHero || 'sol'); this.renderOnline(); }
        catch (err) { status('Could not join: ' + err.message, true); }
      };
    } else {
      const f = $('#onFight'); if (f) f.onclick = () => { this.onlineEl.style.display = 'none'; np.startOnline(); };
      $('#onLeave').onclick = async () => { await np.leave(); this.renderOnline(); };
    }
  }
  setHintVisible(v) { if (this.el.hint) this.el.hint.style.display = v ? 'block' : 'none'; }
  // The help panel, ORGANISED — one titled group per thing you do, instead of a wall of prose.
  // Rebuilt whenever the control scheme changes so it always shows YOUR bindings, not defaults.
  buildHintBody() {
    const el = this.root.querySelector('#hHintBody'); if (!el) return;
    const K = this.game?.modeId==='powerworld'?{...keymap(SETTINGS.scheme),strikeLabel:'V',grabLabel:'E',guardLabel:'Q / MOUSE4',guard:'KeyQ',downLabel:'CTRL',itemLabel:'X',digitsSwap:false}:keymap(SETTINGS.scheme);
    const soldier=this.game?.player?.def.archetype==='soldier'&&(this.game.modeId==='powerworld'||this.game.player._openSky);
    const grp = (title, rows) => `<div class="hgrp"><div class="hgt">${title}</div>${rows.filter(Boolean).map(([k, d]) => `<div class="hgr"><b>${k}</b><span>${d}</span></div>`).join('')}</div>`;
    const wheelSel = K.wheel === 'ability';
    // ⚠ IF A PAD IS THE ACTIVE DEVICE, PRINT PAD GLYPHS. Telling a Steam Deck player about WASD
    // and LMB is telling them about keys that do not exist on the machine in their hands.
    const pad = this.game && this.game.pad;
    const P = padActive(pad);
    const G = (a) => glyph(a, pad);
    this._hintPad = P;                                   // so armHintTimer can re-render on change
    if(this.game?.modeId==='powerworld'&&P&&this.game.humans?.length!==2){
      el.innerHTML=grp('MOVE & AIM', [['LEFT / RIGHT STICK','move / look'],['R3','focus / release target'],['VIEW / TOUCHPAD HOLD','independent free look with right stick'],['L3','tap, then hold again for movement gears'],['B / CIRCLE','evade']])+
        grp('COMBAT', [['X / SQUARE','strike · hold heavy'],['LB / L1','guard'],['RB / R1','interact / grab · hold again and release to throw'],['RT / R2 · LT / L2','primary · secondary power']])+
        grp('POWERS & EQUIPMENT', [['D-PAD LEFT / RIGHT','tap: cycle · hold: power picker'],['RIGHT STICK (PICKER)','choose · release D-pad to assign · B cancels'],['Y / TRIANGLE','gadget · hold for inventory'],['D-PAD DOWN + X / SQUARE','reload equipped firearm'],['VIEW / TOUCHPAD TAP','inventory']])+
        grp('FLIGHT & SYSTEM', [['A / CROSS','jump / rise'],['D-PAD UP','toggle flight'],['D-PAD DOWN','crouch / descend'],['MENU / OPTIONS','pause']]);return;
    }
    if(this.game?.modeId==='powerworld'&&!P){
      el.innerHTML=grp('MOVE & AIM', [['WASD','move'],['MOUSE','aim'],['ALT (HOLD)','look around without changing travel or attack aim'],['T','focus / release target'],['C (HOLD)','crouch'],['Z','prone · soldier class only'],['DOUBLE-TAP WASD','dodge in that direction'],['SHIFT','tap, release, then hold again for faster movement']])+
        grp('MELEE & INTERACT', [['V','tap: strike and approach · hold: heavy'],['Q / MOUSE4','hold guard · same on ground and in air'],['E','interact / grab · move to carry'],['E (CARRYING)','enemy: hold, aim, release to throw · tap to drop; teammate: release safely']])+
        grp('POWERS & EQUIPMENT', [['LMB / RMB','primary / secondary attack'],['WHEEL','select primary'],['TAB + WHEEL','select secondary'],['TAB (HOLD)','power picker'],['1–4','additional powers'],['X','use gadget · hold for gadget picker'],['I','inventory'],['R','reload equipped firearm']])+
        grp('FLIGHT & SYSTEM', [['F','toggle flight when supported'],['SPACE','jump / rise'],['CTRL','descend'],['F3','character roster'],['ESC','pause'],['F1','this panel']]);
      return;
    }
    el.innerHTML = P
      ? grp('MOVE & AIM', [[G('move'), 'move'], [G('aim'), 'aim'], combatView(this.game)==='bfp'?['L1 + R3','lock / release target']:null, [G('dash'), 'tap, then hold for movement gears'], ['2×FLICK', 'evade']]) +
        grp('MELEE', [[G('strike'), 'tap = jab · HOLD = haymaker'], [G('grab'), 'grab · hoist a car/tree'], [G('guard'), 'guard (hold)']]) +
        grp('POWERS', [[G('lmb') + ' / ' + G('rmb'), 'primary · secondary'],
          [G('q') + ' / ' + G('e'), 'skills'], [G('f'), '4th power'], [G('ult'), 'ULTIMATE'], [G('item'), 'gadget']]) +
        grp('FLIGHT', [[G('fly'), 'flight ON / rise'], [G('descend'), 'descend'], [G('dash') + ' (air)', 'movement gears']]) +
        grp('SYSTEM', [[G('swap'), 'swap hero'], [G('roster'), 'roster'], [G('pause'), 'pause'],
          [G('confirm') + ' / ' + G('back'), 'confirm · back (menus)']])
      : grp('MOVE & AIM', [['WASD', 'move'], ['MOUSE', 'aim'], combatView(this.game)==='bfp'?['ALT (HOLD)','look around · release to return']:null, soldier?['C (HOLD)','crouch · release to stand']:null, soldier?['Z','prone / stand · WASD crawl']:null, soldier?['E','interact / board · E exits scout, J exits aircraft']:null, [combatView(this.game)==='bfp'?'T':'CLICK FOE',combatView(this.game)==='bfp'?'lock / release target':'lock on · T to release'], ['2×TAP', 'evade'], ['SHIFT', 'tap, then hold · gears I / II / III']]) +
        // ⚠ THE PANEL WAS LYING UNDER BRAWLER. Guard read `K.guardLabel` but strike and grab were
        // hard-coded 'V' and 'G' — so the one scheme that exists BECAUSE the melee keys moved was
        // the one scheme the help panel printed the old keys for.
        grp('MELEE', [[K.strikeLabel || 'V', 'tap = jab · HOLD = haymaker'], soldier?null:[K.grabLabel || 'G', 'grab · hoist a car/tree'], [soldier&&K.guard==='KeyC'?'MOUSE4':K.guardLabel, 'guard (hold)']]) +
        grp('POWERS', [
          ['WHEEL', 'select LMB attack'],
          soldier?['1–6','select equipped attack · does not fire']:null,
          ['RMB + WHEEL', 'select RMB attack; release, then fire'],
          K.mouseMelee ? ['V','select melee · release attacks before switching'] : null,
          ['LMB', 'fire selected primary'],
          ['RMB', 'tap to fire on release · hold to charge / sustain'],
          [soldier?'G':'Q / E', soldier?'quick grenade · keeps weapon selected':'skills'], ['H', '4th power'], ['R', soldier?'reload selected weapon':'ULTIMATE'], [soldier?'Q':K.itemLabel, 'gadget'],
        ]) +
        grp('FLIGHT', [[K.flyLabel, 'flight ON/OFF'], [K.upLabel, 'rise'], [K.downLabel, 'descend'], ['SHIFT (air)', 'movement gears']]) +
        grp('SYSTEM', [[K.swapLabel, 'swap hero'], ['TAB', 'PowerWorld: melee / restore attacks; city: roster'], ['F3', 'PowerWorld roster'], ['B', 'order a rival'], ['N', 'order a training bot'], ['ESC', 'pause'], ['F1', 'this panel']]);
  }
  // The full control list is onboarding, not furniture: it earns ~18s of a fresh match, then
  // collapses to a corner chip. F1 (or the Options toggle) brings it back any time.
  hintFull(on) { if (this.el.hint) this.el.hint.classList.toggle('mini', !on); }
  toggleHint() {
    const hint = this.el.hint; if (!hint) return;
    const opening = hint.style.display === 'none' || hint.classList.contains('mini');
    this._hintPinned = opening;
    this.hintFull(opening);
    this.setHintVisible(opening || SETTINGS.hints);
    if (opening) {
      this.buildHintBody(); hint.scrollTop = 0;
      // An explicit reference request overrides hidden onboarding, without changing
      // the saved preference. Release capture so wheel scrolling reaches the panel.
      if (document.pointerLockElement) document.exitPointerLock();
      hint.focus({ preventScroll: true });
    } else if (document.activeElement === hint) hint.blur();
  }
  // wheel-select feedback: light the chosen slot so the wheel has a visible consequence
  selectSlot(key,secondary) {
    if (!this.slotEls) return;
    for (const k in this.slotEls){
      const se=this.slotEls[k];se.root.classList.toggle('sel',k===key);se.root.classList.toggle('sel-secondary',k===secondary);
      const label=se.root.querySelector('.key');
      if(label)label.textContent=k===key&&k===secondary?'L + R':k===key?'LMB':k===secondary?'RMB':se.keyLabel||'V';
    }
  }
  armHintTimer() {
    this.buildHintBody();   // always show the ACTIVE scheme's bindings
    clearTimeout(this._hintT); this._hintPinned = false;
    this.hintFull(true);
    this._hintT = setTimeout(() => { if (!this._hintPinned) this.hintFull(false); }, 18000);
  }

  // The height meter: four rungs (GROUND / BUILDING / SKY / CLOUDS) with the live one lit in your
  // hero's colour, plus the raw altitude. Crossing a band lights the next rung — you can watch
  // yourself climb or drop a level.
  // THE ALTIMETER MOVED INTO THE WORLD (2026-07-25). This used to be a four-rung ALT ladder
  // docked to the side of the screen — a number you had to look AWAY from your character to read,
  // while flying, which is exactly when you cannot afford to. It now lives on the marker under the
  // flyer: the ring rises off its own contact shadow so the GAP is the altitude, and a small tag
  // rides it with the band name and the height in metres. See entity._animate / _altTag.
  // ===== THE TEST HARNESS =====
  // In the Danger Room we surface everything the engine knows: frame cost, live entity/FX
  // counts, the player's exact combat state, per-dummy DPS, and — critically — each bot's
  // HONEST senses (what it believes, from which source, and how good its hands are). If a
  // system misbehaves, it should be visible here before it's visible in a bug report.
  // (5) telemetry is normally a Danger Room thing, but F2 forces it anywhere
  toggleTelemetry() { this._telForce = !this._telForce; this.feed(this._telForce ? '◈ Telemetry ON (F2)' : '◈ Telemetry off (F2)', 'var(--info)'); }
  updateTelemetry(g) {
    const on = (g.modeId === 'training' || this._telForce) && g.running;
    if (on !== this._simOn) { this._simOn = on; this.root.classList.toggle('sim', on); }
    if (!on) return;
    const now = performance.now();
    if (this._telT && now - this._telT < 120) return;    // 8 Hz — readable, and cheap
    this._telT = now;
    const p = g.player, w = g.world;
    const row = (k, v, cls = '') => `<div class="tr2"><span class="tk">${k}</span><span class="tv ${cls}">${v}</span></div>`;
    const bands = ['GROUND', 'BUILDING', 'SKY', 'CLOUDS'];
    const b = bandOf(p.pos.y);
    const fps = w.fps, ft = (w._ema || 16.7);
    let html = `<h4><span>◈ SIMULATION TELEMETRY</span><span>${fps} FPS</span></h4>`;
    html += row('FRAME', ft.toFixed(1) + ' ms', ft > 24 ? 'bad' : ft < 17 ? 'ok' : 'hot');
    html += row('QUALITY TIER', 'T' + (w._qTier ?? '?') + (w.qualityOverride != null ? ' (locked)' : ''));
    html += row('ENTITIES', g.entities.length);
    html += row('PROJECTILES', g.projectiles.list.length);
    html += row('PARTICLES', (g.particles && g.particles.count) || (g.particles && g.particles.live) || '—');
    html += row('COVER / FADES', `${w.cover.length} / ${(w._fades && w._fades.size) || 0}`);
    // the live subject
    html += `<div class="tg"><div class="subj">SUBJECT — ${esc(p.name)}</div>`;
    html += row('HP / KI', `${p.hp | 0}/${p.maxHp} · ${p.ki | 0}/${p.maxKi}`, p.hp < p.maxHp * 0.3 ? 'bad' : '');
    html += row('STATE', `${p.state}${p.hitstop > 0 ? ' +hitstop' : ''}${p.staggerT > 0 ? ' +stagger' : ''}`, p.hitstop > 0 ? 'bad' : '');
    html += row('ALTITUDE', `${unitsToMeters(p.pos.y).toFixed(1)} m · ${bands[b]}`, b ? 'hot' : '');
    html += row('FLYING / GUARD', `${p.flying ? 'YES' : 'no'} / ${p.guarding ? 'UP' : 'down'}`);
    html += row('GUARD METER', (p.guardMeter * 100 | 0) + '%', p.guardMeter < 0.3 ? 'bad' : '');
    html += row('TIER / LVL', `${p.tier} / ${p.level}`);
    html += row('COMBO', g.combo + (g._p1MaxCombo ? ` (best ${g._p1MaxCombo})` : ''));
    html += `</div>`;
    // dummies: live damage instrumentation
    const dummies = g.entities.filter(e => e.isDummy);
    if (dummies.length) {
      html += `<div class="tg"><div class="subj">DAMAGE BENCH</div>`;
      for (const d of dummies) {
        const log = d._dmgLog || [];
        while (log.length && log[0].t < g.time - 3) log.shift();
        const dps = log.reduce((s, x) => s + x.a, 0) / 3;
        html += row(`DUMMY ${d.id}`, `${dps.toFixed(0)} dps · Σ${Math.round(d._dmgTotal || 0)}`, dps > 0.5 ? 'hot' : '');
      }
      html += `</div>`;
    }
    // every bot's honest senses + fair hands
    const bots = g.entities.filter(e => e.ai && e.alive && !e.isDummy);
    if (bots.length) {
      html += `<div class="tg"><div class="subj">AI — SENSES &amp; HANDS</div>`;
      for (const f of bots.slice(0, 3)) {
        const ai = f.ai;
        html += row(esc(f.name), ai._sees ? 'SEES YOU' : (ai.belief ? 'believes:' + ai.belief.src : 'no idea'), ai._sees ? 'bad' : ai.belief ? 'hot' : 'ok');
        html += row('  reflex/turn', `${ai.reflex.toFixed(2)}s · ${ai.turnRate.toFixed(1)} r/s`);
        html += row('  mem/jitter', `${ai._mem.toFixed(1)}s · ${(ai.aimJitter * 100).toFixed(1)}`);
      }
      html += `</div>`;
    }
    // the city / villain systems, live
    const c = g.cityStats || {};
    html += `<div class="tg"><div class="subj">WORLD</div>`;
    html += row('CIV / CARS / BLOCKS', `${c.civs || 0} / ${c.cars || 0} / ${c.blocks || 0}`, (c.civs || 0) ? 'bad' : '');
    html += row('HEAT / WANTED', `${g.police ? g.police.heatOf(p) | 0 : 0} · ${'★'.repeat(g.police ? g.police.wantedLevel(p) : 0) || '—'}`, (g.police && g.police.wantedLevel(p)) ? 'bad' : '');
    html += row('OFFICERS', g.entities.filter(e => e.def && e.def.police).length);
    html += `</div>`;
    if (html !== this._telHtml) { this._telHtml = html; this.el.telem.innerHTML = html; }
  }

  // Point at the fight. Bots can genuinely hide now, so an off-screen target gets an edge marker.
  // THE HONEST LIMIT, said out loud (altitude plan 2): a lobbed weapon that physically cannot
  // reach the locked target says so, instead of quietly falling short.
  throwReach(text) {
    let el = this.el.throwReach;
    if (!el) {
      el = document.createElement('div');
      el.id = 'hThrowReach';
      el.style.cssText = 'position:fixed;left:50%;top:57%;transform:translateX(-50%);font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.16em;color:var(--danger,#ff5a4a);text-shadow:0 2px 6px #000;pointer-events:none;z-index:22;display:none';
      document.getElementById('hud').appendChild(el);
      this.el.throwReach = el;
    }
    el.textContent = text || '';
    el.style.display = text ? 'block' : 'none';
  }

  // SPECTATOR BANDS (altitude plan 2): an explicit ADMIN view — every tether at full opacity,
  // every column chip drawn, radar band-coded. Deliberately NOT a change to the player HUD.
  toggleSpectatorBands() {
    this.spectatorBands = !this.spectatorBands;
    this.feed(this.spectatorBands ? 'SPECTATOR BANDS on — all altitudes shown' : 'Spectator bands off', '#7fe6ff');
    return this.spectatorBands;
  }

  // THE COLUMN CHIP: because a flier is routinely off-frame while their ground column is not,
  // a chip rides above the column carrying band glyph + altitude in metres.
  updateColumnChips(g) {
    if (!this._colChips) this._colChips = [];
    const p = g.player; if (!p || !g.running) { for (const c of this._colChips) c.style.display = 'none'; return; }
    const show = [];
    for (const e of g.entities) {
      if (!e.alive || e === p || !g.isFoe(p, e)) continue;
      const h = e.pos.y - (e.groundY || 0);
      if (h < 40) continue;
      if (!this.spectatorBands && g.fov && (e._vis || 0) < 0.4) continue;   // the honesty gate again
      show.push(e);
      if (show.length >= 4) break;
    }
    for (let i = 0; i < Math.max(show.length, this._colChips.length); i++) {
      let c = this._colChips[i];
      if (!c && i < show.length) {
        c = document.createElement('div');
        c.style.cssText = 'position:fixed;transform:translate(-50%,-100%);font-family:var(--f-mono,monospace);font-size:9.5px;letter-spacing:.1em;padding:2px 6px;border:1px solid var(--line-2,#3a3d43);background:rgba(10,12,18,.8);border-radius:4px;pointer-events:none;z-index:21;white-space:nowrap';
        document.getElementById('hud').appendChild(c);
        this._colChips[i] = c;
      }
      if (!c) continue;
      const e = show[i];
      if (!e) { c.style.display = 'none'; continue; }
      const sp = { x: 0, y: 0, behind: false };
      g.world.screenPosOf(e.pos.x, (e.groundY || 0) + 1, e.pos.z, sp);
      if (sp.behind) { c.style.display = 'none'; continue; }
      const b = e.pos.y > 260 ? 3 : e.pos.y > 150 ? 2 : 1;
      const GL = ['GND', 'BLD', 'SKY', 'CLD'];
      c.style.display = 'block';
      c.style.left = sp.x + 'px';
      c.style.top = Math.max(18, sp.y - 6) + 'px';
      // ⚠ THE BAND WORD IS THE LADDER PRINTED OVER EVERY ENEMY'S HEAD. "↑ SKY · 42m" tells you which
      // of four storeys someone is on, which is the right reading of a city with rooftops and the
      // wrong one for an open sky where the altitude is continuous. The METRES stay — an air fight
      // needs them more than a street fight does — and the storey name and its four colours go.
      const open = g.player && g.player._openSky;
      c.style.color = open ? '#cfe6f2' : ['#8fe08a', '#ffd24a', '#7fe6ff', '#ffffff'][b];
      const m = Math.round(unitsToMeters(e.pos.y - (e.groundY || 0)));
      c.textContent = open ? `↑ ${m}m · ${e.name}` : `↑ ${GL[b]} · ${m}m · ${e.name}`;
    }
  }

  // 3a · THE PROMPT. Four behaviours share the G key, and that is ONLY acceptable because
  // this says which one is armed. Without it, the chain does not ship.
  interactPrompt(h, f) {
    let el = this.el.iPrompt;
    if (!el) {
      el = document.createElement('div');
      el.id = 'hInteract';
      el.style.cssText = 'position:fixed;left:50%;bottom:19%;transform:translateX(-50%);display:none;align-items:center;gap:9px;font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.12em;color:var(--text,#e8e2d4);background:rgba(10,12,18,.82);border:1px solid var(--line-gold,#6b5824);border-radius:var(--r-1,4px);padding:6px 12px;pointer-events:none;z-index:22';
      document.getElementById('hud').appendChild(el);
      this.el.iPrompt = el;
    }
    const g = this.game;
    const verb = g && g.interactVerb && f ? g.interactVerb(f) : null;
    const LABEL = { interact: h ? h.verb : 'INTERACT', throw: 'THROW', hurl: 'HURL THEM', hoist: 'HOIST', grab: 'GRAB' };
    const grab=verb==='grab'&&g.modeId==='powerworld'&&g.melee.canBeginGrab(f)?g.melee.grabTarget(f):null;
    if (!f || !g || !g.running || !verb || (verb === 'grab' && !grab)) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const soldier=f.def.archetype==='soldier'&&(f._openSky||g.modeId==='powerworld');
    if(soldier&&g.modeId!=='powerworld'&&verb!=='interact'){el.style.display='none';return;}
    const action=grab?(grab.friendly?'CARRY TEAMMATE':'GRAB OPPONENT'):f._personCarry?.friendly?'RELEASE TEAMMATE':g.modeId==='powerworld'&&(f.grabbing||f._carry)?'HOLD: AIM THROW · TAP: RELEASE':(LABEL[verb]||verb).toUpperCase();
    el.innerHTML = `<b style="color:var(--gold,#ffd24a)">${g.touch?.enabled?'TAP':g.modeId==='powerworld'||soldier?'E':'G'}</b><span>${action}</span>` +
      (grab?'<span>'+String(grab.fighter.name).replace(/[<>&]/g,'')+'</span>':'')+
      (h && verb === 'interact' ? `<span style="color:var(--text-5,#8b8577)">— ${String(h.label).toUpperCase()}</span>` : '');
  }

  // 3b · THE CHOICE SURFACE — a FIELD INTERCEPT TRANSCRIPT, not a JRPG box. Classification bar,
  // mono speaker slug with the real district, typed body, numbered § option rows with
  // consequence tags, ESC = WITHDRAW. LIVE by default: a street conversation that stopped the
  // world would fight the police and heat systems that are still running.
  showTranscript({ speaker, district, body, options, pause = false } = {}) {
    let el = this.el.transcript;
    if (!el) {
      el = document.createElement('div');
      el.id = 'hTranscript';
      el.className = 'lswovl';
      el.style.cssText = 'position:fixed;left:50%;bottom:8%;transform:translateX(-50%);width:min(620px,92vw);display:none;z-index:63;font-family:var(--f-display,Rajdhani,sans-serif)';
      document.body.appendChild(el);
      this.el.transcript = el;
    }
    const mono = 'font-family:var(--f-mono,monospace)';
    el.innerHTML = `
      <div style="border:1px solid var(--line-gold,#6b5824);background:var(--surface-solid,#12110e)">
        <div style="display:flex;gap:8px;align-items:center;padding:5px 10px;border-bottom:1px solid var(--line,#2a2d33);${mono};font-size:9px;letter-spacing:.16em;color:var(--text-5,#8b8577)">
          <span style="background:var(--stamp,#8a1d24);color:#fff;padding:1px 6px">FIELD INTERCEPT</span>
          <span>${(district || '').toUpperCase()}</span><span style="margin-left:auto">ESC · WITHDRAW</span>
        </div>
        <div style="padding:11px 13px">
          <div style="${mono};font-size:10px;color:var(--gold,#ffd24a);letter-spacing:.1em">${(speaker || 'UNKNOWN').toUpperCase()}</div>
          <div id="tsBody" style="font-size:14px;line-height:1.5;color:var(--text-2,#c9c2b4);margin:5px 0 9px;min-height:2.6em"></div>
          <div id="tsOpts" style="display:flex;flex-direction:column;gap:5px"></div>
        </div>
      </div>`;
    el.style.display = 'block';
    // typed body, in the same register as every other document surface in this game
    const bEl = el.querySelector('#tsBody');
    let i = 0; clearInterval(this._tsT);
    this._tsT = setInterval(() => { bEl.textContent = String(body || '').slice(0, ++i); if (i >= (body || '').length) clearInterval(this._tsT); }, 16);
    const oEl = el.querySelector('#tsOpts');
    (options || []).forEach((o, n) => {
      const b = document.createElement('button');
      b.style.cssText = 'text-align:left;background:var(--surface-raised,#16150f);border:1px solid var(--line,#2a2d33);color:var(--text,#e8e2d4);padding:6px 10px;font-family:inherit;font-size:12.5px;cursor:pointer';
      b.innerHTML = `<span style="${mono};font-size:10px;color:var(--gold,#ffd24a)">§${n + 1}</span> ${o.text}` +
        (o.tag ? ` <span style="${mono};font-size:9px;color:var(--text-5,#8b8577)">— ${o.tag.toUpperCase()}</span>` : '');
      b.onclick = () => { this.hideTranscript(); o.onPick && o.onPick(); };
      oEl.appendChild(b);
    });
    // ⚠ if it ever pauses, it MUST join the overlay set or ESC pauses the game BEHIND it
    this._tsPaused = !!pause;
    if (pause && this.game) this.game.running = false;
    this._tsEsc = (e) => { if (e.code === 'Escape') { e.stopPropagation(); this.hideTranscript(); } };
    addEventListener('keydown', this._tsEsc, true);
  }
  hideTranscript() {
    const el = this.el.transcript; if (!el) return;
    clearInterval(this._tsT);
    el.style.display = 'none';
    if (this._tsPaused && this.game) { this.game.running = true; this._tsPaused = false; }
    if (this._tsEsc) { removeEventListener('keydown', this._tsEsc, true); this._tsEsc = null; }
  }
  transcriptOpen() { return !!(this.el.transcript && this.el.transcript.style.display === 'block'); }

  // ⚠ YOU MUST BE ABLE TO SEE HOW YOUR OWN CHARACTER FEELS — that was the whole point of the ask
  // ("so a player can always kind of know how the character is feeling"). The shade is the WORD
  // from Robert's wheel, not a number, and the mood line is what it is currently doing to you, so
  // the chip explains the multiplier rather than hiding it.
  updateMood(g) {
    const p = g.player, P = p && p._psyche;
    let el = this._moodEl;
    if (!el) {
      el = document.createElement('div');
      el.id = 'plMood';
      el.style.cssText = 'position:fixed;left:14px;bottom:250px;z-index:21;padding:5px 10px 6px;' +
        'border-radius:var(--r-2,8px);border:1px solid var(--line,#2a2d33);background:var(--surface,rgba(14,16,24,.72));' +
        'font-family:var(--f-display,Rajdhani),sans-serif;letter-spacing:.06em;display:none;pointer-events:none';
      document.body.appendChild(el);
      this._moodEl = el;
    }
    const on = !!(P && g.mode && g.running);
    if (!on) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    const docked=combatLookActive(g)&&!document.body.classList.contains('phone')&&!document.body.classList.contains('tablet');
    const parent=docked?this.el.statusDock:document.body;
    if(el.parentNode!==parent)parent.appendChild(el);
    // Visibility is independent of content dirtiness: an unchanged mood must
    // return after menu/resume and follow the active HUD layout.
    el.style.display = 'block';
    const key = P.main + '|' + P.shade + '|' + (P.mood && P.mood.id);
    if (key === this._moodKey) return;                       // dirty-checked, like every other chip
    this._moodKey = key;
    el.style.borderColor = P.colour;
    el.innerHTML =
      '<div class="mood-label" style="font:700 9px var(--f-mono,monospace);letter-spacing:.22em;color:var(--text-5,#8b8577)">MOOD</div>' +
      '<div class="mood-shade" style="font-weight:800;font-size:15px;color:' + P.colour + '">' + P.shade.toUpperCase() + '</div>' +
      (P.mood ? '<div class="mood-effect" style="font:600 10px var(--f-mono,monospace);letter-spacing:.1em;color:var(--text-4,#9a9384)">' +
        P.mood.text + '</div>' : '');
  }

  updateFoeArrow(g) {
    const el = this.el.foeArrow; if (!el) return;
    const inMatch = !!(g.mode && g.running && !g.matchOver);
    let foe = null;
    if (inMatch) {
      const cand = visibleTarget(g,g.hardLock) ? g.hardLock : visibleTarget(g,g.lockTarget) ? g.lockTarget : null;
      foe = cand && !cand.isDummy ? cand : null;
      if (!foe) { const n = g.nearestFoe(g.player, g.player.pos, 400); if (n && !n.isDummy && (!g.fov || (n._vis || 0) > 0.4)) foe = n; }
    }
    if (!foe) { if (this._arrowOn) { this._arrowOn = false; el.classList.remove('on'); } return; }
    const sp = g.world.screenPosOf(foe.pos.x, foe.pos.y + 6, foe.pos.z);
    const m = 64, W = innerWidth, H = innerHeight;
    const off = sp.behind || sp.x < m || sp.x > W - m || sp.y < m || sp.y > H - m;
    if (!off) { if (this._arrowOn) { this._arrowOn = false; el.classList.remove('on'); } return; }
    // project the bearing onto the screen edge
    const cx = W / 2, cy = H / 2;
    let dx = sp.x - cx, dy = sp.y - cy;
    if (sp.behind) { dx = -dx; dy = -dy; }
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const sx = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs((H / 2 - m) / (dy || 1e-6)));
    const x = cx + dx * sx, y = cy + dy * sx;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.querySelector('u').style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI + 90}deg)`;
    const dist = Math.round(Math.hypot(foe.pos.x - g.player.pos.x, foe.pos.z - g.player.pos.z));
    const lab = `${foe.name} ${dist}m`;
    if (lab !== this._arrowLab) { this._arrowLab = lab; el.querySelector('span').textContent = lab; }
    el.querySelector('span').style.left = (x > W - m * 2.6) ? '-92px' : '16px';
    if (!this._arrowOn) { this._arrowOn = true; el.classList.add('on'); }
  }

  // ---- interactive tutorial banner ----
  showTutorial(st, i, n, act) {
    const t = this.el.tut; t.style.display = 'block';
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    if (this.el.tutAct) this.el.tutAct.textContent = act || '';
    if (this.el.tutDist) this.el.tutDist.textContent = '';
    this.el.tutStep.textContent = `LEARN TO PLAY — ${i + 1} / ${n}`;
    this.el.tutObj.textContent = st.obj;
    this.el.tutKeys.textContent = st.keys;
    this.el.tutTip.textContent = st.tip;
    this.el.tutDots.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : ''}"></i>`).join('');
  }
  tutorialStepDone() { this.flashScreen('var(--gold)', 0.08); }
  setTutorialDist(txt) { if (this.el.tutDist && this.el.tutDist.textContent !== txt) this.el.tutDist.textContent = txt ? '🞋 ' + txt : ''; }
  completeTutorial() { this.hideTutorial(); }
  hideTutorial() { if (this.el.tut) this.el.tut.style.display = 'none'; }
  overlayOpen() { return [this.optionsEl, this.howtoEl, this.rankingsEl, this.bracketEl, this.atlasEl, this.codexEl, this.damageEl].some(e => e && e.style.display === 'flex'); }
  closeOptions() {
    if(this.optionsEl?.style.display!=='flex')return;
    this.optionsEl.style.display='none';
    const opener=this._optionsReturnFocus;this._optionsReturnFocus=null;
    if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});
  }
  closeOverlays() { if (this._atlasUI) this._atlasUI.close(); this.closeOptions(); for (const e of [this.howtoEl, this.rankingsEl, this.atlasEl, this.codexEl, this.damageEl]) if (e) e.style.display = 'none'; }   // the bracket closes only through its own buttons

  // ================= THE CODEX — the full case file on one superweapon =================
  // Every line is DERIVED from live data (kit numbers, the Elo book, AI doctrine, the registry)
  // so the file can never lie. Planetary rules: stamps, redactions, and useful intelligence.

  showOptions() {
    const S = SETTINGS;
    const cameraPreference=getCameraPreferences();
    const cameraProfile=cameraProfileOf({def:this.game.player?.def,_cameraPreset:this.game.player?._cameraPreset},cameraPreference)||CAMERA_DEFAULTS;
    const cameraSlider=(key,label,step)=>`<div class="orow"><label class="ol" for="camera-${key}">${label}</label><input id="camera-${key}" type="range" data-camera-value="${key}" min="${CAMERA_OPTION_LIMITS[key][0]}" max="${CAMERA_OPTION_LIMITS[key][1]}" step="${step}" value="${cameraProfile[key]??CAMERA_DEFAULTS[key]}"><output class="ov" for="camera-${key}">${cameraProfile[key]??CAMERA_DEFAULTS[key]}</output></div>`;
    const opening=this.optionsEl.style.display!=='flex';
    if(opening){this._optionsReturnFocus=document.activeElement;this.game.retireCombatViewInput?.();}
    this.optionsEl.setAttribute('role','dialog');this.optionsEl.setAttribute('aria-label','Options');this.optionsEl.setAttribute('aria-modal','true');
    // Keep menu keys away from combat shortcuts. Tab stays inside the modal;
    // ordinary input keys retain native behavior. Escape uses the shared closer.
    this.optionsEl.onkeyup=e=>{if(e.key!=='Escape')e.stopPropagation();};
    this.optionsEl.onkeydown=e=>{
      if(e.key==='Escape')return;
      e.stopPropagation();
      if(e.key!=='Tab')return;
      const controls=[...this.optionsEl.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
      const first=controls[0],last=controls.at(-1),active=document.activeElement;
      if(!first)return;
      if(e.shiftKey&&(active===first||!this.optionsEl.contains(active))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(active===last||!this.optionsEl.contains(active))){e.preventDefault();first.focus();}
    };
    const slider = (key, label, max, step) => `<div class="orow"><span class="ol">${label}</span><input type="range" data-k="${key}" min="0" max="${max}" step="${step}" value="${S[key]}"><span class="ov" data-v="${key}">${Math.round(S[key] * 100)}%</span></div>`;
    const toggle = (key, label) => `<div class="orow"><span class="ol">${label}</span><div class="chips3"><span class="c3${S[key] ? ' on' : ''}" data-t="${key}" data-on="1">ON</span><span class="c3${!S[key] ? ' on' : ''}" data-t="${key}" data-on="0">OFF</span></div></div>`;
    this.optionsEl.innerHTML = `<div class="obox">
      <div class="oh">Options</div>
      <div class="dgsec">CAMERA</div>
      <div class="orow"><span class="ol">Player view</span><div class="chips3" role="group" aria-label="Player camera">
        ${[['character','Character / Match'],['centered','Centered BFP'],['shoulder','Shoulder']].map(([id,label])=>`<button type="button" class="c3${(cameraPreference?.mode||'character')===id?' on':''}" data-camera-option="${id}" aria-pressed="${(cameraPreference?.mode||'character')===id}">${label}</button>`).join('')}
      </div></div>
      ${cameraSlider('fov','Vertical field of view',.01)}
      ${cameraSlider('range','Camera range',.5)}
      <div class="oline2">Camera changes apply immediately. Character / Match follows your match choice and character camera. Vehicles use their own view.</div>
      <button type="button" class="odone oghost" data-camera-reset>Reset camera</button>
      ${slider('master', 'Master Volume', 1, 0.05)}
      <div class="dgsec">THE MIX</div>
      ${slider('volMusic', 'Music', 1, 0.05)}
      ${slider('volSfx', 'Combat &amp; World', 1, 0.05)}
      ${slider('volVoice', 'Voices', 1, 0.05)}
      ${slider('volAmbient', 'City Ambience', 1, 0.05)}
      ${slider('volUi', 'Interface &amp; Broadcast', 1, 0.05)}
      <div class="dgsec">GAME</div>
      ${slider('voice', 'Battle Cry Intensity', 1, 0.05)}
      ${slider('shake', 'Screen Shake', 1.5, 0.05)}
      ${slider('lookSens', 'Mouse Look Sensitivity', 3, 0.1)}
      ${toggle('dmgNumbers', 'Damage Numbers')}
      ${toggle('hints', 'Controls Hint Panel')}
      ${toggle('aimAssist', 'Aim Assist · magnet targeting')}
      ${toggle('spacingRings', 'Spacing Rings · draw your strike reach on the ground')}
      ${toggle('sundial', 'Sundial · the hanging dial, sun and moon, day and time')}
      <div class="dgsec">DATA</div>
      <div class="oline2" style="line-height:1.5">${esc(GEO_ATTRIBUTION)}</div>
      <div class="oline2" style="opacity:.7">Everything ships offline. Nothing here is fetched at runtime.</div>
      ${toggle('heroVoice', 'Hero Voices · DBZ yells (off: fighters fight in silence)')}
      <div class="orow"><span class="ol">Control Scheme</span><div class="chips3">
        ${Object.entries(KEYMAPS).map(([k, m]) => `<span class="c3${keymap(S.scheme) === m ? ' on' : ''}" data-scheme="${k}">${m.name}</span>`).join('')}
      </div></div>
      <div class="oline2" id="schemeBlurb">${esc(keymap(S.scheme).blurb)}</div>
      <div class="orow"><span class="ol">Render Quality</span><div class="chips3">
        ${[['auto', 'AUTO'], ['2', 'HIGH'], ['1', 'BALANCED'], ['0', 'LOW']].map(([v, n]) => `<span class="c3${String(S.quality) === v ? ' on' : ''}" data-q="${v}">${n}</span>`).join('')}
      </div></div>
      <div class="orow"><span class="ol">Match Opening</span><div class="chips3">
        ${[['full', 'CINEMATIC'], ['quick', 'QUICK CARD'], ['off', 'OFF']].map(([v, n]) => `<span class="c3${S.opening === v ? ' on' : ''}" data-open="${v}">${n}</span>`).join('')}
      </div></div>
      <div class="oline2">CINEMATIC cold-opens each match with one of ten openers — case file, broadcast, flyover… Any key skips.</div>

      <div class="dgsec">THE LOOK</div>
      <div class="orow"><span class="ol">Print Treatment</span><div class="chips3">
        ${Object.entries(LOOK_PRESETS).map(([v, P]) => `<span class="c3${S.look === v ? ' on' : ''}" data-look="${v}">${P._n}</span>`).join('')}
      </div></div>
      <div class="oline2">${esc((LOOK_PRESETS[S.look] || {})._d || 'Your own numbers.')}</div>
      <div class="oline2" style="opacity:.72">Named for what they are FOR, not LOW / MEDIUM / HIGH. Measured on an RTX 4090 the whole stack fits inside 0.25ms even at 4K, so the ladder is built on texture fetches per pixel — ink and tilt-shift cost 8 each, everything else is free. If the frame-rate governor drops you to the lowest quality tier those two switch off automatically and come back when it recovers; your choice here is never overwritten.</div>
      ${slider('fxInk', 'Ink outlines', 1.5, 0.05)}
      ${slider('fxHalftone', 'Halftone (shadows only)', 1.5, 0.05)}
      ${slider('fxGrain', 'Paper grain', 1.5, 0.05)}
      ${slider('fxTilt', 'Tilt-shift', 1.5, 0.05)}
      ${slider('fxDither', 'Ordered dither', 1.5, 0.05)}
      ${slider('fxGrade', 'World grading', 1.5, 0.05)}
      ${slider('fxVibrance', 'Vibrance · lifts the DULL colours only', 1, 0.05)}
      ${slider('fxSaturation', 'Saturation · the blunt one', 1, 0.05)}
      ${slider('fxRim', 'Rim light on fighters', 1.5, 0.05)}
      <div class="orow"><span class="ol">Palette</span><div class="chips3">
        ${[['0', 'FULL'], ['9', '9 TONES'], ['7', '7 TONES'], ['5', '5 TONES']].map(([v, n]) => `<span class="c3${String(S.fxLevels) === v ? ' on' : ''}" data-lv="${v}">${n}</span>`).join('')}
      </div></div>
      ${toggle('fxImpact', 'Impact frames · one inverted frame on a haymaker')}
      ${toggle('fxSpeedLines', 'Speed lines on heavy hits')}

      <button class="odone" data-options-done>Done</button>
    </div>`;
    const apply = () => { applySettings(this.game); saveSettings(); };
    this.optionsEl.querySelectorAll('input[data-k]').forEach(r => r.oninput = () => {
      S[r.dataset.k] = parseFloat(r.value);
      // ⚠ touching a look dial switches to CUSTOM. Without this the preset re-stamps its own value
      // on the very next applySettings and the slider springs back — a control that fights you.
      if (r.dataset.k.startsWith('fx')) S.look = 'custom';
      this.optionsEl.querySelector(`[data-v="${r.dataset.k}"]`).textContent = Math.round(S[r.dataset.k] * 100) + '%';
      apply();
      if (r.dataset.k === 'master' || r.dataset.k === 'voice') this.game.audio.zap(700);   // audible feedback
    });
    this.optionsEl.querySelectorAll('[data-t]').forEach(c => c.onclick = () => { S[c.dataset.t] = c.dataset.on === '1'; apply(); this.showOptions(); });
    this.optionsEl.querySelectorAll('[data-q]').forEach(c => c.onclick = () => { S.quality = c.dataset.q === 'auto' ? 'auto' : c.dataset.q; apply(); this.showOptions(); });
    this.optionsEl.querySelectorAll('[data-open]').forEach(c => c.onclick = () => { S.opening = c.dataset.open; apply(); this.showOptions(); });
    this.optionsEl.querySelectorAll('[data-look]').forEach(c => c.onclick = () => { S.look = c.dataset.look; apply(); this.showOptions(); });
    this.optionsEl.querySelectorAll('[data-lv]').forEach(c => c.onclick = () => { S.fxLevels = +c.dataset.lv; S.look = 'custom'; apply(); this.showOptions(); });
    if (!this._uiSndWired) {
      this._uiSndWired = true;
      document.addEventListener('click', (ev) => {
        const el = ev.target && ev.target.closest && ev.target.closest('button, .c3, .chip, .rcard, .mcard, .slot, .odone, .oline, [data-t], [data-q], [data-scheme]');
        if (el && this.game && this.game.audio) this.game.audio.sample && this.game.audio.sample('ui.click', { bus: 'ui' });
      }, true);
    }
    this.optionsEl.querySelectorAll('[data-scheme]').forEach(c => c.onclick = () => {
      S.scheme = c.dataset.scheme; apply(); this.buildHintBody(); this.hintFull(true);   // show the new bindings
      this.feed('Controls: ' + keymap(S.scheme).name, 'var(--gold)');
      this.showOptions();
    });
    const applyCamera=()=>{const w=this.game.world;if(this.game.player&&w?.camMode==='chase')w.chase(this.game.player,this.game.hardLock,0,w._bfpCameraActive?'bfp':'auto');};
    this.optionsEl.querySelectorAll('[data-camera-option]').forEach(button=>button.onclick=()=>{
      if(button.dataset.cameraOption==='character')resetCameraPreferences();else setCameraPreferences({mode:button.dataset.cameraOption});
      applyCamera();this.showOptions();this.optionsEl.querySelector(`[data-camera-option="${button.dataset.cameraOption}"]`).focus();
    });
    this.optionsEl.querySelector('[data-camera-reset]').onclick=()=>{resetCameraPreferences();applyCamera();this.showOptions();this.optionsEl.querySelector('[data-camera-reset]').focus();};
    this.optionsEl.querySelectorAll('[data-camera-value]').forEach(input=>input.oninput=()=>{
      const current=getCameraPreferences()||{mode:cameraProfile.shoulder?'shoulder':'centered',fov:cameraProfile.fov??CAMERA_DEFAULTS.fov,range:cameraProfile.range??CAMERA_DEFAULTS.range};
      setCameraPreferences({...current,[input.dataset.cameraValue]:+input.value});input.nextElementSibling.textContent=input.value;applyCamera();
      this.optionsEl.querySelectorAll('[data-camera-option]').forEach(button=>{const active=button.dataset.cameraOption===getCameraPreferences().mode;button.classList.toggle('on',active);button.setAttribute('aria-pressed',String(active));});
    });
    this.optionsEl.querySelector('[data-options-done]').onclick = () => { apply();this.game.retireCombatViewInput?.();this.closeOptions(); };
    this.optionsEl.style.display = 'flex';
    if(opening)this.optionsEl.querySelector('[data-camera-option][aria-pressed="true"]').focus({preventScroll:true});
  }

  showHowto() {
    this.howtoEl.innerHTML = `<div class="obox">
      <div class="oh">How to Play</div>
      <div class="hsec"><div class="ht">Move & Aim</div><div class="hb"><b>WASD</b> move · <b>Mouse</b> aims everything · hover a foe to target them · <b>Click</b> a foe = hard lock (<b>T</b> clears) · <b>SHIFT</b> tap, then hold to advance movement gears · <b>2×TAP</b> a direction = your evade</div></div>
      <div class="hsec"><div class="ht">Powers</div><div class="hb"><b>LMB / RMB / Q / E / H</b> fire your powers · <b>R</b> is your ULTIMATE · many powers <em>charge</em> — hold to grow them, release to fire · everything spends <em>KI</em>: run dry and you fizzle, so watch the blue bar</div></div>
      <div class="hsec"><div class="ht">The Melee Triangle</div><div class="hb"><b>V</b> strike (tap = jab combo · <em>hold</em> = HAYMAKER) · <b>G</b> grab · <b>C / Mouse4</b> guard — <em>Strike beats Grab · Grab beats Guard · Guard beats Strike</em> · a HAYMAKER crushes a guard wide open · back-grabs can't be escaped</div></div>
      <div class="hsec"><div class="ht">Flight</div><div class="hb"><b>F</b> toggles flight on/off · hold <b>SPACE</b> to rise · release to hover · <b>Z</b> to descend and land · tap, then hold <b>SHIFT</b> in the air for <em>MOVEMENT GEARS</em> (some heroes fly much faster than others) · the <em>ring under every fighter</em> is their altitude band — green GROUND · gold BUILDING · cyan SKY · white CLOUDS — match colors to reach them</div></div>
      <div class="hsec"><div class="ht">Gadgets & The Meter</div><div class="hb"><b>X</b> uses your carried gadget (beacon, medkit, flashbang…) · low ki opens <em>OVERDRIVE</em> — your fists refill the tank · leveling up climbs <em>TIERS</em>: your aura and your meter literally grow</div></div>
      <div class="hsec"><div class="ht">Attacks & The Rest</div><div class="hb"><b>WHEEL</b> selects LMB attack · <b>RMB + WHEEL</b> selects RMB attack (release, then fire) · <b>[ ]</b> swaps hero · <b>TAB</b> melee / restore attacks in PowerWorld; roster in City · <b>F3</b> PowerWorld roster · <b>B</b> rival · <b>ESC</b> pause · <b>M</b> mute · 🎮 sticks move/aim · R2/L2 powers · ▢ ○ melee · L1 guard · ✕ fly</div></div>
      <div class="hsec"><div class="ht">The Golden Rule</div><div class="hb">The LeFevre threat scale is real — a Street-tier human <em>should</em> lose to a Cosmic superweapon. Lopsided is honest. Pick your fights, or forge your own weapon in <b>ORIGIN</b>.</div></div>
      <div class="hsec"><div class="ht">Damage Types</div><div class="hb">Every hit has a <em>type</em> — physical, ballistic, energy, fire, cold, toxic, acid, magic — and every fighter resists them differently. A machine <em>cannot</em> be poisoned; <b>ACID</b> eats the armour that stops bullets. Character selection shows your resistances and weaknesses. Your selected attacks show damage type; hit feedback says RESISTED, VULNERABLE or IMMUNE. Magic attacks drain energy and are resisted by Resolve.</div></div>
      <div class="hsec"><div class="ht">Conditions & Recovery</div><div class="hb"><b>BLEEDING:</b> movement reopens wounds; remain still for four seconds to clot. <b>BLIND:</b> leave smoke; lock and aim assistance are unavailable. <b>SLEEP:</b> damage wakes the victim; machines cannot sleep. <b>STUN / SHOCK:</b> actions stop and flyers fall; recovery gives a brief immunity window. Shock lasts longer on machines. <b>FROST:</b> leave the cold before buildup reaches full; frozen targets can be shattered by a heavy hit. <b>CORRODED:</b> armor is weakened, so avoid gunfire. Burning and poison keep dealing damage until their timers expire or are purged. Guard break creates a short opening: create distance before re-engaging.</div></div>
      <button class="odone" id="howtoDmg">☣ Open the Damage Codex</button>
      <button class="odone" id="howtoVis">◈ Open the Visual Language</button>
      <button class="odone" id="howtoTut">🎓 Play the Tutorial — learn by doing</button>
      <button class="odone oghost">Got It — Let's Fight</button>
    </div>`;
    if(this.game?.modeId==='powerworld'){
      const copy={
        'Move & Aim':'WASD moves · mouse aims · T focuses/releases the viewed target · hold ALT to look around while preserving travel and attack aim · C crouches · Z evades.',
        'Powers':'LMB / RMB fire the selected attacks · WHEEL selects primary · TAB + WHEEL selects secondary · hold TAB for the power picker · 1–4 use additional powers. Hold chargeable attacks to build power, then release. Watch your energy.',
        'The Melee Triangle':'V taps strike and approach; hold V for a heavy attack. Q / Mouse4 guards on ground or in air. E interacts or grabs. Strike can interrupt a grab; grab threatens guard; guard stops frontal strikes using energy. Watch the guard meter and recovery openings.',
        'Flight':'F toggles supported flight · SPACE jumps or rises · CTRL descends · release rise to hover when supported. Tap SHIFT, release, then hold again for faster movement. Character movement capabilities set the available speed tiers.',
        'Gadgets & The Meter':'X uses the selected gadget; hold X to open its picker. I opens inventory. R reloads an equipped firearm. Movement tiers do not occupy power slots.',
        'Attacks & The Rest':'E grabs a valid target; move to carry. While carrying, hold E to aim a throw and release to throw; tap E to let go. F3 opens character selection · ESC pauses · F1 shows the controls.'
      };
      for(const section of this.howtoEl.querySelectorAll('.hsec')){const text=copy[section.querySelector('.ht')?.textContent];if(text)section.querySelector('.hb').textContent=text;}
    }
    const seen = () => { try { localStorage.setItem('threshold_howto_seen', '1'); } catch {} this.howtoEl.style.display = 'none'; };
    this.howtoEl.querySelector('.oghost').onclick = seen;
    this.howtoEl.querySelector('#howtoDmg').onclick = () => this.showDamage();
    const vb = this.howtoEl.querySelector('#howtoVis');
    if (vb) vb.onclick = () => this.showVisual();
    this.howtoEl.querySelector('#howtoTut').onclick = () => { seen(); this.onTutorial && this.onTutorial(); };
    this.howtoEl.style.display = 'flex';
  }

  // ---- THE ESTABLISHING SHOT ------------------------------------------------------------
  // Every match opens on a title card the way a film opens on a city: the name, then the facts
  // underneath it, then the card lifts and you are standing in it. The Danger Room gets a
  // different one — it BOOTS rather than arrives, because it is a simulation and should say so.
  // ---------- LOW ORBIT TRANSIT (manual §17): the world map + the loading-screen cinematic ----------
  // Deterministic pseudo-geography: the sheet has no coordinates (HANDOFF documents the gap), so
  // distances hash from country+city — STABLE, same-country cities cluster, and the transit time
  // honestly orders near vs far until real coordinates exist in the sheet.
  // ⚠ THE HASH IS THE FALLBACK NOW, NOT THE ANSWER. This used to hash country+city into a
  // plausible-looking lat/lon, and its own comment said "until real coordinates exist in the
  // sheet." They exist: data/citycoords.js carries all 1,050, matched to GeoNames. Baking them and
  // leaving the consumer hashing is exactly the half-wire this project keeps producing — the data
  // landed and nothing read it.
  // ⚠ cityList() returns a FRESH array per call, so indexOf(cityObject) is always -1 (the known
  // law). Match on name+country, the same way the theater does.
  _cityLL(c) {
    if (c && c.name) {
      if (this._llIdx === undefined) {
        this._llIdx = new Map();
        cityList().forEach((x, i) => this._llIdx.set((x.name + '|' + x.country).toLowerCase(), i));
      }
      const i = this._llIdx.get(((c.name || '') + '|' + (c.country || '')).toLowerCase());
      if (i !== undefined) { const ll = cityLatLon(i); if (ll) return { lat: ll[0], lon: ll[1], real: true }; }
    }
    // off-world settlements and anything not on the sheet still need a stable ordering
    const h = (s) => { let x = 9; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; };
    const hc = h((c && c.country) || '?'), hn = h(((c && c.name) || '?') + ((c && c.country) || ''));
    return { lat: (hc % 1200) / 10 - 60 + ((hn % 60) / 10 - 3), lon: ((hc >>> 8) % 3400) / 10 - 170 + ((hn >>> 6) % 60) / 10 - 3 };
  }
  // GREAT-CIRCLE distance, because the coordinates are real now. The old flat lat/lon hypotenuse
  // was fine for hash noise and is wrong for a globe: it makes any long east-west leg far too long
  // (a degree of longitude is 111km at the equator and 30km at Oslo) and it cannot cross the
  // antimeridian at all — Tokyo to Los Angeles would have gone the long way round the planet.
  _cityKm(from, to) {
    const a = this._cityLL(from || { name: 'x', country: 'x' }), b = this._cityLL(to);
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
    const h = s1 * s1 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * s2 * s2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  _transitSecs(from, to) {
    // half the planet (~20,000km) is the long trip; the clamp keeps a loading screen a loading
    // screen rather than a punishment.
    const km = this._cityKm(from, to);
    return Math.max(4, Math.min(13, 4 + (km / 20000) * 9));
  }
  showDepart(game) {
    if (this._departEl) return;
    const from = game.world.plan ? { name: game.world.plan.name, country: game.world.plan.country } : { name: 'THE WHITE CITY', country: '' };
    const ov = document.createElement('div');
    ov.className = 'lswovl';
    ov.style.cssText = 'position:fixed;inset:0;z-index:64;display:flex;align-items:center;justify-content:center;background:rgba(6,8,12,0.86)';
    const box = document.createElement('div');
    box.style.cssText = 'width:min(680px,92vw);max-height:82vh;display:flex;flex-direction:column;gap:10px;background:var(--surface-solid,#14161c);border:1px solid var(--line-gold,#6b5824);border-radius:12px;padding:18px 20px;font-family:var(--f-mono,monospace)';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div style="font-family:var(--f-display,sans-serif);font-size:20px;letter-spacing:0.06em;color:var(--gold,#ffd24a)">LOW ORBIT — DEPART</div>
        <div style="font-size:10px;color:var(--text-5,#8b8577)">THE WORLD MAP · GPS STAYS ON THE STREET</div>
      </div>
      <div style="font-size:11px;color:var(--text-3,#c9c2b4)">Holding the burner above the ceiling. Pick a theater — transit time is distance over an open throttle.</div>
      <input id="dptQ" placeholder="search 1,050 cities…" style="background:var(--surface,#0d0f14);border:1px solid var(--line,#2a2d33);border-radius:8px;color:var(--text,#e8e2d4);padding:8px 10px;font-family:inherit;font-size:12px;outline:none">
      <div id="dptList" style="overflow-y:auto;min-height:120px;max-height:46vh;display:flex;flex-direction:column;gap:4px"></div>
      <button id="dptStay" style="align-self:flex-end;background:none;border:1px solid var(--line-2,#3a3f47);border-radius:8px;color:var(--text-3,#c9c2b4);padding:6px 14px;font-family:inherit;font-size:11px;cursor:pointer">STAY — descend</button>`;
    ov.appendChild(box); document.body.appendChild(ov);
    this._departEl = ov;
    const list = box.querySelector('#dptList'), q = box.querySelector('#dptQ');
    // THE ZOOM STACK (manual §17): city → SYSTEM. Same map, one level out — the GPS never leaves
    // the street, this screen never leaves the traveler.
    let view = this._departView || 'earth';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px';
    bar.innerHTML = `
      <button id="dptEarth" style="flex:1;border-radius:8px;padding:6px;font-family:inherit;font-size:11px;cursor:pointer">🌍 EARTH — 1,050 THEATERS</button>
      <button id="dptSys" style="flex:1;border-radius:8px;padding:6px;font-family:inherit;font-size:11px;cursor:pointer">☉ THE SYSTEM — 10 WORLDS</button>`;
    box.insertBefore(bar, q);
    const setView = (v) => {
      view = v; this._departView = v;
      const on = 'background:var(--surface-hi,#1a1d24);border:1px solid var(--gold,#ffd24a);color:var(--gold,#ffd24a)';
      const off = 'background:none;border:1px solid var(--line-2,#3a3f47);color:var(--text-3,#c9c2b4)';
      bar.querySelector('#dptEarth').style.cssText = 'flex:1;border-radius:8px;padding:6px;font-family:inherit;font-size:11px;cursor:pointer;' + (v === 'earth' ? on : off);
      bar.querySelector('#dptSys').style.cssText = 'flex:1;border-radius:8px;padding:6px;font-family:inherit;font-size:11px;cursor:pointer;' + (v === 'system' ? on : off);
      q.style.display = v === 'earth' ? 'block' : 'none';
      render(q.value || '');
    };
    bar.querySelector('#dptEarth').onclick = () => setView('earth');
    bar.querySelector('#dptSys').onclick = () => setView('system');
    const renderSystem = () => {
      list.innerHTML = PLANETS.map((P, i) => {
        const km = Math.round(P.au * AU_KM / 1e6);
        const ok = P.landable && !P.home;
        const right = P.home ? 'YOU ARE HERE' : ok ? `TRANSIT ~${transitSecsFor(P).toFixed(0)}s` : (P.reason || 'NO LANDING');
        return `<div class="dptRow sysRow" data-i="${i}" style="display:flex;justify-content:space-between;gap:10px;padding:7px 10px;border:1px solid var(--line,#2a2d33);border-radius:8px;${ok ? 'cursor:pointer' : 'opacity:0.55'}">
          <div><b style="color:${ok ? 'var(--text,#e8e2d4)' : 'var(--text-4,#9a958a)'};font-size:12px">${P.name.toUpperCase()}</b>
            <span style="color:var(--text-5,#8b8577);font-size:10px"> · ${P.au} AU · ${km}M KM${P.settlement ? ' · ' + P.settlement.name : ''}</span></div>
          <div style="color:${ok ? 'var(--gold,#ffd24a)' : 'var(--text-6,#6a655a)'};font-size:10.5px;white-space:nowrap;text-align:right">${right}</div>
        </div>`;
      }).join('') + `<div class="dptRow" id="dptHelio" style="display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border:1px dashed var(--line-gold,#6b5824);border-radius:8px;cursor:pointer;margin-top:6px">
        <div><b style="color:var(--gold,#ffd24a);font-size:12px">⬆ LEAVE THE SYSTEM</b>
          <span style="color:var(--text-5,#8b8577);font-size:10px"> · cross the heliopause · see the true scale</span></div>
        <div style="color:var(--gold,#ffd24a);font-size:10.5px">${HELIOPAUSE_AU} AU →</div></div>`;
      list.querySelectorAll('.sysRow').forEach((el) => {
        const P = PLANETS[+el.dataset.i];
        if (!(P.landable && !P.home)) return;
        el.onmouseenter = () => el.style.borderColor = 'var(--gold,#ffd24a)';
        el.onmouseleave = () => el.style.borderColor = 'var(--line,#2a2d33)';
        el.onclick = () => {
          this.hideDepart();
          // ⚠ A PLANET CROSSING IS A FLIGHT, NOT A LOADING CARD. The 2D transit card stays for
          // city-to-city hops (a suborbital hop past nothing); going to another WORLD runs the
          // real space layer, which flies the route's actual flybys in the game's own renderer.
          this._playSpace(game, {
            from: (game.hud && game.hud.theater && game.hud.theater.planet) || 'earth',
            to: P.id, secs: transitSecsFor(P) * 1.6,
          }, () => { if (game.onTravel) game.onTravel({ name: P.settlement.name, country: P.name }, -1, P.id); });
        };
      });
      // THE DEEP CROSSING — out past Neptune, through the heliopause and into the Oort cloud. The
      // route model marks anything beyond 30 AU `deep`, which is what earns those two acts.
      list.querySelector('#dptHelio').onclick = () => {
        this.hideDepart();
        this._playSpace(game, { from: 'earth', to: { au: HELIOPAUSE_AU }, deep: true, secs: 24 },
          () => this._playHeliopause(game));
      };
    };
    const render = (filter) => {
      if (view === 'system') return renderSystem();
      const F = (filter || '').toLowerCase();
      const rows = cityList().filter(c => !F || c.name.toLowerCase().includes(F) || (c.country || '').toLowerCase().includes(F)).slice(0, 40);
      list.innerHTML = rows.map((c, i) => {
        const t = this._transitSecs(from, c).toFixed(0);
        let cl = ''; try { cl = climateLine ? (climateLine(c) || '') : ''; } catch (e) {}
        return `<div class="dptRow" data-i="${i}" style="display:flex;justify-content:space-between;gap:10px;padding:7px 10px;border:1px solid var(--line,#2a2d33);border-radius:8px;cursor:pointer">
          <div><b style="color:var(--text,#e8e2d4);font-size:12px">${c.name.toUpperCase()}</b>
            <span style="color:var(--text-5,#8b8577);font-size:10px"> · ${(c.country || '').toUpperCase()} · POP ${c.popLabel || c.popType || ''}</span>
            <div style="color:var(--text-5,#8b8577);font-size:9.5px">${cl}</div></div>
          <div style="color:var(--gold,#ffd24a);font-size:11px;white-space:nowrap">TRANSIT ~${t}s</div>
        </div>`;
      }).join('') || '<div style="color:var(--text-5)">no matches</div>';
      list.querySelectorAll('.dptRow').forEach((el) => {
        el.onmouseenter = () => el.style.borderColor = 'var(--gold,#ffd24a)';
        el.onmouseleave = () => el.style.borderColor = 'var(--line,#2a2d33)';
        el.onclick = () => {
          const c = rows[+el.dataset.i];
          this.hideDepart();
          this._playTransit(game, from, c, () => { if (game.onTravel) game.onTravel(c, cityList().findIndex(x => x.name === c.name && x.country === c.country)); });   // cityList() is a fresh array per call - identity indexOf is always -1
        };
      });
    };
    setView(view);
    q.oninput = () => render(q.value);
    setTimeout(() => q.focus(), 30);
    box.querySelector('#dptStay').onclick = () => { this.hideDepart(); game.running = true; if (game.player) game.player.vel.y = -20; };
  }
  hideDepart() { if (this._departEl) { this._departEl.remove(); this._departEl = null; } }
  // The transit cinematic — the 11th member of the cold-open family, doubling as the loading
  // screen. Stars, the planet's limb, the route drawn in the traveler's own WAKE identity.
  // THE SPACE LAYER LAUNCHER. The PARTY is assembled from live state, never named: whoever is
  // piloting plus anyone else on the roster who is coming, plus a ship if one is booked. That is
  // the seam vehicles arrive through — `partySpec` is data, so "a flyer", "a flyer and a shuttle"
  // and "four flyers escorting a freighter" are all callers, not code paths.
  _playSpace(game, opts, onDone) {
    const spec = opts.partySpec || (game.travelParty) || { hero: game.player && game.player.def };
    return playSpaceFlight(game, { ...opts, partySpec: spec }, () => { if (onDone) onDone(); });
  }

  _playTransit(game, from, to, onDone, opts = {}) {
    const hero = game.player ? game.player.def : null;
    const wake = (hero && hero.afterburner && hero.afterburner.wake) || ['#ffffff', '#ffd24a'];
    const secs = Math.max(3.2, (opts.secs || this._transitSecs(from, to)) * 0.55);
    const ov = document.createElement('div');
    ov.className = 'lswovl';
    ov.style.cssText = 'display:block;position:fixed;inset:0;z-index:66;background:#04050a;overflow:hidden;font-family:var(--f-mono,monospace)';   // .lswovl defaults display:none — inline display wins
    ov.innerHTML = `
      <canvas id="trvStars" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <div style="position:absolute;left:0;right:0;bottom:-42vh;height:80vh;border-radius:50% 50% 0 0;background:#070a12;box-shadow:0 -6px 60px 8px rgba(127,190,255,0.28), inset 0 30px 80px rgba(10,20,40,0.9)"></div>
      <div id="trvKick" style="position:absolute;top:9vh;left:50%;transform:translateX(-50%);color:var(--gold,#ffd24a);font-size:13px;letter-spacing:0.22em;white-space:nowrap"></div>
      <svg id="trvArc" viewBox="0 0 1000 500" style="position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(860px,92vw);height:auto">
        <path id="trvPath" d="M 120 380 Q 500 60 880 380" fill="none" stroke="${wake[1]}" stroke-width="2.5" stroke-dasharray="7 9" opacity="0.85"/>
        <circle id="trvDot" r="7" fill="${wake[0]}" style="filter:drop-shadow(0 0 8px ${wake[0]})"/>
      </svg>
      <div style="position:absolute;left:6vw;bottom:16vh;color:var(--text-3,#c9c2b4);font-size:12px">
        <div style="color:var(--text-5,#8b8577);font-size:9px">DEPARTED</div><b style="font-size:15px;color:var(--text,#e8e2d4)">${(from.name || '').toUpperCase()}</b>
        <div style="font-size:10px;color:var(--text-5,#8b8577)">${(from.country || '').toUpperCase()}</div></div>
      <div style="position:absolute;right:6vw;bottom:16vh;text-align:right;color:var(--text-3,#c9c2b4);font-size:12px">
        <div style="color:var(--text-5,#8b8577);font-size:9px">ON APPROACH</div><b style="font-size:15px;color:var(--gold,#ffd24a)">${to.name.toUpperCase()}</b>
        <div style="font-size:10px;color:var(--text-5,#8b8577)">${(to.country || '').toUpperCase()}</div></div>
      <div style="position:absolute;bottom:7vh;left:50%;transform:translateX(-50%);color:var(--text-6,#6a655a);font-size:9.5px;letter-spacing:0.2em">ANY KEY — SKIP TRANSIT</div>`;
    document.body.appendChild(ov);
    const cv = ov.querySelector('#trvStars'), ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 230; i++) { ctx.globalAlpha = 0.25 + Math.random() * 0.75; ctx.fillRect(Math.random() * cv.width, Math.random() * cv.height * 0.72, Math.random() < 0.08 ? 2 : 1, 1); }
    ctx.globalAlpha = 1;
    const kick = ov.querySelector('#trvKick');
    const kickTxt = `LOW ORBIT TRANSIT — ${hero ? hero.name : 'ASCENDANT'} DEPARTS ${(from.name || '').toUpperCase()}`;
    let ki = 0;
    const kt = setInterval(() => { kick.textContent = kickTxt.slice(0, ++ki); if (ki >= kickTxt.length) clearInterval(kt); }, 26);
    const path = ov.querySelector('#trvPath'), dot = ov.querySelector('#trvDot');
    const plen = path.getTotalLength();
    const t0 = performance.now();
    let done = false;
    let tick = 0;
    const finish = () => {
      if (done) return; done = true;
      clearInterval(kt); clearInterval(tick);
      window.removeEventListener('keydown', skip, true); ov.removeEventListener('pointerdown', skip, true);
      ov.remove(); this._transitEl = null;
      onDone && onDone();
    };
    const skip = (e) => { if (e && e.key === 'F12') return; finish(); };
    window.addEventListener('keydown', skip, true); ov.addEventListener('pointerdown', skip, true);
    tick = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (secs * 1000));
      const pt = path.getPointAtLength(plen * k);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      if (k >= 1) finish();
    }, 33);
    this._transitEl = ov;
  }

  _playHeliopause(game) {
    const hero = game.player ? game.player.def : null;
    const wake = (hero && hero.afterburner && hero.afterburner.wake) || ['#ffffff', '#ffd24a'];
    const prim = (hero && hero.colors && hero.colors.primary) || '#e8e2d4';
    const name = hero ? hero.name : 'ASCENDANT';
    const ov = document.createElement('div');
    ov.className = 'lswovl';
    ov.style.cssText = 'display:block;position:fixed;inset:0;z-index:66;background:#03040a;overflow:hidden;font-family:var(--f-mono,monospace)';
    ov.innerHTML = `
      <canvas id="hpCv" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <div id="hpTitle" style="position:absolute;top:8vh;left:50%;transform:translateX(-50%);color:var(--gold,#ffd24a);font-size:13px;letter-spacing:0.22em;white-space:nowrap"></div>
      <div id="hpSub" style="position:absolute;top:8vh;left:50%;transform:translate(-50%,22px);color:var(--text-3,#c9c2b4);font-size:10.5px;letter-spacing:0.08em;white-space:nowrap"></div>
      <div id="hpNote" style="position:absolute;bottom:14vh;left:50%;transform:translateX(-50%);color:var(--text-4,#9a958a);font-size:10.5px;letter-spacing:0.06em;white-space:nowrap"></div>
      <div id="hpBarWrap" style="position:absolute;bottom:8.5vh;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;color:var(--text-5,#8b8577);font-size:9.5px">
        <span id="hpBar" style="display:inline-block;width:160px;height:2px;background:var(--text-4,#9a958a)"></span><span id="hpBarLab"></span></div>
      <button id="hpReturn" style="position:absolute;bottom:5vh;right:6vw;display:none;background:none;border:1px solid var(--gold,#ffd24a);border-radius:8px;color:var(--gold,#ffd24a);padding:8px 18px;font-family:inherit;font-size:11px;cursor:pointer;letter-spacing:0.1em">RETURN TO THE MAP</button>
      <div id="hpSkip" style="position:absolute;bottom:5vh;left:50%;transform:translateX(-50%);color:var(--text-6,#6a655a);font-size:9.5px;letter-spacing:0.2em">ANY KEY — SKIP AHEAD</div>`;
    document.body.appendChild(ov);
    this._helioEl = ov;
    const cv = ov.querySelector('#hpCv'), ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const W = cv.width, Hh = cv.height, cx = W / 2, cy = Hh / 2;
    const stars = [];
    for (let i = 0; i < 260; i++) stars.push([Math.random() * W, Math.random() * Hh, 0.2 + Math.random() * 0.8]);
    const $ = (id) => ov.querySelector('#' + id);
    const T1 = 5.2, T2 = 4.6, STEP = 1.6, T3 = SCALE_LADDER.length * STEP + 1.4;
    let t = 0, done = false, raf = 0, last = performance.now();
    const figure = (x, y, s) => {           // the character, SEEN — head, body, trailing wake
      ctx.strokeStyle = prim; ctx.lineWidth = Math.max(1.5, s * 0.16); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y - s * 0.75, s * 0.28, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.45); ctx.lineTo(x, y + s * 0.35); ctx.stroke();      // spine
      ctx.beginPath(); ctx.moveTo(x - s * 0.55, y - s * 0.15); ctx.lineTo(x + s * 0.62, y - s * 0.3); ctx.stroke();  // arms — lead fist out
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.35); ctx.lineTo(x - s * 0.7, y + s * 0.62); ctx.stroke();             // legs trail
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.35); ctx.lineTo(x - s * 0.5, y + s * 0.78); ctx.stroke();
      const g = ctx.createLinearGradient(x - s * 4.5, y, x, y);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, wake[0]);
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, s * 0.22);
      ctx.beginPath(); ctx.moveTo(x - s * 4.5, y + s * 0.1); ctx.lineTo(x - s * 0.6, y); ctx.stroke();
    };
    const drawStars = (dim) => { ctx.fillStyle = '#fff'; for (const [sx, sy, sa] of stars) { ctx.globalAlpha = sa * dim; ctx.fillRect(sx, sy, 1, 1); } ctx.globalAlpha = 1; };
    const orbitR = (au) => 30 + Math.log10(au * 12 + 1) * (Math.min(W, Hh) * 0.155);
    const draw = () => {
      ctx.fillStyle = '#03040a'; ctx.fillRect(0, 0, W, Hh);
      if (t < T1) {
        // ACT I — the run out: log-scaled orbits, the dot accelerating past every world
        drawStars(0.8);
        ctx.fillStyle = '#ffd97a'; ctx.beginPath(); ctx.arc(cx * 0.5, cy, 5, 0, Math.PI * 2); ctx.fill();
        for (const P of PLANETS) {
          const r = orbitR(P.au);
          ctx.strokeStyle = 'rgba(140,150,170,0.22)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(cx * 0.5, cy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#9aa4b0'; ctx.font = '9px monospace';
          ctx.fillText(P.name.toUpperCase(), cx * 0.5 + r + 3, cy - 4);
          ctx.beginPath(); ctx.arc(cx * 0.5 + r, cy, P.kind === 'gas' ? 3 : 1.6, 0, Math.PI * 2); ctx.fill();
        }
        const k = t / T1, ease = k * k;
        const R = orbitR(0.3) + ease * (orbitR(60) - orbitR(0.3));
        const px = cx * 0.5 + R;
        ctx.fillStyle = wake[0]; ctx.shadowColor = wake[0]; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(px, cy, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        const passed = [...PLANETS].reverse().find(P => orbitR(P.au) < R);
        $('hpTitle').textContent = 'LEAVING THE SYSTEM — ' + name;
        $('hpSub').textContent = passed ? `PASSING ${passed.name.toUpperCase()} · ${passed.au} AU` : 'FULL BURN';
        $('hpNote').textContent = 'the map does the miles — the burner does the leaving';
        $('hpBarLab').textContent = '≈ 60 AU ACROSS';
      } else if (t < T1 + T2) {
        // ACT II — THE BOUNDARY: the character is SEEN crossing the heliopause
        const k = (t - T1) / T2;
        drawStars(1);
        const wallX = cx + Math.min(W, Hh) * 0.12;
        ctx.strokeStyle = 'rgba(120,160,220,0.32)'; ctx.lineWidth = 26;
        ctx.beginPath(); ctx.arc(wallX + Hh * 2.1, cy, Hh * 2.16, Math.PI * 0.86, Math.PI * 1.14); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,200,255,0.75)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(wallX + Hh * 2.1, cy, Hh * 2.1, Math.PI * 0.85, Math.PI * 1.15); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,190,120,0.2)'; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.arc(wallX + Hh * 2.1, cy, Hh * 2.34, Math.PI * 0.88, Math.PI * 1.12); ctx.stroke();
        const fx = cx - W * 0.28 + k * W * 0.5;
        figure(fx, cy, 26);
        ctx.fillStyle = 'var(--gold)'; ctx.fillStyle = '#ffd24a'; ctx.font = '10px monospace';
        ctx.fillText(name.toUpperCase(), fx - 14, cy + 34);
        $('hpTitle').textContent = 'THE HELIOPAUSE · ' + HELIOPAUSE_AU + ' AU';
        $('hpSub').textContent = 'the solar wind stops here — Voyager 1 crossed in 2012, at 121.6 AU';
        $('hpNote').textContent = fx > wallX ? name + ' IS OUTSIDE THE SOLAR SYSTEM' : `termination shock behind · ${TERMINATION_SHOCK_AU} AU`;
        $('hpBarLab').textContent = '≈ 40 AU ACROSS';
      } else {
        // ACT III — PROPER SCALE: powers of ten until the whole system is a dot among the stars
        const k3 = t - T1 - T2;
        const step = Math.min(SCALE_LADDER.length - 1, Math.floor(k3 / STEP));
        const L = SCALE_LADDER[step];
        drawStars(1);
        const span = L.au * 2.4;                        // AU across the frame
        const pxPerAU = W / span;
        const hpR = Math.max(0.7, HELIOPAUSE_AU * pxPerAU);
        ctx.strokeStyle = 'rgba(160,200,255,0.6)'; ctx.lineWidth = Math.max(1, Math.min(3, hpR * 0.02));
        ctx.beginPath(); ctx.arc(cx, cy, hpR, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd97a'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.8, 1 * pxPerAU), 0, Math.PI * 2); ctx.fill();
        if (hpR > 8) { ctx.fillStyle = '#9aa4b0'; ctx.font = '9px monospace'; ctx.fillText('THE HELIOSPHERE', cx + hpR + 5, cy); }
        else { ctx.strokeStyle = '#8b8577'; ctx.beginPath(); ctx.moveTo(cx + 26, cy - 26); ctx.lineTo(cx + 3, cy - 3); ctx.stroke(); ctx.fillStyle = '#c9c2b4'; ctx.font = '10px monospace'; ctx.fillText('THE ENTIRE SYSTEM — everything you have ever fought over', cx + 30, cy - 30); }
        if (L.au >= 100000) {
          for (let i = 0; i < NEAR_STARS.length; i++) {
            const S = NEAR_STARS[i], au = S.ly * 63241;
            const a = S.a, sx2 = cx + Math.cos(a) * au * pxPerAU, sy2 = cy + Math.sin(a) * au * pxPerAU * 0.6;
            if (sx2 > -50 && sx2 < W + 50 && sy2 > -50 && sy2 < Hh + 50) {
              ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
              ctx.beginPath(); ctx.arc(sx2, sy2, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
              ctx.fillStyle = '#c9c2b4'; ctx.font = '9.5px monospace';
              ctx.fillText(`${S.name} · ${S.ly} LY`, sx2 + 7, sy2 + 3);
            }
          }
        }
        $('hpTitle').textContent = 'THE TRUE SCALE';
        $('hpSub').textContent = L.note.toUpperCase();
        $('hpNote').textContent = 'INTERSTELLAR SPACE — NO CHARTED THEATERS BEYOND THIS LINE. YET.';
        const barAU = 160 / pxPerAU;
        $('hpBarLab').textContent = 'BAR ≈ ' + (barAU >= 63241 ? (barAU / 63241).toFixed(1) + ' LIGHT-YEARS' : Math.round(barAU).toLocaleString() + ' AU');
        if (t > T1 + T2 + T3 - 0.2) { $('hpReturn').style.display = 'block'; $('hpSkip').style.display = 'none'; }
      }
    };
    const finish = () => {
      if (done) return; done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', skip, true);
      ov.remove(); this._helioEl = null;
      this._departView = 'system';
      this.showDepart(game);                             // back to the map, still at the system tier
    };
    const skip = (e) => {
      if (e && e.key === 'F12') return;
      if (t < T1 + T2 + T3 - 0.3) { t = T1 + T2 + T3 - 0.25; }   // jump to the final frame — the scale is the point
      else finish();
    };
    window.addEventListener('keydown', skip, true);
    ov.querySelector('#hpReturn').onclick = finish;
    const loop = () => {
      const now = performance.now(); t += Math.min(0.05, (now - last) / 1000); last = now;
      draw();
      if (!done) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  showEstablishing(plan, opts = {}) {
    const el = this.establishEl;
    clearTimeout(this._estT1); clearTimeout(this._estT2);
    const sim = !!opts.sim;
    const esc2 = (v) => esc(String(v == null ? '' : v));

    if (sim) {
      el.className = 'establish sim';
      el.innerHTML = `
        <div class="estinner">
          <div class="estkick">THRESHOLD TREATY OFFICE · TRAINING DIVISION</div>
          <div class="esttitle">THE DANGER ROOM</div>
          <div class="estsub">SIMULATED ENVIRONMENT</div>
          <div class="estboot">
            <div><b>ENVIRONMENT</b><span>PROJECTED</span></div>
            <div><b>SUBJECT</b><span>LIVE</span></div>
            <div><b>SAFETIES</b><span>ENGAGED</span></div>
            <div><b>TELEMETRY</b><span>RECORDING</span></div>
          </div>
          <div class="estbar"><i></i></div>
        </div>`;
    } else {
      const C = opts.country || {};
      const crime = plan.crime ?? 50, safety = plan.safety ?? 50;
      const bar = (v, good) => {
        const pct = Math.max(0, Math.min(100, v));
        return `<div class="estbarline"><i style="width:${pct}%;background:${good ? 'var(--good)' : 'var(--danger)'}"></i></div>`;
      };
      el.className = 'establish';
      el.innerHTML = `
        <div class="estinner">
          <div class="estkick">${esc2(opts.kicker || 'THEATER OF OPERATIONS')}</div>
          <div class="esttitle">${esc2(plan.name)}</div>
          <div class="estsub">${esc2(plan.country || '')}</div>
          <div class="eststats">
            <div class="eststat"><b>POPULATION</b><span>${esc2(plan.popLabel || '')}</span></div>
            <div class="eststat"><b>DISTRICTS</b><span>${esc2((plan.types || []).join(' · ') || 'MIXED')}</span></div>
            <div class="eststat"><b>CRIME INDEX</b><span>${crime}</span>${bar(crime, false)}</div>
            <div class="eststat"><b>SAFETY INDEX</b><span>${safety}</span>${bar(safety, true)}</div>
            ${C.lawEnforcement != null ? `<div class="eststat"><b>POLICE RESPONSE</b><span>~${opts.eta ?? '?'}s</span></div>` : ''}
            ${C.vigilantism ? `<div class="eststat"><b>VIGILANTISM</b><span class="${C.vigilantism === 'Banned' ? 'estbad' : ''}">${esc2(C.vigilantism.toUpperCase())}</span></div>` : ''}
          </div>
        </div>`;
    }

    el.style.display = 'flex';
    // three beats: HOLD on the card, LIFT the veil, then get out of the way entirely
    el.classList.remove('lift', 'gone');
    void el.offsetWidth;                       // force a reflow so the transition actually plays
    this._estT1 = setTimeout(() => el.classList.add('lift'), sim ? 1500 : 2200);
    this._estT2 = setTimeout(() => { el.classList.add('gone'); el.style.display = 'none'; }, sim ? 3200 : 4200);
  }
  hideEstablishing() {
    clearTimeout(this._estT1); clearTimeout(this._estT2);
    if (this.establishEl) { this.establishEl.style.display = 'none'; this.establishEl.classList.add('gone'); }
  }

  // THE DAMAGE CODEX — the in-game half of docs/COMBAT_MANUAL.md. Every row is READ FROM THE LIVE
  // TABLES (DTYPE_INFO + resistOf run against the real roster), so this screen physically cannot
  // drift from what the engine does. Protocol §6: a new damage type shows up here for free.

  // ⚠ CANVAS 2D CANNOT READ CSS TOKENS. `ctx.fillStyle = '#ffd24a'` is silently ignored and
  // the previous colour is kept — it is not an error, it just draws the wrong thing. Anything
  // painted into a <canvas> must use these literals. Keep them in sync with :root in index.html.
  // ---- combat UI: radar, hit direction, KO banner ----
  // -------------------------------------------------------------------------------------------
  // THE SUNDIAL. Robert's brief, in his words: "a upside down needle that points to sun and moon
  // and Noon/Midnight, and it should show the days and time."
  //
  // So it is an INVERTED dial: the gnomon HANGS from the top edge of the screen and the hours are
  // the arc swinging below it, which is the one arrangement that reads instantly at the top of a
  // HUD and does not fight the isometric camera the way a flat-on-the-ground dial would.
  //
  // Every value is live: the needle is `world.dayT` (the same clock the sky, the news bug and the
  // pedestrians already run on), the date is `gameDate()` (the same calendar the planets orbit on,
  // advanced by the career), and the MOON rides exactly opposite the sun. Nothing here keeps its
  // own time, so the dial and the sky can never disagree.
  //
  // ⚠ ONE-TIME BUILD, TRANSFORM-ONLY UPDATE. The SVG is created once and the frame loop writes
  // three transforms and two strings — no innerHTML in the frame path, and the text only rewrites
  // when the displayed MINUTE changes (the dirty-check pattern the rest of the HUD widgets use).
  _buildSundial() {
    const W = 246, H = 96, CX = W / 2, CY = 4, R = 74;      // the pivot hangs off the TOP edge
    const pol = (deg, r) => {                                // 0deg = straight down from the pivot
      const a = (deg - 90) * Math.PI / 180;
      return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
    };
    let ticks = '';
    for (let h = 0; h < 24; h++) {
      const deg = -90 + h * 15;                              // 24 hours across the 360, half visible
      if (deg < -84 || deg > 84) continue;
      const big = h % 6 === 0;
      const [x1, y1] = pol(deg, R - (big ? 11 : 5)), [x2, y2] = pol(deg, R);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${big ? 'var(--gold-deep,#b8801a)' : 'var(--line-2,#3a3d43)'}" stroke-width="${big ? 1.6 : 1}"/>`;
    }
    const [ax, ay] = pol(-84, R), [bx, by] = pol(84, R);
    this.el.sundial.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
      <path d="M ${ax.toFixed(1)} ${ay.toFixed(1)} A ${R} ${R} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}"
            fill="none" stroke="var(--line-2,#3a3d43)" stroke-width="1.2"/>
      ${ticks}
      <text class="sdlab" x="${CX}" y="${(CY + R - 15).toFixed(1)}" text-anchor="middle">NOON</text>
      <text class="sdlab" x="7" y="${(CY + 20).toFixed(1)}">MID</text>
      <text class="sdlab" x="${W - 7}" y="${(CY + 20).toFixed(1)}" text-anchor="end">NIGHT</text>
      <g id="sdMoon"><circle cx="${CX}" cy="${CY + R - 30}" r="5.5" fill="#cfd6e0"/>
        <circle id="sdMoonShade" cx="${CX - 2.6}" cy="${CY + R - 30}" r="5.5" fill="var(--ink,#0e0d0a)"/></g>
      <g id="sdSun"><circle cx="${CX}" cy="${CY + R - 30}" r="7" fill="var(--gold,#ffd24a)"/>
        <circle cx="${CX}" cy="${CY + R - 30}" r="11" fill="var(--gold,#ffd24a)" opacity="0.16"/></g>
      <g id="sdNeedle">
        <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY + R - 7}" stroke="var(--bone,#f2ead9)" stroke-width="1.6"/>
        <polygon points="${CX - 4},${CY + R - 16} ${CX + 4},${CY + R - 16} ${CX},${CY + R - 4}" fill="var(--bone,#f2ead9)"/>
      </g>
      <circle cx="${CX}" cy="${CY}" r="3.4" fill="var(--gold,#ffd24a)"/>
    </svg>
    <div class="sdread"><b id="sdTime">--:--</b><span id="sdDate"></span></div>`;
    this._sd = {
      needle: this.el.sundial.querySelector('#sdNeedle'),
      sun: this.el.sundial.querySelector('#sdSun'),
      moon: this.el.sundial.querySelector('#sdMoon'),
      shade: this.el.sundial.querySelector('#sdMoonShade'),
      time: this.el.sundial.querySelector('#sdTime'),
      date: this.el.sundial.querySelector('#sdDate'),
      CX, CY, last: '', lastDate: '',
    };
  }

  updateSundial() {
    const el = this.el.sundial, g = this.game;
    const show = !!(SETTINGS.sundial && g && g.mode && g.modeId !== 'powerworld' && g.running && g.world);
    if (this.root.classList.contains('hassun') !== show) this.root.classList.toggle('hassun', show);
    if (!show) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    if (el.style.display === 'none') { el.style.display = ''; if (!this._sd) this._buildSundial(); }
    const sd = this._sd, t = g.world.dayT;
    // dayT 0.25 = noon, 0.75 = midnight (data/news.js). The needle points DOWN at noon and swings
    // a full turn across the day; the sun rides with it and the moon sits exactly opposite.
    const deg = (t - 0.25) * 360;
    sd.needle.setAttribute('transform', `rotate(${deg.toFixed(2)} ${sd.CX} ${sd.CY})`);
    sd.sun.setAttribute('transform', `rotate(${deg.toFixed(2)} ${sd.CX} ${sd.CY})`);
    sd.moon.setAttribute('transform', `rotate(${(deg + 180).toFixed(2)} ${sd.CX} ${sd.CY})`);
    // a body below the horizon line fades — you should be able to SEE which one is up
    const up = Math.cos(deg * Math.PI / 180);
    sd.sun.style.opacity = up > -0.1 ? '1' : '0.16';
    sd.moon.style.opacity = up < 0.1 ? '1' : '0.16';
    const now = clockStr(t);
    if (now !== sd.last) {                                   // text only when the minute turns
      sd.last = now; sd.time.textContent = now;
      const d = gameDate(), ds = dateStr(d);
      if (ds !== sd.lastDate) { sd.lastDate = ds; sd.date.textContent = ds; }
    }
  }

  updateRadar(g) {
    const ctx = this._radarCtx; if (!ctx || this.el.radar.style.display === 'none') return;
    const now = performance.now();                                   // ~25 Hz is plenty for a minimap
    if (this._radarLast && now - this._radarLast < 40) return;
    this._radarLast = now;
    const W = 152, R = W / 2, cx = R, cy = R, A = (g.world && (g.world.combatRadius || g.world.ARENA)) || 175, sc = (R - 9) / A;
    // Preserve the compound overview, then scroll continuously at local scale.
    // A jet-sized world must not turn nearby soldiers and cover into single pixels.
    const local=g.world?.ARENA>A, p=g.player?.pos;
    const ox=local&&p?Math.sign(p.x)*Math.max(0,Math.abs(p.x)-A*.35):0;
    const oz=local&&p?Math.sign(p.z)*Math.max(0,Math.abs(p.z)-A*.35):0;
    const toXY = (wx, wz) => [cx + (wx-ox) * sc, cy + (wz-oz) * sc];
    ctx.clearRect(0, 0, W, W);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(16,20,30,.82)'; ctx.fillRect(0, 0, W, W);
    // the harbor
    if (hasCity(g.modeId) && g.world && g.world.waterX != null) {
      ctx.fillStyle = 'rgba(70,140,180,.4)';
      const wx = cx + g.world.waterX * sc;
      ctx.fillRect(wx, 0, W - wx, W);
    }
    // cover blocks
    ctx.fillStyle = 'rgba(120,132,155,.55)';
    for (const c of (g.world && g.world.cover) || []) { const [x, y] = toXY(c.x, c.z); const w = (c.hx ?? c.r) * sc, h = (c.hz ?? c.r) * sc; ctx.fillRect(x - w, y - h, Math.max(2, w * 2), Math.max(2, h * 2)); }
    // district labels (canon names on the flagship only — generated cities read from their plan)
    if (hasCity(g.modeId) && (!g.world.plan || g.world.plan.flagship)) {
      ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.85;
      const lab = (t, wx, wz, col) => { const [x, y] = toXY(wx, wz); ctx.fillStyle = col; ctx.fillText(t, x, y); };
      lab('COM', -96, -140, '#9fc0ff'); lab('RES', 0, 140, '#ffb87a'); lab('IND', 156, -20, '#c0d0e0'); lab('MIL', -144, 200, '#a8c070');
      ctx.globalAlpha = 1;
    }
    const P = g.player;
    // player vision wedge
    if (P) {
      const [px, py] = toXY(P.pos.x, P.pos.z), aang = Math.atan2(P.aim.z, P.aim.x);
      if (g.fov) { ctx.fillStyle = 'rgba(245,178,26,.14)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 34, aang - 0.62, aang + 0.62); ctx.closePath(); ctx.fill(); }
    }
    // enemies: solid red if seen, faded "?" at last-known if not
    for (const e of g.entities) {
      if (e === P || !e.def || e.isDummy || !e.alive) continue;
      const vis = g.fov ? (e._vis || 0) : 1;
      if (vis > 0.4 || this.spectatorBands) {
        const [ex, ey] = toXY(e.pos.x, e.pos.z);
        // THE RADAR IS XZ-ONLY (altitude plan 2): a foe 300u overhead was a dot beside you.
        // Band-COLOUR and band-SIZE the dot so height reads on the map. ⚠ Canvas 2D cannot
        // resolve CSS tokens — these must be literals (the documented law).
        const b = e.pos.y > 260 ? 3 : e.pos.y > 150 ? 2 : e.pos.y > 8 ? 1 : 0;
        const BC = ['#ff5a4a', '#ffd24a', '#7fe6ff', '#ffffff'];
        ctx.fillStyle = e.def.police ? '#7fb0d0' : BC[b];
        ctx.beginPath(); ctx.arc(ex, ey, 3.4 + b * 0.9, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
        if (b > 0) { ctx.fillStyle = '#0b0906'; ctx.font = '700 7px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(b), ex, ey + 2.5); }
      }
      else if (e._lastKnown) { const [lx, ly] = toXY(e._lastKnown.x, e._lastKnown.z); ctx.fillStyle = 'rgba(255,90,74,.6)'; ctx.font = 'bold 11px Inter,sans-serif'; ctx.fillText('?', lx - 3, ly + 4); }
    }
    // deployed beacon — gold diamond so she always knows where home is
    if (P && P.items) for (const it of P.items) if (it.state === 'deployed' && it.pos) {
      const [bx, by] = toXY(it.pos.x, it.pos.z);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = P.def.colors.accent; ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.strokeRect(-3, -3, 6, 6); ctx.restore();
    }
    // player marker + facing tick
    if (P) { const [px, py] = toXY(P.pos.x, P.pos.z); ctx.strokeStyle = 'rgba(255,210,74,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + P.aim.x * 13, py + P.aim.z * 13); ctx.stroke(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(px, py, 3.8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#160d02'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(245,178,26,.32)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.stroke();
  }

  // red glow at the screen edge in the direction damage came from
  hitDirection(worldPos) {
    if (!this.game.world) return;
    const sp = this.game.world.screenPosOf(worldPos.x, (worldPos.y || 0) + 4, worldPos.z);
    const cxp = innerWidth / 2, cyp = innerHeight / 2;
    let ang = Math.atan2((sp.y || cyp) - cyp, (sp.x || cxp) - cxp);
    if (sp.behind) ang += Math.PI;                       // source behind camera → opposite edge
    // Chase damage is a bearing from the PLAYER, not the projected attacker's
    // height. A frontal ground attacker often projects below the reticle; that
    // must not falsely report a hit from behind. Keep the ribbon at the actual
    // viewport edge in both landscape and portrait, not a circle inside it.
    if (this.game.world.camMode === 'chase') {
      const player=this.game.player,m=this.game.world.camera.matrixWorld.elements;
      const dx=worldPos.x-player.pos.x,dz=worldPos.z-player.pos.z;
      const horizontal=Math.hypot(m[8],m[10]);
      const right=horizontal>1e-6?(m[10]*dx-m[8]*dz)/horizontal:dx;
      const front=horizontal>1e-6?(-m[8]*dx-m[10]*dz)/horizontal:-dz;
      ang=Math.hypot(dx,dz)<.01?-Math.PI/2:Math.atan2(-front,right);
      const rx=Math.max(8,cxp-16),ry=Math.max(8,cyp-16),thickness=Math.min(12,Math.max(7,Math.min(innerWidth,innerHeight)*.012));
      const half=Math.min(.2,62/Math.hypot(rx*Math.sin(ang),ry*Math.cos(ang)));
      const a0 = ang - half, a1 = ang + half;
      let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (let i = 0; i <= 12; i++) { const a = a0 + (a1 - a0) * i / 12;
        for (const inset of [0,thickness]) { const x = cxp + Math.cos(a) * (rx-inset), y = cyp + Math.sin(a) * (ry-inset);
          if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; } }
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', (maxx - minx)); svg.setAttribute('height', (maxy - miny));
      svg.style.cssText = `position:absolute;left:${minx}px;top:${miny}px;pointer-events:none;opacity:.9;transition:opacity .55s ease-out;filter:drop-shadow(0 1px 1px rgba(0,0,0,.7));`;
      const sector=String((Math.round(ang/(Math.PI/6))+12)%12);
      for(const existing of this.el.hits.children)if(existing.dataset.bearing===sector)existing.remove();
      svg.dataset.bearing=sector;
      const P = (inset, a) => `${(cxp + Math.cos(a) * (rx-inset) - minx).toFixed(1)} ${(cyp + Math.sin(a) * (ry-inset) - miny).toFixed(1)}`;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M ${P(0, a0)} A ${rx} ${ry} 0 0 1 ${P(0, a1)} L ${P(thickness, a1)} A ${rx-thickness} ${ry-thickness} 0 0 0 ${P(thickness, a0)} Z`);
      path.setAttribute('fill', 'rgba(255,74,52,.85)');
      svg.appendChild(path); this.el.hits.appendChild(svg);
      requestAnimationFrame(() => { svg.style.opacity = '0'; });
      setTimeout(() => svg.remove(), 600);
      while (this.el.hits.children.length > 4) this.el.hits.firstChild.remove();   // five directions at once is not information
      return;
    }
    const rad = Math.min(innerWidth, innerHeight) * 0.5;
    const el = document.createElement('div'); el.className = 'hitarc';
    el.style.left = (cxp + Math.cos(ang) * rad) + 'px';
    el.style.top = (cyp + Math.sin(ang) * rad) + 'px';
    this.el.hits.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '0'; });
    setTimeout(() => el.remove(), 600);
    while (this.el.hits.children.length > 6) this.el.hits.firstChild.remove();
  }

  showKO(text = 'K.O.', sub = '', color = '#fff') {
    const compact=combatView(this.game)==='bfp';this.el.ko.classList.toggle('compact-notice',compact);this.el.ko.dataset.active='true';
    this.el.koT.textContent = text; this.el.koT.style.color = color; this.el.koS.textContent = sub;
    this.el.ko.style.opacity = '1'; this.el.ko.style.transform = 'translateX(-50%) scale(1)';
    clearTimeout(this._koT1); clearTimeout(this._koT2);
    if(!compact)this._koT1 = setTimeout(() => { this.el.ko.style.transform = 'translateX(-50%) scale(1.09)'; }, 480);
    this._koT2 = setTimeout(() => { this.el.ko.style.opacity = '0';this.el.ko.dataset.active='false'; }, 1350);
  }
  setCombatUI(on) { this.el.radar.style.display = on ? 'block' : 'none'; }

  // ---- energy feedback ----
  kiWarn() {                                            // ki ran dry mid-ability — flash the bar
    this.playerStatusView?.energyWarning();
    this.el.kiBar.classList.add('kiflash');
    clearTimeout(this._kiT); this._kiT = setTimeout(() => this.el.kiBar.classList.remove('kiflash'), 650);
  }
  kiDenied(key) {                                       // pressed something you can't afford
    this.kiWarn();
    const se = this.slotEls?.[key];
    if (se) { se.root.classList.remove('deny'); void se.root.offsetWidth; se.root.classList.add('deny'); }
  }
  overdriveFlash() {                                    // a fist just converted into ki
    this.el.kiBar.style.boxShadow = '0 0 18px rgba(127,230,255,.95)';
    clearTimeout(this._odT); this._odT = setTimeout(() => { this.el.kiBar.style.boxShadow = ''; }, 350);
  }

  announce(text, sub = '', color = 'var(--gold)') {
    const compact=combatView(this.game)==='bfp';this.el.ann.classList.toggle('compact-notice',compact);this.el.ann.dataset.active='true';
    this.el.annT.textContent = text; this.el.annT.style.color = color; this.el.annS.textContent = sub;
    this.el.ann.style.opacity = '1'; this.el.ann.style.transform = `translateX(-50%) scale(${compact?1:1.12})`;
    clearTimeout(this._annT1); clearTimeout(this._annT2);
    this._annT1 = setTimeout(() => { this.el.ann.style.transform = 'translateX(-50%) scale(1)'; }, 110);
    this._annT2 = setTimeout(() => { this.el.ann.style.opacity = '0';this.el.ann.dataset.active='false'; }, 1800);
    try { this.game.audio.zap(760); this.game.audio.blast(220, 0.12); } catch (e) {}
  }
  scorePopup(worldPos, amount) { this.damageNumber({ x: worldPos.x, y: worldPos.y + 4, z: worldPos.z }, '+' + amount, 'var(--gold-pale)', true); }

  updateModeBar(g) {
    const el = this.el.mode; if (!g.mode) { el.style.display = 'none'; return; }
    // ⚠ A MODE THAT DECLARES ITS BAR WRONG MUST NOT TAKE THE FRAME DOWN. `boxing` shipped `hud` as
    // the STRING 'boxing', so this line threw sixty times a second for the life of the match — and
    // because the frame is wrapped and `reportError` collapses repeats, the whole thing presented as
    // "the bar is blank". Degrade to no bar; the real fix is that `hud` is always a function.
    if (typeof g.mode.hud !== 'function') { el.style.display = 'none'; return; }
    const h = g.mode.hud(g);
    // no score, no clock, no target — free roam and the Danger Room both have nothing to report
    // no score, no clock, no target — free roam, the Danger Room and POWERWORLD all have nothing to
    // report, and an empty bar is worse than no bar
    if (h.type === 'training' || h.type === 'freeroam' || h.type === 'powerworld') { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    let html = '';
    if (h.type === 'duel') html = `<div class="seg"><div class="mv" style="color:var(--good)">${h.a}</div><div class="ml">${h.aName}</div></div><div class="vs">${h.a}–${h.b} · first to ${h.target}</div><div class="seg"><div class="mv" style="color:var(--danger-2)">${h.b}</div><div class="ml">${h.bName}</div></div>`;
    else if (h.type === 'survival') html = `<div class="seg"><div class="mv" style="color:#ffb03a">${h.wave}</div><div class="ml">Wave</div></div><div class="seg"><div class="mv">${h.score}</div><div class="ml">Score</div></div><div class="seg"><div class="mv" style="color:var(--danger-2)">${'♥'.repeat(h.lives) || '—'}</div><div class="ml">Lives</div></div>`;
    else if (h.type === 'rumble') html = `<div class="seg"><div class="mv" style="color:var(--info)">${h.frags}</div><div class="ml">Frags / ${h.target}</div></div><div class="seg"><div class="mv">${h.timer}</div><div class="ml">Seconds</div></div>`;
    else if (h.type === 'tournament') html = `<div class="seg"><div class="mv" style="color:var(--good)">${h.a}</div><div class="ml">YOU</div></div><div class="vs">${h.roundName} · RD ${h.round} · first to ${h.target} · ⚠ TEAM DMG</div><div class="seg"><div class="mv" style="color:var(--danger-2)">${h.b}</div><div class="ml">${h.bName}</div></div>`;
    // THE CARD. A boxing bar reports what a broadcast reports: the round, the clock, and the two
    // scorecards — and while a man is down, the COUNT replaces all of it, because during a ten-count
    // nothing else on the card matters.
    else if (h.type === 'boxing') {
      const mm = Math.floor(h.clock / 60), ss = Math.floor(h.clock % 60);
      const clock = `${mm}:${String(ss).padStart(2, '0')}`;
      html = h.count
        ? `<div class="seg"><div class="mv" style="color:var(--danger)">${h.count}</div><div class="ml">COUNT</div></div><div class="vs" style="color:var(--danger)">${esc(h.countWho)} IS DOWN</div><div class="seg"><div class="mv">${clock}</div><div class="ml">ROUND ${h.round}</div></div>`
        : `<div class="seg"><div class="mv" style="color:var(--good)">${h.aPts}</div><div class="ml">${esc(h.aName)} · ${h.aLanded}${h.aDowns ? ' · ▼' + h.aDowns : ''}</div></div>`
          + `<div class="vs">ROUND ${h.round} / ${h.rounds} · ${clock}</div>`
          + `<div class="seg"><div class="mv" style="color:var(--danger-2)">${h.bPts}</div><div class="ml">${esc(h.bName)} · ${h.bLanded}${h.bDowns ? ' · ▼' + h.bDowns : ''}</div></div>`;
    }
    if (html !== this._modeHtml) { this._modeHtml = html; el.innerHTML = html; }   // dirty-check — no per-frame DOM rebuild
  }

  updateKitWidget(p) {
    const el = this.el.kit; if (!p) { el.style.display = 'none'; return; }
    const chips = []; const d = p.def, acc = d.colors.accent;
    if (p.buffT > 0 && p.buffName) chips.push({ t: p.buffName + ' ' + Math.ceil(p.buffT) + 's', on: true });
    if (p.invuln > 0.15) chips.push({ t: 'INVINCIBLE', on: true });
    if (p.phase) chips.push({ t: 'INTANGIBLE', on: true });
    if (p.frozenT > 0) chips.push({ t: '❄ FROZEN', on: true });
    const bowA = Object.values(d.abilities).find(a => a.type === 'bow');
    if (bowA) { const pls = bowA.payloads || ['explosive', 'flame', 'poison']; chips.push({ t: '➶ ' + pls[p._quiverIdx % pls.length].toUpperCase(), on: true }); }
    if (d.guardType === 'deflect') chips.push({ t: 'DEFLECT GUARD', on: p.guarding });
    if (d.guardType === 'barrier') chips.push({ t: 'BARRIER GUARD', on: p.guarding });
    for (const it of p.items || []) {
      const label = it.def.kind === 'beacon'
        ? (it.state === 'ready' ? 'X TO PLANT' : it.state === 'deployed' ? 'X TO RECALL' : 'RECHARGING ' + Math.ceil(it.cd) + 's')
        : (it.state === 'ready' ? 'X · ×' + (it.charges ?? it.def.charges ?? 1) : it.state === 'spent' ? 'SPENT' : 'CD ' + Math.ceil(it.cd) + 's');
      chips.push({ t: '◈ ' + (it.def.name || it.def.kind).toUpperCase() + ' — ' + label, on: it.state === 'deployed' });
    }
    if (p._shieldHp > 0) chips.push({ t: '🛡 SHIELD ' + Math.round(p._shieldHp), on: true });
    if (p._jetT > 0) chips.push({ t: '🔥 JETS ' + Math.ceil(p._jetT) + 's', on: true });
    if (p._revealT > 0) chips.push({ t: '👁 THE RING SEES ' + Math.ceil(p._revealT) + 's', on: true });
    const mine = this.game.minions.filter(m => m.owner === p).length; const maxD = Math.max(...Object.values(d.abilities).map(a => a.type === 'summon' ? (a.max || 6) : 0), 0);
    if (maxD) chips.push({ t: '◈ DRONES ' + mine + '/' + maxD, on: mine > 0 });
    const cons = this.game.constructs.filter(c => c.owner === p && !c.dead);
    if (Object.values(d.abilities).some(a => a.type === 'construct')) {
      const c=cons[0],budget=c?.policy?.mode==='upkeep'?` · ${c.policy.kiPerSec} KI/S`:c?.policy?.mode==='damage'?` · ${c.policy.kiPerDamage} KI/HP`:'';
      chips.push({ t: c?'CONSTRUCT: '+c.kind.toUpperCase()+budget:'CONSTRUCTS', on:cons.length>0 });
    }
    if (d.beamMight >= 1.2) chips.push({ t: 'BEAM MASTER', on: false });
    if (d.grabHeal) chips.push({ t: 'ABSORB', on: false });
    if (d.thorns) chips.push({ t: 'THORNS', on: false });
    if (!chips.length) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const html = chips.map(c => `<span class="chip${c.on ? ' on' : ''}" style="${c.on ? `background:${acc}22;border-color:${acc}88;color:${acc}` : ''}">${c.t}</span>`).join('');
    if (html !== this._kitHtml) { this._kitHtml = html; this.el.kitChips.innerHTML = html; }   // dirty-check
  }

  /**
   * THE HANDS ROW (engine/hands.js, docs/THE_HANDS.md) — what your fists are wrapped around, and
   * what else you could reach for. The mesh is real and the poses carry it, but on a fixed isometric
   * camera a rifle at 9.6u tall is a few pixels: **the object being visible in the world is not the
   * same as it being readable**, which is why item 5 of the gate was only half met without this.
   *
   * ⚠ IT REPORTS THE ENGINE, NOT THE SELECTOR. `_hand` is an INTENT and `_gearHeld` is the TRUTH,
   * and the two legitimately disagree: a weapon scavenged off the street lands in your hands without
   * ever touching the selector. A row that rendered the intent would cheerfully name a rifle you are
   * not holding — the same class of lie as a control that lies about its own label.
   *
   * ⚠ IT NEVER PRINTS A KEY THE SCHEME HAS NOT GIVEN IT. `KEYMAPS.digitsSwap` already decides who
   * owns 1–0; under CLASSIC the digits swap HERO, so the row drops to a read-only status of what is
   * in your hands rather than listing four choices you cannot pick. Offering an unbound control is
   * worse than offering none.
   */
  updateHands(p) {
    const el = this.el.hands; if (!el) return;
    const g = this.game;
    const hide = () => { if (el.style.display !== 'none') { el.style.display = 'none'; this._handsHtml = null; } };
    if (!p || !p.alive || !(g.mode && g.running)) return hide();
    let H; try { H = handLabel(p); } catch (e) { return hide(); }
    const held = p._gearHeld;
    // A pickup is SCAVENGED; something taken from the armory is CHOSEN. One field apart, and the row
    // has to tell them apart because only one of them has a leash on it.
    const scav = !!(held && !held.chosen);
    // ⚠ ONE SLOT IS NO CHOICE. A fighter who has never been to the armory has FISTS and nothing else,
    // so the control disappears for them — the "most of the roster never sees this button" property
    // falling out of the loadout instead of a hard gate. A scavenged weapon overrides that: you are
    // holding something now whether you chose it or not, and the row must say so.
    if (H.list.length < 2 && !scav) return hide();

    const keyed = !keymap(SETTINGS.scheme).digitsSwap;
    const acc = p.def && p.def.colors ? p.def.colors.accent : 'var(--gold)';
    const drawing = (p._handT || 0) > 0;
    const chips = [];
    // Under CLASSIC the row is a readout, so it shows the one hand you are actually on.
    for (const s of (keyed ? H.list : [H.cur])) {
      const on = s.i === H.cur.i && !scav;
      chips.push(`<span class="hchip${on ? ' on' : ''}${on && drawing ? ' draw' : ''}"${on ? ` style="border-color:${acc};background:${acc}1f;color:${acc}"` : ''}>`
        + (keyed ? `<b>${s.i}</b>` : '')
        + esc(s.n) + (s.two ? '<u>2H</u>' : '') + '</span>');
    }
    // The truth, when it disagrees with the selector — and the leash, because a scavenged weapon
    // going dry mid-fight should never be a surprise.
    if (scav) {
      const t = held.t;
      chips.push(`<span class="hchip scav">◆ ${esc(held.base && held.base.name ? held.base.name : 'SCAVENGED')}`
        + `<u>${t > 0 && t < 900 ? Math.ceil(t) + 's' : 'SCAVENGED'}</u></span>`);
    }
    // What it COSTS you. Two-handed is a real constraint (`oneHand` on the armory row decides it),
    // and the cost is the reason picking a slot is a decision instead of a free upgrade.
    const twoNow = scav ? !(held.base && held.base.oneHand) : H.two;
    if (twoNow) chips.push('<span class="hnote">BOTH HANDS — NO GRAB</span>');
    if (drawing) chips.push('<span class="hnote draw">DRAWING…</span>');
    else if (p._disarmT > 0) chips.push(`<span class="hnote bad">DISARMED ${Math.ceil(p._disarmT)}s</span>`);

    const html = chips.join('');
    if (html !== this._handsHtml) { this._handsHtml = html; this.el.handsRow.innerHTML = html; }   // dirty-check
    if (el.style.display !== 'flex') el.style.display = 'flex';
  }


  // ---- the KMK 9 ACTION NEWS post-fight broadcast: TV replaying the crew's REAL footage,
  // a typed anchor script about who won and how, the tale of the tape, and the city desk ----

  // typewriter for the anchor script — one line at a time, news-crawl cadence
  _typeScript(lines, onDone) {
    const sc = this.el.end.querySelector('#nScript'); if (!sc) return;
    const run = this._tvRun;
    let li = 0;
    const nextLine = () => {
      if (this._tvRun !== run || !sc.isConnected) return;
      if (li >= lines.length) { if (onDone) onDone(); return; }
      const L = lines[li++];
      const d = document.createElement('div');
      d.className = 'sline' + (L.who !== 'ANCHOR' ? ' field' : '');
      d.innerHTML = `<span class="swho">${esc(L.label || (L.who === 'ANCHOR' ? 'ANCHOR' : titleCase(L.who)))}</span><span class="stx"></span><span class="cursor"></span>`;
      sc.appendChild(d);
      const tx = d.querySelector('.stx'), cur = d.querySelector('.cursor');
      const text = L.text; let i = 0; let last = performance.now();
      const tick = (now) => {
        if (this._tvRun !== run || !sc.isConnected) return;
        const n = this._skipType ? text.length : Math.max(1, Math.round((now - last) / 11));   // ~90 chars/sec, or instant on click
        last = now; i = Math.min(text.length, i + n);
        tx.textContent = text.slice(0, i);
        if (i < text.length) requestAnimationFrame(tick);
        else { cur.remove(); setTimeout(nextLine, 200); }
      };
      requestAnimationFrame(tick);
    };
    nextLine();
  }

  // the TV: plays the crew's recorded clips in a loop with analog static between them
  _stopTV() {
    this._tvRun = (this._tvRun || 0) + 1;
    if (this._tvRaf) { cancelAnimationFrame(this._tvRaf); this._tvRaf = 0; }
  }
  hideEndScreen() { this._stopTV(); this.el.end.style.display = 'none'; this.el.end.classList.remove('news'); globalThis.document?.body?.classList.remove('report-open'); }

  flashScreen(color = '#ffffff', dur = 0.15) {
    // aaa-06 §10.1: CUT in the chase (close) camera — all 12 call sites, one early return. A
    // full-viewport 50% screen-blend wash is the definition of screen fill, and the print pass's
    // one inverted frame IS the heavy tell now. Every remaining caller already has a shake, a
    // sound and a banner. The city (camMode iso) is untouched.
    if (this.game.world && this.game.world.camMode === 'chase') return;
    const el = this.el.flash; if (!el) return;
    el.style.transition = 'none'; el.style.background = color; el.style.opacity = '0.5';
    requestAnimationFrame(() => { el.style.transition = `opacity ${dur}s ease-out`; el.style.opacity = '0'; });
  }

  // floating combat number at a world position. slash=true kicks OUTWARD-DOWN (offense reads
  // differently from the defensive popups, which float up).
  damageNumber(worldPos, text, color = '#fff', tag = false, slash = false) {
    if (this.dmgNumbersOff) return;
    // aaa-06 §10.3: OFF BY DEFAULT in the close (chase) frame — a world-anchored number at 29% of
    // the frame flies off the top as often as not, and the combo counter / health bar / recorded
    // punch already say what happened. The centre box stays clear of the DOM (gate I6).
    if (this.game.world && this.game.world.camMode === 'chase') return;
    if (this.el.dmg.childElementCount > 48) return;   // AoE storms don't get to drown the DOM
    if (!this.game.world) return;
    const sp = this.game.world.screenPosOf(worldPos.x, worldPos.y + 7, worldPos.z);
    if (sp.behind) return;
    const el = document.createElement('div'); el.className = 'dmg'; el.textContent = text;
    el.style.color = color; el.style.left = sp.x + 'px'; el.style.top = sp.y + 'px';
    const num = +text || parseInt(String(text).replace(/[^0-9]/g, ''), 10) || 0;   // "SLAM 18" sizes by the 18
    el.style.fontSize = (tag ? 16 : Math.min(38, 18 + num * 0.45)) + 'px';
    if (slash) { el.style.fontStyle = 'italic'; el.style.textShadow = '0 2px 5px rgba(0,0,0,.85), 0 0 12px rgba(255,90,74,.7)'; }
    this.el.dmg.appendChild(el);
    const dx = slash ? (36 + Math.random() * 26) * (Math.random() < 0.5 ? -1 : 1) : (Math.random() * 2 - 1) * 32;
    const dy = slash ? 30 : -46;
    const t0 = performance.now();
    const anim = (now) => { const k = (now - t0) / 720; if (k >= 1) { el.remove(); return; } el.style.transform = `translate(-50%,-50%) translate(${dx * k}px, ${dy * k}px)${slash ? ' rotate(-8deg)' : ''}`; el.style.opacity = String(1 - k * k); requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
    while (this.el.dmg.children.length > 48) this.el.dmg.firstChild.remove();
  }

  // ---- Danger Room: live DPS meters floating over training dummies ----
  updateDpsMeters(g) {
    const on = g.modeId === 'training' && g.running;
    this._dpsEls = this._dpsEls || {};
    if (!on) { for (const id in this._dpsEls) { this._dpsEls[id].remove(); delete this._dpsEls[id]; } return; }
    for (const e of g.entities) {
      if (!e.isDummy) continue;
      let el = this._dpsEls[e.id];
      if (!el) {
        el = document.createElement('div'); el.className = 'dmg'; el.style.fontSize = '12px'; el.style.color = 'var(--info)';
        el.style.textAlign = 'center'; this.el.dmg.appendChild(el); this._dpsEls[e.id] = el;
      }
      const log = e._dmgLog || [];
      while (log.length && log[0].t < g.time - 3) log.shift();
      const dps = log.reduce((s, x) => s + x.a, 0) / 3;
      const sp = g.world.screenPosOf(e.pos.x, e.pos.y + 16, e.pos.z);
      el.style.left = sp.x + 'px'; el.style.top = sp.y + 'px';
      el.style.transform = 'translate(-50%,-50%)';
      el.style.display = sp.behind ? 'none' : 'block';
      el.textContent = dps > 0.5 ? `DPS ${dps.toFixed(0)} · Σ ${Math.round(e._dmgTotal || 0)}` : (e._dmgTotal ? `Σ ${Math.round(e._dmgTotal)}` : 'DPS —');
    }
  }

  combo(n) {
    const c = this.el.combo;
    if (n >= 2) { this.el.comboN.textContent = n; c.style.opacity = '1'; c.style.transform = 'translateX(-50%) scale(1.15)'; clearTimeout(this._ct); this._ct = setTimeout(() => { c.style.transform = 'translateX(-50%) scale(1)'; }, 90); }
    else c.style.opacity = '0';
  }

  setPaused(on) { this._paused=!!on; this.el.paused.style.display = on ? 'flex' : 'none'; }

  buildSlots(def) {
    this.el.slots.innerHTML = '';
    this.slotEls = {};
    this._toolScheme=this.game?.modeId!=='powerworld'&&keymap(SETTINGS.scheme).mouseMelee===true;this._toolKey=null;
    // THESIS: two readable triggers lead; the compact kit remains available underneath.
    // OWN-WORLD: existing warm dark/gold combat dock, original attack silhouettes.
    // STORY/FIRST VIEW: identify LMB and RMB at a glance without covering the fighter.
    // FORM: local extension of the established HUD, not a replacement visual system.
    const pair=document.createElement('div');pair.className='trigger-pair';pair.setAttribute('aria-label','Selected mouse attacks');
    this.triggerEls={};
    for(const side of ['primary','secondary']){
      const el=document.createElement('div');el.className='trigger-attack';el.dataset.trigger=side;
      el.innerHTML=`<span class="trigger-bind">${side==='primary'?'LMB':'RMB'}<small>${side==='primary'?'WHEEL':this.game?.modeId==='powerworld'?'TAB + WHEEL':'RMB + WHEEL'}</small></span><span class="trigger-art"></span><span class="trigger-name"></span><span class="trigger-damage"></span><span class="trigger-status"></span>`;
      pair.appendChild(el);this.triggerEls[side]=el;
    }
    this.el.slots.appendChild(pair);
    if(this._toolScheme){
      const d=document.createElement('div');d.className='slot';d.dataset.tool='melee';
      d.title='Select with V or wheel. LMB: tap punch, hold heavy. RMB: grab / throw. C: block.';
      d.innerHTML='<div class="key">V / WHEEL</div>'+attackIcon({type:'melee'})+'<div class="an">Melee</div><div class="sfx">STRIKE</div>';
      this.el.slots.appendChild(d);this.slotEls.melee={root:d,keyLabel:'V'};
    }
    for (const { k, label } of SLOT_ORDER) {
      const a = def.abilities[k]; if (!a) continue;
      const tactical=def.archetype==='soldier'&&(this.game?.modeId==='powerworld'||this.game?.player?._openSky);
      const binding=this.game?.modeId==='powerworld'?({q:'1',e:'2',f:'3',r:'4',shift:'WHEEL'}[k]||label):k==='shift'?'WHEEL':tactical?String(['lmb','rmb','q','e','f','r'].indexOf(k)+1):def.archetype==='soldier'&&k==='r'?'WHEEL':label;
      const d = document.createElement('div');
      d.className = 'slot' + (k === 'r' ? ' ult' : '');
      // ⚠ THE CHIP NOW SAYS WHAT IT IS. A name alone ("Heat Ray", "Prince's Pride") does not tell you
      // whether it is a beam, a thrown thing or something that happens to you — and you were finding
      // out by firing it. The glyph and the range word are DERIVED (visOf + the ability's own reach
      // field), so they cannot drift from what the power actually does, and the tooltip is the
      // sentence `describeAbility` was already writing and nothing was showing.
      const F = slotFacts(a, visOf);
      d.title = a.name + ' — ' + describeAbility(a) + '\n' + F.kind + ' · ' + F.range +
        (F.units ? ' (' + F.units + 'u)' : '') + (F.hold ? ' · HOLD TO CHARGE' : '') +
        (attackEntryCost(a) ? ' · ' + attackEntryCost(a) + ' ki' : a.kiPerSec ? ' · ' + a.kiPerSec + ' ki/s' : '');
      d.innerHTML = `<div class="key">${binding}</div><div class="cost">${attackEntryCost(a) || (a.kiPerSec ? a.kiPerSec + '/s' : '')}</div>` +
        `${attackIcon(a)}<div class="an">${esc(a.name)}</div>` +
        `<div class="sfx"><b>${F.glyph}</b>${F.range}${F.hold ? ' ⏱' : ''}</div>` +
        `<div class="cd" style="height:0%"></div><div class="cdn"></div>`;
      this.el.slots.appendChild(d);
      this.slotEls[k] = { root: d,keyLabel:k==='lmb'?'I':k==='rmb'?'II':binding, baseTitle:d.title, cd: d.querySelector('.cd'), cost: d.querySelector('.cost'), cdn: d.querySelector('.cdn') };
    }
  }

  setPlayer(def) {
    this._formRole=undefined;
    this.el.name.textContent = def.name;
    this.el.role.textContent = def.title + ' · ' + def.role;
    this.buildSlots(def);
  }

  feed(text, color = 'var(--gold)') {
    const d = document.createElement('div'); d.textContent = text; d.style.color = color;
    this.el.feed.prepend(d); this.feedLines.push(d);
    setTimeout(() => { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 500); }, 2600);
    while (this.el.feed.children.length > 5) this.el.feed.lastChild.remove();
  }

  // THE CROSSHAIR IS DRAWN WHERE THE SHOT GOES (docs/powerworld/aaa-05-reticle.md §6.4). JKA's own
  // rule: CG_DrawCrosshair(trace.endpos) — the mark is painted at the projected AIM POINT, every
  // frame, and hidden when it is behind the camera. Unlocked with a hit on the camera's centre ray
  // this projects to screen centre and the reticle does not visibly move (the fix is invisible in
  // the common case); LOCKED it walks onto the enemy, which closes §3.2's lie — the crosshair used
  // to recolour to hostile red AT SCREEN CENTRE while the shot left for a body 16-42% of the gap
  // off-centre. Called from game.updateReticle (the SIM loop), never from update() — see the note
  // there and in update()'s class-toggle block.
  syncCombatView(g) {
    this.updateFieldRecorder(g);
    const pw=g.modeId==='powerworld',chase=combatLookActive(g);
    if (pw !== this._pwCls) { this._pwCls = pw; document.body.classList.toggle('powerworld', pw); }
    if(chase!==this._chaseCls){this._chaseCls=chase;document.body.classList.toggle('combat-chase',chase);}
    if(!chase){
      if(this._lkCls){this._lkCls=false;document.body.classList.toggle('pw-locked',false);}
      if(this.el.cross){this.el.cross.style.visibility='hidden';this._csOff=true;}
    }
    return chase;
  }

  updateFieldRecorder(g){
    const el=this.el.fieldRecorder;if(!el)return;
    const paused=!g.running&&this._paused;
    const news=g.news,shown=g.modeId==='powerworld'&&!this.titleOpen&&(g.running||paused)&&!g.matchOver&&news?.enabled&&!news._finished;
    el.hidden=!shown;if(!shown)return;
    const state=paused?'paused':news.rec?'recording':'ready',count=news.clips?.length||0;
    const text=state==='paused'?'CAM PAUSED':state==='recording'?'REC':count?`${count} CLIP${count===1?'':'S'}`:'FIELD CAM';
    if(el.dataset.state!==state)el.dataset.state=state;
    const label=el.querySelector('span');if(label.textContent!==text)label.textContent=text;
  }

  updateCrosshair(g) {
    if(!this.syncCombatView(g))return;
    const el = this.el.cross; if (!el) return;
    if(!this._meleeCue){this._meleeCue=document.createElement('span');this._meleeCue.className='melee-entry-cue';el.append(this._meleeCue);}this._meleeCue.hidden=true;
    const aircraft=g.player?._aircraftVehicle;
    if(aircraft){
      const aim=aircraft.combat?.pilotAim?.(),s=this._csp||(this._csp={x:0,y:0,behind:false});
      if(this._lkCls){this._lkCls=false;document.body.classList.toggle('pw-locked',false);}
      el.dataset.aimMode='aircraft';
      if(aim)g.world.screenPosOf(aim.point.x,aim.point.y,aim.point.z,s);
      const hidden=!aim||s.behind||s.x<18||s.x>innerWidth-18||s.y<18||s.y>innerHeight-32;
      if(this._csOff!==hidden){this._csOff=hidden;el.style.visibility=hidden?'hidden':'';}
      if(!hidden){
        const dx=Math.round(s.x-innerWidth*.5),dy=Math.round(s.y-innerHeight*.5);
        if(dx!==this._csx||dy!==this._csy){this._csx=dx;this._csy=dy;el.style.transform=`translate(${dx}px, ${dy}px)`;}
        const label=`CANNON · ${Math.round(aim.range)}u`;
        if(el.dataset.label!==label)el.dataset.label=label;
      }
      return;
    }
    if(el.dataset.aimMode){delete el.dataset.aimMode;delete el.dataset.label;}
    const hasLock = g.hardLock && g.hardLock.alive;
    const locked = visibleTarget(g,g.hardLock);
    if (hasLock && !locked) {
      if(this._csOff!==true){this._csOff=true;el.style.visibility='hidden';}
    } else if (locked||g.world.freeLooking) {
      // Lock or independent look: project the actual aim, which can be offscreen.
      const a = g._aim3pt, s = this._csp || (this._csp = { x: 0, y: 0, behind: false });
      g.world.screenPosOf(a.x, a.y, a.z, s);
      if(g.world.freeLooking&&(s.behind||s.x<44||s.x>innerWidth-44||s.y<44||s.y>innerHeight-44)){
        // Camera-local lateral bearing avoids the mirrored projection of a
        // point behind the eye. Exactly aft has two equal turns; choose right.
        const m=g.world.camera.matrixWorldInverse.elements;
        let bx=(m[0]*a.x+m[4]*a.y+m[8]*a.z+m[12])/(g.world.camera.aspect||innerWidth/innerHeight);
        let by=-(m[1]*a.x+m[5]*a.y+m[9]*a.z+m[13]);
        if(Math.abs(bx)+Math.abs(by)<1e-6)bx=1;
        const scale=Math.min((innerWidth*.5-44)/Math.max(1e-9,Math.abs(bx)),(innerHeight*.5-44)/Math.max(1e-9,Math.abs(by)));
        const dx=Math.round(bx*scale),dy=Math.round(by*scale);
        el.dataset.aimMode='free-look-edge';el.dataset.label=s.behind?'AIM BEHIND':'AIM';
        el.style.setProperty('--aim-bearing',`${Math.atan2(by,bx)}rad`);
        el.style.setProperty('--aim-label-x',dx>innerWidth*.25?'-100%':dx<-innerWidth*.25?'0%':'-50%');
        el.style.setProperty('--aim-label-y',dy>innerHeight*.25?'-28px':'18px');
        this._csOff=false;el.style.visibility='';this._csx=dx;this._csy=dy;
        el.style.transform=`translate(${dx}px, ${dy}px)`;
      }else if (s.behind) {
        if (this._csOff !== true) { this._csOff = true; el.style.visibility = 'hidden'; }
      } else {
        if (this._csOff !== false) { this._csOff = false; el.style.visibility = ''; }
        // ⚠ `#hCross` is `position:fixed; left:50%; top:50%` with ticks at negative offsets — a
        // `transform: translate()` moves the whole assembly. NOT left/top (layout, invalidated every
        // frame). WRITE ONLY ON CHANGE (60Hz — a per-frame style write is a layout thrash).
        const dx = Math.round(s.x - innerWidth * 0.5), dy = Math.round(s.y - innerHeight * 0.5);
        if (dx !== this._csx || dy !== this._csy) {
          this._csx = dx; this._csy = dy; el.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      }
    } else {
      // ⚠ FREE AIM IS A CENTRE RETICLE (Robert 2026-07-28: "the crosshair isn't on point"). Under
      // mouse-look the shot goes along the camera's CENTRE ray, so the reticle IS the centre of the
      // screen. Projecting a traced point drifts as the camera turns — controlPlayer computes the
      // point, then cameraDrive's mouse-look moves the camera, and projecting the now-stale point
      // lagged the aim by ~9px. Pin it to centre; that is exactly where the shot lands.
      if (this._csOff !== false) { this._csOff = false; el.style.visibility = ''; }
      if (this._csx !== 0 || this._csy !== 0) { this._csx = 0; this._csy = 0; el.style.transform = 'translate(0px, 0px)'; }
    }
    // ⚠ HOSTILE ONLY WHEN EXPLICITLY LOCKED (Robert 2026-07-28: "target doesn't turn off"). Lighting
    // the mark red on `aimHit==='foe'` meant it went red whenever ANY foe drifted under the centre —
    // which in a fight is always — so it never turned off. The T lock is the ONE toggle for the target.
    const cue=el.dataset.aimMode?null:meleeEntryCue(g),sequence=el.dataset.aimMode?null:meleeSequenceCue(g);if(cue||sequence){this._meleeCue.hidden=false;const label=sequence||cue.family.toUpperCase()+' · '+cue.range+'u';if(this._meleeCue.textContent!==label)this._meleeCue.textContent=label;}
    const hot = !!locked;
    if (hot !== this._lkCls) { this._lkCls = hot; document.body.classList.toggle('pw-locked', hot); }
  }

  update() {
    const g = this.game, p = g.player;this.syncCombatView(g);if (!p) return;
    if(g.modeId==='powerworld')this.playerStatusView?.update(p);
    // Bench/respawn/form transitions can replace the fighter without the menu's
    // setHero path. Rebuild before reading cooldowns from a different slot set.
    if(this._shownSlots!==p.slots||this._toolScheme!==(keymap(SETTINGS.scheme).mouseMelee===true)){
      this.buildSlots(p.def);this._shownSlots=p.slots;
    }
    const selection=selectedAttacks(p,keymap(SETTINGS.scheme)),tool=selection.primary+'|'+selection.secondary;
    if(this._toolKey!==tool){this._toolKey=tool;this.selectSlot(selection.primary,selection.secondary);}
    for(const side of ['primary','secondary']){
      const el=this.triggerEls?.[side];if(!el)continue;
      const k=selection[side],st=p.slots[k],def=st?.def||{type:k,name:k==='grab'?'Grab / Throw':'Melee'};
      const primaryDef=p.slots[selection.primary]?.def,sight=side==='secondary'&&primaryDef?.type==='rifle'&&primaryDef.scopeZoom>1;
      const sightName=sight?`${primaryDef.scopeZoom}× Sight`:'';
      const active=st?.active&&!st.active.dead?st.active:null;
      const locked=st&&!slotUnlocked(p,k)&&!remoteAttack(p,st);
      const status=side==='secondary'&&p._mouseCombat?.blocked?'RELEASE TO READY':sight?(p._firearmReload?'LOWERED · RELOADING':firearmSightZoom(p)>1?'AIMING · LMB FIRE':p._scopeHeld?'SIGHT UNAVAILABLE':'HOLD TO AIM'):locked?`LEVEL ${unlockLevel(p.def,k)}`:firearmStatus(p,k)||(st?._handsBusy?'HANDS OCCUPIED':st?._handsRetry?'RELEASE TO RETRY':st?.charging?'CHARGING':active?.pendingLaunch?'ALIGNING':active?.sustaining?'FIRING':st?.cd>.05?`${st.cd.toFixed(1)}s`:st&&p.ki<attackEntryCost(def)?'LOW ENERGY':k==='melee'?'TAP / HOLD HEAVY':k==='grab'?'GRAB / THROW':'READY');
      if(el._def!==def||el._sightName!==sightName){el._def=def;el._sightName=sightName;el.querySelector('.trigger-art').innerHTML=sight?icon('range',26):attackIcon(def);el.querySelector('.trigger-name').textContent=sightName||def.name;el.title=sight?'Hold RMB to aim this rifle; LMB fires. RMB + wheel still selects the secondary for other primary attacks.':def.name+' — '+(st?describeAbility(def):status);}
      if(el._status!==status){el._status=status;el.querySelector('.trigger-status').textContent=status;el.classList.toggle('unavailable',!!locked||status==='LOW ENERGY'||status==='HANDS OCCUPIED'||status==='RELEASE TO RETRY');}
      const payload=def.type==='bow'?(def.payloads||['explosive','flame','poison'])[(p._quiverIdx||0)%(def.payloads?.length||3)]:undefined;
      const target=visibleTarget(g,g.hardLock)?g.hardLock:visibleTarget(g,g.lockTarget)?g.lockTarget:null;
      const match=attackMatchup(def,target,payload);
      const damage=sight?'':attackGuide(def,payload).label+(match?' / '+match:'');
      if(el._damage!==damage){el._damage=damage;const node=el.querySelector('.trigger-damage'),guide=attackGuide(def,payload);node.innerHTML=sight?'':damageBadges(guide.types);if(!sight)node.append(document.createTextNode((guide.effects.length?' · '+guide.effects.join(' · '):'')+(match?' / '+match:'')));}
    }
    // syncCombatView above is the HUD-side cleanup safety net for paused/menu
    // frames; updateCrosshair owns position and lock colour in the native game loop.
    this.el.hp.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    this.el.ki.style.width = clamp(p.ki / p.maxKi * 100, 0, 100) + '%';
    // energy readability: amber when low, red pulse when critical, DRAINED tag after an all-in fizzle
    const kiFrac = p.ki / p.maxKi, drained = p.drainedT > 0;
    if (p.energyInfinite) {   // android core — the tank literally cannot move
      this.el.ki.classList.remove('crit', 'low'); this.el.kiState.classList.add('on'); this.el.kiOver.classList.remove('on');
      if (this._infML !== p.id) { this._infML = p.id; this.el.kiState.textContent = '∞ CORE'; this.el.kiState.style.color = 'var(--info)'; }
    } else {
      if (this._infML) { this._infML = 0; this.el.kiState.textContent = 'DRAINED'; this.el.kiState.style.color = ''; }
      this.el.ki.classList.toggle('crit', drained || kiFrac < 0.15);
      this.el.ki.classList.toggle('low', !drained && kiFrac >= 0.15 && kiFrac < 0.38);
      this.el.kiState.classList.toggle('on', drained);
      // OVERDRIVE window: low tank + a real overdrive attribute → your fists are batteries right now
      this.el.kiOver.classList.toggle('on', !drained && (p.def.overdrive ?? 1) >= 0.7 && kiFrac < 0.25);
    }
    this.el.gd.style.width = clamp(p.guardMeter * 100, 0, 100) + '%';
    this.el.gd.classList.toggle('stagger', p.staggerT > 0);
    // THE WOUND CHIP (manual §18): one row, grayscale-readable — zone · roman severity
    {
      const wEl = document.getElementById('plWounds');
      if (wEl) {
        const W = p._wounds, parts = [];
        if (W) for (const z of ['arm', 'leg', 'torso']) if (W[z] > 0) parts.push(`${z.toUpperCase()} ${['', 'I', 'II', 'III'][W[z]]}`);
        const txt = parts.length ? '⚕ ' + parts.join(' · ') : '';
        if (wEl._t !== txt) { wEl._t = txt; wEl.textContent = txt; wEl.style.display = txt ? 'block' : 'none'; }
      }
    }
    this.el.lvl.textContent = p.level;
    this.el.xp.style.width = clamp(p.level >= 10 ? 100 : p.xp / p.xpNext * 100, 0, 100) + '%';
    // power tier: badge changes + the whole meter panel physically WIDENS — a tier-3 bar is visibly bigger than tier-1
    if (this._tier !== p.tier) {
      this._tier = p.tier;
      this.el.tier.textContent = p.tier >= 4 ? 'MAX TIER' : 'TIER ' + ['', 'I', 'II', 'III'][p.tier];
      this.el.tier.className = 'tierb' + (p.tier > 1 ? ' t' + p.tier : '');
      this.el.plPanel.style.minWidth = (240 + (p.tier - 1) * 44) + 'px';
      this.root.style.setProperty('--tier-spread',((p.tier-1)*44)+'px');
    }

    // ability cooldowns / states
    g.touch?.updateAccess(p);
    const formRole=p.def.title+' · '+p.def.role+(p.formName?' · '+p.formName:'');
    if(this._formRole!==formRole){this._formRole=formRole;this.el.role.textContent=formRole;}
    let charging = 0, maxCharge = 1;
    for (const { k } of SLOT_ORDER) {
      const se = this.slotEls?.[k]; if (!se) continue; const st = p.slots[k]; const def = st.def;
      const locked=!slotUnlocked(p,k)&&!remoteAttack(p,st),required=unlockLevel(p.def,k);
      if(se._locked!==locked||se._required!==required){
        se._locked=locked;se._required=required;se.root.classList.toggle('locked',locked);
        se.root.setAttribute('aria-disabled',String(locked));
        se.root.title=se.baseTitle+(locked?`\nUnlocks at level ${required}`:'');
      }
      const cdPct = def.cd ? clamp(st.cd / def.cd, 0, 1) * 100 : 0;
      se.cd.style.height = cdPct + '%';
      // (8) NUMERIC COOLDOWN — "2.4" beats guessing from a shrinking bar
      if (se.cdn) {
        const secs = locked ? `LV ${required}` : st.cd > 0.05 ? (st.cd < 1 ? st.cd.toFixed(1) : Math.ceil(st.cd)) : '';
        if (se._cdn !== secs) { se._cdn = secs; se.cdn.textContent = secs; }
      }
      const broke = p.ki < attackEntryCost(def);
      const dim = locked || broke || st.cd > 0.01;
      se.root.classList.toggle('dim', !!dim);
      if (se.cost) se.cost.classList.toggle('nope', broke);   // cost turns red when unaffordable
      se.root.classList.toggle('on', !!(st.charging || st.active));
      if (st.charging) { charging = st.chargeT; maxCharge = def.maxCharge || 1.6; }
      if (st.active && st.active.charge01 != null) { charging = st.active.charge01; maxCharge = 1; }
    }
    if (charging > 0) { this.el.charge.style.display = 'block'; this.el.chargeI.style.width = clamp(charging / maxCharge * 100, 0, 100) + '%'; }
    else this.el.charge.style.display = 'none';

    // target health bar — the foe you're locked on / aiming at, only while visible
    let foe = null;
    if (visibleTarget(g,g.hardLock)) foe = g.hardLock;
    else if (visibleTarget(g,g.lockTarget)) foe = g.lockTarget;
    if (foe && !foe.isDummy) {
      this.el.foe.style.display = 'block';
      const vil = g.police && g.police.wantedLevel(foe) > 0 ? '  ·  🚨 VILLAIN' : '';
      this.el.foeName.textContent = foe.name + '  ·  Lv' + foe.level + '  ·  ' + (foe.def.title || '') + vil;
      this.el.foeHp.style.width = clamp(foe.hp / foe.maxHp * 100, 0, 100) + '%';
      const conditions=playerStatus(foe).effects.filter(e=>e.harmful).map(e=>e.label+(e.remaining?' '+e.remaining+'s':'')).join(' · ');
      const node=this.el.foe.querySelector('.foe-conditions');if(node&&node.textContent!==conditions)node.textContent=conditions;
    } else this.el.foe.style.display = 'none';
    // the wanted meter — the city has opinions about who hurts humans
    if (g.police) {
      const lvl = g.police.wantedLevel(p);
      // ⚠ the ladder runs to SIX now (feds → military → sanctioned LSW). Repeat counts must
      // never go negative — the old `3 - lvl` RangeError lives in memory as a warning.
      const txt = !lvl ? ''
        : lvl >= 6 ? `⚡ SANCTIONED ${'★'.repeat(6)}`
        : lvl === 5 ? `🪖 MARTIAL ${'★'.repeat(5)}`
        : lvl === 4 ? `🕶 FEDERAL ${'★'.repeat(4)}`
        : `🚨 WANTED ${'★'.repeat(lvl)}${'☆'.repeat(Math.max(0, 3 - lvl))}`;
      if (txt !== this._wantedTxt) {
        this._wantedTxt = txt;
        this.el.wanted.style.display = lvl ? 'block' : 'none'; this.el.wanted.textContent = txt;
        const prev = this._wantedLvl || 0;
        if (lvl > prev && g.audio && g.audio.sample) {
          g.audio.sample('sting.wanted', { bus: 'music', gain: 0.45 + lvl * 0.08, rate: 0.92 + lvl * 0.05 });
          this.flashScreen('rgba(90,160,255,0.5)', 0.12);
          this.el.wanted.classList.remove('lvlup'); void this.el.wanted.offsetWidth; this.el.wanted.classList.add('lvlup');
        } else if (!lvl && prev && g.audio && g.audio.sample) {
          g.audio.sample('sting.clear', { bus: 'music', gain: 0.5 });
          this.feed('Flag cleared — units standing down', '#7fb0d0');
        }
        this._wantedLvl = lvl;
      }
    }
    this.updateModeBar(g);
    this.updateKitWidget(p);
    // ⚠ EVERY FRAME, NOT ONLY ON THE KEYPRESS. A pickup, a dry toss, a disarm and a KO all change
    // what is in your hands without the selector being touched, so a row driven by the key alone
    // would be correct exactly until something happened to you.
    this.updateHands(p);
    // PURE BOXING: the powers are gated at `runSlot`, so leaving seven lit ability chips on screen
    // is a control that lies about itself — the same law the armory screen keeps when it says
    // "SAVED — NOT YET ISSUED". No powers, no powers row.
    if (this.el.slots) {
      const noPow = !!(p && p.noPowers);
      if (this._noPow !== noPow) { this._noPow = noPow; this.el.slots.style.display = noPow ? 'none' : ''; }
    }
    this.updateDpsMeters(g);
    this.updateMood(g);
    this.updateFoeArrow(g);
    // the comic layer rides the HUD's frame — it is presentation, and it must never be able to
    // throw into the sim
    if (g.comic) { try { g.comic.update(this._dt || 0.016); } catch (e) { g.reportError && g.reportError(e, 'comic'); } }
    this.updateColumnChips(g);
    this.updateTelemetry(g);
    // radar (hidden at the title / while paused) + low-HP danger pulse
    const inMatch = !!(g.mode && g.running);
    this.el.radar.style.display = inMatch ? 'block' : 'none';
    this.updateRadar(g);
    this.updateSundial();
    // the theater nameplate — where in the world this fight is happening
    const plan = g.world && g.world.plan;
    // ⚠ THE DISTRICT IS PART OF THE KEY. A rule the player cannot perceive did not ship: the plate
    // used to rebuild only when the CITY changed, so the reaction table would have been invisible
    // while you walked from a hospital district into a rail yard. Keying on the district type
    // rebuilds it exactly when you cross a boundary and never once in between.
    // ⚠ ONLY WHERE THE DISTRICT ACTUALLY GOVERNS — see `hasCity` in data/modes.js. A venue keeps the
    // last theatre's plan, so the plate has always shown a stale city NAME there (cosmetic, and
    // pre-existing); a stale district REACTION would be a lie about the rules of this fight.
    const dtype = inMatch && plan && p && hasCity(g.modeId) && g.world.districtTypeAt
      ? g.world.districtTypeAt(p.pos.x, p.pos.z) : null;
    const plateKey = inMatch && plan ? plan.name + plan.seed + '|' + (dtype || '') : '';
    if (plateKey !== this._plateKey) {
      this._plateKey = plateKey;
      if (!plateKey) this.el.city.style.display = 'none';
      else {
        this.el.city.style.display = 'block';
        // WHAT IT IS, then WHAT THAT MEANS FOR THIS FIGHT — derived from the same numbers the
        // crowd, the police and the hazard read, so the line cannot flatter a district.
        const line = districtLine(dtype);
        this.el.city.innerHTML = `📍 <b>${esc(plan.name.toUpperCase())}</b> · ${esc(plan.country.toUpperCase())} — ${esc(plan.popLabel)}${plan.crime ? ` · CRIME ${plan.crime}` : ''}`
          + (line ? `<span class="cpdist">⟩ ${esc(line)}</span>` : '');
      }
    }
    // the KMK 9 live monitor — visible while the field crew is ON AIR
    if (g.news) {
      if (!this._pipAdopted && g.news.canvas) { this.el.pip.appendChild(g.news.canvas); this._pipAdopted = true; }
      const onAir = inMatch && !g.matchOver && g.news.enabled && g.news.onAir;
      if (onAir !== this._pipOn) { this._pipOn = onAir; this.el.pip.style.display = onAir ? 'block' : 'none'; }
    }
    const hpFrac = p.hp / p.maxHp;
    this.el.danger.style.opacity = (inMatch && p.alive && hpFrac < 0.28) ? String(clamp(0.32 + Math.sin(performance.now() * 0.006) * 0.3, 0, 0.8)) : '0';
  }

  // ---------- Title / select ----------
  // ---- THE COLD OPEN --------------------------------------------------------------------
  // The home page opens the way a news hour opens: a monitor, a bug, a clock, a lower third and
  // a headline. The monitor plays REAL FOOTAGE — the clips the field crew actually captured in
  // your last match. With no footage yet it runs a broadcast test card, because a dead monitor
  // on a menu reads as broken rather than as "nothing has happened yet".
  // Headlines built from the LIVE book, so the menu is reporting on your actual game.
  _coldHeadlines() {
    const out = [];
    try {
      const table = snapshotTable(ROSTER);
      const champ = championId();
      if (champ) {
        const c = ROSTER.find(r => r.id === champ);
        if (c) out.push({ head: c.name + ' HOLDS THE BELT', lower: 'THE INVITATIONAL — REIGNING CHAMPION',
          sub: 'The Treaty Office confirms ' + c.name + ' remains undefeated at the top of the sanctioned book.' });
      }
      const top = table[0];
      if (top) out.push({ head: top.def.name + ' LEADS THE BOOK', lower: 'ASCENDANT POWER RANKINGS',
        sub: 'Rated ' + Math.round(top.elo) + ' across ' + (top.rec.w + top.rec.l) + ' sanctioned bouts.' });
      const inc = recentIncidents ? recentIncidents(6) : [];
      for (const i of inc.slice(0, 3)) {
        if (!i || !i.text) continue;
        out.push({ head: String(i.text).toUpperCase().slice(0, 54), lower: 'FIELD REPORT', sub: i.sub || 'Continuing coverage.' });
      }
    } catch (e) { /* the book may be empty on a fresh install */ }
    if (!out.length) {
      out.push({ head: 'NO SANCTIONED BOUTS ON RECORD', lower: 'THE ASCENDANT REGISTRY',
        sub: 'Fifty-two registered weapons. One thousand and fifty cities. Nothing has happened yet.' });
    }
    out.push({ head: 'THE VILLAIN IS WHOEVER HURTS HUMANS', lower: 'TREATY OFFICE — STANDING NOTICE',
      sub: 'Collateral is tracked. Police response is set by the theater. Some nations shoot back.' });
    return out;
  }


}

// ⚠ CODE REVIEW ITEM 4 — hud.js was 2570 lines carrying every screen in the game. The codex,
// the post-fight broadcast and the title/cold-open are now their own modules, installed here as
// mixins so `this` still means the HUD and every existing call site is untouched. The shared
// helpers they all needed went to hudUtil.js FIRST, which is what keeps this acyclic.
Object.assign(HUD.prototype, CodexMixin, BroadcastMixin, TitleMixin, SelectMixin);
