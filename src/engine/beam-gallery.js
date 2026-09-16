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
    this.i = 0;
    this.modeIdx = -1;                       // -1 = the beam's own mode; 0..n = force BEAM_MODES[idx]
    this.beam = null;
    const p = game.player;
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
    this._buildChip();
    this._onKey = (e) => {
      if (e.key === '.') { this.step(1); e.preventDefault(); }
      else if (e.key === ',') { this.step(-1); e.preventDefault(); }
      else if (e.key === '/') { this.cycleMode(); e.preventDefault(); }
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
    if (c.aim3 && c.aim3.set) c.aim3.set(dx / l, dy / l, dz / l);
    if (c.aim && c.aim.set) c.aim.set(dx / l, 0, dz / l);
    c.facing = Math.atan2(dx, dz);
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
      beam._poseLaunch = false; beam._launchReady = true; beam.sustaining = true;
      // ⚠ OWN THE BEAM. Pulled OUT of projectiles.list so the manager's per-frame pre-passes
      // (clipForContacts / _beamClash / dt=0 launch-resolve) can't starve its emission — that was
      // the frozen-shaft bug. It still renders (its group is in the scene) and the gallery ticks it
      // directly each frame. No damage/contacts needed: the target is invulnerable, it's a stand.
      const j = g.projectiles.list.indexOf(beam); if (j >= 0) g.projectiles.list.splice(j, 1);
      this.beam = beam;
    }
    this._updateChip();
  }

  step(d) { this.i = (this.i + d + this.list.length) % this.list.length; this.spawn(); }
  cycleMode() { this.modeIdx = this.modeIdx + 1 >= BEAM_MODES.length ? -1 : this.modeIdx + 1; this.spawn(); }

  update(dt = 1 / 60) {
    const c = this.caster; if (!c) return;
    c.ki = c.maxKi; c.drainedT = 0; c.noPowers = true; c.energyInfinite = true;
    this._aim();
    if (!this.beam || this.beam.dead) { this.spawn(); return; }
    this.beam.sustaining = true;
    try { this.beam.update(dt, this.g); } catch { this._drop(); }   // gallery owns the tick
  }

  _buildChip() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('beamGalleryChip');
    if (!el) {
      el = document.createElement('div'); el.id = 'beamGalleryChip';
      el.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:40;'
        + 'font-family:Cascadia Code,Consolas,monospace;font-size:12px;letter-spacing:.04em;color:#f5e6c8;'
        + 'background:rgba(12,10,16,.82);border:1px solid #6b5824;border-radius:8px;padding:7px 12px;'
        + 'text-align:center;pointer-events:none;text-shadow:0 1px 2px #000;white-space:nowrap;';
      document.body.appendChild(el);
    }
    this.chip = el;
  }
  _updateChip() {
    if (!this.chip) return;
    const { item, def } = this._current();
    const build = beamBuildOf(def), temper = beamTemperOf(def), mode = beamModeOf(def);
    const forced = this.modeIdx >= 0 ? ' · MODE LOCKED' : '';
    this.chip.innerHTML = `<b style="color:#f5b21a">◈ BEAM GALLERY</b> &nbsp; ${this.i + 1}/${this.list.length} &nbsp;·&nbsp; `
      + `<b>${item.heroName}</b> — ${item.name} &nbsp;·&nbsp; `
      + `<span style="color:#9fd4ff">${build.toUpperCase()} · ${temper} · ${mode}${forced}</span>`
      + `<br><span style="opacity:.6;font-size:10px">, . cycle beam &nbsp; / cycle mode</span>`;
  }

  dispose() {
    try { window.removeEventListener('keydown', this._onKey, true); } catch {}
    if (this.chip && this.chip.parentNode) this.chip.parentNode.removeChild(this.chip);
    this._drop();
    if (this.caster) { this.caster.noPowers = false; this.caster.energyInfinite = this._wasInfinite; }
    this.chip = null;
  }
}
