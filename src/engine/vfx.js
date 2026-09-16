import {terrainScorchMesh,disposeScorch,BEAM_GROUND_LIMITS} from './beam-ground-contact.js';
// WAR WORLD: ASCENDANTS — transient 3D effects: explosions, shockwaves, lightning, rings, flashes, scorch.
import * as THREE from 'three';
import { rand, TAU, lerp, GROUND_LAYER, PW_FX } from '../core/util.js';
import { FlightWake } from './flight-wake.js';
import {FlightSurfaceWake} from './flight-surface-wake.js';
import {energyShellMaterial} from './energy-burst-material.js';

const addMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });


// ⚠ THE VFX FINITE LAW — the visual twin of audio's `fin()`.
//
// Every primitive below builds geometry (or a light) straight from `pos`. A single non-finite
// coordinate becomes an all-NaN BufferAttribute, and because these meshes are frustum-culled
// three.js computes a bounding sphere from it and reports
// `computeBoundingSphere(): Computed radius is NaN` — a diagnostic that survives long after
// the transient position that caused it is gone, which is exactly why it was so hard to trace.
//
// One gate, at the door, for every present and future caller. In dev it NAMES the caller so
// the upstream NaN gets fixed instead of merely absorbed.
const okPos = (p, where) => {
  if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)) return true;
  if (!okPos._warned) okPos._warned = new Set();
  const site = (new Error().stack || '').split(String.fromCharCode(10))[3] || '?';
  const key = where + site;
  if (!okPos._warned.has(key)) {
    okPos._warned.add(key);
    console.warn('[VFX] non-finite position rejected by ' + where + ' <-' + site.trim());
  }
  return false;
};

export class VFX {
  constructor(world, particles) {
    this.world = world; this.scene = world.scene; this.P = particles;
    this.fx = [];
    this.scorches = [];
    this._sphere = new THREE.SphereGeometry(1, 16, 12);
    this._ring = new THREE.RingGeometry(0.86, 1, 48);
    this._decalGeo = new THREE.CircleGeometry(1, 32);
    // ⚠ THE LIGHT-COUNT LAW (the beam-block freeze, 2026-07-24). three.js bakes the number of
    // VISIBLE lights into every material's program cache key, so toggling a PointLight's
    // `.visible` (or adding/removing one) recompiles EVERY material in the scene at the next
    // render. The old pool grew lazily and flipped `.visible` on borrow/return — so a held beam
    // on a raised guard spawned a flash+light EVERY frame, the visible-light count oscillated
    // 2↔8, and the renderer recompiled the whole city dozens of times a second (measured +152
    // programs in 4s → 400ms freeze). Fix: a FIXED pool, ALWAYS in the scene and ALWAYS visible,
    // pre-warmed once. borrow/return only drive INTENSITY (0 = idle). The count never changes,
    // so the recompile can never fire. On exhaustion we STEAL the dimmest light — never grow.
    this._lights = [];
    for (let i = 0; i < 14; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 100);
      l.visible = true; this.scene.add(l); this._lights.push(l);
    }
    this.lightPool = this._lights.slice();
  }

  _add(o) { this.fx.push(o); return o; }
  surfaceWake(fighter){
    if(!fighter._surfaceWake&&FlightSurfaceWake.canEmit(this.world,fighter))fighter._surfaceWake=this._add(new FlightSurfaceWake(this.world,fighter));
  }

  flightWake(fighter) {
    if(fighter._flightWake||!fighter.obj.visible||(fighter._vis??1)<.35||fighter.vel.lengthSq()<=900||(fighter.def.model?.wake?.intensity??1)<=0)return;
    if(!okPos(fighter.pos,'flightWake')||!okPos(fighter.vel,'flightWake velocity'))return;
    fighter._flightWake=this._add(new FlightWake(this.world,fighter));
  }

  borrowLight(color, intensity, dist) {
    let l = this.lightPool.pop();
    if (!l) { l = this._lights[0]; for (const x of this._lights) if (x.intensity < l.intensity) l = x; }  // all busy → steal the dimmest, never grow the count
    l.userData.vfxLease=(l.userData.vfxLease||0)+1;
    l.color.set(color); l.intensity = intensity; l.distance = dist;   // stays visible — the count is constant
    return l;
  }
  returnLight(l) { if (!l) return; l.intensity = 0; if (!this.lightPool.includes(l)) this.lightPool.push(l); }   // never touch .visible, never remove from the scene

  // aaa-06 §3.2: in the CLOSE (chase) camera a world-space effect size is clamped to a fraction of
  // the LIVE frame height, so a hit spark is smaller than the fighter it lands on. In the city
  // (camMode iso) this is a byte-identical no-op — the guard is off, so nothing is clamped, and a
  // clamp can only shrink, never inflate a far spark. `frac` is a PW_FX ladder rung. Passing
  // Infinity as worldSize asks only for the ceiling (frac × frame), still Infinity in the city.
  _cap(pos, worldSize, frac) {
    if (this.world.camMode !== 'chase') return worldSize;
    return Math.min(worldSize, frac * this.world.frameHeightAt(pos));
  }
  get _close() { return this.world.camMode === 'chase'; }

  flash(pos, color = '#fff', size = 6, life = 0.18) {
    if (!okPos(pos, 'flash')) return;
    // aaa-06 §3.4: in the close frame the flash MESH shrinks (highest-frequency light in the game)
    // but the borrowed LIGHT is untouched — illuminance is camera-independent (§6), so the light
    // distance stays keyed to the original size while only the visible sphere is clamped.
    const ms = this._cap(pos, size, PW_FX.flash);
    const m = new THREE.Mesh(this._sphere, addMat(color, 1));
    m.position.copy(pos); m.scale.setScalar(ms * 0.4); this.scene.add(m);
    const l = this.borrowLight(color, 6, size * 6);
    l.position.copy(pos);
    let t = 0;
    this._add({
      update: (dt) => {
        t += dt; const k = t / life;
        m.scale.setScalar(ms * (0.4 + k * 0.9));
        m.material.opacity = Math.max(0, 0.85 * (1 - k));
        l.intensity = Math.max(0, 6 * (1 - k));
        return k >= 1;
      },
      dispose: () => { this.scene.remove(m); m.material.dispose(); this.returnLight(l); },
    });
  }

  // Big energy explosion: flash + fireball + smoke + light + sparks (+ optional scorch)
  explode(pos, opt = {}) {
    if (!okPos(pos, 'explode')) return;
    if(opt.energyShell && opt.radius===0)return; // authored point burst: no fabricated visual radius
    const color = opt.color || '#ffd15a', color2 = opt.color2 || '#ff5a2a';
    // THE FX RECIPE (data/powerfx.js, Refs #42): opt.fx = { family, level, f, L } makes this ONE
    // explosion speak its element at its level — palette, smoke, debris, cloud, afterFx, all from
    // the table. With no fx every caller renders exactly what it always rendered.
    const fx = opt.fx || null, pal = fx && fx.f.palette, imp = fx && fx.f.impact, LV = fx && fx.L;
    const S = LV ? LV.scale : 1, CN = LV ? LV.count : 1;
    const radius = (opt.radius || 12) * S, power = (opt.power || 1) * (LV ? 0.7 + 0.3 * S : 1);
    this.flash(pos, imp ? imp.kernel : '#ffffff', radius * 0.3, 0.14);
    // fireball shell
    const shell = new THREE.Mesh(this._sphere, opt.energyShell?energyShellMaterial(color,.8):addMat(color, 0.8));
    shell.position.copy(pos); shell.scale.setScalar(radius * 0.3); this.scene.add(shell);
    const l = this.borrowLight(color, 10 * power, radius * 8); l.position.copy(pos);
    let t = 0; const life = 0.5 + power * 0.15;
    const c1 = new THREE.Color(color), c2 = new THREE.Color(color2);   // once per explosion, not per frame
    const shellMax = this._cap(pos, Infinity, PW_FX.blastShell);   // §3.4: cap the fireball peak at 0.64 of frame
    // fx path: the shell is a FLASH, not a balloon — kernel/ring/debris/cloud carry the structure
    const shellPeak = fx ? 0.55 : 0.9, shellGrow = fx ? 0.9 : 1.1;
    this._add({
      update: (dt) => {
        t += dt; const k = t / life;
        shell.scale.setScalar(Math.min(radius * (0.3 + k * shellGrow), shellMax));
        shell.material.opacity = Math.max(0, shellPeak * (1 - k));
        shell.material.color.lerpColors(c1, c2, k);
        l.intensity = Math.max(0, 10 * power * (1 - k * k));
        return k >= 1;
      },
      dispose: () => { this.scene.remove(shell); shell.material.dispose(); this.returnLight(l); },
    });
    // the detonation KERNEL — a fast white core that pops and dies before the fireball peaks, which
    // is what makes a blast read as a detonation instead of a balloon inflating. ⚠ §2.1: SUPPRESS it
    // entirely when the eye is inside `kernelNear × radius` — a solid white sphere the camera is
    // sitting inside is a full-frame white flash, not a detonation; else cap it to 0.292 of frame.
    if (!(this._close && this.world.camera.position.distanceTo(pos) < radius * PW_FX.kernelNear)) {
      const core = new THREE.Mesh(this._sphere, addMat(imp ? imp.kernel : '#ffffff', 0.95));
      core.position.copy(pos); core.scale.setScalar(radius * 0.12); this.scene.add(core);
      const coreMax = this._cap(pos, Infinity, PW_FX.blastCore);
      let ct = 0; const clife = 0.14;
      this._add({
        update: (dt) => { ct += dt; const k = ct / clife; core.scale.setScalar(Math.min(radius * (0.12 + k * 0.55), coreMax)); core.material.opacity = Math.max(0, 0.95 * (1 - k)); return k >= 1; },
        dispose: () => { this.scene.remove(core); core.material.dispose(); },
      });
    }
    // the pressure ring, tilted flat — the blast telling the world how wide it reached
    this.ring(pos, { color, r0: radius * 0.25, r1: this._cap(pos, radius * 1.7, PW_FX.pressureRing), life: 0.32, flat: true, opacity: 0.7 });
    // sparks + embers + smoke + tumbling DEBRIS with real gravity. ⚠ §7: in the close frame each
    // spark draws up to 9× its authored area (the perspective divide finally bites), so cap the count.
    const sparkN = (this._close ? Math.min(PW_FX.sparkCount, 26 + power * 14) : 26 + power * 14) * CN;
    this.P.burst(pos.x, pos.y, pos.z, { count: sparkN, speed: 20 + power * 10, life: 0.6, size: 2.6, color: pal ? [imp.kernel, pal.glow, pal.core] : ['#ffffff', color, color2], up: 4, grav: 10, drag: 1.3 });
    this.P.burst(pos.x, pos.y, pos.z, { count: (6 + power * 5) * CN, speed: 26 + power * 8, life: 1.0, size: 1.6, color: pal ? [...pal.debris, pal.deep] : ['#3a352c', '#57504a', color2], up: 14, grav: 60, drag: 0.6 });
    this.P.burst(pos.x, pos.y, pos.z, { count: 10 * CN, speed: 7, life: 1.1, size: 4.5, color: pal ? pal.smoke : ['#20222c', '#15161d'], up: 6, grav: -3, drag: 1.1 });

    // THE CLOUD (level-gated): the aftermath COLUMN — buoyant smoke that keeps rising after the
    // flash is gone, which is what separates "an effect went off" from "something blew up here".
    // Level I has none, II a plume, III a real column with straggler puffs on a short timer.
    if (LV && LV.cloud > 0) {
      const rise = imp.cloudRise, dur = imp.cloudDur;
      // REAL SMOKE — normal-blend billboard puffs (the additive system cannot render soot; goal
      // board iter 2 root cause). Column now, stragglers climbing behind it at level III.
      const puffs = Math.round((5 + power * 3) * LV.cloud);
      this.smokePuffs(pos, { count: puffs, colors: pal ? [...pal.smoke, '#191a1e'] : undefined, warm: imp && imp.afterFx === 'embers' ? pal.glow : null, rise, dur, size: 4.5 + power * 2, spread: radius * 0.3, opacity: 0.55 });
      let ct = 0, fired = 0; const stragglers = Math.max(0, Math.round(LV.cloud) - 1) * 2;
      if (stragglers > 0) this._add({
        update: (dt) => {
          ct += dt;
          if (ct > 0.3 * (fired + 1) && fired < stragglers) {
            fired++;
            this.smokePuffs({ x: pos.x + rand(-radius, radius) * 0.2, y: pos.y + 1 + fired * 2.5, z: pos.z + rand(-radius, radius) * 0.2 },
              { count: 2, colors: pal ? pal.smoke : undefined, rise: rise * 0.8, dur: dur * 0.85, size: 4 + power * 1.5, spread: 1.5, opacity: 0.45 });
          }
          return fired >= stragglers;
        },
        dispose: () => {},
      });
    }

    // THE AFTEREFFECT (family vocabulary, data/powerfx.js): what LINGERS says what it WAS —
    // embers gutter, frost hangs, arcs re-strike, water falls back, glyphs fade upward, steel rains.
    if (imp) {
      const AN = (LV ? LV.after : 1);
      switch (imp.afterFx) {
        case 'embers': {
          // FIRE TONGUES (iter 6): flame-silhouette particles punch outward from the blast heart —
          // the debris of a fire event IS fire (the aShape:'flame' silhouette the cones already use)
          this.P.burst(pos.x, pos.y + 1.5, pos.z, { count: Math.round(8 * AN), speed: 16, life: 0.55, size: 4.2, color: [pal.glow, pal.core], up: 9, grav: -1.5, drag: 1.6, shrink: true, shape: 'flame' });
          this.P.burst(pos.x, pos.y + 1, pos.z, { count: Math.round(14 * AN), speed: 5, life: 2.2, size: 1.4, color: [pal.glow, pal.mist], up: 6, grav: 2.5, drag: 1.8 });
          // "fire first and then some smoke afterwards" (Robert's /goal, verbatim): flames LICK the
          // ground where it landed, then a second, sootier wave takes over as they die.
          const gy = Math.max(0.6, pos.y * 0.15);
          this.P.burst(pos.x, gy, pos.z, { count: Math.round(8 * AN), speed: 3, life: 1.6, size: 2.6, color: [pal.glow, pal.core], up: 4, grav: -1.2, drag: 2.2, shrink: true });
          let ft = 0, fw = 0;
          this._add({
            update: (dt) => {
              ft += dt;
              if (ft > 0.55 * (fw + 1) && fw < 2) {
                fw++;
                // the soot waves are REAL smoke now — normal-blend puffs the additive system can't fake
                this.smokePuffs({ x: pos.x + rand(-2, 2), y: gy + 1, z: pos.z + rand(-2, 2) },
                  { count: Math.round(3 * AN), colors: fw === 1 ? [pal.smoke[0], '#241c14'] : [...pal.smoke, '#191a1e'], rise: 5, dur: 1.9, size: 3.4, spread: 1.4, opacity: 0.5 });
              }
              return fw >= 2;
            },
            dispose: () => {},
          });
          break;
        }
        case 'frostmist':
          this.P.burst(pos.x, pos.y, pos.z, { count: Math.round(12 * AN), speed: 2.5, life: 3.0, size: 6, color: [pal.mist, pal.smoke[0]], up: 1.2, grav: -0.4, drag: 2.2 });
          // ICE SPIKES (iter 7): real shard silhouettes burst out and fall — a fragment, not glitter
          this.P.burst(pos.x, pos.y + 0.5, pos.z, { count: Math.round(9 * AN), speed: 18, life: 0.85, size: 3.4, color: [pal.core, pal.glow], up: 10, grav: 55, drag: 0.6, shape: 'shard' });
          this.P.burst(pos.x, pos.y + 0.5, pos.z, { count: Math.round(8 * AN), speed: 14, life: 0.7, size: 1.1, color: [pal.core, '#ffffff'], up: 6, grav: 40, drag: 0.8 });
          break;
        case 'arcs': {
          // re-strikes must OUTLIVE the flash — the aftermath frame is where electricity says
          // "still live"; at 0.16s spacing they were dead before anyone looked (goal board iter 1)
          let at = 0, an = 0; const strikes = Math.max(2, Math.round(3 * AN));
          this._add({
            update: (dt) => { at += dt; if (at > 0.34 * (an + 1) && an < strikes) { an++; this.lightning(pos, { color: pal.glow, count: 2, radius: radius * 0.5, height: 8 }); } return an >= strikes; },
            dispose: () => {},
          });
          break;
        }
        case 'droplets':
          this.P.burst(pos.x, pos.y + 3, pos.z, { count: Math.round(18 * AN), speed: 14, life: 0.9, size: 1.6, color: [pal.glow, pal.core], up: 12, grav: 70, drag: 0.6 });
          break;
        case 'glyphs':
          this.P.burst(pos.x, pos.y + 1.5, pos.z, { count: Math.round(10 * AN), speed: 2, life: 1.8, size: 2.4, color: [pal.glow, pal.core], up: 4, grav: -1.5, drag: 2.4 });
          this.ring(pos, { color: pal.glow, r0: radius * 0.2, r1: radius * 1.1, life: 0.8, flat: true, opacity: 0.4 });
          break;
        case 'shrapnel':
          this.P.burst(pos.x, pos.y, pos.z, { count: Math.round(16 * AN), speed: 34, life: 0.7, size: 1.3, color: pal.debris, up: 10, grav: 90, drag: 0.4 });
          break;
        case 'sparks':
        default:
          this.P.burst(pos.x, pos.y + 1, pos.z, { count: Math.round(12 * AN), speed: 24, life: 0.9, size: 1.6, color: [imp.kernel, pal.glow], up: 8, grav: 30, drag: 1.0 });
      }
    }

    // the stain is a TINT, not a hole — pal.deep rendered as harsh black ellipses (goal board iter 1)
    if (opt.scorch !== false && pos.y < 4) this.scorch(pos, radius * 0.6, pal ? pal.glow : color2);
    this.world.shake((0.6 + power * 0.7) * (LV ? 0.7 + 0.3 * LV.kb : 1));
  }

  // ---- REAL SMOKE (goal board iter 3 #2) --------------------------------------------------------
  // The particle system is ADDITIVE, so dark soot mathematically cannot render on it — a pale
  // marshmallow was the ceiling. Smoke is its own small pool of NORMAL-blend billboards: soft
  // canvas blob, ramps in, rises, grows, dies. ≤48 sprites, borrowed and returned, budget honest.
  _smokeTexture() {
    if (this._smokeT) return this._smokeT;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 6, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.55, 'rgba(255,255,255,0.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    // a few dimmer blotches so a rotating puff reads as VAPOR, not a disc
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * TAU, r = 18 + Math.random() * 26;
      const bx = 64 + Math.cos(a) * r, by = 64 + Math.sin(a) * r;
      const b = x.createRadialGradient(bx, by, 2, bx, by, 16 + Math.random() * 10);
      b.addColorStop(0, 'rgba(0,0,0,0.22)'); b.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = b; x.beginPath(); x.arc(bx, by, 30, 0, TAU); x.fill();
    }
    this._smokeT = new THREE.CanvasTexture(c);
    return this._smokeT;
  }
  _puff() {
    this._smokePool = this._smokePool || [];
    let p = this._smokePool.find(s => !s._live);
    if (!p) {
      if (this._smokePool.length >= 48) return null;   // budget spent — a missing puff beats a spike
      p = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._smokeTexture(), transparent: true, depthWrite: false, opacity: 0 }));
      this.scene.add(p); this._smokePool.push(p);
    }
    p._live = true; p.visible = true;
    return p;
  }
  smokePuffs(pos, o = {}) {
    const n = Math.max(1, Math.round(o.count ?? 6)), colors = o.colors || ['#20222c', '#15161d'];
    const rise = o.rise ?? 8, dur = o.dur ?? 2.2, size = o.size ?? 6, spread = o.spread ?? 3, op = o.opacity ?? 0.5;
    // o.warm: smoke born HOT and cooling to soot — "fire first and then some smoke afterwards"
    // playing out inside each single puff, not just across the burst.
    const warmC = o.warm ? new THREE.Color(o.warm) : null;
    for (let i = 0; i < n; i++) {
      const p = this._puff(); if (!p) return;
      const soot = new THREE.Color(colors[(Math.random() * colors.length) | 0]);
      p.material.color.copy(warmC || soot);
      p.material.rotation = Math.random() * TAU;
      const rot = rand(-0.6, 0.6), drx = rand(-1.4, 1.4), drz = rand(-1.4, 1.4);
      const px = pos.x + rand(-spread, spread), pz = pos.z + rand(-spread, spread);
      let py = pos.y + rand(0, spread * 0.6);
      const s0 = size * rand(0.6, 1);
      const life = dur * rand(0.75, 1.15);
      let t = 0;
      p.position.set(px, py, pz); p.scale.setScalar(s0 * 0.6);
      this._add({
        update: (dt) => {
          t += dt; const k = Math.min(1, t / life);
          py += rise * dt * (1 - k * 0.55);
          p.position.set(p.position.x + drx * dt, py, p.position.z + drz * dt);
          p.scale.setScalar(s0 * (0.65 + k * 1.5));
          p.material.rotation += rot * dt;
          p.material.opacity = op * Math.min(1, t * 5) * Math.pow(1 - k, 1.25);
          if (warmC) p.material.color.lerpColors(warmC, soot, Math.min(1, k * 2.4));
          return k >= 1;
        },
        dispose: () => { p._live = false; p.visible = false; p.material.opacity = 0; },
      });
    }
  }

  // Ground shockwave: expanding flat ring + energy dome + dust + lightning skirt.
  shockwave(pos, opt = {}) {
    if (!okPos(pos, 'shockwave')) return;
    const color = opt.color || '#7fe0ff', power = opt.power || 1, maxR = opt.radius || 28;
    // flat ring
    const ring = new THREE.Mesh(this._ring, addMat(color, 0.9));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.3, pos.z); ring.scale.setScalar(2); this.scene.add(ring);
    // second ring (delayed)
    const ring2 = new THREE.Mesh(this._ring, addMat('#ffffff', 0.7));
    ring2.rotation.x = -Math.PI / 2; ring2.position.set(pos.x, 0.35, pos.z); ring2.scale.setScalar(1); this.scene.add(ring2);
    // dome — ⚠ CUT ENTIRELY in the close frame (aaa-06 §2.1). At the clinch framing the eye sits
    // INSIDE this additive ellipsoid (measured `(30/47)² + (14/25)² = 0.72 < 1`), and a backside
    // sphere you are inside tints EVERY pixel — the heliopause-shell lesson at ten times the
    // opacity. A percentage clamp cannot fix that; the two flat rings carry the read.
    const dome = this._close ? null : new THREE.Mesh(this._sphere, addMat(color, 0.24));
    if (dome) { dome.position.set(pos.x, 0, pos.z); dome.scale.setScalar(3); this.scene.add(dome); }
    let t = 0; const life = 0.5 + power * 0.14;
    this._add({
      update: (dt) => {
        t += dt; const k = t / life; const e = 1 - Math.pow(1 - k, 2);
        ring.scale.setScalar(2 + e * maxR); ring.material.opacity = 0.9 * (1 - k);
        ring2.scale.setScalar(1 + Math.max(0, (k - 0.12)) * maxR * 1.15); ring2.material.opacity = 0.7 * (1 - k);
        if (dome) { dome.scale.set(3 + e * maxR, 3 + e * maxR * 0.5, 3 + e * maxR); dome.material.opacity = 0.32 * (1 - k); }
        return k >= 1;
      },
      dispose: () => { [ring, ring2, dome].forEach(m => { if (!m) return; this.scene.remove(m); m.material.dispose(); }); },
    });
    // dust ring particles
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU;
      this.P.spawn({ x: pos.x + Math.cos(a) * 3, y: 0.5, z: pos.z + Math.sin(a) * 3, vx: Math.cos(a) * (16 + power * 8), vz: Math.sin(a) * (16 + power * 8), vy: rand(2, 8), life: 0.7, size: 5, color: ['#4a4a55', color], grav: 6, drag: 1.5 });
    }
    // ⚠ §3.4: the lightning skirt is authored against the 156u ortho frame; scale it by the live
    // frame so a shockwave under the player at the clinch does not fill the screen with bolts.
    const _ls = this._close ? Math.min(1, this.world.frameHeightAt(pos) / 156) : 1;
    this.lightning(pos, { color, count: 4 + (power * 3 | 0), radius: maxR * 0.7 * _ls, height: (10 + power * 8) * _ls });
    this.world.shake(0.8 + power);
  }

  // Branching lightning bolts from a point, flicker briefly.
  lightning(pos, opt = {}) {
    if (!okPos(pos, 'lightning')) return;
    const color = opt.color || '#bfefff', count = opt.count || 5, radius = opt.radius || 20, height = opt.height || 16;
    // one fixed-size buffer per strike, refilled in place on each flicker (no per-flicker allocations)
    const arr = new Float32Array((count * 5 + 3 * 6) * 6);
    let w = 0;
    const bolt = (x0, y0, z0, x1, y1, z1, segs) => {
      let px = x0, py = y0, pz = z0;
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const nx = lerp(x0, x1, t) + rand(-2, 2), ny = lerp(y0, y1, t) + rand(-1.5, 1.5), nz = lerp(z0, z1, t) + rand(-2, 2);
        arr[w++] = px; arr[w++] = py; arr[w++] = pz; arr[w++] = nx; arr[w++] = ny; arr[w++] = nz;
        px = nx; py = ny; pz = nz;
      }
    };
    const build = () => {
      w = 0;
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU), r = rand(radius * 0.3, radius);
        bolt(pos.x, pos.y + 0.5, pos.z, pos.x + Math.cos(a) * r, pos.y + rand(0, 3), pos.z + Math.sin(a) * r, 5);
      }
      // upward strikes
      for (let i = 0; i < 3; i++) bolt(pos.x + rand(-4, 4), pos.y, pos.z + rand(-4, 4), pos.x + rand(-6, 6), pos.y + height, pos.z + rand(-6, 6), 6);
    };
    build();
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(arr, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const seg = new THREE.LineSegments(geo, mat); this.scene.add(seg);
    const l = this.borrowLight(color, 6, radius * 3); l.position.copy(pos); l.position.y += 3;
    let t = 0; const life = 0.26; let flick = 0;
    this._add({
      update: (dt) => {
        t += dt; flick += dt;
        if (flick > 0.04) { flick = 0; build(); attr.needsUpdate = true; }
        mat.opacity = Math.max(0, 1 - t / life);
        l.intensity = Math.max(0, 6 * (1 - t / life));
        return t >= life;
      },
      dispose: () => { this.scene.remove(seg); geo.dispose(); mat.dispose(); this.returnLight(l); },
    });
  }

  // generic expanding ring (air / hit)
  ring(pos, opt = {}) {
    if (!okPos(pos, 'ring')) return;
    const color = opt.color || '#fff', r0 = opt.r0 || 1, r1 = opt.r1 || 10, life = opt.life || 0.35, y = opt.y == null ? pos.y : opt.y, flat = opt.flat;
    const m = new THREE.Mesh(this._ring, addMat(color, opt.opacity == null ? 0.9 : opt.opacity));
    if (flat) m.rotation.x = -Math.PI / 2; else m.lookAt && (m.quaternion.copy(this.world.camera.quaternion));
    m.position.set(pos.x, y, pos.z); m.scale.setScalar(r0); this.scene.add(m);
    let t = 0;
    this._add({
      update: (dt) => { t += dt; const k = t / life; m.scale.setScalar(lerp(r0, r1, 1 - Math.pow(1 - k, 2))); m.material.opacity *= (1 - dt / life * 1.05); return k >= 1; },
      dispose: () => { this.scene.remove(m); m.material.dispose(); },
    });
  }

  // Dark scorch decal on the ground that lingers then fades.
  // RESIDUE (visual contract): what the world KEEPS after an effect. The decal tint is the
  // ability's own material, not a global black — an ice burst leaves frost, acid leaves sludge.
  residue(pos, kind = 'scorch', radius = 8) {
    if (!okPos(pos, 'residue')) return;
    if (kind === 'none') return;
    const TINT = { scorch: '#0b0906', frost: '#cfeaff', sludge: '#7f8f28', debris: '#4a443c', crater: '#0b0906', cloud: '#2a2a2e' };
    this.scorch(pos, radius, TINT[kind] || '#0b0906');
  }
  beamGroundScorch(pos,radius=2) {
    if(!okPos(pos,'beamGroundScorch')||!Number.isFinite(radius)||radius<=0||!this.world?.heightAt)return null;
    const mesh=terrainScorchMesh(this.world,pos,Math.min(6,radius));if(!mesh)return null;
    this.scene.add(mesh);this.scorches.push(mesh);this.world.flattenGrass?.(pos.x,pos.z,radius);
    if(this.scorches.length>40)disposeScorch(this.scene,this.scorches.shift());return mesh;
  }
  scorch(pos, radius = 8, tint = '#000') {
    if (!okPos(pos, 'scorch')) return;
    const mat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.55, depthWrite: false });
    mat.color.multiplyScalar(0.2);
    const m = new THREE.Mesh(this._decalGeo, mat);
    // ⚠ TWO DEFECTS IN THE LINE THIS REPLACES. (1) It invented its own ladder — `0.06 + n*0.002`,
    // a 0.4cm step — instead of taking a rung from GROUND_LAYER, which is exactly the failure mode
    // THE FLICKER LAW names. (2) The index was `scorches.length`, and the pool is CAPPED at 40:
    // once you hit the cap the length stops growing, so every scorch after the fortieth landed at
    // the identical height and z-fought with the one before it. A long fight is precisely when you
    // have the most scorch marks. A monotonic counter can't stall; the rung comes off the ladder.
    this._scorchN = (this._scorchN || 0) + 1;
    m.rotation.x = -Math.PI / 2;
    // ⚠ ON THE GROUND, NOT AT AN ABSOLUTE HEIGHT. This set y from GROUND_LAYER alone and never
    // added the terrain, so on any city with relief every scorch mark was BURIED — measured on
    // Kabul, whose terrain runs -13 to +122. Invisible rather than tearing (depthWrite is off),
    // but it meant the one mark that says 'something exploded here' was missing city-wide.
    const gy = this.world && this.world.heightAt ? this.world.heightAt(pos.x, pos.z) : 0;
    m.position.set(pos.x, gy + GROUND_LAYER.shadow + 0.01 + (this._scorchN % 24) * 0.004, pos.z);
    m.scale.setScalar(radius);
    this.scene.add(m); this.scorches.push(m);
    if (this.world.flattenGrass) this.world.flattenGrass(pos.x, pos.z, radius);   // burned ground = burned grass
    if (this.scorches.length > 40) { const old = this.scorches.shift(); disposeScorch(this.scene,old); }
  }

  _impactTex() {
    if (this._itex) return this._itex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.translate(64, 64);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 44); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 44, 0, TAU); x.fill();
    x.fillStyle = '#fff'; const spikes = 9; x.beginPath();
    for (let i = 0; i < spikes * 2; i++) { const a = i / (spikes * 2) * TAU; const r = (i % 2 === 0) ? 62 : 20; x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill();
    this._itex = new THREE.CanvasTexture(c); return this._itex;
  }

  // comic-style impact star (billboard, draws over everything)
  impactStar(pos, size, color = '#fff', life = 0.2) {
    if (!okPos(pos, 'impactStar')) return;
    // ⚠ §3.4: `depthTest:false` draws the star over EVERYTHING — a convenience at 260u, but in the
    // chase view the nearest object to the lens is the player's own back, so the star paints over
    // your own fighter. In the close frame it takes depthTest:true with renderOrder raised, so it
    // still wins ties against the fighter it lands on and loses to anything in front of the lens.
    const close = this._close;
    const mat = new THREE.SpriteMaterial({ map: this._impactTex(), color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: close, rotation: rand(0, TAU) });
    const s = new THREE.Sprite(mat); s.renderOrder = close ? 6 : 0; s.position.copy(pos); s.scale.setScalar(size * 0.3); this.scene.add(s);
    let t = 0; const spin = rand(-3, 3);
    this._add({ update: (dt) => { t += dt; const k = t / life; s.scale.setScalar(size * (0.3 + easeOut(k) * 0.9)); mat.opacity = Math.max(0, 1 - k * k); mat.rotation += spin * dt; return k >= 1; }, dispose: () => { this.scene.remove(s); mat.dispose(); } });
  }

  // Close contact reads through a tiny, short-lived kernel and an open fan of
  // tapered streaks. No sphere or opaque ring across the opponent's reaction.
  contact(pos, dir, opt = {}) {
    if (!okPos(pos, 'contact')) return;
    const origin = new THREE.Vector3(pos.x, pos.y, pos.z);
    const power = Math.min(3, Math.max(.3, Number.isFinite(opt.power) ? opt.power : 1));
    const color = opt.color || '#ffe6a0';
    this.impactStar(pos, this._cap(pos, .9 + power * .55, .035), '#fff', .055);
    const axis = new THREE.Vector3(dir?.x ?? 0, dir?.y ?? 0, dir?.z ?? 1);
    if (!Number.isFinite(axis.lengthSq()) || axis.lengthSq() < .001) axis.set(0, 0, 1);
    axis.normalize();
    if(opt.pressure)axis.negate(); // pressure rebounds from a surface, unlike a punch's forward spray
    const side = new THREE.Vector3().crossVectors(axis, Math.abs(axis.y) > .9 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0)).normalize();
    const up = new THREE.Vector3().crossVectors(side, axis).normalize();
    const vertices = [], count = 7 + Math.round(power * 2), phase = rand(0, TAU);
    for (let i = 0; i < count; i++) {
      const angle = phase + i / count * TAU;
      const ray = side.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle));
      const tangent = side.clone().multiplyScalar(-Math.sin(angle)).addScaledVector(up, Math.cos(angle));
      const radius = (1.8 + power * .8) * rand(.65, 1), width = .055 + power * .025;
      const tip = ray.clone().multiplyScalar(radius).addScaledVector(axis, radius * .55);
      const base = ray.clone().multiplyScalar(radius * .35).addScaledVector(axis, radius * .12);
      for (const p of [base.clone().addScaledVector(tangent, width), tip, base.clone().addScaledVector(tangent, -width)]) vertices.push(p.x,p.y,p.z);
      this.P.spawn({x:pos.x, y:pos.y, z:pos.z,
        vx:ray.x*12+axis.x*18, vy:ray.y*12+axis.y*18, vz:ray.z*12+axis.z*18,
        color, size:.22+power*.06, life:.16+power*.02, grav:3, drag:3});
    }
    const geometry = new THREE.BufferGeometry();geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide, transparent:true, opacity:.95, depthWrite:false});
    const streaks = new THREE.Mesh(geometry, material);streaks.position.copy(pos);streaks.scale.setScalar(.6);this.scene.add(streaks);
    let t = 0;const life = .14 + power * .025;
    this._add({update:dt=>{
      t += dt;const k = Math.min(1, t / life);
      streaks.scale.setScalar(.6 + k * 1.4);streaks.position.copy(origin).addScaledVector(axis, k * 1.5);
      material.opacity = .95 * (1-k) * (1-k);return t >= life;
    },dispose:()=>{this.scene.remove(streaks);geometry.dispose();material.dispose();}});
    if(opt.pressure){
      const radius=this._cap(pos,Math.min(3.2,Math.max(.5,opt.radius??1)*1.15),.075);
      const rim=new THREE.Mesh(this._ring,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.48,side:THREE.DoubleSide,depthWrite:false}));
      rim.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),axis);rim.position.copy(pos).addScaledVector(axis,.08);
      rim.scale.setScalar(radius*.65);this.scene.add(rim);let age=0;
      this._add({update:dt=>{age+=dt;const k=Math.min(1,age/.2);rim.scale.setScalar(radius*(.65+k*.65));rim.material.opacity=.48*(1-k);return age>=.2;},
        dispose:()=>{this.scene.remove(rim);rim.material.dispose();}});
    }
  }

  // Distant action retains the broad comic burst; close action exposes the body.
  impact(pos, dir, opt = {}) {
    if (!okPos(pos, 'impact')) return;
    const color = opt.color || '#ffffff', power = opt.power || 1;
    if (this._close) { this.contact(pos, dir, opt); this.world.shake(.4 + power); return; }
    // §3.3 ladder: the white star is clamped to a fraction of the frame keyed to the blow — a
    // haymaker star goes from 69% of frame height to 18%. The accent star is the SECOND additive
    // layer over the centre box; the two-layer rule (§6) CUTS it in the close frame.
    const _tier = power >= 1.6 ? PW_FX.sparkHeavy : power >= 0.9 ? PW_FX.sparkMid : PW_FX.sparkJab;
    this.impactStar(pos, this._cap(pos, 7 + power * 6, _tier), '#ffffff', 0.16);
    if (power > 0.9 && !this._close) this.impactStar(pos, 5 + power * 5, color, 0.24);
    this.flash(pos, '#ffffff', 3 + power * 3, 0.09);
    const d = dir ? { x: dir.x, z: dir.z } : null;
    this.P.burst(pos.x, pos.y, pos.z, { count: 10 + (power * 10 | 0), speed: 30 + power * 20, life: 0.4, size: 2.8, color: ['#fff', color], dir: d, spread: 0.55, up: power * 4, grav: 9, drag: 2.2 });
    this.P.burst(pos.x, pos.y, pos.z, { count: 5 + (power * 4 | 0), speed: 16 + power * 10, life: 0.55, size: 3.6, color: [color, '#fff'], up: 6, grav: 11, drag: 1.5, shrink: false });
    this.ring(pos, { color: '#fff', r0: 1, r1: this._cap(pos, 5 + power * 5, PW_FX.sparkHeavy), life: 0.2, opacity: 0.9 });
    this.world.shake(0.4 + power);
  }

  clearScorches() { for (const m of this.scorches) disposeScorch(this.scene,m); this.scorches.length = 0; }

  update(dt) {
    for(let i=this.scorches.length-1;i>=0;i--){const m=this.scorches[i];if(!m.userData.beamGroundScorch)continue;
      m.userData.age+=Math.max(0,dt);
      if(m.userData.age>=BEAM_GROUND_LIMITS.life){disposeScorch(this.scene,m);this.scorches.splice(i,1);}
      else m.material.uniforms.opacity.value=.6*Math.min(1,(BEAM_GROUND_LIMITS.life-m.userData.age)/BEAM_GROUND_LIMITS.fade);
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      if (this.fx[i].update(dt)) { this.fx[i].dispose(); this.fx.splice(i, 1); }
    }
  }
}
function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

