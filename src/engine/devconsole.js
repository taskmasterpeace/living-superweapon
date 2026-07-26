// THE DEV CONSOLE — a command line inside the game.
//
// Robert, 2026-07-25: "had nova did shift space and nothing happened… let me have a button in game
// for console `, then let me type a command for verbose logging or something."
//
// The reason this exists is that a GATED feature fails silently. Departure needs three conditions
// true at once; when it doesn't fire, the game says nothing at all, and the difference between
// "wrong hero", "tank empty" and "never left the ground" is invisible from the outside. Nobody
// should have to guess — and neither should I, from a transcript.
//
// TWO RULES this file keeps:
//   · IT NEVER THROWS INTO THE FRAME. Every command runs in a try/catch and reports its own error;
//     a debugging tool that can crash the thing it is debugging is worse than no tool.
//   · IT READS, IT DOESN'T MODEL. `heights` measures the LIVE scene — the actual tops of the actual
//     cover boxes — rather than recomputing what the planner intended. A ruler that agrees with the
//     source instead of the world is how a wrong number survives being checked.
import { BANDS } from '../core/util.js';
import { ROSTER } from '../data/characters.js';
import * as ORG from '../data/org.js';
import * as MED from '../data/medical.js';
import * as BASE from '../data/base.js';
import * as CITIES from '../data/cities.js';
import * as COUNTRIES from '../data/countries.js';
import { FIREARMS, BLADES, GEAR, LOADOUTS, firearmById, bladeById, gearById, buildLoadout } from '../data/armory.js';
import { playSpaceFlight } from './spaceflight.js';
import { ORBITS, MOONS, moonsOf, moonDistanceInRadii, positionAt, separationAU,
         alignmentSpread, bestAlignmentIn, gameDate, setGameDate, advanceDays,
         dateStr, seasonOf, ALIGN_DATE } from '../data/orbits.js';
import { WORLDS, worldOf, survivalFor, skyFor, SUITS } from '../data/environments.js';
import { ORIGINS, deriveOrigin, recoveryPlan, HOSPITAL } from '../data/origins.js';
import { WHEEL, EMOTIONS, shadeOf, derivePersonality, TARGET_RULES } from '../data/psyche.js';
import { psycheOf } from './psyche.js';

const U_PER_M = 1 / 0.19;              // TRUE 1:1 SCALE: 1 unit ≈ 0.19m
const HERO_U = 9.6;                    // a hero is 9.6u ≈ 1.8m — the only ruler that means anything
const m = (u) => (u * 0.19).toFixed(1) + 'm';
const heroes = (u) => (u / HERO_U).toFixed(1) + '×hero';

export class DevConsole {
  constructor(game, hud) {
    this.g = game; this.hud = hud;
    this.open = false; this.verbose = false;
    this.hist = []; this.hpos = -1;
    this._traceT = new Map();          // per-tag rate limiter — verbose must not become a freeze
    this.cmds = new Map();
    this._build();
    this._register();
    game.dev = this;                   // engines call game.dev && game.dev.trace(...)
  }

  // ------------------------------------------------------------------ DOM
  _build() {
    const btn = document.createElement('button');
    btn.id = 'devBtn'; btn.textContent = '>_'; btn.title = 'Console (`)';
    btn.style.cssText = 'position:fixed;left:14px;top:14px;z-index:64;width:38px;height:28px;' +
      'font:700 13px var(--f-mono,monospace);color:var(--gold,#ffd24a);background:rgba(20,18,14,.82);' +
      'border:1px solid rgba(255,210,74,.45);border-radius:var(--r-1,4px);cursor:pointer;opacity:.55;' +
      'transition:opacity .15s';
    btn.onmouseenter = () => (btn.style.opacity = '1');
    btn.onmouseleave = () => (btn.style.opacity = this.open ? '1' : '.55');
    btn.onclick = () => this.toggle();
    document.body.appendChild(btn); this.btn = btn;

    const el = document.createElement('div');
    el.id = 'devConsole';
    el.style.cssText = 'position:fixed;left:14px;top:48px;width:min(620px,52vw);z-index:64;display:none;' +
      'background:rgba(14,13,10,.94);border:1px solid rgba(255,210,74,.4);border-radius:var(--r-2,8px);' +
      'box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden';
    el.innerHTML =
      '<div id="devOut" style="max-height:44vh;overflow-y:auto;padding:8px 10px;' +
      'font:12px/1.55 var(--f-mono,Cascadia Code,monospace);color:#cfc9bb;white-space:pre-wrap"></div>' +
      '<div style="display:flex;align-items:center;border-top:1px solid rgba(255,210,74,.22)">' +
      '<span style="padding:0 8px;color:var(--gold,#ffd24a);font:700 13px var(--f-mono,monospace)">&gt;</span>' +
      '<input id="devIn" spellcheck="false" autocomplete="off" style="flex:1;background:none;border:0;' +
      'outline:0;padding:8px 10px 8px 0;color:#f2efe6;font:12px var(--f-mono,Cascadia Code,monospace)"></div>';
    document.body.appendChild(el);
    this.el = el; this.out = el.querySelector('#devOut'); this.in = el.querySelector('#devIn');

    // ⚠ the input must EAT its keys. main.js has a global keydown that moves, fires and swaps hero;
    // without this, typing "hero sol" also throws a punch and cycles the roster.
    this.in.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { this.run(this.in.value); this.in.value = ''; this.hpos = -1; }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this._recall(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this._recall(-1); }
      else if (e.key === 'Escape') this.toggle(false);
    });
    this.in.addEventListener('keyup', (e) => e.stopPropagation());
    this.in.addEventListener('keypress', (e) => e.stopPropagation());
  }
  _recall(d) {
    if (!this.hist.length) return;
    this.hpos = Math.max(-1, Math.min(this.hist.length - 1, this.hpos + d));
    this.in.value = this.hpos < 0 ? '' : this.hist[this.hpos];
  }

  toggle(force) {
    this.open = force === undefined ? !this.open : !!force;
    this.el.style.display = this.open ? 'block' : 'none';
    this.btn.style.opacity = this.open ? '1' : '.55';
    if (this.open) { this.in.focus(); if (!this._greeted) { this._greeted = 1; this.print('WAR WORLD console — type `help`'); } }
    else this.in.blur();
    return this.open;
  }

  print(s, col) {
    const d = document.createElement('div');
    if (col) d.style.color = col;
    d.textContent = s;
    this.out.appendChild(d);
    while (this.out.childNodes.length > 300) this.out.removeChild(this.out.firstChild);
    this.out.scrollTop = this.out.scrollHeight;
  }
  ok(s) { this.print(s, '#8fe08a'); }
  warn(s) { this.print(s, '#ffb03a'); }
  err(s) { this.print(s, '#ff5a4a'); }

  // ⚠ THE RATE LIMIT IS THE POINT. A per-frame trace at 60Hz appending DOM nodes IS a freeze —
  // the same lesson as THE REPEATED-ERROR LAW. One line per tag per interval, never more.
  trace(tag, msg, every = 0.5) {
    if (!this.verbose) return;
    const t = (this.g.time || 0), last = this._traceT.get(tag) || -9;
    if (t - last < every) return;
    this._traceT.set(tag, t);
    this.print('· ' + tag + '  ' + msg, '#8b8577');
  }

  run(line) {
    line = (line || '').trim();
    if (!line) return;
    this.hist.unshift(line); if (this.hist.length > 60) this.hist.pop();
    this.print('> ' + line, '#ffd24a');
    const [name, ...args] = line.split(/\s+/);
    const c = this.cmds.get(name.toLowerCase());
    if (!c) return this.err('no such command: ' + name + '   (try `help`)');
    try { c.run(args, this); }
    catch (e) { this.err(String((e && e.message) || e)); }
  }
  cmd(name, help, run) { this.cmds.set(name, { name, help, run }); }

  // ------------------------------------------------------------------ measurements
  // THE RULER (Robert: "the heights are not right yet… give me something to measure height of each
  // phase"). Everything here is MEASURED off the live scene, never recomputed from the planner —
  // the whole question is whether the bands match the buildings that actually got built.
  measure() {
    const g = this.g, W = g.world, p = g.player;
    let tallest = null, standable = 0, n = 0;
    for (const c of (W.coverAll || W.cover || [])) {
      if (c.destroyed) continue;
      const top = c.top ?? c.h; if (top == null) continue;
      n++;
      if (top > standable) { standable = top; tallest = c; }
    }
    // interiors are standable too (roofs), and so are the props nothing else counts
    for (const it of (W.interiors || [])) {
      const top = it.top ?? it.h;
      if (top != null && top > standable) { standable = top; tallest = it; }
    }
    return {
      cover: n, standable, tallest,
      bands: { ...BANDS },
      player: p ? p.pos.y : null,
      ceilingHard: BANDS.ceiling + 90,
      departAt: BANDS.ceiling + 44,
    };
  }

  _register() {
    const G = () => this.g, P = () => this.g.player;

    this.cmd('help', 'list commands', (a, c) => {
      const names = [...c.cmds.values()].sort((x, y) => x.name.localeCompare(y.name));
      for (const k of names) c.print('  ' + k.name.padEnd(10) + k.help);
    });
    this.cmd('clear', 'clear the log', () => { this.out.innerHTML = ''; });

    this.cmd('verbose', 'verbose [on|off] — trace gated systems', (a, c) => {
      c.verbose = a[0] ? /^(on|1|true|yes)$/i.test(a[0]) : !c.verbose;
      c.ok('verbose ' + (c.verbose ? 'ON — gated systems will report why they refuse' : 'off'));
    });

    // ---- THE HEIGHT RULER ----
    this.cmd('heights', 'measure every altitude band against the tallest thing you can stand on', (a, c) => {
      const M = c.measure(), B = M.bands;
      const line = (label, u, note) => c.print('  ' + label.padEnd(22) + String(Math.round(u)).padStart(5) + 'u   ' +
        m(u).padStart(8) + '   ' + heroes(u).padStart(10) + (note ? '   ' + note : ''));
      c.print('SCALE  1u = 0.19m · a hero is ' + HERO_U + 'u (1.8m) · one building storey ≈ 51u? see note');
      c.print('— WHAT YOU CAN ACTUALLY STAND ON —');
      line('tallest standable', M.standable, M.tallest ? ('(' + (M.tallest.w || 0).toFixed(0) + '×' + (M.tallest.d || 0).toFixed(0) + ' footprint)') : '');
      c.print('  ' + String(M.cover).padStart(3) + ' standable surfaces in this theatre');
      c.print('— THE BANDS —');
      line('GROUND  <', B.ground);
      line('BUILDING <', B.building, B.building > M.standable ? '⚠ ' + Math.round(B.building - M.standable) + 'u ABOVE the tallest roof' : 'at/below the tallest roof');
      line('SKY     <', B.sky, '+' + Math.round(B.sky - B.building) + 'u over BUILDING');
      line('CEILING', B.ceiling, '+' + Math.round(B.ceiling - B.building) + 'u over BUILDING');
      line('depart offer at', M.departAt);
      line('hard stop (burner)', M.ceilingHard);
      if (M.player != null) line('YOU are at', M.player, 'band ' + (M.player < B.ground ? 'GROUND' : M.player < B.building ? 'BUILDING' : M.player < B.sky ? 'SKY' : 'CLOUDS'));
      c.print('— THE RATIO —');
      c.print('  everything above the tallest roof is EMPTY AIR: ' +
        Math.round(B.ceiling - M.standable) + 'u (' + m(B.ceiling - M.standable) + ') of it, ' +
        (M.standable > 0 ? (B.ceiling / M.standable).toFixed(2) : '—') + '× the height of the city itself.');
    });

    // ---- WHY DIDN'T IT FIRE ----
    this.cmd('why', 'why the depart gate is refusing right now', (a, c) => {
      const g = G(), p = P();
      if (!p) return c.err('no player');
      const B = BANDS, need = B.ceiling + 44;
      const row = (okv, label, detail) => c.print((okv ? '  ✓ ' : '  ✗ ') + label.padEnd(26) + detail, okv ? '#8fe08a' : '#ff5a4a');
      c.print('DEPART GATE — ' + (p.def.name || p.def.id));
      row(!!p.def.afterburner, 'burner-class hero', p.def.afterburner ? 'yes' : 'NO — only sol/nova/torch/apex/majesty/olympus');
      row(!!p.flying, 'flying', p.flying ? 'yes' : 'NO — press F first');
      row(!!p.cruiseHeld, 'cruise held (SHIFT)', p.cruiseHeld ? 'yes' : 'not held THIS FRAME');
      row(p.ki > 1, 'ki in the tank', Math.round(p.ki) + ' / ' + Math.round(p.maxKi) + '  (burner costs ' + ((p.def.afterburner && p.def.afterburner.kiPerSec) || '—') + '/s)');
      row((p._burnT || 0) > 0.8, 'burner LIT (0.8s of cruise)', (p._burnT || 0).toFixed(2) + 's');
      row(p.pos.y > need, 'altitude', Math.round(p.pos.y) + 'u — need ' + Math.round(need) + 'u');
      row(!g._departing, 'gate armed', g._departing ? 'ALREADY OFFERED this climb — descend below ' + Math.round(B.ceiling - 40) + 'u to re-arm' : 'armed');
      row(!!g.running && !!g.mode, 'match live', g.running ? 'yes' : 'NO — game is paused or on a menu');
    });

    // THE DIAL. `bands` shows them; `bands sky 1.6` reshapes the sky as a multiple of the tallest
    // roof and refits live, so a height ruling can be FLOWN before anyone writes it down.
    this.cmd('bands', 'bands | bands sky|ceiling <multiple> — reshape live', (a, c) => {
      const W = G().world, S = W.constructor.BAND_SHAPE;
      if (a.length >= 2 && (a[0] === 'sky' || a[0] === 'ceiling')) {
        const v = parseFloat(a[1]);
        if (!(v > 1)) return c.err('multiple must be > 1 (it is × the tallest roof)');
        S[a[0]] = v;
        const b = W.fitBands();
        if (!b) return c.warn('nothing standable to measure here');
        c.ok(a[0] + ' = ' + v + '× tallest roof  →  ' + JSON.stringify(b));
        return;
      }
      c.print('shape:  sky ' + S.sky + '×   ceiling ' + S.ceiling + '×   (of the tallest roof)');
      c.print('live:   ' + JSON.stringify(BANDS));
      c.print('tallest roof measured: ' + Math.round(W._measuredTop || 0) + 'u');
    });
    this.cmd('where', 'position + band', (a, c) => {
      const p = P(); if (!p) return c.err('no player');
      c.print('x ' + p.pos.x.toFixed(1) + '  y ' + p.pos.y.toFixed(1) + ' (' + m(p.pos.y) + ')  z ' + p.pos.z.toFixed(1) +
        '  flying=' + !!p.flying + '  burn=' + (p._burnT || 0).toFixed(2) + '  ki=' + Math.round(p.ki));
    });
    this.cmd('ki', 'refill ki', (a, c) => { const p = P(); if (p) { p.ki = p.maxKi; c.ok('ki full'); } });
    this.cmd('hp', 'refill health', (a, c) => { const p = P(); if (p) { p.hp = p.maxHp; c.ok('health full'); } });
    this.cmd('up', 'up <units> — lift the player', (a, c) => {
      const p = P(); if (!p) return c.err('no player');
      p.pos.y += (+a[0] || 50); p.flying = true; c.ok('y = ' + Math.round(p.pos.y));
    });
    this.cmd('tp', 'tp <x> <z> — teleport', (a, c) => {
      const p = P(); if (!p) return c.err('no player');
      p.pos.x = +a[0] || 0; p.pos.z = +a[1] || 0; c.ok('moved');
    });
    this.cmd('hero', 'hero <id> — swap the player hero', (a, c) => {
      if (!a[0]) return c.err('hero <id>');
      const g = G(); if (!g.cycleHeroTo && !g.setPlayerHero) return c.warn('no swap hook — use the wheel');
      (g.setPlayerHero || g.cycleHeroTo).call(g, a[0]); c.ok('now ' + a[0]);
    });
    this.cmd('mode', 'mode <id> — restart in a mode', (a, c) => {
      if (!a[0]) return c.err('mode <id>');
      const p = P();
      G().startMode(a[0], { p1: p ? p.def.id : 'sol' }); c.ok('mode ' + a[0]);
    });
    // THE SURVEY, READ BACK. Every number here is the plan's own, so the console cannot disagree
    // with the city it is describing (data/cityplan.js surveyCity).
    this.cmd('survey', 'the street survey for this city — grades, cut and fill', (a, c) => {
      const plan = G().world.plan, SV = plan && plan.survey;
      if (!SV) return c.warn('this theatre has no road survey (the flagship is hand-built)');
      const CLASS = { 1: 'track', 2: 'street', 3: 'arterial', 4: 'highway' };
      c.print('  ' + 'streets surveyed'.padEnd(22) + String(SV.edges).padStart(6) + ' edges, ' + SV.surveyed + ' junctions');
      c.print('  ' + 'steepest street'.padEnd(22) + (SV.worstGrade * 100).toFixed(1).padStart(6) + '%   on a ' + (CLASS[SV.worstClass] || '?'));
      c.print('  ' + 'earth cut'.padEnd(22) + String(SV.cutFill.cut).padStart(6) + 'u');
      c.print('  ' + 'earth filled'.padEnd(22) + String(SV.cutFill.fill).padStart(6) + 'u');
      c.print('  ' + 'mean move per junction'.padEnd(22) + String(SV.cutFill.meanMove).padStart(6) + 'u  (' + m(SV.cutFill.meanMove) + ')');
      c.print('  relief: ' + ((plan.relief && plan.relief.kind) || '?') + '  amp ' + ((plan.relief && plan.relief.amp) || 0));
      c.print('  the survey follows the land as closely as the grade limit allows, and no closer.');
    });
    // FLY ANY CROSSING ON DEMAND, with any party. This is the customizability made reachable:
    //   space mars              — you, to Mars
    //   space pluto 4           — a flight of four
    //   space pluto 2 freighter — two flyers escorting a freighter
    //   space deep 1 scout      — out to the heliopause with an alien scout in company
    this.cmd('space', 'space <target|deep> [flyers] [ship] — fly a crossing', (a, c) => {
      const g = G(), R = window.LSW && window.LSW.ROSTER;
      const target = (a[0] || 'mars').toLowerCase();
      const n = Math.max(1, Math.min(8, parseInt(a[1], 10) || 1));
      const ship = a[2];
      const pool = (R || []).filter(d => d && d.id);
      const heroes = [];
      for (let i = 0; i < n; i++) heroes.push((g.player && i === 0 && g.player.def) || pool[(i * 7) % Math.max(1, pool.length)] || null);
      const spec = { heroes: heroes.filter(Boolean) };
      if (ship) { if (['scout', 'hauler'].includes(ship)) { spec.alien = ship; spec.alienCount = 1; } else spec.ship = ship; }
      const opts = target === 'deep'
        ? { from: 'earth', to: { au: 123 }, deep: true, secs: 22, partySpec: spec }
        : { from: 'earth', to: target, secs: 16, partySpec: spec };
      c.ok('flying ' + target + ' with ' + (spec.heroes.length) + ' flyer(s)' + (ship ? ' + ' + ship : ''));
      playSpaceFlight(g, opts, () => c.ok('arrived'));
    });
    // ---- THE CALENDAR. Where everything is depends on the day, so the day has to be visible and
    // settable, or "the time of year matters" is a claim nobody can check.
    this.cmd('date', 'date | date <y> <m> <d> | date +<days> — the in-game date', (a, c) => {
      if (a[0] && a[0][0] === '+') advanceDays(parseInt(a[0].slice(1), 10) || 1);
      else if (a.length >= 3) setGameDate({ y: +a[0], m: +a[1], d: +a[2] });
      const d = gameDate();
      c.ok(dateStr(d) + '   ·   ' + seasonOf(d) + ' in the north');
      c.print('  system alignment ' + alignmentSpread(d).toFixed(2) + '\u00b0 spread' +
        (alignmentSpread(d) < 0.01 ? '   ← PERFECT SYZYGY' : ''));
    });

    // ---- THE ALMANAC. Every world, where it is today, and how far the crossing would be.
    this.cmd('almanac', 'where every world is today, and what it costs to get there', (a, c) => {
      const d = gameDate();
      c.print('THE ALMANAC   ' + dateStr(d));
      c.print('  alignment spread ' + alignmentSpread(d).toFixed(2) + '\u00b0' +
        (alignmentSpread(d) < 0.01 ? '   PERFECT — every world on one line from the sun' : ''));
      c.print('');
      c.print('  ' + 'WORLD'.padEnd(10) + 'ORBIT'.padStart(7) + '  ' + 'LONGITUDE'.padStart(10) + '  ' +
              'FROM EARTH'.padStart(11) + '   MOONS');
      for (const id of Object.keys(ORBITS)) {
        const o = ORBITS[id], pos = positionAt(id, d);
        const sep = id === 'earth' ? 0 : separationAU('earth', id, d);
        const mo = moonsOf(id).map(m => m.name).join(', ') || '\u2014';
        c.print('  ' + id.toUpperCase().padEnd(10) + (o.a.toFixed(2) + ' AU').padStart(7) + '  ' +
                (pos.lon.toFixed(1) + '\u00b0').padStart(10) + '  ' +
                (id === 'earth' ? '\u2014' : sep.toFixed(2) + ' AU').padStart(11) + '   ' + mo);
      }
      c.print('');
      c.print('  the periods do not divide into one another, so the line never comes back:');
      c.print('  best alignment in four centuries \u2192 ' + JSON.stringify(bestAlignmentIn(1900, 2300).date));
    });

    // ---- THE MOONS, at the distance nobody believes.
    this.cmd('moons', 'moons <planet> — the interesting ones, and how far out they really are', (a, c) => {
      const id = (a[0] || 'earth').toLowerCase();
      const list = moonsOf(id);
      if (!list.length) return c.warn('no moons on file for ' + id);
      const par = ORBITS[id];
      c.print(id.toUpperCase() + '  (radius ' + par.radiusKm.toLocaleString() + ' km)');
      for (const m of list) {
        c.print('  ' + m.name.padEnd(11) + (m.a.toLocaleString() + ' km').padStart(13) + '  = ' +
                moonDistanceInRadii(id, m).toFixed(1).padStart(5) + '\u00d7 the planet\'s radius' +
                '   ' + Math.abs(m.T).toFixed(2) + 'd');
        c.print('             ' + m.note);
      }
    });

    // ---- COULD I STAND THERE? The question the whole environment model exists to answer.
    this.cmd('survive', 'survive <world> [hero] — what it takes to stand there', (a, c) => {
      const id = (a[0] || 'mars').toLowerCase();
      const w = worldOf(id);
      if (!w) return c.err('no environment on file for ' + id + '   (' + Object.keys(WORLDS).join(' ') + ')');
      const R = window.LSW && window.LSW.ROSTER;
      const g = G();
      const def = (a[1] && R && R.find(x => x.id === a[1].toLowerCase())) || (g.player && g.player.def);
      const s2 = survivalFor(def, id, g.player && g.player.sheet);
      const sky = skyFor(id);
      c.print(w.name.toUpperCase() + '   ' + w.air);
      c.print('  ' + w.note);
      c.print('');
      c.print('  ' + ((def && def.name) || 'YOU') + ':  ' + s2.verdict +
        (s2.suit && s2.suit.id !== 'none' ? '   \u2014 ' + s2.suit.blurb : ''));
      if (s2.bare.length) {
        c.print('  unprotected: ' + (s2.unsuitedSecs === Infinity ? 'survivable' : s2.unsuitedSecs + ' seconds'), '#ff5a4a');
        c.print('  it attacks on: ' + s2.bare.map(m => m.ch + ' ' + m.need + (m.have ? ' (you answer ' + m.have + ')' : '')).join(' \u00b7 '));
      } else c.ok('  nothing here can touch you.');
      if (s2.missing.length) c.err('  NO SUIT CLOSES: ' + s2.missing.map(m => m.ch).join(', '));
      c.print('  ' + s2.gravity);
      c.print('');
      c.print('  SKY   noon ' + sky.day + '   sunset ' + sky.sunset +
        (sky.starsByDay ? '   stars visible at noon' : ''));
      c.print('        the sun is ' + sky.sunArcDeg.toFixed(3) + '\u00b0 across' +
        (sky.sunIsPoint ? ' \u2014 a very bright STAR, with no disc' : '') +
        ', light \u00d7' + sky.lightMult.toFixed(3));
      c.print('        overhead: ' + sky.inSky);
    });

    // ---- WHO SOMEBODY IS, and what medicine can do about it (Combat Compendium).
    this.cmd('origin', 'origin [hero] — origin, hospital plan and personality', (a, c) => {
      const R = window.LSW && window.LSW.ROSTER, g = G();
      const def = (a[0] && R && R.find(x => x.id === a[0].toLowerCase())) || (g.player && g.player.def);
      if (!def) return c.err('no hero');
      const sheet = g.player && g.player.def === def ? g.player.sheet : null;
      const p2 = recoveryPlan(def, sheet, null), P = derivePersonality(def);
      c.print((def.name || def.id) + '   ' + p2.origin.name);
      c.print('  ' + p2.origin.blurb);
      c.print('  ' + p2.origin.detail);
      c.print('');
      if (!p2.canAdmit) {
        c.err('  NO HOSPITAL WILL ADMIT THEM — ' + p2.why);
        c.print('  instead: ' + p2.alternative);
      } else {
        c.print('  HOSPITAL   heals to ' + Math.round(p2.healMax * 100) + '% at most');
        c.print('             stamina ' + p2.stamina + ' ' + (p2.staminaShift > 0 ? '+' : '') + p2.staminaShift +
                'CS → ' + p2.effectiveLabel + '   (' + Math.round(p2.perStay * 100) + '% per stay)');
        c.print('             one stay every ' + p2.hours + 'h · ' + p2.stays + ' stays · ' + p2.totalHours + 'h total');
        c.print('             100% requires: ' + p2.requires);
        if (p2.afterCare) c.print('             after the cap: ' + p2.afterCare, '#8b8577');
        if (p2.table.intensityNote) c.warn('             ⚠ ' + p2.table.intensityNote);
      }
      c.print('');
      c.print('  PERSONALITY  #' + P.n + '  ' + P.name);
      c.print('               ' + P.blurb);
      c.print('               targets ' + TARGET_RULES[P.target].label + ' — ' + TARGET_RULES[P.target].desc);
    });

    // ---- the roster, by origin — the whole assignment at a glance
    this.cmd('origins', 'the whole roster, by origin', (a, c) => {
      const R = (window.LSW && window.LSW.ROSTER) || [];
      for (const o of ORIGINS) {
        const list = R.filter(d => deriveOrigin(d).id === o.id).map(d => d.name || d.id);
        if (!list.length) continue;
        const H = HOSPITAL[o.id];
        c.print(o.name.padEnd(23) + String(list.length).padStart(2) + '   ' +
          (H.canAdmit ? Math.round(H.healMax * 100) + '% cap · every ' + H.hours + 'h' : 'cannot be admitted'));
        c.print('   ' + list.join(', '), '#8b8577');
      }
    });

    // ---- the comic layer, on demand
    this.cmd('comic', 'comic [talk|yell|whisper|think|robot|alien|announce|weak|narrate|cap|sfx|demo] <text>', (a, c) => {
      const g = G(), C = g.comic, p = P();
      if (!C) return c.err('no comic layer');
      const what = (a[0] || 'demo').toLowerCase();
      const text = a.slice(1).join(' ');
      if (what === 'demo') {
        C.caption('Meanwhile, across town...', { where: 'tl' });
        C.caption('Just at that moment!', { where: 'tr', halftone: true, tilt: 'r' });
        if (p) C.say(p, 'You picked the *wrong* city, pal!');
        const foe = g.entities.find(e => e.alive && e.def && e !== p && g.isFoe && g.isFoe(p, e));
        if (foe) C.say(foe, 'I will tear you **apart**!', { tone: 'shout' });
        if (p) C.sfx('THWAKK!', p.pos, { power: 0.8 });
        return c.ok('lettered');
      }
      if (what === 'tones') {
        const rows = [['talk', 'Normal speech, balanced.'], ['yell', 'I said MOVE!'],
          ['whisper', 'Keep it down...'], ['think', 'Maybe this is a bad idea.'],
          ['robot', 'TARGET ACQUIRED'], ['alien', 'we have come for it'],
          ['announce', 'ATTENTION, CITIZENS'], ['weak', 'i cant... hold it'],
          ['narrate', 'Later that night...']];
        for (const [t, tx] of rows) C.say(p, tx, { tone: t, life: 6, inverted: t === 'alien' });
        return c.ok('nine tones');
      }
      if (what === 'cap') { C.caption(text || 'Meanwhile...', { where: 'tl' }); return; }
      if (what === 'sfx') { if (p) C.sfx(text || 'KRAKOOM!', p.pos, { power: 0.9 }); return; }
      if (!p) return c.err('no player to speak');
      C.say(p, text || 'Say something.', { tone: what === 'say' ? 'talk' : what });
    });

    // ---- the wheel, live
    // THE TEAM AND THE CHART. `team` is the manager's view; `chart <id>` is the physician's.
    this.cmd('team', 'team [hire|market|week|chart <id>|examine <id>|couch <id>] — your firm', (a, c) => {
      const sub = (a[0] || 'list').toLowerCase();
      const o = ORG.org();
      if (!o.founded && sub !== 'found') return c.err('no firm — try:  team found <country> <city> [name]');
      if (sub === 'found') {
        const res = ORG.found(a[1], a[2], a.slice(3).join(' '));
        if (!res.ok) return c.err(res.why);
        c.log(res.firm + (res.stateNamed ? '   (THE STATE NAMED IT)' : ''));
        c.log('  ' + res.why);
        return c.log('  $' + res.capital.cash + 'K · site ' + res.site.n + '×' + res.site.n + ' · ' + res.capital.note);
      }
      if (sub === 'market') {
        const mk = ORG.market(ROSTER, 5);
        for (const k of Object.keys(mk)) {
          c.log(ORG.ROLES[k].n);
          for (const p2 of mk[k]) c.log('   ' + p2.name.padEnd(24) + '$' + String(p2.salary).padStart(4) + 'K/wk  sign $' + p2.sign + 'K' + (p2.band ? '   ' + p2.band : ''));
        }
        return;
      }
      if (sub === 'week') { const w = ORG.weekTurn(); return c.log('payroll $' + w.paid + 'K · $' + w.cash + 'K left' + (w.broke ? '   ARREARS — MORALE FALLING' : '')); }
      if (sub === 'chart' || sub === 'examine' || sub === 'couch') {
        const id = a[1];
        if (!id) return c.err('who?');
        if (sub === 'examine') {
          const q = parseFloat(a[2]) || 0.6;
          const r2 = MED.examine(id, q);
          if (!r2.found.length) return c.log('examination at quality ' + q + ' found nothing.');
          for (const x of r2.found) c.log('  FOUND  ' + x.def.n + '  (severity ' + x.sev + ')   ' + x.def.d);
          return;
        }
        if (sub === 'couch') {
          const r2 = MED.session(id, a[2], 1);
          return r2.ok ? c.log(r2.cleared ? r2.n + ' — CLEARED' : r2.n + ' — ' + r2.left + ' session(s) to go') : c.err(r2.why);
        }
        const rep = MED.chartReport(id);
        c.log('CHART · ' + id + (rep.seen ? '' : '   (NEVER EXAMINED)'));
        for (const x of rep.physical) c.log('  PHYS   ' + x.def.n.padEnd(20) + 'sev ' + x.sev + '   ' + x.def.d);
        for (const x of rep.psychological) c.log('  PSYCH  ' + x.def.n.padEnd(20) + 'sev ' + x.sev + '   ' + x.def.d);
        if (!rep.physical.length && !rep.psychological.length) c.log('  nothing on file');
        if (rep.concern) c.log('  ⚠ ' + rep.concern);
        return;
      }
      c.log(ORG.orgLine());
      for (const p2 of ORG.teamReport())
        c.log('  ' + p2.name.padEnd(24) + p2.role.padEnd(13) + '$' + String(p2.salary).padStart(4) + 'K  ' + p2.health.word);
    });

    // THE BASE — the site survey, the grid, the pipeline and the cells, all readable from here.
    this.cmd('base', 'base [survey|grid|pipe|cells|study <major>] — your HQ', (a, c) => {
      const g = G(), sub = (a[0] || 'grid').toLowerCase();
      const b = BASE.baseState();
      if (sub === 'survey') {
        const th = (g.hud && g.hud.theater) || null;
        const city = th && CITIES.cityList().find(x => x.name === th.city);
        const sv = BASE.siteSurvey(city, city && COUNTRIES.countryOf(city.country));
        c.log((city ? city.name + ' · ' + city.country : 'NO THEATER') + '  →  ' + sv.n + '×' + sv.n +
              (sv.twoFloors ? ' · TWO FLOORS' : ' · ONE FLOOR') + '   ' + sv.label);
        c.log(sv.why);
        for (const k of ['wealth','scale','legal','permissive','infra','watched','chaos','ground','cover'])
          c.log('   ' + k.padEnd(11) + (sv.terms[k]).toFixed(3));
        return;
      }
      if (sub === 'pipe') { for (const st of BASE.pipeline(b)) c.log((st.ok ? '  READY   ' : '  BLOCKED ') + st.n.padEnd(12) + st.why); return; }
      if (sub === 'cells') {
        const cl = BASE.cellsFor(9999, b);
        if (!cl.length) return c.log('no containment built');
        for (const x of cl) c.log('  ' + x.fac.n.padEnd(18) + 'holds to rank ' + String(x.fac.holds).padStart(4) + '   ' + x.held + '/' + x.fac.cap + ' occupied');
        for (const pr of (b.prisoners || [])) c.log('  HELD: ' + pr.name + ' (rank ' + pr.rank + ')');
        return;
      }
      if (sub === 'study') {
        const m = (a[1] || '').toLowerCase();
        const opts = BASE.studyOptions(m, 6);
        if (!opts.length) return c.err('no faculty anywhere teaches "' + m + '"');
        for (const u of opts) c.log('  #' + String(u.rank).padStart(3) + '  ' + u.name.padEnd(38) + u.country.padEnd(16) + u.weeks + 'w' + (u.shadow ? '  UNCERTIFIED' : ''));
        return;
      }
      // the grid, drawn
      const P = BASE.permitted(b);
      c.log(BASE.baseLine(b));
      for (let f = 0; f < P.floors; f++) {
        c.log(f === 0 ? 'GROUND FLOOR' : 'UPPER FLOOR');
        for (let r = 0; r < BASE.GRID; r++) {
          let ln = '  ';
          for (let col = 0; col < BASE.GRID; col++) {
            const i = BASE.idx(col, r, f), rm = b.rooms[i];
            ln += rm ? (rm.built ? '[' + (BASE.facilityById(rm.fid)?.n || '?').slice(0, 3) + ']' : '{' + rm.weeksLeft + 'w}')
                     : (BASE.inPermit(i, b) ? '  ·  ' : '     ');
          }
          c.log(ln);
        }
      }
    });

    // THE ARMORY — every weapon and every piece of gear, reachable. Without this the catalogue is
    // 13 firearms nobody can hold: the police carry their own tuned kit deliberately, and the
    // creator's catalogue is a separate curation pass.
    this.cmd('arm', 'arm [weapon|gear|loadout] — equip from the armory; bare `arm` lists it', (a, c) => {
      const g = G(), p = P();
      if (!p) return c.err('no player');
      if (!a[0]) {
        c.log('FIREARMS  ' + FIREARMS.map(w => w.id).join(' '));
        c.log('BLADES    ' + BLADES.map(w => w.id).join(' '));
        c.log('GEAR      ' + GEAR.map(w => w.id).join(' '));
        c.log('LOADOUTS  ' + Object.keys(LOADOUTS).join(' '));
        return;
      }
      const key = a[0].toLowerCase();
      if (LOADOUTS[key]) {
        const L = buildLoadout(key);
        Object.assign(p.def.abilities, L.abilities);
        p.items = L.items.map(it => ({ def: { ...it, cd: 6 }, charges: it.charges, state: 'ready' }));
        if (g.hud) g.hud.buildKit && g.hud.buildKit(p);
        return c.log('LOADOUT · ' + L.name + ' — ' + Object.keys(L.abilities).join('/') + ' + ' + L.items.length + ' items');
      }
      const w = firearmById(key) || bladeById(key);
      if (w) {
        const slot = a[1] || 'lmb';
        p.def.abilities[slot] = { ...w.ab, voice: w.voice };
        if (g.hud) g.hud.buildKit && g.hud.buildKit(p);
        return c.log(w.n + ' → ' + slot.toUpperCase() + (w.voice ? '  (voice: ' + w.voice + ')' : ''));
      }
      const gr = gearById(key);
      if (gr) {
        p.items = [{ def: { kind: gr.kind, name: gr.n, mode: gr.mode, payload: gr.payload,
                            r: gr.r, dur: gr.dur, charges: gr.charges || 1, cd: 6 },
                     charges: gr.charges || 1, state: 'ready' }];
        return c.log(gr.n + ' → item slot (X)   ' + (gr.d || ''));
      }
      c.err('unknown: ' + key + '   (bare `arm` lists everything)');
    });

    this.cmd('mood', 'mood [emotion] — the live wheel, or push one', (a, c) => {
      const g = G(), p = P();
      if (!p) return c.err('no player');
      const P2 = psycheOf(p);
      if (!P2) return c.err('this fighter has no psyche');
      if (a[0]) {
        const e = a[0].toLowerCase();
        if (!EMOTIONS.includes(e)) return c.err('emotions: ' + EMOTIONS.join(' '));
        P2.v[e] = Math.min(10, P2.v[e] + (parseFloat(a[1]) || 4));
        P2._last = { e, t: g.time || 0 };
        P2._settle(g.time || 0);
      }
      c.print((p.def.name || p.def.id) + '   feels   ' + P2.shade.toUpperCase() + '   (' + P2.label + ' ' + P2.value.toFixed(1) + '/10)');
      for (const e of EMOTIONS) {
        const v = P2.v[e], bar = '\u2588'.repeat(Math.round(v)) + '\u00b7'.repeat(10 - Math.round(v));
        c.print('  ' + e.padEnd(10) + bar + ' ' + v.toFixed(1), e === P2.main ? WHEEL[e].color : '#8b8577');
      }
      if (P2.mood) c.print('  MOOD   ' + P2.mood.text + '   ' + JSON.stringify(P2.mood.fx));
      if (P2.instant) c.print('  LAST   ' + P2.instant.text + '   ' + JSON.stringify(P2.instant.fx));
      const per = P2.p;
      c.print('  WHO    #' + per.n + ' ' + per.name + ' \u2014 targets ' + TARGET_RULES[per.target].label);
    });

    this.cmd('surfaces', 'run the z-fighting audit on the live scene', (a, c) => {
      const r = G().world.auditSurfaces();
      c.print(r.problems ? r.problems + ' problem(s) of ' + r.surfaces + ' surfaces' : 'clean — ' + r.surfaces + ' surfaces, 0 problems');
      for (const w of r.worst) c.print('  gap ' + w.gap + '  y ' + w.y + '  area ' + w.area + '  ' + w.a + ' / ' + w.b);
    });
  }
}
