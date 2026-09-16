import { ROSTER } from '../data/characters.js';
import { beamBuildOf, beamTemperOf, beamModeOf, BEAM_MODES } from '../data/visual.js';

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
    const p = game.player;
    // start on the caster's OWN first beam when they carry one (so ?hero=vega opens on Violet Lance),
    // else the first beam in the roster.
    const ownIdx = p && p.def ? this.list.findIndex(x => x.heroId === p.def.id) : -1;
    this.i = ownIdx >= 0 ? ownIdx : 0;
    this.modeIdx = -1;                       // -1 = the beam's own mode; 0..n = force BEAM_MODES[idx]
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
      this.beam = beam;
    }
    this._updateChip();
  }

  step(d) { this.i = (this.i + d + this.list.length) % this.list.length; this.spawn(); }
  cycleMode() { this.modeIdx = this.modeIdx + 1 >= BEAM_MODES.length ? -1 : this.modeIdx + 1; this.spawn(); }

  update() {
    const c = this.caster; if (!c) return;
    c.ki = c.maxKi; c.drainedT = 0; c.noPowers = true; c.energyInfinite = true;
    if (this.g.input) this.g.input.pointerLock = false;               // free cursor — a viewer isn't mouse-look
    if (this._home) { c.pos.copy(this._home); if (c.vel) c.vel.set(0, 0, 0); }   // caster stands still
    this._aim();                                                       // beam + view stay locked on the target, never drift
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
    const text = document.createElement('div'); text.style.cssText = 'text-align:center;min-width:280px;';
    el.append(prev, text, next, modeBtn);
    document.body.appendChild(el);
    this.chip = el; this._chipText = text;
  }
  _updateChip() {
    if (!this._chipText) return;
    const { item, def } = this._current();
    const build = beamBuildOf(def), temper = beamTemperOf(def), mode = beamModeOf(def);
    const forced = this.modeIdx >= 0 ? ' · LOCKED' : '';
    this._chipText.innerHTML = `<b style="color:#f5b21a">◈ BEAM GALLERY</b> &nbsp; ${this.i + 1}/${this.list.length}<br>`
      + `<b style="font-size:13px">${item.heroName}</b> — ${item.name}<br>`
      + `<span style="color:#9fd4ff">${build.toUpperCase()} · ${temper} · ${mode}${forced}</span>`;
  }

  dispose() {
    try { window.removeEventListener('keydown', this._onKey, true); } catch {}
    if (this.chip && this.chip.parentNode) this.chip.parentNode.removeChild(this.chip);
    this._drop();
    if (this.g) this.g.mapCam = null;
    if (this.g && this.g.input) this.g.input.pointerLock = this._wasLock;
    if (this.caster) { this.caster.noPowers = false; this.caster.energyInfinite = this._wasInfinite; }
    this.chip = null;
  }
}
