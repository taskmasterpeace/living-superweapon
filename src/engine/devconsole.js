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
    this.cmd('surfaces', 'run the z-fighting audit on the live scene', (a, c) => {
      const r = G().world.auditSurfaces();
      c.print(r.problems ? r.problems + ' problem(s) of ' + r.surfaces + ' surfaces' : 'clean — ' + r.surfaces + ' surfaces, 0 problems');
      for (const w of r.worst) c.print('  gap ' + w.gap + '  y ' + w.y + '  area ' + w.area + '  ' + w.a + ' / ' + w.b);
    });
  }
}
