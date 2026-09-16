import { ROSTER } from '../data/characters.js';
import { beamBuildOf, beamTemperOf, beamModeOf, BEAM_MODES, visOf } from '../data/visual.js';
import { LIBRARY_BEAMS } from '../data/beams.js';
import { TYPES } from './abilities.js';

// THE BEAM GALLERY — Robert: "flip through every beam×mode in third person, no fight. Best way for me
// to explore them later." A proving stand, not a battle: one caster, one invulnerable target down-range,
// and every beam the roster carries on a wheel. `.`/`,` cycle the beam, `/` cycles the MODE override so
// you can see all twelve behaviours on ONE beam. It reuses spawnBeamFor (so colour/build/temper/mode/
// family are exactly the shipping derivation) but forces `poseLaunch:false` — the beam emits from the
// hand without waiting on the launch animation, which is what makes a stand possible at all.
export class BeamGallery {
  constructor(game) {
    this.g = game;
    this.list = [];
    for (const d of ROSTER) {
      if (!d.abilities) continue;
      for (const k of ['lmb', 'rmb', 'q', 'e', 'f', 'r']) {
        const a = d.abilities[k];
        if (a && a.type === 'beam') this.list.push({ heroId: d.id, heroName: d.name, slot: k, ab: a, name: a.name });
      }
    }
    // THE LIBRARY ROWS (data/beams.js) — beams that belong to NOBODY, on the same wheel as the
    // roster's. That is the unassociation made visible: the stand's caster fires them fine.
    for (const b of LIBRARY_BEAMS) this.list.push({ heroId: null, heroName: 'LIBRARY', slot: '—', ab: b, name: b.name });
    // THE SHOTS WHEEL — Robert: "I need to be able to see these missiles, bro... show the rockets."
    // Every projectile-type ability the roster carries, fired on a cadence at the stand's target.
    this.shots = [];
    for (const d of ROSTER) {
      if (!d.abilities) continue;
      for (const k of ['lmb', 'rmb', 'q', 'e', 'f', 'r']) {
        const a = d.abilities[k];
        if (a && a.type === 'projectile') this.shots.push({ heroId: d.id, heroName: d.name, slot: k, ab: a, name: a.name });
      }
    }
    // THE SPRAY WHEEL — "the wide short spray... we need to be able to control that... certain
    // things should go so far and so wide" (the sliders). Driven through the REAL cone ability
    // body (TYPES.cone) with a stand-owned state — zero mirror drift; the sliders override the
    // exact `range`/`arc` fields the engine's hit test and spray read.
    this.cones = [];
    for (const d of ROSTER) {
      if (!d.abilities) continue;
      for (const k of ['lmb', 'rmb', 'q', 'e', 'f', 'r']) {
        const a = d.abilities[k];
        if (a && a.type === 'cone') this.cones.push({ heroId: d.id, heroName: d.name, slot: k, ab: a, name: a.name });
      }
    }
    this.kind = 'beam';                      // 'beam' | 'shot' | 'cone' — which wheel the stand is on
    this.shotI = 0; this._shotT = 0;
    this.coneI = 0; this._coneSt = {};
    this.coneRange = null; this.coneArc = null;   // null = the ability's own authored numbers
    const p = game.player;
    // start on the caster's OWN first beam when they carry one (so ?hero=vega opens on Violet Lance),
    // else the first beam in the roster.
    const ownIdx = p && p.def ? this.list.findIndex(x => x.heroId === p.def.id) : -1;
    this.i = ownIdx >= 0 ? ownIdx : 0;
    this.modeIdx = -1;                       // -1 = the beam's own mode; 0..n = force BEAM_MODES[idx]
    this.speed = 1;                          // the LOOK-speed dial (beam.animSpeed) — mode + edge clocks only
    this.beam = null;
    this.caster = p;
    // ⚠ energyInfinite is the ONE thing that guarantees emission: the beam pays ki inside
    // projectiles.update, which runs BEFORE this mode-tick tops the pool, so a finite bar starves
    // the emission block and the shaft never advances (measured: pn frozen at 2). Infinite ki makes
    // spendKi always pass regardless of tick order. Restored in dispose.
    this._wasInfinite = p ? p.energyInfinite : false;
    if (p) { p.pos.set(-40, 0, -40); p.noPowers = true; p.energyInfinite = true; p.facing = Math.atan2(1, 0.12); }
    // one passive target, straight down-range along +x, that the beam can play across
    this.target = game.spawnDummy ? game.spawnDummy(p.pos.x + 46, p.pos.z + 6) : null;
    if (this.target) { this.target.hp = this.target.maxHp = 1e9; this.target.invuln = 1e9; this.target._patrol = null; }
    this._home = p ? p.pos.clone() : null;      // the caster stands still; frameCamera composes the view
    // FREE THE CURSOR. A viewer is not mouse-look — clicking a button must not swing the view.
    this._wasLock = game.input ? game.input.pointerLock : false;
    if (game.input) game.input.pointerLock = false;
    try { if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock(); } catch {}
    this._buildChip();
    this._onKey = (e) => {
      if (e.key === '.' || e.key === 'ArrowRight') { this.step(1); e.preventDefault(); }
      else if (e.key === ',' || e.key === 'ArrowLeft') { this.step(-1); e.preventDefault(); }
      else if (e.key === '/' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { this.cycleMode(); e.preventDefault(); }
      else if (e.key === '-' || e.key === '_') { this.setSpeed(-1); e.preventDefault(); }
      else if (e.key === '=' || e.key === '+') { this.setSpeed(1); e.preventDefault(); }
    };
    window.addEventListener('keydown', this._onKey, true);
    this.spawn();
  }

  _current() {
    const item = this.list[this.i];
    const def = { ...item.ab };
    if (this.modeIdx >= 0) def.mode = BEAM_MODES[this.modeIdx];   // force one mode across the whole list
    return { item, def };
  }

  _aim() {
    const c = this.caster, t = this.target; if (!c || !t) return;
    const dx = t.pos.x - c.pos.x, dy = (t.pos.y + 5) - (c.pos.y + 6), dz = t.pos.z - c.pos.z;
    const l = Math.hypot(dx, dy, dz) || 1;
    if (c.aim3 && c.aim3.set) c.aim3.set(dx / l, dy / l, dz / l);   // the BEAM fires at the target
    if (c.aim && c.aim.set) c.aim.set(dx / l, 0, dz / l);
    c.facing = Math.atan2(dx, dz);
  }

  // THE GALLERY OWNS THE CAMERA — game.cameraDrive yields to this (same pattern as the handheld
  // device view). A proving stand is not mouse-look: the cursor stays free for the ◀ ▶ MODE
  // buttons, and the view is COMPOSED — steered ~30° off the beam axis so the shaft crosses the
  // frame side-on. Straight down the axis it foreshortens to a dot ("just looking at a pointer").
  frameCamera(dt) {
    const g = this.g, c = this.caster, t = this.target, w = g && g.world;
    if (!w || !c) return false;
    if (g.input) g.input.pointerLock = false;                    // clicking a button must not swing the view
    const yaw = t ? Math.atan2(t.pos.x - c.pos.x, t.pos.z - c.pos.z) : c.facing;
    w._lookActive = true; w._lookYaw = yaw - 0.52; w._lookPitch = 0.06;
    w.chase(c, null, dt, 'bfp');                                 // the real BFP boom + collision, gallery-steered
    return true;
  }

  _drop() {
    const g = this.g;
    if (!this.beam) return;
    const j = g.projectiles.list.indexOf(this.beam); if (j >= 0) g.projectiles.list.splice(j, 1);
    try { this.beam._dispose(g); } catch {}
    this.beam = null;
  }

  spawn() {
    const g = this.g, c = this.caster; if (!c) return;
    this._drop();
    c.ki = c.maxKi = Math.max(c.maxKi || 0, 9999); c.drainedT = 0;
    this._aim();
    const { def } = this._current();
    const beam = g.spawnBeamFor(c, def, def.charge ? (def.chargePower || 1.6) : 1);   // charge beams show at full width
    if (beam) {
      // ⚠ LEAVE IT IN projectiles.list so the manager runs every beam's real pre-passes (clash,
      // axial support, launch-resolve) — some beams (VEGA's spiral/siphon) throw without them.
      // poseLaunch:false lets it emit without the launch animation, and the caster's energyInfinite
      // (set in update) means spendKi always passes regardless of tick order — no starved shaft.
      beam._poseLaunch = false; beam._launchReady = true; beam.sustaining = true;
      const j = g.projectiles.list.indexOf(beam); if (j >= 0) g.projectiles.list.splice(j, 1);   // gallery owns the tick
      beam.animSpeed = this.speed;
      this.beam = beam;
    }
    this._updateChip();
  }

  step(d) {
    if (this.kind === 'shot') { this.shotI = (this.shotI + d + this.shots.length) % this.shots.length; this._shotT = 0; this._updateChip(); return; }
    if (this.kind === 'cone') { this._stopCone(); this.coneI = (this.coneI + d + this.cones.length) % this.cones.length; this._syncSliders(); this._updateChip(); return; }
    this.i = (this.i + d + this.list.length) % this.list.length; this.spawn();
  }
  cycleMode() { if (this.kind !== 'beam') return; this.modeIdx = this.modeIdx + 1 >= BEAM_MODES.length ? -1 : this.modeIdx + 1; this.spawn(); }
  toggleKind() {
    if (this.kind === 'cone') this._stopCone();
    this.kind = this.kind === 'beam' ? 'shot' : this.kind === 'shot' ? 'cone' : 'beam';
    if (this.kind === 'beam') this.spawn();
    else { this._drop(); this._shotT = 0; this._updateChip(); }
    if (this._sliderRow) this._sliderRow.style.display = this.kind === 'cone' ? 'flex' : 'none';
    if (this.kind === 'cone') this._syncSliders();
  }
  // the held spray fades out through the body's own release branch — never a hard cut
  _stopCone() {
    try { TYPES.cone(this.caster, this.cones[this.coneI]?.ab || {}, this._coneSt, this.g, { held: false, dt: 1 / 60 }); } catch {}
    if (this._coneSt._loop) { try { this._coneSt._loop.stop(); } catch {} this._coneSt._loop = null; }
    this._coneSt = {};
  }

  // FIRE ONE SHOT through the real spawnProjectile door. ⚠ The field mapping mirrors the
  // `projectile` ability body (abilities.js) — the stand's caster is noPowers, so it cannot go
  // through runSlot; if a new projectile flag lands there, add it here too (a missing field shows
  // up as a stand-only visual gap, never a combat one).
  _fireShot(def) {
    const g = this.g, c = this.caster; if (!c) return;
    const vel = def.grav ? c.aim.clone().setY(.5) : c.aim3.clone();
    g.projectiles.spawnProjectile(c, { vis: visOf(def),
      pos: c.muzzle ? c.muzzle(new (c.pos.constructor)(), 3.6, 5.8) : c.pos.clone(),
      vel: vel.setLength(def.speed || 70),
      radius: def.radius || 1.4, damage: def.damage || 14, blast: def.blast || 5, power: def.power || 1,
      homing: def.homing || 0, color: def.color, color2: def.color2, grav: def.grav || 0, shock: def.shock,
      arrow: def.arrow, payload: def.payload, blind: def.blind, boomerang: def.boomerang, range: def.range,
      card: def.card, disc: def.disc, bounces: def.bounces, pumpkin: def.pumpkin,
      blade: def.blade, canister: def.canister, missile: def.missile, pierce: def.pierce,
      dtype: def.dtype,
    });
    if (g.muzzleFlash) g.muzzleFlash(c, def.color, 1);
  }
  setSpeed(d) {
    this.speed = Math.min(6, Math.max(0.25, Math.round((this.speed + d * 0.25) * 100) / 100));
    if (this.beam) this.beam.animSpeed = this.speed;
    this._updateChip();
  }

  // "how something looks when it's on fire — we're gonna be able to set stuff on fire and we
  // need to know how it looks." The stand's target burns through the REAL front door (ignite →
  // burn DoT → the pool's flame shapes), so the grade is the shipping look, not a mock.
  igniteTarget() {
    const g = this.g, t = this.target; if (!g || !t) return;
    if (g.ignite) g.ignite(t, { dps: 4, dur: 6, src: this.caster });
  }

  update() {
    const c = this.caster; if (!c) return;
    c.ki = c.maxKi; c.drainedT = 0; c.noPowers = true; c.energyInfinite = true;
    if (this.g.input) this.g.input.pointerLock = false;               // free cursor — a viewer isn't mouse-look
    if (this._home) { c.pos.copy(this._home); if (c.vel) c.vel.set(0, 0, 0); }   // caster stands still
    this._aim();                                                       // beam + view stay locked on the target, never drift
    if (this.kind === 'shot') {                                        // the SHOTS wheel: refire on a cadence; the manager ticks them
      this._shotT -= 1 / 60;
      if (this._shotT <= 0 && this.shots.length) { this._fireShot(this.shots[this.shotI].ab); this._shotT = 0.6; }   // ~0.55s flight to the stand target — keep one in the air
      return;
    }
    if (this.kind === 'cone') {                                        // the SPRAY wheel: hold the REAL cone body every frame
      const it = this.cones[this.coneI];
      if (it) {
        const def = { ...it.ab };
        if (this.coneRange != null) def.range = this.coneRange;        // the sliders override the exact fields
        if (this.coneArc != null) def.arc = this.coneArc;              // the engine's hit test + spray read
        try { TYPES.cone(c, def, this._coneSt, this.g, { held: true, dt: 1 / 60, pressed: false, released: false }); }
        catch (e) { this._lastErr = e.message; }
      }
      return;
    }
    if (!this.beam || this.beam.dead) { this.spawn(); return; }
    const b = this.beam, pr = this.g.projectiles;
    b.sustaining = true;
    // run only the per-beam prep the beam's own update expects (VEGA's spiral/siphon throws without
    // axial support), THEN tick it directly. ⚠ NOT clipForContacts — that truncates the shaft at the
    // target and was collapsing the beam to a stub ("the shaft is gone"). The gallery owns the tick.
    try {
      pr._directionBatch = (pr._directionBatch || 0) + 1;
      if (b._findAxialSupport) b._stepChest = b._findAxialSupport();
      b._directionBatch = pr._directionBatch;
      if (b._stepDirection && b.dir) b._stepDirection.copy(b.dir);
      b.update(1 / 60, this.g);
    } catch (e) { this._lastErr = e.message; this._drop(); }
  }

  _buildChip() {
    if (typeof document === 'undefined') return;
    document.getElementById('beamGalleryChip')?.remove();
    const el = document.createElement('div'); el.id = 'beamGalleryChip';
    el.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:40;'
      + 'font-family:Cascadia Code,Consolas,monospace;font-size:12px;letter-spacing:.04em;color:#f5e6c8;'
      + 'background:rgba(12,10,16,.9);border:1px solid #6b5824;border-radius:10px;padding:6px 8px;'
      + 'display:flex;align-items:center;gap:8px;pointer-events:auto;text-shadow:0 1px 2px #000;white-space:nowrap;user-select:none;';
    const mkBtn = (label, title, fn) => {
      const b = document.createElement('button'); b.textContent = label; b.title = title;
      b.style.cssText = 'font:700 15px Cascadia Code,monospace;color:#20180a;background:#f5b21a;border:0;'
        + 'border-radius:7px;padding:5px 11px;cursor:pointer;line-height:1;';
      b.onmouseenter = () => b.style.background = '#ffca4a'; b.onmouseleave = () => b.style.background = '#f5b21a';
      b.onclick = (e) => { e.stopPropagation(); fn(); };
      return b;
    };
    const prev = mkBtn('◀', 'Previous beam ( , )', () => this.step(-1));
    const next = mkBtn('▶', 'Next beam ( . )', () => this.step(1));
    const modeBtn = mkBtn('MODE ▸', 'Cycle behaviour mode ( / )', () => this.cycleMode());
    const slower = mkBtn('−', 'Slower look ( - )', () => this.setSpeed(-1));
    const faster = mkBtn('+', 'Faster look ( = )', () => this.setSpeed(1));
    const fireBtn = mkBtn('🔥', 'Set the target on fire (the real ignite path)', () => this.igniteTarget());
    const chartBtn = mkBtn('CHART', 'Open the beam chart — the whole language, every beam', () => window.open('./beam-chart.html', '_blank'));
    const kindBtn = mkBtn('⇄ SHOTS', 'Cycle the stand: BEAMS → SHOTS → SPRAYS', () => {
      this.toggleKind();
      kindBtn.textContent = this.kind === 'beam' ? '⇄ SHOTS' : this.kind === 'shot' ? '⇄ SPRAYS' : '⇄ BEAMS';
    });
    const text = document.createElement('div'); text.style.cssText = 'text-align:center;min-width:280px;';
    el.append(prev, text, next, modeBtn, slower, faster, fireBtn, chartBtn, kindBtn);
    // THE SLIDERS ("some sliders where... certain things should be able to go so far and so
    // wide") — they write the exact `range`/`arc` fields the cone hit test + spray read. Shown
    // only on the SPRAY wheel. Vertical aperture is NOT a field the engine has yet — no fake dial.
    const srow = document.createElement('div');
    srow.style.cssText = 'display:none;flex-basis:100%;justify-content:center;align-items:center;gap:10px;padding-top:5px;';
    const mkS = (lab, min, max, step, fmt, on) => {
      const w = document.createElement('label'); w.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:11px;color:#9fd4ff;';
      const t = document.createElement('span'); t.textContent = lab;
      const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.style.width = '120px';
      const v = document.createElement('b'); v.style.cssText = 'color:#f5e6c8;min-width:44px;';
      r.oninput = () => { on(+r.value); v.textContent = fmt(+r.value); this._updateChip(); };
      w.append(t, r, v); srow.appendChild(w); return { r, v };
    };
    this._sRange = mkS('REACH', 10, 120, 2, v => v + 'u', v => this.coneRange = v);
    this._sArc = mkS('WIDTH', 0.15, 1.5, 0.05, v => Math.round(v * 114.6) + '°', v => this.coneArc = v);
    srow.appendChild(mkBtn('↺', 'Back to the authored numbers', () => { this.coneRange = null; this.coneArc = null; this._syncSliders(); this._updateChip(); }));
    el.style.flexWrap = 'wrap'; el.appendChild(srow); this._sliderRow = srow;
    document.body.appendChild(el);
    this.chip = el; this._chipText = text;
  }
  _syncSliders() {
    if (!this._sRange) return;
    const a = this.cones[this.coneI]?.ab || {};
    const r = this.coneRange ?? a.range ?? 34, w = this.coneArc ?? a.arc ?? 1.05;
    this._sRange.r.value = r; this._sRange.v.textContent = r + 'u';
    this._sArc.r.value = w; this._sArc.v.textContent = Math.round(w * 114.6) + '°';
  }

  _updateChip() {
    if (!this._chipText) return;
    if (this.kind === 'cone') {
      const it = this.cones[this.coneI]; if (!it) return;
      const a = it.ab, r = this.coneRange ?? a.range ?? 34, w = this.coneArc ?? a.arc ?? 1.05;
      const tags = [a.cold && 'COLD', a.gasDot && 'GAS', a.kiDrain && 'DRAIN', a.spikes && 'GROUND SPIKES',
        a.magnet && 'MAGNET', a.sonic && 'SONIC', a.lift && 'LIFT'].filter(Boolean).join(' · ') || 'SPRAY';
      this._chipText.innerHTML = `<b style="color:#f5b21a">≋ SPRAY STAND</b> &nbsp; ${this.coneI + 1}/${this.cones.length}<br>`
        + `<b style="font-size:13px">${it.heroName}</b> — ${it.name}<br>`
        + `<span style="color:#9fd4ff">${tags} · REACH ${r}u · WIDTH ${Math.round(w * 114.6)}°${(this.coneRange != null || this.coneArc != null) ? ' · EDITED' : ''}</span>`;
      return;
    }
    if (this.kind === 'shot') {
      const it = this.shots[this.shotI]; if (!it) return;
      const a = it.ab;
      const flags = [a.missile && 'MISSILE', a.pierce && 'AP', a.homing && 'HOMING ' + a.homing, a.canister && 'CANISTER',
        a.blade && 'BLADE', a.card && 'CARD', a.disc && 'DISC', a.grav && 'ARC', a.bounces && 'RICOCHET',
        a.boomerang && 'BOOMERANG', a.payload && ('PAYLOAD ' + a.payload).toUpperCase()].filter(Boolean).join(' · ') || 'PLAIN BOLT';
      this._chipText.innerHTML = `<b style="color:#f5b21a">➶ SHOT STAND</b> &nbsp; ${this.shotI + 1}/${this.shots.length}<br>`
        + `<b style="font-size:13px">${it.heroName}</b> — ${it.name}<br><span style="color:#9fd4ff">${flags}</span>`;
      return;
    }
    const { item, def } = this._current();
    const build = beamBuildOf(def), temper = beamTemperOf(def), mode = beamModeOf(def);
    const forced = this.modeIdx >= 0 ? ' · LOCKED' : '';
    this._chipText.innerHTML = `<b style="color:#f5b21a">◈ BEAM GALLERY</b> &nbsp; ${this.i + 1}/${this.list.length}<br>`
      + `<b style="font-size:13px">${item.heroName}</b> — ${item.name}<br>`
      + `<span style="color:#9fd4ff">${build.toUpperCase()} · ${temper} · ${mode}${forced} · SPD ×${this.speed}</span>`;
  }

  dispose() {
    try { window.removeEventListener('keydown', this._onKey, true); } catch {}
    if (this.chip && this.chip.parentNode) this.chip.parentNode.removeChild(this.chip);
    this._stopCone();
    this._drop();
    if (this.g) this.g.mapCam = null;
    if (this.g && this.g.input) this.g.input.pointerLock = this._wasLock;
    if (this.caster) { this.caster.noPowers = false; this.caster.energyInfinite = this._wasInfinite; }
    this.chip = null;
  }
}
