// Living Superweapon — game orchestrator: entities, control, combat helpers, main update.
import { Weather, TimeFields, GravityZones, setSize, banish } from './systems.js';
import * as THREE from 'three';
import { World } from './world.js';
import { Particles3D } from './particles3d.js';
import { VFX } from './vfx.js';
import { Projectiles } from './projectiles.js';
import { buildWeapon, weaponProficiency, PROP_WEIGHT, liftCapacity, bodyWeight, Fighter } from './entity.js';
import { AI } from './ai.js';
import { Minion, Construct } from './summons.js';
import { MeleeSystem } from './melee.js';
import { Pedestrians } from './pedestrians.js';
import { NewsCrew } from './newscrew.js';
import { PoliceSystem } from './police.js';
import { buildReport } from '../data/news.js';
import { bookInjury, injuryOf, healBout, koElo, matchElo } from '../data/rankings.js';
import { SETTINGS, keymap } from '../core/settings.js';
import { Gamepad } from '../core/gamepad.js';
import { runSlot, performEvade } from './abilities.js';
import { ROSTER } from '../data/characters.js';
import { BANDS, clamp, rand, TAU, damp } from '../core/util.js';
import { tierOf, TIER_COLORS } from './entity.js';

const _v = new THREE.Vector3();
const SLOT_KEYS = ['lmb', 'rmb', 'q', 'e', 'r', 'f', 'shift'];
const TAP_DIRS = [['KeyW', 'ArrowUp', 0, 1], ['KeyS', 'ArrowDown', 0, -1], ['KeyA', 'ArrowLeft', -1, 0], ['KeyD', 'ArrowRight', 1, 0]];
const NULL_PAD = { active: false, aiming: false, moving: false, lx: 0, ly: 0, rx: 0, ry: 0, down: () => false, pressed: () => false, released: () => false };
const _inp = { pressed: false, held: false, released: false, dt: 0 };   // scratch intent — runSlot reads it synchronously
function feedSlot(g, f, k, it, busy, dt) {
  const blocked = busy && k !== 'shift';
  _inp.pressed = blocked ? false : it.pressed; _inp.held = blocked ? false : it.held; _inp.released = it.released; _inp.dt = dt;
  runSlot(f, k, _inp, g);
}

// Game modes: setup spawns, tick drives it, onKO scores, isOver returns a result, hud describes the top bar.
const MODE_IMPL = {
  duel: {
    setup(g, o) {
      g.ms = { p1KO: 0, enemyKO: 0, target: 3 };
      g.ms.p1 = g.humans[0].fighter;
      g.ms.enemy = o.twoPlayer ? g.humans[1].fighter : (o.net ? null : g.spawnEnemy(o.enemy, { x: 0, z: -42, aiLevel: o.aiLevel || 1.25 }));   // career bouts scale the bot with the Elo gap
    },
    tick() {},
    onKO(g, v) { if (v === g.ms.p1) g.ms.enemyKO++; else if (v === g.ms.enemy) g.ms.p1KO++; },
    isOver(g) { if (g.ms.p1KO >= g.ms.target) return { win: true, title: 'VICTORY', lines: ['You bested ' + g.ms.enemy.name] }; if (g.ms.enemyKO >= g.ms.target) return { win: false, title: 'DEFEAT', lines: [g.ms.enemy.name + ' won the duel'] }; return null; },
    hud(g) { return { type: 'duel', a: g.ms.p1KO, b: g.ms.enemyKO, target: g.ms.target, aName: 'YOU', bName: g.ms.enemy ? g.ms.enemy.name : 'RIVAL' }; },
  },
  survival: {
    setup(g, o) { g.ms = { wave: 0, score: 0, lives: 3, betweenT: 1.5, target: (o && o.waves) || 0 }; },
    tick(g, dt) {
      const bots = g.entities.filter(e => e.ai && e.alive).length;
      if (bots === 0) { g.ms.betweenT -= dt; if (g.ms.betweenT <= 0) { g.ms.wave++; g._spawnWave(g.ms.wave); g.ms.betweenT = 3.6; if (g.hud) g.hud.announce('WAVE ' + g.ms.wave, g._waveCount(g.ms.wave) + ' rivals incoming', '#ffb03a'); } }
    },
    onKO(g, v) { if (v.ai) g.ms.score += 120 + g.ms.wave * 20; else if (g.isHuman(v)) { g.ms.lives--; if (g.hud) g.hud.announce(g.ms.lives > 0 ? 'DOWN!' : 'LAST BREATH', g.ms.lives + ' lives left', '#ff5a4a'); } },
    isOver(g) {
      if (g.ms.lives <= 0 && g.humans.every(h => !h.fighter.alive)) return { win: false, title: 'OVERWHELMED', lines: ['Reached Wave ' + g.ms.wave, 'Score ' + g.ms.score], wave: g.ms.wave };
      // THE DEFENSE CONTRACT (career): clear the contracted wave count and the district holds
      if (g.ms.target && g.ms.wave >= g.ms.target && !g.entities.some(e => e.ai && e.alive)) return { win: true, title: 'DISTRICT HELD', lines: [g.ms.target + ' waves repelled', 'Score ' + g.ms.score], wave: g.ms.wave };
      return null;
    },
    hud(g) { return { type: 'survival', wave: g.ms.wave, score: g.ms.score, lives: Math.max(0, g.ms.lives) }; },
  },
  rumble: {
    setup(g) { g.ms = { target: 12, timer: 99 }; const chars = ROSTER.map(r => r.id).sort(() => Math.random() - 0.5); for (let i = 0; i < 3; i++) g.spawnEnemy(chars[i], { aiLevel: 1, r: 82 }); },
    tick(g, dt) { g.ms.timer -= dt; },
    onKO() {},
    isOver(g) {
      const hi = g.humans.reduce((m, h) => Math.max(m, h.fighter.kills), 0);
      const bot = g.entities.filter(e => e.ai).reduce((m, b) => Math.max(m, b.kills), 0);
      if (hi >= g.ms.target) return { win: true, title: 'VICTORY', lines: [hi + ' KOs — arena cleared'] };
      if (bot >= g.ms.target) return { win: false, title: 'DEFEAT', lines: ['A rival hit ' + g.ms.target + ' first'] };
      if (g.ms.timer <= 0) return hi >= bot ? { win: true, title: 'TIME — YOU WIN', lines: [hi + ' KOs'] } : { win: false, title: 'TIME — YOU LOSE', lines: [hi + ' KOs'] };
      return null;
    },
    hud(g) { const hi = g.humans.reduce((m, h) => Math.max(m, h.fighter.kills), 0); return { type: 'rumble', frags: hi, target: g.ms.target, timer: Math.max(0, Math.ceil(g.ms.timer)) }; },
  },
  training: {
    setup() {},   // THE ROOM STARTS EMPTY (Robert's ruling): N orders a bot, B orders a rival
    tick() {}, onKO() {}, isOver() { return null; },
    hud() { return { type: 'training' }; },
  },
  // THE INVITATIONAL — one bracket match: best-of-3 ELIMINATION rounds (last side standing takes
  // the round, nobody respawns mid-round), team damage LIVE. The Tournament object rides in o.tourney.
  tournament: {
    setup(g, o) {
      const T = o.tourney, m = T && T.currentMatch();
      g.ms = { T, m, aWins: 0, bWins: 0, target: 2, round: 1, betweenT: 0, roundLive: false, roundName: T ? T.roundName() : 'EXHIBITION' };
      g.friendlyFire = true;   // the ruling: your splash is EVERYONE'S problem
      g._tourneyRound();
    },
    tick(g, dt) {
      const ms = g.ms; if (!ms.m) return;
      if (ms.betweenT > 0) { ms.betweenT -= dt; if (ms.betweenT <= 0 && !g.matchOver) g._tourneyRound(); return; }
      if (!ms.roundLive || g.matchOver) return;
      // a DOMINATED fighter counts for their ORIGINAL side — mind control may turn a round, never END one
      const side = (e) => (e._controlled && e._oldTeam !== undefined) ? e._oldTeam : e.team;
      const aAlive = g.entities.some(e => e.alive && e.def && !e.isDummy && side(e) === 0);
      const bAlive = g.entities.some(e => e.alive && e.def && !e.isDummy && side(e) === 1);
      if (aAlive && bAlive) return;
      ms.roundLive = false;
      const aWon = aAlive;                                  // double-KO edges to the challengers
      if (aWon) ms.aWins++; else ms.bWins++;
      g.slowmo(0.5, 0.35);
      if (ms.aWins < ms.target && ms.bWins < ms.target) {
        ms.round++; ms.betweenT = 3.0;
        if (g.hud) g.hud.announce(aWon ? 'ROUND YOURS' : 'ROUND LOST', `${ms.aWins}–${ms.bWins} · first to ${ms.target}`, aWon ? '#8fe08a' : '#ff6a5a');
      }
    },
    onKO() {},
    isOver(g) {
      const ms = g.ms; if (!ms.m) return { win: false, title: 'NO BRACKET', lines: ['Tournament state lost'] };
      if (ms.aWins < ms.target && ms.bWins < ms.target) return null;
      const win = ms.aWins >= ms.target, final = ms.T.isFinal(ms.m);
      return {
        win, tournament: true,
        title: win ? (final ? 'CHAMPION' : 'ADVANCE') : 'ELIMINATED',
        lines: [win
          ? (final ? `The ${ms.T.label} is yours — ${ms.aWins}–${ms.bWins} in the final` : `${ms.roundName} taken ${ms.aWins}–${ms.bWins} — the bracket advances`)
          : `Out in the ${ms.roundName.toLowerCase()} — ${ms.aWins}–${ms.bWins} against ${ms.T.sideName(ms.T.playerFoeSide(ms.m))}`],
      };
    },
    hud(g) {
      const ms = g.ms;
      return { type: 'tournament', a: ms.aWins, b: ms.bWins, target: ms.target, round: ms.round, roundName: ms.roundName, bName: ms.m ? ms.T.sideName(ms.T.playerFoeSide(ms.m)) : 'RIVALS' };
    },
  },
};

export class Game {
  constructor(canvas, input, audio) {
    this.input = input; this.audio = audio; this.pad = new Gamepad();
    this.world = new World(canvas);
    this.scene = this.world.scene;
    this.particles = new Particles3D(this.scene);
    this.vfx = new VFX(this.world, this.particles);
    this.projectiles = new Projectiles(this);
    this.melee = new MeleeSystem(this);
    this.peds = new Pedestrians(this.world.scene, this.world.ARENA || 240, this.world.waterX || 188);
    this.news = new NewsCrew(this);  // the KMK 9 field crew — films the fight, records the clips
    this.police = new PoliceSystem(this);   // the city's answer to whoever hurts humans
    // EVERY city rebuild re-grids what was keyed to the old map — whether it came from a match,
    // the atlas, or the map maker's live preview. There is exactly one of these for a reason.
    this.world.onRebuilt = (plan) => {
      this.peds.setCity(this.world.ARENA, this.world.waterX);
      this.vfx.clearScorches();
      if (this.news && this.news.reset) this.news.reset();
    };
    // the match record the news desk reports from (reset in startMode)
    this.matchT = 0; this.matchLog = [];
    this.cityStats = { civs: 0, cars: 0, blocks: 0, craters: 0 };
    this.bigHit = { amount: 0, by: null, kind: 'blast' };
    this._p1MaxCombo = 0; this.matchReport = null;
    this.hud = null;                 // set by main.js — for damage numbers / combo
    this.combo = 0; this.comboT = 0;
    this.humans = [];                // local players: [{ fighter, scheme:'kbm'|'pad' }]
    this.mode = null; this.modeId = null; this.ms = {}; this.matchOver = false; this.matchResult = null;
    this.entities = []; this.minions = []; this.constructs = [];
    // TIER THREE SYSTEMS (docs/POWERS_BRIEF.md Part Five) — engine layers, not abilities
    this.weather = new Weather(this);
    this.timeFields = new TimeFields(this);
    this.gravityZones = new GravityZones(this);
    this.portals = []; this._openPair = null;   // dimensional door pairs (RIFT)
    this.aimPoint = new THREE.Vector3(20, 0, 0);
    this.time = 0; this.running = false; this.player = null;
    this.lockTarget = null; this._lastLock = null; this._sp = { x: 0, y: 0, behind: false };
    this.hardLock = null; this._aim3pt = new THREE.Vector3();
    // field of vision — enemies only shown where the player can see them
    this.fov = true; this.visNear = 26; this.visRange = 96; this.visCos = Math.cos(0.96); this.visReveal = 130;
    this._ghostGeo = new THREE.CapsuleGeometry(1.5, 3.2, 4, 8);
    this._buildReticle();
    this._buildLockMark();
    this._buildPlayerMark();
    this._buildThrowArc();

    // camera-aligned movement basis
    const cd = this.world.camDir;
    this.fwd = new THREE.Vector3(-cd.x, 0, -cd.z).normalize();
    this.right = new THREE.Vector3().crossVectors(this.fwd, new THREE.Vector3(0, 1, 0)).normalize();

    this.onKill = null; // hud hook
  }

  _buildReticle() {
    this.reticle = new THREE.Group();
    const mk = (o) => new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.7, 40), mk(0.85));
    ring.rotation.x = -Math.PI / 2; this.reticle.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.9, 4), mk(0.6)); // square-ish bracket
    ring2.rotation.x = -Math.PI / 2; ring2.rotation.z = Math.PI / 4; this.reticle.add(ring2);
    const chev = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 3), mk(0.95));
    chev.rotation.x = Math.PI; chev.position.y = 13; this.reticle.add(chev);
    this.reticle.visible = false; this.scene.add(this.reticle);
    this._retRing = ring; this._retRing2 = ring2; this._retChev = chev;
  }

  // "YOU ARE HERE" — at 1:1 city scale a 9.6u hero is a speck between towers. A soft gold ring
  // under the player (pulsing, ground-pinned) makes you findable at a glance without clutter.
  _buildPlayerMark() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 5.4, 44), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; g.add(ring);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(5.2, 32), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; g.add(glow);
    g.visible = false; this.scene.add(g);
    this.playerMark = g; this._pmRing = ring; this._pmGlow = glow;
  }
  // TELEPORT TARGETING — the blink always went to your aim point, but with nothing drawn there
  // you were guessing. This puts a ring exactly where you WILL land (range-clamped, so it stops
  // at the edge of what the ability can actually reach) whenever a blink is ready to fire.
  updateBlinkMark(dt) {
    if (!this._blinkMark) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 32), new THREE.MeshBasicMaterial({ color: '#eaffff', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      const pip = new THREE.Mesh(new THREE.ConeGeometry(1, 2.4, 4), new THREE.MeshBasicMaterial({ color: '#eaffff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      pip.rotation.x = Math.PI; pip.position.y = 7;
      g.add(ring, pip); g.visible = false; this.scene.add(g);
      this._blinkMark = g; this._bmRing = ring; this._bmPip = pip;
    }
    const p = this.player, m = this._blinkMark;
    let slot = null;
    if (p && p.alive && this.running && !this.matchOver) {
      for (const k in p.slots) { const s = p.slots[k]; if (s.def.type === 'teleport' && s.cd <= 0 && p.ki >= (s.def.cost || 0)) { slot = s; break; } }
    }
    if (!slot) { if (m.visible) m.visible = false; return; }
    const range = slot.def.range || 42;
    const dx = this.aimPoint.x - p.pos.x, dz = this.aimPoint.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
    const dd = Math.min(range, d);
    m.visible = true;
    m.position.set(p.pos.x + (dx / d) * dd, 0.2, p.pos.z + (dz / d) * dd);
    this._bmRing.rotation.z += dt * 2.2;
    this._bmPip.position.y = 7 + Math.sin(this.time * 6) * 0.7;
    const capped = d > range;                       // out of reach = amber, in reach = clean white
    const col = capped ? '#ffb03a' : '#eaffff';
    if (this._bmCol !== col) { this._bmCol = col; this._bmRing.material.color.set(col); this._bmPip.material.color.set(col); }
  }

  updatePlayerMark(dt) {
    const m = this.playerMark, p = this.player;
    if (!m) return;
    const show = !!(p && p.alive && this.mode && this.running);
    if (m.visible !== show) m.visible = show;
    if (!show) return;
    m.position.set(p.pos.x, 0.16, p.pos.z);
    const pulse = 0.42 + Math.sin(this.time * 3.1) * 0.12;
    this._pmRing.material.opacity = pulse;
    this._pmGlow.material.opacity = 0.07 + Math.sin(this.time * 3.1) * 0.03;
    const s = 1 + Math.sin(this.time * 3.1) * 0.04;
    m.scale.set(s, 1, s);
    if (this._pmColor !== p.def.colors.accent) {   // wears your hero's colour
      this._pmColor = p.def.colors.accent;
      this._pmRing.material.color.set(this._pmColor); this._pmGlow.material.color.set(this._pmColor);
    }
  }

  // ---------- THE THROW ARC: aim before you lob ----------
  // Any gravity-bound projectile (grenades) gets a dotted parabola from the muzzle to where it
  // will actually land, plus a landing ring. Same maths the projectile uses, so it never lies.
  _buildThrowArc() {
    const g = new THREE.Group(); g.visible = false;
    const dotGeo = new THREE.SphereGeometry(0.34, 6, 5);
    this._arcDots = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.6, depthWrite: false }));
      g.add(m); this._arcDots.push(m);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.0, 22), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; g.add(ring); this._arcRing = ring;
    this.scene.add(g); this.throwArc = g;
  }
  updateThrowArc() {
    const arc = this.throwArc, p = this.player;
    if (!arc) return;
    let def = null;
    if (p && p.alive && this.mode && this.running && !this.matchOver) {
      for (const k of SLOT_KEYS) {                       // the first READY lobbed weapon they carry
        const s = p.slots[k]; if (!s) continue;
        const d = s.def;
        if ((d.type === 'projectile' && d.grav > 0) && s.cd <= 0 && p.ki >= (d.cost || 0)) { def = d; break; }
      }
      if (!def && p._carry) def = { _prop: true };       // carrying a car/tree = also a throw
      if (!def && p.grabState === 'clinch' && p.grabbing) def = { _body: true };   // clinch = aiming a PERSON (manual §11)
    }
    if (!def) { if (arc.visible) arc.visible = false; return; }
    arc.visible = true;
    // launch state: muzzle + the same velocity the ability would use
    const spd = def._body ? (((p.grabMode === 'back' ? 60 : 48) + (p.def.strength ?? 5) * 4.6)
        * (p.grabbing ? Math.max(0.45, Math.min(1.2, 0.75 + 0.15 * Math.log2(liftCapacity(p.def.strength) / Math.max(0.05, bodyWeight(p.grabbing.def))))) : 1))
      : def._prop ? ((p._carry && p._carry.spd) || 74) : (def.speed || 58);   // the preview promises what the throw delivers (manual §21)
    const grav = (def._prop || def._body) ? 62 : (def.grav || 11) * 6;   // bodies and props fall at world gravity
    const m = def._body ? _v.set(p.pos.x + p.aim.x * 4.4, p.pos.y + 5.2, p.pos.z + p.aim.z * 4.4).clone()
      : p.muzzle(_v.clone(), 4, 6.4);
    const dir = p.aim3;
    const loft = def._body ? 0.22 : 0.34;   // bodies fly flatter than lobbed props — preview matches _throw exactly
    let vx = dir.x * spd, vy = (dir.y + loft) * spd, vz = dir.z * spd;   // thrown things get lofted
    let x = m.x, y = m.y, z = m.z, land = null;
    const step = 0.055;
    for (let i = 0; i < this._arcDots.length; i++) {
      const d = this._arcDots[i];
      x += vx * step; y += vy * step; z += vz * step; vy -= grav * step;
      if (y <= 0.4 && !land) { land = { x, z }; y = 0.4; }
      d.position.set(x, y, z);
      d.visible = !land || i < 2;
      d.material.opacity = 0.62 * (1 - i / this._arcDots.length);
      if (land) d.visible = false;
    }
    if (land) { this._arcRing.visible = true; this._arcRing.position.set(land.x, 0.3, land.z); }
    else this._arcRing.visible = false;
    const col = (p._carry || p.grabState === 'clinch') ? '#ff8a3a' : '#ffd24a';
    if (this._arcCol !== col) { this._arcCol = col; for (const d of this._arcDots) d.material.color.set(col); this._arcRing.material.color.set(col); }
  }

  // ---------- CARRY & THROW: the city is ammunition ----------
  // Cars, street trees and lightpoles can be torn up and hurled. Strength gates what you can
  // lift (a car needs real muscle), and the thrown prop hurts whatever it lands on.
  propInReach(f) {
    // THE WEIGHT LADDER (manual §21): capacity — not a hard-coded STR gate — decides what your
    // hands can take. The nearest thing you CAN'T lift is remembered so the feed can say why.
    const R = 22, cap = liftCapacity(f.def.strength);
    let best = null, bd = R * R;
    f._tooHeavyProp = null;
    const consider = (d, rec) => {
      if (d >= bd) return;
      if (cap >= rec.w) { bd = d; best = rec; }
      else if (!f._tooHeavyProp || d < f._tooHeavyProp._d) f._tooHeavyProp = { kind: rec.kind, w: rec.w, _d: d };
    };
    for (const car of this.world.cars || []) {
      if (car.dead || car.carried) continue;
      const dx = car.x - f.pos.x, dz = car.z - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'car', ref: car, x: car.x, z: car.z, w: PROP_WEIGHT.car });
    }
    for (const pl of this.world.planes || []) {                     // 24 tons of airliner
      if (pl.dead || pl.carried) continue;
      const dx = pl.x - f.pos.x, dz = pl.z - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'plane', ref: pl, x: pl.x, z: pl.z, w: PROP_WEIGHT.plane });
    }
    for (const rk of this.world.rocks || []) {                      // loose stones (0.5t — STR 3 territory)
      if (rk.dead || rk.carried) continue;
      const dx = rk.x - f.pos.x, dz = rk.z - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'rock', ref: rk, x: rk.x, z: rk.z, w: PROP_WEIGHT.rock });
    }
    const G = this.world.grass;                                     // street trees (instanced)
    if (G && this.world._gPos) for (let i = 0; i < G.count; i++) {
      if (!this.world._gOn[i]) continue;
      const gx = this.world._gPos[i * 2], gz = this.world._gPos[i * 2 + 1];
      const dx = gx - f.pos.x, dz = gz - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'tree', idx: i, x: gx, z: gz, w: PROP_WEIGHT.tree });
    }
    return best;
  }
  grabProp(f) {
    if (f._carry || f.grabbing || f.grabbedBy) return false;
    const t = this.propInReach(f);
    if (!t) {
      const th = f._tooHeavyProp;
      if (th && this.isHuman(f) && this.hud) this.hud.feed(`TOO HEAVY — the ${th.kind} is ~${th.w}t; you lift ~${liftCapacity(f.def.strength).toFixed(1)}t`, '#8b8577');
      return false;
    }
    const cap = liftCapacity(f.def.strength), ratio = cap / t.w;
    let mesh = null;
    if (t.kind === 'car') {
      t.ref.carried = true; t.ref.mesh.visible = false;
      mesh = new THREE.Mesh(this.world._carGeo, t.ref.paint);
    } else if (t.kind === 'rock') {
      t.ref.carried = true; t.ref.mesh.visible = false;
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 0), new THREE.MeshStandardMaterial({ color: '#8d8577', roughness: 0.95, flatShading: true }));
    } else if (t.kind === 'plane') {
      t.ref.carried = true; for (const m of t.ref.meshes) m.visible = false;
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.5, 38, 8), new THREE.MeshStandardMaterial({ color: '#dfe3e6', roughness: 0.4, metalness: 0.35 }));
      fus.rotation.z = Math.PI / 2;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 36), new THREE.MeshStandardMaterial({ color: '#c9ced4', roughness: 0.5, metalness: 0.3 }));
      mesh = new THREE.Group(); mesh.add(fus, wing);
    } else {
      this.world.flattenGrass(t.x, t.z, 0.5);                        // pull it out of the ground
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, 14, 6), new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.9, flatShading: true }));
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(9.5, 0), new THREE.MeshStandardMaterial({ color: '#4a6a3a', roughness: 0.9, flatShading: true }));
      crown.position.y = 12; mesh = new THREE.Group(); mesh.add(trunk, crown);
    }
    mesh.castShadow = true; this.scene.add(mesh);
    // the hurl the arc will preview — computed ONCE here so the preview can never lie
    const spd = 74 * Math.max(0.5, Math.min(1.25, 0.5 + 0.16 * Math.log2(Math.max(0.6, ratio))));
    f._carry = { kind: t.kind, mesh, t: 0, w: t.w, spd, ratio };
    f.speed = (f.def.speed || 30) * Math.max(0.42, Math.min(0.93, 1 - 0.45 / Math.max(0.9, ratio)));   // weight on your back is speed off your feet
    this.audio.impact(t.kind === 'plane' ? 1.1 : 0.7, f.pos); this.world.shake(t.kind === 'plane' ? 1.1 : 0.5);
    if (this.isHuman(f) && this.hud) this.hud.feed(`Hoisted a ${t.kind} (~${t.w}t) — press G again to THROW`, '#ff8a3a');
    return true;
  }
  throwProp(f) {
    const c = f._carry; if (!c) return;
    f._carry = null; f.speed = f.def.speed || 30;
    const spd = c.spd || 74, dir = f.aim3;   // the speed the arc promised (weight ratio, manual §21)
    const vel = new THREE.Vector3(dir.x * spd, (dir.y + 0.34) * spd, dir.z * spd);
    const pos = f.muzzle(new THREE.Vector3(), 5, 6.4);
    const mesh = c.mesh; mesh.position.copy(pos);
    const str = f.strength ?? 5;
    const dmg = ((c.kind === 'plane' ? 60 : c.kind === 'car' ? 34 : c.kind === 'rock' ? 14 : 22) + str * 3) * Math.min(1.6, 0.75 + 0.25 * Math.min(3, c.ratio || 1));
    let spin = rand(-5, 5), t = 0;
    this.audio.boom(0.4, f.pos); this.heroYell(f, 1.1);
    this.vfx._add({
      update: (dt) => {
        t += dt; vel.y -= 62 * dt;
        mesh.position.addScaledVector(vel, dt);
        mesh.rotation.z += spin * dt; mesh.rotation.x += spin * 0.5 * dt;
        // a car is 24u long and a tree is 20u tall — they need a hitbox to match, and a tall one:
        // `overlapFoe`'s ±9u vertical window let a lobbed car sail clean over someone's head.
        const R = c.kind === 'plane' ? 22 : c.kind === 'car' ? 13 : c.kind === 'rock' ? 7 : 10, RV = c.kind === 'plane' ? 20 : c.kind === 'car' ? 16 : c.kind === 'rock' ? 10 : 14;
        let foe = null;
        for (const e of this.entities) {
          if (!this.isFoe(f, e)) continue;
          const dx = e.pos.x - mesh.position.x, dz = e.pos.z - mesh.position.z;
          if (Math.hypot(dx, dz) < R + e.radius && Math.abs((e.pos.y + 5) - mesh.position.y) < RV) { foe = e; break; }
        }
        const grounded = mesh.position.y <= 1.2;
        if (foe || grounded || t > 4) {
          const p = mesh.position.clone(); p.y = Math.max(0.4, p.y);
          if (foe) foe.takeDamage(dmg, { src: f, kb: vel.clone().setY(0).setLength(dmg * 0.7), launch: 14, hitstop: 0.12 });
          this.areaDamage(f, p, c.kind === 'plane' ? 22 : c.kind === 'car' ? 13 : 9, dmg * 0.5, c.kind === 'plane' ? 2 : 1.5);
          if (c.kind === 'plane') { this.vfx.explode(p, { color: '#ff8a3d', color2: '#ffffff', radius: 22, power: 2.4 }); this.audio.boom(1.2, p); this.world.crater(p.x, p.z, 9, 1.6); this.world.punch(0.8); this.slowmo(0.15, 0.45); }
          else if (c.kind === 'car') { this.vfx.explode(p, { color: '#ff8a3d', color2: '#ffd24a', radius: 12, power: 1.6 }); this.audio.boom(0.6, p); }
          else { this.particles.burst(p.x, p.y, p.z, { count: 14, speed: 16, life: 0.6, size: 3, color: ['#5a4630', '#4a6a3a'], up: 6, grav: 12, drag: 1.4 }); this.audio.impact(1.1, p); }
          this.world.shake(1.3);
          return true;
        }
        return false;
      },
      dispose: () => { this.scene.remove(mesh); },
    });
  }
  // THE AIMED THROW's highest expression (manual §11): a hurled BODY that passes through another
  // fighter hits them too — both take damage, both are launched, both credited to the thrower.
  // A raised guard BRACES against the incoming body instead (blocked = no launch).
  updateThrownBodies(dt) {
    for (const v of this.entities) {
      if (!(v._thrownT > 0)) continue;
      v._thrownT -= dt;
      if (v._thrownT <= 0 || !v.alive) { v._thrownBy = null; continue; }
      const spd = Math.hypot(v.vel.x, v.vel.y, v.vel.z);
      if (spd < 24) continue;
      const by = v._thrownBy;
      v._thrownHit = v._thrownHit || new Set();
      for (const e of this.entities) {
        if (e === v || e === by || !e.alive || v._thrownHit.has(e.id)) continue;
        if (by && !this.isFoe(by, e)) continue;              // you bowl at the OTHER side
        const dx = e.pos.x - v.pos.x, dz = e.pos.z - v.pos.z;
        if (Math.hypot(dx, dz) > e.radius + v.radius + 1.4 || Math.abs(e.pos.y - v.pos.y) > 9) continue;
        v._thrownHit.add(e.id);
        const hit = Math.min(30, 8 + spd * 0.22);
        const kx = v.vel.x / (spd || 1), kz = v.vel.z / (spd || 1);
        e.takeDamage(hit, { src: by || v, slam: true, hitstop: 0.1, kb: { x: kx * spd * 0.55, y: 6, z: kz * spd * 0.55 }, launch: 10 });
        if (!(e._blocked > 0)) e.launchT = Math.max(e.launchT, 1.0);   // struck clean → they chain into walls too
        v.takeDamage(hit * 0.6, { src: by || v, slam: true, unblockable: true, hitstop: 0.1 });
        v.vel.multiplyScalar(0.55);
        const imp = e.pos.clone().setY(e.pos.y + 5.6);
        this.vfx.impactStar(imp, 10, '#ffffff', 0.2);
        this.vfx.ring(imp, { color: '#ff8a3a', r0: 1, r1: 10, life: 0.3 });
        this.world.shake(1.3); this.audio.impact(1.25, imp); this.audio.boom(0.4, imp);
        if (this.hud) this.hud.damageNumber(e.pos, 'BOWLED ' + Math.round(hit), '#ff8a3a', false);
        this.noise(imp, 1.1, by || v);
      }
    }
  }

  // BLIND SMOKE (manual §14): a dense, oily cloud. Anyone inside keeps a short blind refresh —
  // step out and your eyes clear in about half a second. The zone is the delivery; the STATUS
  // does the work (bots lose sight via ai.js, humans lose the lock and the aim magnet here).
  // GROUND SPIKES (brief T2.8): a cone that RAISES cover. The spikes are real collision —
  // registered like any other cover so physics, LOS, fog and projectiles all see them — but
  // they are TEMPORARY, and they are made of whatever the ground here is (asphalt gives broken
  // road, dirt gives stone). They sweep themselves up on expiry.
  raiseSpike(x, z, cfg = {}, src = null) {
    const w = this.world;
    const gy = w.heightAt ? w.heightAt(x, z) : 0;
    const h = cfg.h || 11, r = cfg.r || 2.6;
    const rural = !!(w.plan && w.plan.rural);
    const mat = new THREE.MeshStandardMaterial({ color: rural ? '#6b5f4a' : '#3a3b40', roughness: 0.95, flatShading: true });
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mat);
    m.position.set(x, gy - h, z); m.castShadow = true; m.rotation.y = Math.random() * 6.28;
    this.scene.add(m);
    const co = { mesh: m, crack: null, x, z, r, hx: r, hz: r, top: gy + h * 0.5, h: gy + h,
                 hp: cfg.hp || 40, maxHp: cfg.hp || 40, y0: gy + h * 0.5 - h / 2, w: r * 2, d: r * 2,
                 destroyed: false, _spike: true, _t: cfg.dur || 6, _rise: 0, _gy: gy, _h: h };
    w.cover.push(co); w.coverAll.push(co);
    (this._spikes = this._spikes || []).push(co);
    this.particles.burst(x, gy + 0.5, z, { count: 8, speed: 9, life: 0.5, size: 2.2, color: rural ? ['#6b5f4a', '#8a7a5a'] : ['#3a3b40', '#6a6f7a'], up: 7, drag: 1.2 });
    this.audio.impact(0.5, { x, y: gy, z });
    if (w.refreshFogBoxes) w.refreshFogBoxes();
    return co;
  }
  updateSpikes(dt) {
    const S = this._spikes; if (!S || !S.length) return;
    const w = this.world;
    for (let i = S.length - 1; i >= 0; i--) {
      const co = S[i];
      if (co._rise < 1) {                                  // they COME UP, sequentially — not popped
        co._rise = Math.min(1, co._rise + dt * 5);
        co.mesh.position.y = co._gy - co._h + co._rise * (co._h * 1.5);
      }
      co._t -= dt;
      if (co._t <= 0 || co.destroyed) {
        this.scene.remove(co.mesh);
        if (co.mesh.geometry) co.mesh.geometry.dispose();
        if (co.mesh.material) co.mesh.material.dispose();
        const a = w.cover.indexOf(co); if (a >= 0) w.cover.splice(a, 1);
        const b = w.coverAll.indexOf(co); if (b >= 0) w.coverAll.splice(b, 1);
        S.splice(i, 1);
        if (w.refreshFogBoxes) w.refreshFogBoxes();
      }
    }
  }
  addSmoke(x, z, r, dur, src) {
    (this._smoke = this._smoke || []).push({ x, z, r, t: dur });
    this.particles.burst(x, 3, z, { count: 26, speed: 13, life: 1.3, size: 6, color: ['#2a2d33', '#3a3f47', '#23262c'], up: 5, drag: 1.5 });
    this.audio.boom(0.28, { x, y: 2, z });
    this.noise({ x, y: 2, z }, 0.7, src || null);
  }
  // BLACK HOLE ROUND (brief T2.6). The DEBRIS moves before the bodies do — that is the whole
  // read: dust and smoke curve inward first, giving you the beat you need to leave. Then it
  // implodes; there is no outward blast, which is what separates it from every other bomb.
  addSingularity(pos, r, dur, pull, src, color) {
    (this._sing = this._sing || []).push({ x: pos.x, y: pos.y, z: pos.z, r, t: dur, dur, pull, src, color: color || '#1a1020' });
    this.audio.blast(120, 0.5, pos);
    this.vfx.ring(pos.clone(), { color: color || '#7fb0d0', r0: r, r1: 1, life: 0.5 });
  }
  updateSingularity(dt) {
    const S = this._sing; if (!S || !S.length) return;
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i]; s.t -= dt;
      const p = { x: s.x, y: s.y, z: s.z };
      if (s.t <= 0) {
        // THE IMPLOSION — inward, never a fireball
        this.areaDamage(s.src, p, s.r * 0.55, 26, 1.2);
        this.vfx.flash(new THREE.Vector3(s.x, s.y, s.z), '#0b0510', s.r * 0.5, 0.22);
        this.vfx.ring(new THREE.Vector3(s.x, s.y, s.z), { color: '#9ab0d0', r0: s.r * 0.7, r1: 0.5, life: 0.35 });
        this.world.shake(1.1); this.audio.boom(0.7, p);
        S.splice(i, 1); continue;
      }
      // debris first
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2, rr = s.r * (0.6 + Math.random() * 0.5);
        this.particles.spawn({ x: s.x + Math.cos(a) * rr, y: s.y + (Math.random() * 2 - 1) * 4, z: s.z + Math.sin(a) * rr,
          vx: -Math.cos(a) * rr * 1.6, vy: 0, vz: -Math.sin(a) * rr * 1.6, life: 0.5, size: 1.6 + Math.random() * 1.6,
          color: ['#6a6f7a', '#3a3f47', '#9ab0d0'], drag: 0.2 });
      }
      // then the bodies — a real pull, lifted past the walk clamp like every other shove
      for (const f of this.entities) {
        if (!f.alive || f.isDummy || f === s.src) continue;
        const dx = s.x - f.pos.x, dy = s.y - f.pos.y, dz = s.z - f.pos.z;
        const d = Math.hypot(dx, dy, dz); if (d > s.r || d < 0.001) continue;
        const k = (1 - d / s.r) * s.pull * dt * (1 - (f.def.strength ?? 5) * 0.05);
        f.vel.x += (dx / d) * k; f.vel.y += (dy / d) * k * 0.6; f.vel.z += (dz / d) * k;
        f.burstT = Math.max(f.burstT || 0, 0.12);
      }
    }
  }
  updateSmoke(dt) {
    const S = this._smoke; if (!S || !S.length) return;
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i]; s.t -= dt;
      if (s.t <= 0) { S.splice(i, 1); continue; }
      if (Math.random() < dt * 30) this.particles.spawn({ x: s.x + (Math.random() * 2 - 1) * s.r * 0.8, y: 1 + Math.random() * 5.5, z: s.z + (Math.random() * 2 - 1) * s.r * 0.8, vx: (Math.random() * 2 - 1) * 2, vy: 1.4 + Math.random() * 2, vz: (Math.random() * 2 - 1) * 2, life: 1.5, size: 5 + Math.random() * 3.5, color: ['#2a2d33', '#3a3f47', '#23262c'], drag: 1.2 });
      for (const f of this.entities) {
        if (!f.alive || f.isDummy) continue;
        const dx = f.pos.x - s.x, dz = f.pos.z - s.z;
        if (dx * dx + dz * dz > s.r * s.r || f.pos.y > 16) continue;
        f.blindT = Math.max(f.blindT, 0.55);
      }
    }
  }

  // ---------- THE GEAR SYSTEM (manual §16): powers are what you ARE, gear is what you HOLD ----------
  _gearKind(ab) {
    const n = (ab.name || '').toLowerCase();
    if (ab.type === 'bow' || ab.type === 'quiver') return 'bow';
    if (/shotgun/.test(n)) return 'shotgun';
    if (/pistol|sidearm|smg/.test(n)) return 'pistol';
    if (ab.type === 'rifle') return 'rifle';
    if (/knife|dagger/.test(n)) return 'knife';
    if (/axe/.test(n)) return 'axe';
    if (/spear|trident/.test(n)) return 'spear';
    if (ab.dmgClass === 'slash' || /blade|sword/.test(n)) return 'sword';
    return 'rifle';
  }
  spawnGearDrop(ab, x, z) {
    const mats = { armor: new THREE.MeshStandardMaterial({ color: '#565c66', roughness: 0.45, metalness: 0.7 }) };
    const mesh = buildWeapon(this._gearKind(ab), mats);
    mesh.rotation.z = Math.PI / 2.2; mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.scale.setScalar(1.6);
    const gy = this.world.heightAt ? this.world.heightAt(x, z) : 0;
    mesh.position.set(x, gy + 0.8, z);
    this.scene.add(mesh);
    (this._drops = this._drops || []).push({ ab, mesh, x, z, t: 20, y0: gy + 0.8 });
  }
  updateDrops(dt) {
    const D = this._drops; if (!D || !D.length) return;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i]; d.t -= dt;
      d.mesh.rotation.y += dt * 0.9;
      d.mesh.position.y = d.y0 + Math.sin(this.time * 2.2 + i) * 0.25;
      if (d.t <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        D.splice(i, 1);
      }
    }
  }
  // G near a dropped weapon = take it into the CARRY HAND (never hides a kit slot; X fires it)
  pickupGear(f) {
    const D = this._drops; if (!D || !D.length) return false;
    let best = null, bd = 8 * 8;
    for (const d of D) {
      const q = (d.mesh.position.x - f.pos.x) ** 2 + (d.mesh.position.z - f.pos.z) ** 2;
      if (q < bd) { bd = q; best = d; }
    }
    if (!best) return false;
    if (f._gearHeld) this.dropGear(f, false);              // hands are a slot: swap, don't stack
    const prof = weaponProficiency(f.def);
    const ab = best.ab;
    const eff = { ...ab, gear: true,
      damage: ab.damage != null ? +(ab.damage * prof).toFixed(2) : ab.damage,
      dmgMin: ab.dmgMin != null ? +(ab.dmgMin * prof).toFixed(2) : ab.dmgMin,
      dmgMax: ab.dmgMax != null ? +(ab.dmgMax * prof).toFixed(2) : ab.dmgMax,
      spread: ab.spread != null ? +(ab.spread / prof).toFixed(4) : ab.spread };   // proficiency shows in the HANDS
    f._gearHeld = { ab: eff, base: ab, t: 12, prof };
    f.slots._gear = { def: eff, cd: 0, chargeT: 0, sustainT: 0 };
    const hand = buildWeapon(this._gearKind(ab), { armor: new THREE.MeshStandardMaterial({ color: '#565c66', roughness: 0.45, metalness: 0.7 }) });
    hand.position.set(1.55, 4.6, 1.1); hand.rotation.x = -0.5;
    f.obj.add(hand); f._gearMesh = hand;
    this.scene.remove(best.mesh);
    best.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this._drops.splice(this._drops.indexOf(best), 1);
    this.audio.impact(0.5, f.pos);
    if (this.isHuman(f) && this.hud) this.hud.feed(`SCAVENGED: ${ab.name} ×${prof.toFixed(2)} — X fires it, ~12s of trigger time`, '#ffd24a');
    return true;
  }
  dropGear(f, spawnDrop = true) {
    if (!f._gearHeld) return;
    if (spawnDrop) this.spawnGearDrop(f._gearHeld.base, f.pos.x + (Math.random() * 4 - 2), f.pos.z + (Math.random() * 4 - 2));
    if (f._gearMesh) {
      f.obj.remove(f._gearMesh);
      f._gearMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      f._gearMesh = null;
    }
    delete f.slots._gear;
    f._gearHeld = null;
  }
  drainGear(f, dt) {
    const H = f._gearHeld; if (!H) return;
    H.t -= dt;
    if (H.t <= 0) {
      this.dropGear(f, false);                             // dry — the leash: a pickup never becomes kit
      if (this.isHuman(f) && this.hud) this.hud.feed('DRY — tossed it', '#8b8577');
      this.audio.zap(160, f.pos);
    }
  }
  // A landed grab STRIPS the weapon: the held pickup hits the pavement, and the victim's own
  // gear-tagged kit slots go dead for the window (runSlot gate). Powers keep firing — you can
  // take the man's gun, never his fire.
  disarm(v, by) {
    let any = false;
    if (v._gearHeld) { this.dropGear(v, true); any = true; }
    if (Object.values(v.slots).some(s => s && s.def && s.def.gear)) { v._disarmT = 6; any = true; }
    if (any && this.hud) this.hud.damageNumber(v.pos, 'DISARMED', '#ffd24a', true);
    if (any) this.audio.zap(300, v.pos);
  }

  updateCarry(dt) {
    for (const f of this.entities) {
      const c = f._carry; if (!c) continue;
      if (!f.alive) { this.scene.remove(c.mesh); f._carry = null; f.speed = f.def.speed || 30; continue; }
      c.t += dt;
      const h = c.kind === 'plane' ? 17 : c.kind === 'car' ? 13 : c.kind === 'rock' ? 11.5 : 15;
      c.mesh.position.set(f.pos.x - f.aim.x * 1.5, f.pos.y + h + Math.sin(c.t * 3) * 0.3, f.pos.z - f.aim.z * 1.5);
      c.mesh.rotation.y = f.facing + Math.PI / 2;
      c.mesh.rotation.z = Math.sin(c.t * 2.2) * 0.05;
    }
  }

  _buildLockMark() {
    // HARD LOCK reads as a CROSSHAIR now (Robert 2026-07-24: "I almost want a crosshair and a
    // lock for when it's target locked") — ring + four ticks + centre dot, unmistakably a lock
    // rather than the gold soft-aim reticle.
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    x.strokeStyle = '#ff3b3b'; x.lineWidth = 4.5;
    x.beginPath(); x.arc(32, 32, 19, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 5; x.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[32, 2, 32, 13], [32, 51, 32, 62], [2, 32, 13, 32], [51, 32, 62, 32]]) {
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    }
    x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 3.4, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 1.6;
    x.beginPath(); x.arc(32, 32, 19, 0, Math.PI * 2); x.stroke();
    const tex = new THREE.CanvasTexture(cv);
    this.redTri = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    this.redTri.scale.set(7, 7, 7); this.redTri.visible = false; this.scene.add(this.redTri);
  }

  updateReticle(dt) {
    // gold soft reticle = where the mouse is aiming (what your attacks will hit)
    const t = this.lockTarget;
    if (t && t.alive) {
      this.reticle.visible = true;
      this.reticle.position.set(t.pos.x, 0.35, t.pos.z);
      this._retRing.rotation.z += dt * 1.6; this._retRing2.rotation.z -= dt * 1.1;
      this._retChev.position.y = 13 + t.pos.y + Math.sin(this.time * 7) * 0.6;
      const c = t.def.colors.accent;
      this._retRing.material.color.set(c); this._retRing2.material.color.set(c); this._retChev.material.color.set(c);
    } else this.reticle.visible = false;
    // red triangle = the hard-locked target (who you face) — only while you can see them
    const h = this.hardLock;
    if (h && h.alive && (!this.fov || (h._vis || 1) > 0.35)) {
      this.redTri.visible = true;
      this.redTri.position.set(h.pos.x, h.pos.y + 15 + Math.sin(this.time * 5) * 0.7, h.pos.z);
    } else this.redTri.visible = false;
  }

  // ---------- field of vision ----------
  updateVision(dt) {
    const p = this.player;
    if (!p || !this.fov) { for (const e of this.entities) { e._vis = 1; if (e.obj) e.obj.visible = true; } this.world.setFogEnabled(false); return; }
    this.world.setFogEnabled(true);
    const h2 = this.humans[1] && this.humans[1].fighter;
    this.world.updateFog(p.pos.x, p.pos.z, p.aim.x, p.aim.z, p.def.colors.accent, (h2 && h2.alive) ? h2.pos : null);
    for (const e of this.entities) {
      if (e._banished) { e.obj.visible = false; continue; }   // BANISHED: they are not on this field at all
      if (this.isHuman(e) || e.team === p.team) { e._vis = 1; e.obj.visible = true; continue; }   // your own side is always visible (incl. AI partners)
      let see = this._humanSees(p, e) || (h2 && h2.alive && this._humanSees(h2, e));
      if (!see) { const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < this.visReveal && this._bright(e)) see = true; }
      e._vis = damp(e._vis == null ? (see ? 1 : 0) : e._vis, see ? 1 : 0, 12, dt);
      if (see && !e._seen) this._revealFx(e);
      if (!see && e._seen) this._lastKnown(e);
      e._seen = see;
      const show = e._vis > 0.35;
      if (e.obj.visible !== show) e.obj.visible = show;
    }
  }
  _humanSees(p, e) {
    if (p._revealT > 0) return true;                 // The Ring Sees — the network is her retina
    const vm = ((p.sheet && p.sheet.visMult) || 1) * (p.blindT > 0 ? 0.28 : 1);   // AWARENESS extends the eye — smoke closes it (manual §14)
    const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d < this.visNear * vm) return true;
    if (d < this.visRange * vm && ((dx / d) * p.aim.x + (dz / d) * p.aim.z) > this.visCos) return this.canSee(p, e);
    return false;
  }

  canSee(a, b) {
    for (const c of this.world.cover) {
      if (Math.min(a.pos.y, b.pos.y) + 5 > (c.top ?? c.h)) continue;              // both above the block → seen over it
      if (this._segBox(a.pos.x, a.pos.z, b.pos.x, b.pos.z, c.x, c.z, (c.hx ?? c.r) + 1, (c.hz ?? c.r) + 1)) return false;
    }
    // interior walls block sight exactly like cover, but only the buildings the segment touches
    // pay anything — corner-peeking inside a bungalow rides the SAME honesty machinery as outside.
    // ⚠ _segBox detects boundary CROSSINGS only — a segment fully inside the footprint (both
    // fighters in the same house, the corner-warfare case) never crosses it, so the gate must
    // also pass when either endpoint is inside.
    for (const it of (this.world.interiors || [])) {
      if (Math.min(a.pos.y, b.pos.y) + 5 > it.top) continue;
      const aIn = Math.abs(a.pos.x - it.x) < it.hx + 1 && Math.abs(a.pos.z - it.z) < it.hz + 1;
      const bIn = Math.abs(b.pos.x - it.x) < it.hx + 1 && Math.abs(b.pos.z - it.z) < it.hz + 1;
      if (!aIn && !bIn && !this._segBox(a.pos.x, a.pos.z, b.pos.x, b.pos.z, it.x, it.z, it.hx + 1, it.hz + 1)) continue;
      for (const wl of it.walls)
        if (this._segBox(a.pos.x, a.pos.z, b.pos.x, b.pos.z, wl.x, wl.z, wl.hx + 0.4, wl.hz + 0.4)) return false;
    }
    return true;
  }
  _segBox(x0, z0, x1, z1, cx, cz, hx, hz) {
    const dx = x1 - x0, dz = z1 - z0; let tmin = 0, tmax = 1;
    if (Math.abs(dx) < 1e-5) { if (x0 < cx - hx || x0 > cx + hx) return false; }
    else { let t1 = (cx - hx - x0) / dx, t2 = (cx + hx - x0) / dx; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return false; }
    if (Math.abs(dz) < 1e-5) { if (z0 < cz - hz || z0 > cz + hz) return false; }
    else { let t1 = (cz - hz - z0) / dz, t2 = (cz + hz - z0) / dz; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return false; }
    return tmin > 0.03 && tmin < 0.985;
  }
  _bright(e) {
    if (e.state === 'charge') return true;
    for (const o of this.projectiles.list) if (o.caster === e && (o.sustaining || (o.radius || 0) > 3.5)) return true;
    return false;
  }
  _revealFx(e) { if ((e._vis || 0) > 0.85) return; this.vfx.ring(e.pos.clone().setY(0.5), { color: e.def.colors.accent, r0: 1, r1: 8, life: 0.35, flat: true, y: 0.5 }); }
  _qSprite() {
    if (!this._qTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ff3b3b'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 32, 36); this._qTex = new THREE.CanvasTexture(c); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._qTex, transparent: true, depthTest: false, depthWrite: false })); s.scale.set(5, 5, 5); return s;
  }
  _lastKnown(e) {
    const m = new THREE.Mesh(this._ghostGeo, new THREE.MeshBasicMaterial({ color: '#9aa', transparent: true, opacity: 0.34, depthWrite: false }));
    m.position.copy(e.pos); m.position.y += 5; m.rotation.y = e.facing; this.scene.add(m);
    const q = this._qSprite(); q.position.set(e.pos.x, e.pos.y + 13, e.pos.z); this.scene.add(q);
    let t = 0; const life = 2.6;
    this.vfx._add({ update: (dt) => { t += dt; const k = t / life; m.material.opacity = 0.34 * (1 - k); q.material.opacity = 1 - k * k; return k >= 1; }, dispose: () => { this.scene.remove(m); m.material.dispose(); this.scene.remove(q); q.material.dispose(); } });
  }

  // Target the character the cursor is OVER; else the foe nearest the cursor (aim-assist).
  pickTarget(p) {
    const cx = this.input.mouse.clientX, cy = this.input.mouse.clientY;
    let hover = null, hoverD = 1e9, near = null, nearD = 110;   // magnet radius trimmed (was 210 — grabbed aim from across the screen)
    const sp = this._sp, sp2 = this._sp2 || (this._sp2 = { x: 0, y: 0, behind: false });
    for (const f of this.entities) {
      if (!this.isFoe(p, f)) continue;
      if (this.fov && (f._vis || 0) < 0.4) continue;                        // can't target what you can't see
      this.world.screenPosOf(f.pos.x, f.pos.y + 5, f.pos.z, sp);
      if (sp.behind) continue;
      this.world.screenPosOf(f.pos.x, f.pos.y + 9.5, f.pos.z, sp2);
      const half = Math.max(28, Math.hypot(sp.x - sp2.x, sp.y - sp2.y) + 22); // on-screen body size
      const d = Math.hypot(sp.x - cx, sp.y - cy);
      if (d < half && d < hoverD) { hoverD = d; hover = f; }               // cursor is over this character
      let nd = d; if (f === this._lastLock) nd -= 40;                      // stickiness
      if (nd < nearD) { nearD = nd; near = f; }
    }
    this._hoverPick = hover;                                               // direct-hover only — hard-lock uses this
    const pick = SETTINGS.aimAssist === false ? hover : (hover || near);   // options can turn the magnet off
    this._lastLock = pick; return pick;
  }

  // Nearest foe within a cone of a world aim direction (gamepad right-stick).
  pickTargetDir(p, dx, dz) {
    const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    let best = null, bestDot = 0.4;
    for (const f of this.entities) {
      if (!this.isFoe(p, f)) continue;
      const fx = f.pos.x - p.pos.x, fz = f.pos.z - p.pos.z, d = Math.hypot(fx, fz) || 1;
      if (d > 130) continue;
      const dot = (fx / d) * dx + (fz / d) * dz;
      if (dot > bestDot) { bestDot = dot; best = f; }
    }
    this._lastLock = best; return best;
  }

  slowmo(dur, mul = 0.42) { this._slowT = Math.max(this._slowT || 0, dur); this._slowMul = mul; }

  // ---------- SOUND: the honest way for a blind bot to find a fight ----------
  // Bots can no longer read your position (see ai.js THE HONESTY LAW), so the world has to be
  // audible instead. Explosions, heavy hits and KOs broadcast a position that nearby AI hears
  // with distance-scaled FUZZ — meaning a loud fighter draws a crowd and a quiet one can slip
  // a block over and vanish. `loud` ≈ 1 is a solid punch, 2+ is a detonation.
  noise(pos, loud = 1, src = null) {
    if (this.soundscape && this.soundscape.heard) this.soundscape.heard(loud, pos, this.player);   // the ambience DIRECTOR hears everything the bots do (manual §20)
    if (!this.entities.length) return;
    for (const e of this.entities) {
      if (!e.ai || !e.alive || e === src) continue;
      if (src && e.team === src.team) continue;               // your own side isn't hunting you
      e.ai.hear(pos.x, pos.z, pos.y || 0, loud);
    }
  }

  // An enemy beam currently aimed at f (for AI to block / counter).
  incomingBeam(f) {
    for (const o of this.projectiles.list) {
      if (o.sustaining === undefined || !o.sustaining || o.dead || o.team === f.team || o.caster === f) continue;
      const dx = f.pos.x - o.muzzle.x, dz = f.pos.z - o.muzzle.z, D = Math.hypot(dx, dz);
      if (D > o.maxLen + 10 || D < 3) continue;
      if ((o.dir.x * dx + o.dir.z * dz) / D > 0.7) return o;
    }
    return null;
  }
  // An enemy projectile heading at f.
  incomingProjectile(f) {
    for (const o of this.projectiles.list) {
      if (o.sustaining !== undefined || !o.vel || o.team === f.team) continue;
      const dx = f.pos.x - o.pos.x, dz = f.pos.z - o.pos.z, D = Math.hypot(dx, dz);
      if (D > 24 || D < 1) continue;
      const vl = Math.hypot(o.vel.x, o.vel.z) || 1;
      if ((o.vel.x * dx + o.vel.z * dz) / (D * vl) > 0.6) return o;
    }
    return null;
  }

  // Soft body separation so fighters don't stack (skips grab pairs).
  resolveBodies() {
    const E = this.entities;
    for (let i = 0; i < E.length; i++) {
      const a = E[i]; if (!a.alive) continue;
      for (let j = i + 1; j < E.length; j++) {
        const b = E[j]; if (!b.alive) continue;
        if (a.grabbing === b || b.grabbing === a || a.grabbedBy === b || b.grabbedBy === a) continue;
        if (Math.abs(b.pos.y - a.pos.y) > 7) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
        if (d < min && d > 0.001) {
          const push = (min - d) * 0.5, nx = dx / d, nz = dz / d;
          a.pos.x -= nx * push; a.pos.z -= nz * push; b.pos.x += nx * push; b.pos.z += nz * push;
        }
      }
    }
  }

  // ---------- setup ----------
  addFighter(def, opts) {
    const f = new Fighter(def, opts); f._game = this;
    f.stats = { dmg: 0, taken: 0, big: 0, bigKind: 'blast' }; f._bestStreak = 0;   // the news desk's stat sheet
    this.scene.add(f.obj); this.entities.push(f);
    return f;
  }

  startMatch(charId) {
    // clear
    for (const e of this.entities) { this.scene.remove(e.obj); if (e.dispose) e.dispose(); }
    this.entities.length = 0;
    for (const m of this.minions) if (m._dispose) m._dispose(this);   // ghost drones haunted rematches
    this.minions.length = 0;
    for (const c of this.constructs) c._dispose(this); this.constructs.length = 0;
    for (const pj of this.projectiles.list) if (pj._dispose) pj._dispose(this);   // returns pooled lights too
    this.projectiles.list.length = 0;
    while (this.portals.length) this._closePair(this.portals[0]);
    this.hardLock = null; this.lockTarget = null;
    this.world.resetTerrain(); this.vfx.clearScorches();   // restore blocks + flatten craters each match
    if (this.peds) this.peds.reset();
    if (this.news) this.news.reset(null);   // no crew on the legacy quick-boot path

    const def = ROSTER.find(r => r.id === charId) || ROSTER[0];
    this.player = this.addFighter(def, { isPlayer: true, team: 0, x: 0, z: 30 });
    this.player.ai = null;

    // the room starts EMPTY — N orders a training bot, B orders a rival
    this.running = true;
  }

  setPlayerChar(charId) {
    if (!this.player) return;
    const def = ROSTER.find(r => r.id === charId); if (!def) return;
    const { x, z } = this.player.pos; const y = this.player.pos.y;
    this.scene.remove(this.player.obj); if (this.player.dispose) this.player.dispose();
    const i = this.entities.indexOf(this.player); if (i >= 0) this.entities.splice(i, 1);
    this.player = this.addFighter(def, { isPlayer: true, team: 0, x, z });
    this.player.human = true; this.player.scheme = 'kbm';
    if (this.humans[0]) this.humans[0].fighter = this.player; else this.humans.push({ fighter: this.player, scheme: 'kbm' });
    this.player.pos.y = y;
    this.vfx.flash(this.player.pos.clone().setY(5), def.colors.accent, 10, 0.4);
    this.vfx.ring(this.player.pos.clone().setY(1), { color: def.colors.accent, r0: 2, r1: 16, life: 0.4, flat: true, y: 0.4 });
  }

  spawnDummy(x, z) {
    // a PROJECTED opponent, not a mannequin — cyan construct colours mark it as fabricated
    const def = { name: 'Sim Construct', colors: { primary: '#2f6f86', secondary: '#1d4a5c', accent: '#7fe6ff', skin: '#8fd8ee' }, hp: 120, ki: 100, speed: 0, abilities: {}, holo: true };
    const d = this.addFighter(def, { team: 1, dummy: true, x, z });
    return d;
  }

  spawnRival(charId) {
    const pick = charId ? ROSTER.find(r => r.id === charId) : ROSTER[(Math.random() * ROSTER.length) | 0];
    const ang = rand(0, TAU), r = 60;
    const b = this.addFighter(pick, { team: 1, x: Math.cos(ang) * r, z: Math.sin(ang) * r - 20 });
    b.ai = new AI(b, 1);
    this.vfx.flash(b.pos.clone().setY(5), pick.colors.accent, 10, 0.4);
    return b;
  }

  // ---------- modes & players ----------
  spawnEnemy(charId, o = {}) {
    const pick = charId ? (ROSTER.find(r => r.id === charId) || ROSTER[0]) : ROSTER[(Math.random() * ROSTER.length) | 0];
    const ang = rand(0, TAU), r = o.r ?? 70;
    const b = this.addFighter(pick, { team: o.team ?? 1, x: o.x ?? Math.cos(ang) * r, z: o.z ?? Math.sin(ang) * r });
    b.ai = new AI(b, o.aiLevel || 1);
    if (o.noRespawn) b.noRespawn = true;
    for (let i = 1; i < (o.level || 1); i++) this.levelUp(b, true);   // scale up quietly
    b.xp = 0;
    this.vfx.flash(b.pos.clone().setY(5), pick.colors.accent, 9, 0.35);
    return b;
  }
  // an online opponent: a real fighter whose authority lives on the other machine
  spawnRemote(charId) {
    const def = ROSTER.find(r => r.id === charId) || ROSTER[0];
    const f = this.addFighter(def, { team: 1, x: 0, z: -34 });
    f.remote = true; f.ai = null;
    return f;
  }
  // remote puppet: interpolate toward the streamed state; big jumps = their evade/teleport
  controlRemote(f, dt) {
    f.moveDir = { x: 0, z: 0 };
    const n = f._net; if (!n) return;
    const dx = n.x - f.pos.x, dy = n.y - f.pos.y, dz = n.z - f.pos.z;
    if (Math.hypot(dx, dz) > 26) { f.pos.set(n.x, n.y, n.z); this.afterimage(f); }
    else { const k = 1 - Math.exp(-12 * dt); f.pos.x += dx * k; f.pos.y += dy * k; f.pos.z += dz * k; }
    f.vel.set(n.vx || 0, n.vy || 0, n.vz || 0);               // drives the run/flight animation
    f.faceDir(Math.sin(n.f || 0), Math.cos(n.f || 0));
    if (n.a) f.aim3.set(n.a[0], n.a[1], n.a[2]);
    f.flying = !!n.fl;
    if (f.alive) f.guarding = !!n.gd;
    if (n.k != null) f.ki = n.k;
    if (n.h != null && f.alive) {                              // victim authority: their sim owns their hp
      if (n.h < f.hp - 0.5) f.hitFlash = 1;
      f.hp = n.h;
      if (f.hp <= 0) f._ko();                                  // the KO loop below scores it
    }
  }

  spawnHuman(charId, scheme, o = {}) {
    const def = ROSTER.find(r => r.id === charId) || ROSTER[0];
    const f = this.addFighter(def, { isPlayer: this.humans.length === 0, team: o.team ?? 0, x: o.x ?? 0, z: o.z ?? 30 });
    f.human = true; f.scheme = scheme; f.pnum = this.humans.length + 1;
    this.humans.push({ fighter: f, scheme });
    if (this.humans.length === 1) this.player = f;
    return f;
  }
  startMode(id, o = {}) {
    for (const e of this.entities) { this.scene.remove(e.obj); if (e.dispose) e.dispose(); }
    this.entities.length = 0; this.humans.length = 0;
    for (const m of this.minions) if (m._dispose) m._dispose(this);
    this.minions.length = 0;
    for (const c of this.constructs) c._dispose(this); this.constructs.length = 0;
    for (const pj of this.projectiles.list) if (pj._dispose) pj._dispose(this);
    this.projectiles.list.length = 0;
    while (this.portals.length) this._closePair(this.portals[0]);
    this.hardLock = null; this.lockTarget = null; this.combo = 0; this.comboT = 0;
    this.world.resetTerrain(); this.vfx.clearScorches();
    if (this.peds) this.peds.reset();
    this.modeId = id; this.mode = MODE_IMPL[id] || MODE_IMPL.training; this.ms = {}; this.matchOver = false; this.matchResult = null;
    this.friendlyFire = false;   // tournament setup flips it on
    // fresh match record + the field crew rolls out (they skip the Danger Room)
    this.matchT = 0; this.matchLog = []; this.cityStats = { civs: 0, cars: 0, blocks: 0, craters: 0, cops: 0 };
    this.bigHit = { amount: 0, by: null, kind: 'blast' }; this._p1MaxCombo = 0; this.matchReport = null;
    if (this.news) this.news.reset(id);
    if (this.police) this.police.reset();
    this.world.setSim(id === 'training');   // the Danger Room fabricates its world
    const two = !!o.twoPlayer;
    this.spawnHuman(o.p1 || 'sol', 'kbm', { x: two ? -20 : 0, z: 30 });
    if (two) this.spawnHuman(o.p2 || 'vega', 'pad', { x: 20, z: 30, team: id === 'duel' ? 1 : 0 });
    this.mode.setup(this, o);
    this.running = true;
  }
  endMatch(result) {
    if (this.matchOver) return;
    this.matchOver = true; this.matchResult = result;
    this.slowmo(0.35, 0.4); this.world.punch(0.8);
    // NOTE: a live recording keeps rolling behind the end screen (the final KO's ragdoll IS the
    // money shot) — it finalizes on its own clock into the same clips array the TV is playing.
    try { this.matchReport = buildReport(this, result); } catch (e) { console.error('news desk', e); this.matchReport = null; }
    // decided duels move the book at match weight (tournament rounds are booked by the bracket)
    try {
      if (this.modeId === 'duel' && this.ms.p1 && this.ms.enemy && this.ms.enemy.def) {
        const w = result.win ? this.ms.p1 : this.ms.enemy, l = result.win ? this.ms.enemy : this.ms.p1;
        if (w.def.id && l.def.id) {
          matchElo(w.def.id, l.def.id, [w.def, l.def], 'duel');
          for (const id of [w.def.id, l.def.id]) {            // a completed bout is medicine (manual §18)
            const h = healBout(id);
            if (h && h.cleared && this.hud) this.hud.feed(`MEDICAL: ${id.toUpperCase()} cleared to fight — ${h.name} healed`, '#8fe08a');
          }
        }
      }
      // an Invitational match reports to the bracket: books tournament Elo, sims the rest of the
      // round off-screen, and — if this was the final or the player's exit — crowns the champion
      if (this.modeId === 'tournament' && this.ms.T && this.ms.m) {
        const sc = result.win ? [this.ms.aWins, this.ms.bWins] : [this.ms.bWins, this.ms.aWins];   // winner-first, like a real box score
        this.ms.T.reportPlayerMatch(this.ms.m, result.win, sc);
      }
    } catch (e) { console.error('rankings', e); }
    if (this.onMatchEnd) { try { this.onMatchEnd(result); } catch (e) { console.error('onMatchEnd', e); } }
    if (this.hud) this.hud.showEndScreen(result, this);
  }
  // One elimination round of an Invitational match: full respawn of both sides in line formations.
  // City damage PERSISTS across rounds — the battlefield remembers, and so does the news desk.
  _tourneyRound() {
    const ms = this.ms, T = ms.T, m = ms.m; if (!m) return;
    // the tape is cumulative: lead fighters inherit their stat sheets across rounds
    const prevA = ms.aLeadF ? ms.aLeadF.stats : null, prevB = ms.bLeadF ? ms.bLeadF.stats : null;
    for (const e of this.entities) { this.scene.remove(e.obj); if (e.dispose) e.dispose(); }
    this.entities.length = 0; this.humans.length = 0;
    for (const m of this.minions) if (m._dispose) m._dispose(this);
    this.minions.length = 0;
    for (const c of this.constructs) c._dispose(this); this.constructs.length = 0;
    for (const pj of this.projectiles.list) if (pj._dispose) pj._dispose(this);
    this.projectiles.list.length = 0;
    while (this.portals.length) this._closePair(this.portals[0]);
    this.hardLock = null; this.lockTarget = null;
    const mine = T.sides[0], theirs = T.playerFoeSide(m);
    const p1 = this.spawnHuman(mine.ids[0], 'kbm', { x: mine.ids.length > 1 ? -13 : 0, z: 46 });
    p1.noRespawn = true;                                     // elimination rules — a round death sticks
    if (prevA) p1.stats = prevA;
    ms.aLeadF = p1;
    for (let i = 1; i < mine.ids.length; i++) {
      const ally = this.spawnEnemy(mine.ids[i], { team: 0, x: 13 + (i - 1) * 22, z: 48, aiLevel: 1.15 });
      ally.noRespawn = true;
    }
    theirs.ids.forEach((id, i) => {
      const foe = this.spawnEnemy(id, { team: 1, x: (i - (theirs.ids.length - 1) / 2) * 26, z: -46, aiLevel: 1.2 });
      foe.noRespawn = true;
      if (i === 0) { if (prevB) foe.stats = prevB; ms.bLeadF = foe; }
    });
    ms.roundLive = true;
    if (this.hud) {
      this.hud.setPlayer(p1.def);
      this.hud.announce('ROUND ' + ms.round, ms.roundName + ' · vs ' + T.sideName(theirs), '#ffd24a');
    }
  }
  _waveCount(n) { return Math.min(6, 1 + Math.floor(n * 0.7)); }
  _spawnWave(n) {
    const count = this._waveCount(n), level = 1 + Math.floor((n - 1) / 2), chars = ROSTER.map(r => r.id);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU;
      this.spawnEnemy(chars[(Math.random() * chars.length) | 0], { x: Math.cos(ang) * 100, z: Math.sin(ang) * 100, level, aiLevel: Math.min(1.7, 1 + n * 0.05), noRespawn: true });
    }
  }

  // ---------- combat helpers ----------
  // fixation (police tunnel vision): a fixated fighter ONLY fights its fixation, and nobody
  // else's targeting minds the badge — heroes who keep civilians safe never trade with cops.
  isFoe(a, b) {
    if (!b || !b.alive || b === a || a.isDummy) return false;
    if (a.fixation) return b === a.fixation;
    if (b.fixation && b.fixation !== a) return false;
    return b.team !== a.team || b.isDummy;
  }

  // DECOY HOLOGRAM (brief T2.9): an untargetable copy that enemies RETARGET onto. It is not
  // a fighter — it never takes damage, never blocks, casts no contact shadow — it is a lie the
  // AI's own targeting believes, and it glitches instead of reacting when struck.
  spawnDecoy(caster, dur = 5) {
    const g = new THREE.Group();
    const src = caster.obj;
    const clone = src.clone(true);
    clone.traverse(o => {
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true; o.material.opacity = 0.62;
        if (o.material.emissive) { o.material.emissive.set(caster.def.colors.accent); o.material.emissiveIntensity = 0.5; }
      }
      if (o.isMesh) o.castShadow = false;                   // no proper contact shadow — the tell
    });
    g.add(clone);
    g.position.copy(caster.pos); g.rotation.y = caster.facing;
    this.scene.add(g);
    const d = { grp: g, t: dur, dur, owner: caster, pos: g.position, alive: true, isDecoy: true,
                team: caster.team, def: caster.def, name: caster.name, radius: caster.radius || 3 };
    (this._decoys = this._decoys || []).push(d);
    this.vfx.ring(caster.pos.clone().setY(1), { color: caster.def.colors.accent, r0: 1, r1: 7, life: 0.3, flat: true, y: 0.5 });
    this.audio.teleport(caster.pos);
    return d;
  }
  updateDecoys(dt) {
    const D = this._decoys; if (!D || !D.length) return;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i]; d.t -= dt;
      // slight colour separation + occasional frame-skip: it reads as a projection, not a body
      const skip = Math.random() < 0.03;
      d.grp.visible = !skip;
      d.grp.position.y = d.pos.y + Math.sin(this.time * 9) * 0.06;
      if (d.t <= 0) {
        this.scene.remove(d.grp);
        d.grp.traverse(o => { if (o.material) o.material.dispose(); });
        this.vfx.flash(d.pos.clone().setY(5), d.def.colors.accent, 6, 0.16);
        D.splice(i, 1);
      }
    }
  }
  // a decoy is a legal TARGET but never a real one — nearestFoe is where bots decide
  nearestFoe(caster, pos, maxDist = 200) {
    let best = null, bd = maxDist * maxDist;
    // a live decoy on the other team outranks the real body: that is the entire point of it
    for (const d of (this._decoys || [])) {
      if (!d.alive || d.team === caster.team) continue;
      const dx = d.pos.x - pos.x, dz = d.pos.z - pos.z; const dd = dx * dx + dz * dz;
      if (dd < bd) { bd = dd; best = d; }
    }
    for (const f of this.entities) {
      if (!this.isFoe(caster, f)) continue;
      const dx = f.pos.x - pos.x, dz = f.pos.z - pos.z; const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  overlapFoe(caster, pos, radius) {
    for (const f of this.entities) {
      if (!this.isFoe(caster, f)) continue;
      const dx = f.pos.x - pos.x, dz = f.pos.z - pos.z;
      if (Math.hypot(dx, dz) < radius + f.radius && Math.abs(pos.y - (f.pos.y + 5)) < 9) return f;
    }
    return null;
  }

  coneFoe(caster, range, arc) {
    let best = null, bd = range * range;
    for (const f of this.entities) {
      if (!this.isFoe(caster, f)) continue;
      const dx = f.pos.x - caster.pos.x, dz = f.pos.z - caster.pos.z; const d = Math.hypot(dx, dz);
      if (d > range) continue;
      // the VERTICAL GATE (altitude plan F5): a jab must not connect with a foe a whole band
      // overhead — melee and grabs are same-deck weapons. ~one storey of tolerance.
      if (Math.abs(f.pos.y - caster.pos.y) > 10) continue;
      const dot = (dx / (d || 1)) * caster.aim.x + (dz / (d || 1)) * caster.aim.z;
      if (dot < Math.cos(arc)) continue;
      if (d * d < bd) { bd = d * d; best = f; }
    }
    return best;
  }

  // AN ARMED CITIZEN FIRES. The street answering back — see THE VIGILANTISM LAW in
  // pedestrians.js. Deliberately a real ballistic round and nothing special: it meets ARMOUR and
  // TOUGHNESS like any other bullet, so against a Might-10 frame it is almost nothing. The point
  // is not the damage. It is the noise (police hear it), the tally, and the fact that a city
  // where vigilantism is banned physically shoots at you.
  civilianShot(x, z, target) {
    if (!target || !target.alive) return;
    // ⚠ do NOT use the shared _v here — spawnProjectile keeps the pos vector, and _v is reused
    // by the very next caller (the aliasing rule at the top of projectiles.js, same class of bug).
    const from = new THREE.Vector3(x, 6.4, z);
    const dir = new THREE.Vector3(target.pos.x - x, (target.pos.y + 5) - 6.4, target.pos.z - z).normalize();
    // civilians are bad shots — a wide, honest spread
    dir.x += (Math.random() - 0.5) * 0.13; dir.y += (Math.random() - 0.5) * 0.06; dir.z += (Math.random() - 0.5) * 0.13;
    this.projectiles.spawnProjectile({ pos: from, team: 3, def: { colors: { accent: '#c9b98a' } }, name: 'CITIZEN', powerBuff: 1, alive: true, isCivilian: true }, {
      pos: from, vel: dir.normalize().multiplyScalar(150),
      radius: 0.5, damage: 9, blast: 0, power: 0.2, life: 1.5,
      bullet: true, ballistic: true, weapon: 'pistol', color: '#c9b98a',
    });
    this.audio.gunshot && this.audio.gunshot(0.55, { x, z });
    this.noise({ x, y: 6, z }, 0.7, null);     // the police HEAR the street shooting
    this.cityStats.shots = (this.cityStats.shots || 0) + 1;
  }

  areaDamage(caster, pos, radius, damage, power = 1, o = {}) {
    for (const f of this.entities) {
      const foe = this.isFoe(caster, f);
      // TEAM DAMAGE (tournament ruling): with friendlyFire on, your splash catches your OWN side
      // at half strength. Melee and beams stay disciplined — explosions do not.
      const ff = !foe && this.friendlyFire && f !== caster && f.alive && f.def && !f.isDummy && f.team === caster.team;
      if (!foe && !ff) continue;
      const dx = f.pos.x - pos.x, dz = f.pos.z - pos.z, dy = (f.pos.y + 5) - pos.y;
      const d = Math.hypot(dx, dz, dy);
      if (d > radius + f.radius) continue;
      const fall = 1 - clamp(d / (radius + f.radius), 0, 1) * 0.6;
      const kb = _v.set(dx, 0, dz).setLength((damage * 0.6 + 12) * fall);
      // src attribution: explosions now CREDIT the blaster (artillery kills used to score nobody)
      const dealt = f.takeDamage(damage * fall * caster.powerBuff * (ff ? 0.5 : 1), { src: caster, kb, launch: (6 + power * 6) * fall, hitstop: 0.05, dtype: o.dtype });
      if (o.dot && dealt > 0) f.addDot({ ...o.dot, src: caster });   // caustic/incendiary payloads ride the blast
      if (o.freeze && dealt > 0 && f.addFrost) f.addFrost(o.freeze, caster);   // ice-slick traps ENCASE (brief Tier1 #9)
      if (ff && dealt >= 3 && this.hud && (this._ffFeedT || 0) <= this.time - 2.5) {
        this._ffFeedT = this.time;
        this.hud.feed(`⚠ FRIENDLY FIRE — ${caster.name} clipped ${f.name}`, '#ffb03a');
      }
    }
    this.worldImpact(pos, radius, power, caster);   // crater the ground + damage cover + street life
  }

  // A splash: ripple rings on the surface + spray. Fired by blasts over water and by ragdolls
  // going in ("carry the fall" — it reads under slow-mo because the rings live ~0.5s).
  splash(pos, power = 1) {
    const p = new THREE.Vector3(pos.x, 0.55, pos.z);
    this.vfx.ring(p, { color: '#bfe8f0', r0: 1.5, r1: 9 + power * 8, life: 0.5 });
    this.vfx.ring(p, { color: '#7fb8c8', r0: 1, r1: 5 + power * 5, life: 0.34 });
    const n = Math.round(8 + power * 9);
    for (let i = 0; i < n; i++) this.particles.spawn({
      x: pos.x + (Math.random() - 0.5) * 4, y: 0.6, z: pos.z + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 15, vy: 8 + Math.random() * 15 * power, vz: (Math.random() - 0.5) * 15,
      life: 0.45 + Math.random() * 0.3, size: 1 + Math.random() * 1.1, color: ['#cfeef8', '#9fd4e8'], drag: 1.4, shrink: true,
    });
    if (this.audio.splash) this.audio.splash(power, pos);
  }

  // ---------- destructible environment ----------
  // A blast on the world: crater the ground (big hits only) and damage nearby cover.
  worldImpact(pos, radius, power = 1, src = null) {
    if (pos.y < 6.5 && (power >= 1.25 || radius >= 14)) {
      this.world.crater(pos.x, pos.z, Math.min(radius * 0.45, 22), Math.min(power * 1.3, 5));
      this.vfx.scorch(new THREE.Vector3(pos.x, 0.14, pos.z), Math.min(radius * 0.5, 24), '#161a22');  // scorched pit
      this.cityStats.craters++;
    }
    // over WATER a blast reads as water — ripple rings, spray, and the right sound
    if (pos.y < 7 && this.world.waterAt && this.world.waterAt(pos.x, pos.z)) this.splash(pos, Math.min(2, power));
    if (this.news) this.news.onBlast(pos, radius, power);   // the crew ducks — or eats pavement
    this.noise(pos, Math.min(2.6, 0.9 + power * 0.6 + radius * 0.02), src);   // detonations carry
    for (let i = this.world.cover.length - 1; i >= 0; i--) {
      const c = this.world.cover[i]; if (c.hp == null || c.hp <= 0) continue;
      const d = Math.hypot(pos.x - c.x, pos.z - c.z);
      if (d < radius + (c.r || 6)) { const fall = 1 - clamp((d - (c.r || 6)) / (radius + 1), 0, 1); this.damageBlock(c, power * 20 * fall, pos); }
    }
    // parked cars catch blasts and go up in chained fireballs
    if (this.world.cars) for (const car of this.world.cars) {
      if (car.dead) continue;
      const d = Math.hypot(pos.x - car.x, pos.z - car.z);
      if (d < radius + 5) { car.hp -= 12 + power * 10; if (car.hp <= 0) this._explodeCar(car, src); }
    }
    // the crowd reacts: scatter wide; anyone caught in the blast goes down (collateral)
    if (this.peds && pos.y < 12) {
      this.peds.scare(pos.x, pos.z, radius * 4);
      const downed = this.peds.blast(pos.x, pos.z, Math.max(6, radius * 0.85));
      if (downed) {
        this.cityStats.civs += downed;
        if (this.police) this.police.onCivHarm(src, downed);   // the villain is whoever hurts humans
        if (this.hud) this.hud.feed(`⚠ COLLATERAL — ${downed} civilian${downed > 1 ? 's' : ''} down`, '#ff8a6a');
        if (src && this.isHuman(src)) src.score = Math.max(0, (src.score || 0) - 40 * downed);
        if (downed >= 2 && this.news) this.news.highlight('collateral', 'CIVILIANS CAUGHT IN THE BLAST', { dur: 2.0, priority: 1, focus: pos });
      }
    }
  }
  _explodeCar(car, src) {
    car.dead = true; car.mesh.position.y = -0.25;
    // plain cars are one mesh; police cruisers are a GROUP (body + light bar) — char it ALL, kill the lights
    if (car.mesh.isGroup) car.mesh.traverse(o => { if (o.material) { o.material = this.world._charred; } });
    else car.mesh.material = this.world._charred;
    const pos = { x: car.x, y: 2.5, z: car.z };
    this.cityStats.cars++;
    if (this.news) this.news.highlight('car', 'VEHICLE FIRE — POSSIBLE CHAIN REACTION', { dur: 2.0, priority: 2, focus: pos });
    this.vfx.flash(new THREE.Vector3(car.x, 3, car.z), '#ff8a3d', 14, 0.5);
    this.particles.burst(car.x, 2, car.z, { count: 26, speed: 26, life: 0.85, size: 5.2, color: ['#ff8a3d', '#ffd24a', '#22232c'], up: 15, grav: 8, drag: 1.2 });
    this.vfx.scorch(new THREE.Vector3(car.x, 0.18, car.z), 8, '#161a22');
    this.audio.boom(0.55, pos); this.world.shake(1.2); this.world.punch(0.85);
    this.areaDamage(src || this.player, pos, 14, 22, 2);   // hero-scale fireball — hurts fighters, craters, CHAINS to the next car
  }
  damageBlock(c, amt, pos) {
    if (c.hp == null || c.hp <= 0 || amt <= 0) return;
    c.hp -= amt;
    const py = Math.min(c.top || c.h, (pos && pos.y) || 6);
    this.particles.burst(c.x + rand(-c.hx, c.hx), py, c.z + rand(-c.hz, c.hz), { count: 4 + (amt * 0.12 | 0), speed: 12, life: 0.5, size: 3.2, color: ['#3a3a44', '#22232c', '#6a6a74'], up: 5, grav: 8, drag: 1.5 });
    this.world.setBlockCracks(c);
    if (c.hp <= 0) this.shatterBlock(c);
  }
  shatterBlock(c) {
    this.cityStats.blocks++;
    if (this.news) this.news.highlight('building', 'STRUCTURE COLLAPSE — ' + this.world.districtAt(c.x, c.z), { dur: 2.6, priority: 2, focus: { x: c.x, y: 8, z: c.z } });
    const w = c.w || c.r * 1.6, h = c.h, d = c.d || c.r * 1.6;
    const mat = new THREE.MeshStandardMaterial({ color: '#b5ae9e', roughness: 0.9, metalness: 0.05 });   // white-stone rubble
    for (let i = 0; i < 11; i++) {
      const s = rand(1.4, 3.4);
      const chunk = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
      let px = c.x + rand(-w / 2, w / 2), py = rand(2, h), pz = c.z + rand(-d / 2, d / 2);
      chunk.position.set(px, py, pz); chunk.castShadow = true; this.scene.add(chunk);
      let vx = rand(-20, 20), vy = rand(12, 28), vz = rand(-20, 20), sp = rand(-7, 7), t = 0;
      this.vfx._add({
        update: (dt) => { t += dt; vy -= 62 * dt; px += vx * dt; py += vy * dt; pz += vz * dt; if (py < 1) { py = 1; vy *= -0.32; vx *= 0.6; vz *= 0.6; } chunk.position.set(px, py, pz); chunk.rotation.x += sp * dt; chunk.rotation.z += sp * 0.7 * dt; if (t > 2) { chunk.material.transparent = true; chunk.material.opacity = Math.max(0, 1 - (t - 2) / 0.9); } return t > 2.9; },
        dispose: () => { this.scene.remove(chunk); chunk.geometry.dispose(); },
      });
    }
    this.particles.burst(c.x, h * 0.5, c.z, { count: 28, speed: 16, life: 1.0, size: 6.5, color: ['#cfc8b8', '#8b8577', '#e8e2d4'], up: 8, grav: 4, drag: 1.2 });   // masonry dust
    this.vfx.scorch(new THREE.Vector3(c.x, 0.2, c.z), (c.r || 6) * 1.25, '#20242e');
    this.world.crater(c.x, c.z, (c.r || 6) * 0.7, 2.2);
    const mesh = c.mesh, crack = c.crack, y0 = c.y0; this.world.removeBlockFromCover(c);
    let ct = 0; this.vfx._add({
      update: (dt) => { ct += dt; const k = clamp(ct / 0.5, 0, 1); mesh.position.y = y0 - k * (h * 0.92); mesh.scale.y = Math.max(0.04, 1 - k); if (crack) { crack.position.y = mesh.position.y; crack.scale.copy(mesh.scale); crack.material.opacity = 0.9 * (1 - k); } return k >= 1; },
      dispose: () => { mesh.visible = false; if (crack) crack.visible = false; },   // hidden, not disposed — resetTerrain restores it
    });
    this.world.shake(1.5); this.world.punch(0.9); this.audio.boom(0.6, { x: c.x, z: c.z });
  }

  // ---------- gamified combat: kills, streaks, XP/levels, announcer ----------
  isHuman(f) { return this.humans.some(h => h.fighter === f); }

  handleKO(victim) {
    // THE DROP ECONOMY (manual §16): KO'd gear carriers leave a weapon on the street — 20s to
    // claim it. Held pickups fall too. Police sidearms join the economy the same way.
    if (!victim.isDummy) {
      if (victim._gearHeld) this.dropGear(victim, true);
      const gearAb = Object.values(victim.slots).map(s => s && s.def).find(d => d && d.gear);
      if (gearAb && (this._drops || []).length < 10) this.spawnGearDrop(gearAb, victim.pos.x + (Math.random() * 5 - 2.5), victim.pos.z + (Math.random() * 5 - 2.5));
    }
    const src = victim.lastHitBy;
    const killer = (src && victim.lastHitT < 4 && src !== victim && src.def) ? src : null;
    if (killer) {
      const bonus = 100 + Math.max(0, killer.streak) * 25;
      killer.kills++; killer.score += bonus; killer.streak++;
      this.grantXp(killer, 45 + victim.level * 12);
      if (this.isHuman(killer)) this.announceKill(killer, victim, bonus);
      killer.lastKillT = 0;
    }
    victim.streak = 0;
    if (killer) killer._bestStreak = Math.max(killer._bestStreak || 0, killer.streak);
    // ---------- DEPTH HOOKS, part two: what a knockdown MEANS ----------
    if (killer && !victim.isDummy) {
      const kind = victim._lastHitKind || 'blast';
      // (6) ENVIRONMENTAL CALLOUTS — how they died is its own little story
      if (this.isHuman(killer) && this.hud) {
        if (kind === 'slam') this.hud.announce('DEMOLITION', `${victim.name} went through the city`, '#c9c2b4');
        else if (victim.pos.y > 40) this.hud.announce('SKYFALL', `${victim.name} fell out of the sky`, '#7fe6ff');
        else if ((killer.style || 0) > 70) this.hud.announce('STYLISH K.O.', 'variety bonus banked', '#ffd24a');
      }
      // (7) NEMESIS — settle the score and get paid for it
      if (killer._nemesis === victim) {
        killer._nemesis = null; killer.score += 250;
        if (this.isHuman(killer) && this.hud) this.hud.announce('SCORE SETTLED', `${victim.name} is no longer your nemesis`, '#8fe08a');
      }
      if (this.isHuman(victim) && victim._lastAggressor && victim._lastAggressor.alive) {
        victim._nemesis = victim._lastAggressor;
        if (this.hud) this.hud.feed(`☠ ${victim._nemesis.name} is your NEMESIS — pay them back`, '#ff8a6a');
      }
      // (8) STYLE BANKED — the meter converts to score, then resets. Spend it or lose it.
      if (this.isHuman(killer) && (killer.style || 0) > 25) {
        const rank = killer.style > 90 ? 'S' : killer.style > 65 ? 'A' : killer.style > 40 ? 'B' : 'C';
        killer.score += Math.round(killer.style * 3);
        if (this.hud) this.hud.scorePopup(victim.pos, `${rank}-RANK +${Math.round(killer.style * 3)}`);
        killer.style = 0; killer._styleSeen = {};
      }
      // (9) THE CROWD REACTS — civilians nearby cheer the takedown (they film everything anyway)
      if (this.peds && this.isHuman(killer)) {
        for (let i = 0; i < 26; i++) this.particles.spawn({ x: victim.pos.x + rand(-22, 22), y: rand(1, 9), z: victim.pos.z + rand(-22, 22), vx: 0, vy: rand(9, 20), vz: 0, life: 0.7, size: 2.2, color: ['#ffd24a', '#fff'], drag: 1.1, shrink: true });
      }
    }
    // (10) MASTERY — every kit logs its own use count, so the codex can show what you actually fight with
    if (killer && killer.def && killer._lastSlot) {
      killer._mastery = killer._mastery || {};
      killer._mastery[killer._lastSlot] = (killer._mastery[killer._lastSlot] || 0) + 1;
    }
    if (victim.def.police && this.police) this.police.onCopDown(killer);   // villainy squared
    // THE HERO SIDE — a CLEAN rival takedown (no civilians harmed, not a cop, not a civilian) by the
    // human player, in a country where vigilantism is legal, makes the crowd cheer instead of flee.
    if (killer && this.isHuman(killer) && !victim.def.police && !victim.isDummy && !killer.def.police
        && this.peds && this.peds.cheer && this.police && this.police.heatOf(killer) < 8) {
      this.peds.cheer(victim.pos.x, victim.pos.z);
    }
    // the news layer: log the knockdown, and the camera swings to the body
    if (!victim.isDummy && this.mode) {
      this.matchLog.push({ t: this.matchT, type: 'ko', v: victim.name, vid: victim.def.id, k: killer ? killer.name : null, kid: killer && killer.def ? killer.def.id : null, kind: victim._lastHitKind || 'blast', at: this.world.districtAt(victim.pos.x, victim.pos.z) });
      if (this.news) this.news.highlight('ko', victim.name + ' IS DOWN' + (killer ? ' — ' + killer.name + ' STANDS' : ''), { dur: 3.4, priority: 3, focus: victim.pos });
      if (this.audio.sample && (this.isHuman(victim) || (killer && this.isHuman(killer)))) this.audio.sample('sting.ko', { bus: 'music', gain: 0.8 });
      // the ledger: every registered-weapon knockdown moves the power rankings (AI or human pilot
      // alike) — friendly-fire KOs shame the feed but never touch the book
      if (killer && killer.def && killer.def.id && victim.def.id && killer.team !== victim.team && !killer.def.police && !victim.def.police
        && !killer._controlled && !victim._controlled && this.modeId !== 'training') {
        koElo(killer.def.id, victim.def.id, [killer.def, victim.def]);   // a DOMINATED fighter's KOs are the controller's doing — the book stays honest
        // THE MEDICAL LEDGER (manual §18): some knockdowns leave a mark that outlives the match
        if (Math.random() < 0.3) {
          const inj = bookInjury(victim.def.id, victim._lastHitKind || 'strike', victim.def);
          if (inj) {
            if (this.hud) this.hud.feed(`MEDICAL: ${victim.name} — ${inj.name}, out ${inj.bouts} sanctioned bouts of form`, '#ff8a6a');
            (this._medNews = this._medNews || []).push({ name: victim.name, injury: inj.name, bouts: inj.bouts });   // the news desk reads the same record
          }
        }
      }
    }
    this.audio.cry(victim.def.voicePitch || 1, victim.pos);   // the falling wail
    this.noise(victim.pos, 2.2, null);                        // a death scream carries across the district
    // KO flourish — slowmo + banner when a human is involved (avoids spam in bot-vs-bot rumble)
    const involvesHuman = this.isHuman(victim) || (killer && this.isHuman(killer));
    if (involvesHuman) {
      this.slowmo(0.45, 0.34); if (this.world.punch) this.world.punch(0.9);
      if (this.hud && this.hud.showKO) {
        const down = this.isHuman(victim);
        this.hud.showKO(down ? 'DOWN' : 'K.O.', victim.name, down ? '#ff5a4a' : (killer ? killer.def.colors.accent : '#fff'));
      }
    }
    if (this.mode && this.mode.onKO && !this.matchOver) this.mode.onKO(this, victim, killer);   // the scoreboard freezes with the final whistle
    if (this.onKill) this.onKill(victim);
  }

  grantXp(f, amt) {
    if (!f) return; f.xp += amt;
    while (f.level < 10 && f.xp >= f.xpNext) { f.xp -= f.xpNext; this.levelUp(f); }
    if (f.level >= 10) f.xp = Math.min(f.xp, f.xpNext);
  }
  levelUp(f, quiet = false) {
    f.level++; f.xpNext = Math.round(f.xpNext * 1.35);
    f.levelMult = 1 + (f.level - 1) * 0.06;              // level → damage (capped at lvl 10)
    if (f.buffT <= 0) f.powerBuff = f.levelMult;
    f.maxHp = Math.round(f.maxHp * 1.07); f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.25);
    f.maxKi = Math.round(f.maxKi * 1.04);
    // POWER TIERS (super-saiyan style): crossing 4/7/10 is a TRANSFORMATION, not just a number.
    // Android cores (energyInfinite) never drain — but they CAP at Tier II: ascended heroes out-scale them.
    let newTier = tierOf(f.level);
    if (f.energyInfinite) newTier = Math.min(newTier, 2);
    const tiered = newTier > f.tier; f.tier = newTier;
    if (!quiet) {
      const tc = TIER_COLORS[f.tier] || f.def.colors.accent;
      if (tiered) {
        this.vfx.explode(f.pos.clone().setY(5), { color: tc, color2: '#fff', radius: 16, power: 1.8, scorch: false });
        this.vfx.shockwave(f.pos.clone().setY(0.2), { color: tc, radius: 46, power: 1.6 });
        this.vfx.lightning(f.pos.clone().setY(2), { color: tc, count: 6, radius: 16, height: 22 });
        for (let i = 0; i < 60; i++) this.particles.spawn({ x: f.pos.x + rand(-3, 3), y: rand(0, 6), z: f.pos.z + rand(-3, 3), vx: rand(-3, 3), vy: rand(26, 50), vz: rand(-3, 3), life: 1.2, size: 3.6, color: [tc, '#fff'], drag: 0.5 });
        this.world.punch(0.7); this.world.shake(1.8); this.audio.power(true); this.audio.boom(0.8, f.pos);
        f._yellCd = 0; this.heroYell(f, 1.6);   // the ascension SCREAM
        this.slowmo(0.3, 0.4);
        if (this.hud && (this.isHuman(f) || this.mode)) this.hud.announce('TIER ' + ['', 'I', 'II', 'III', 'MAX'][f.tier], f.name + ' ASCENDS', tc);
        // ASCENDING SPITS. Three arcs over half a second — the air can't hold it.
        if (this.audio.arc) for (let i = 0; i < 3; i++) setTimeout(() => this.audio.arc(1.1 + f.tier * 0.2, f.pos), i * 140);
        if (this.news) this.news.highlight('tier', f.name + ' ASCENDS — POWER READINGS SPIKE', { dur: 2.4, priority: 2, focus: f.pos });
      } else {
        this.vfx.explode(f.pos.clone().setY(5), { color: f.def.colors.accent, color2: '#fff', radius: 11, power: 1.1, scorch: false });
        this.vfx.ring(f.pos.clone().setY(3), { color: f.def.colors.accent, r0: 2, r1: 24, life: 0.6, flat: true, y: 0.5 });
        this.audio.power(true);
        if (this.isHuman(f) && this.hud) this.hud.announce('LEVEL ' + f.level, `+6% DMG · +7% HP · +4% KI`, f.def.colors.accent);   // the delta card — SEE what leveling gave you
      }
    } else f.tier = newTier;
  }
  announceKill(killer, victim, bonus) {
    if (!this.hud) return;
    let text = null, sub = killer.name;
    if (!this.ms.firstBlood) { this.ms.firstBlood = true; text = 'FIRST BLOOD'; }
    else if (killer.lastKillT < 2.2) { killer._multi = (killer._multi || 1) + 1; const m = killer._multi; text = m >= 4 ? 'QUAD KO!' : m === 3 ? 'TRIPLE KO!' : 'DOUBLE KO!'; }
    else { killer._multi = 1; const s = killer.streak; if (s === 3) text = 'RAMPAGE'; else if (s === 5) text = 'UNSTOPPABLE'; else if (s >= 7) text = 'GODLIKE'; if (text) sub = killer.name + ' · ' + s + ' streak'; }
    if (text && this.hud) this.hud.announce(text, sub, killer.def.colors.accent);
    if (killer === this.player && this.hud && this.hud.scorePopup) this.hud.scorePopup(victim.pos, bonus);
  }

  // ---------- energy clarity ----------
  // A sustained/charged ability just ran the caster's ki dry. Make the failure readable:
  // smoke-fizzle VFX, a power-down cue, a DRAINED tag, and a short "winded" state the HUD shows.
  onDrained(f) {
    if (f.drainedT > 0.2) return;                      // debounce — one cue per drain event
    f.drainedT = 1.5;
    this.particles.burst(f.pos.x, f.pos.y + 6, f.pos.z, { count: 12, speed: 9, life: 0.7, size: 3.2, color: ['#6a7078', '#3a3f47', f.def.colors.accent], up: 7, grav: -2, drag: 1.8 });
    this.vfx.ring(f.pos.clone().setY(f.pos.y + 5), { color: '#8a9099', r0: 4, r1: 1, life: 0.3 });
    try { this.audio.zap(140); this.audio.zap(90); } catch (e) {}
    if (this.isHuman(f) && this.hud) {
      this.hud.damageNumber(f.pos, 'DRAINED', '#7fbfff', true);
      if (this.hud.kiWarn) this.hud.kiWarn();
    }
  }
  // The DBZ voice: charge screams, transformation roars, battle shouts — per-character pitch,
  // proximity-attenuated, cooldown so nobody screams every frame.
  heroYell(f, intensity = 1) {
    if (!f.def.yells || (f._yellCd || 0) > 0 || f.state === 'ko') return;
    f._yellCd = 1.4 + Math.random() * 0.5;
    this.audio.yell(f.def.voicePitch || 1, 0.5 + intensity * 0.45, intensity, f.pos);
  }

  // A launched fighter just hit a wall / the ground hard (entity._slam). Sell the crunch.
  onSlam(f, dmg, kind) {
    const p = f.pos.clone().setY(f.pos.y + 4);
    this.vfx.impactStar(p, 8 + dmg * 0.35, '#ffffff', 0.18);
    this.particles.burst(f.pos.x, f.pos.y + 3, f.pos.z, { count: 14, speed: 24, life: 0.5, size: 3, color: ['#8a8f99', '#fff', f.def.colors.accent], up: 8, grav: 14, drag: 1.6 });
    if (kind === 'ground') { this.vfx.shockwave(f.pos.clone().setY(0.2), { color: '#c9cfd9', radius: 14 + dmg, power: 0.9 }); this.world.crater(f.pos.x, f.pos.z, 6, 1.2); }
    this.world.shake(1.2); this.audio.impact(1.15, f.pos); this.audio.boom(0.35, f.pos);
    this.audio.grunt(f.def.voicePitch || 1, f.pos);   // pain is universal
    if (this.hud) this.hud.damageNumber(f.pos, 'SLAM ' + Math.round(dmg), '#ffb03a', false);
    if (this.isHuman(f) && this.hud) this.hud.flashScreen('#ff8a5a', 0.12);
  }

  // SECOND WIND (manual §13): hold any attack for one full second while downed → rise at a
  // quarter health with the tank EMPTY and Overdrive's window live — drained fists refill ki.
  secondWindHold(f, holding, dt) {
    f._swHold = holding ? (f._swHold || 0) + dt : 0;
    if (f._swHold >= 1) this.secondWindRise(f);
  }
  secondWindRise(f) {
    f.downedT = 0; f._swHold = 0; f.staggerT = 0; f.state = 'idle';
    f.hp = f.maxHp * 0.25;
    f.ki = 0; f.drainedT = 5;                        // Overdrive's moment: the comeback attribute earns its keep
    f.invuln = Math.max(f.invuln, 1.2);
    this.vfx.shockwave(f.pos.clone().setY(0.3), { color: '#ffd24a', radius: 16, power: 1.1 });
    this.vfx.ring(f.pos.clone().setY(5), { color: '#ffd24a', r0: 2, r1: 14, life: 0.4 });
    this.world.shake(1.1); this.audio.boom(0.5, f.pos); this.heroYell(f, 1.2);
    this.slowmo(0.25, 0.45);
    if (this.hud) { this.hud.announce('SECOND WIND', 'overdrive burning — your fists refill the tank', '#ffd24a'); this.hud.flashScreen('#ffd24a', 0.2); }
    if (this.audio.sample) this.audio.sample('sting.ko', { gain: 0.75 });
  }

  // A KO'd body just hit the dirt (ragdoll core impact). Weight = strength: the heavies BREAK the ground.
  onRagdollImpact(f, spd, pos) {
    const str = f.strength ?? 5;
    const power = clamp(spd / 55, 0.5, 1.7) * (0.65 + str * 0.09);
    this.world.crater(pos.x, pos.z, 3.5 + str * 0.55, 0.8 + power * 0.9);
    this.particles.burst(pos.x, 0.8, pos.z, { count: 16 + str * 2, speed: 18 + str * 1.5, life: 0.65, size: 3.4, color: ['#6a655a', '#8a8577', '#3a3f47'], up: 9, grav: 14, drag: 1.5 });
    this.vfx.ring(new THREE.Vector3(pos.x, 0.35, pos.z), { color: '#c9bfa9', r0: 2, r1: 9 + str * 1.2, life: 0.42, flat: true, y: 0.35 });
    this.world.shake(0.7 + power * 0.9);
    this.audio.impact(0.75 + power * 0.5, pos);
    if (str >= 7) { this.audio.boom(0.55, pos); this.world.punch(0.85); }   // the big ones land like meteors
  }

  // Pressed an ability without the ki to pay for it (nothing fired — say so).
  onNoKi(f, key) {
    if (!this.isHuman(f)) return;
    if (this.hud && this.hud.kiDenied) this.hud.kiDenied(key);
    if ((f._noKiT || 0) <= 0) { f._noKiT = 0.25; try { this.audio.zap(120); } catch (e) {} }
  }

  // A raised guard just REJECTED a melee strike (called from takeDamage's guard branch for every
  // strike-flagged blocked hit — jabs, straights, melee abilities, rush hits). The attacker BOUNCES
  // off and eats a recovery stagger; a last-instant guard (<0.22s) is a PARRY: bigger bounce, longer
  // stagger, meter refund. This is the law that makes blocking actually stop melee spam.
  onBlockedStrike(att, blk, o = {}) {
    // COUNTER STANCE (brief T2.18): if the blocker is in a riposte window, the block becomes
    // an ANSWER. One use per window — a stance, not a permanent parry — and it rides the same
    // choke point every blocked strike already goes through, so it covers every melee source.
    if (blk && blk._riposte && !blk._riposte.used && att && att.alive) {
      blk._riposte.used = true;
      const dmg = blk._riposte.dmg * (blk.powerBuff || 1);
      const dx = att.pos.x - blk.pos.x, dz = att.pos.z - blk.pos.z, d = Math.hypot(dx, dz) || 1;
      att.takeDamage(dmg, { src: blk, strike: true, dtype: 'physical', hitstop: 0.12,
        kb: { x: (dx / d) * 46, y: 8, z: (dz / d) * 46 }, launch: 10 });
      att.staggerT = Math.max(att.staggerT, 0.55);
      this.slowmo(0.12, 0.42);
      this.vfx.impactStar(blk.pos.clone().setY(blk.pos.y + 5), 9, '#ffd24a', 0.22);
      this.audio.impact(1.1, blk.pos);
      if (this.hud) this.hud.damageNumber(blk.pos, 'COUNTER', '#ffd24a', true);
      blk._poseHold = 0.22;                       // the short martial punctuation the brief asks for
    }
    if (!att || !blk || !att.alive) return;
    if ((att._bounceCd || 0) > 0) return;                      // one rejection per exchange — no bounce-lock
    att._bounceCd = 0.3;
    const perfect = (blk._guardUpT ?? 99) < 0.22;
    const dx = att.pos.x - blk.pos.x, dz = att.pos.z - blk.pos.z, d = Math.hypot(dx, dz) || 1;
    const push = perfect ? 54 : (o.push ?? 38);
    att.vel.x += (dx / d) * push; att.vel.z += (dz / d) * push; att.vel.y = Math.max(att.vel.y, 5);
    att.staggerT = Math.max(att.staggerT, perfect ? 0.8 : (o.stagger ?? 0.45));
    att.hitstop = Math.max(att.hitstop, 0.1);
    att.strikeCd = Math.max(att.strikeCd || 0, 0.55);
    att.meleeCharge = 0; att.strikeActive = 0; att.comboWin = 0;   // the chain is BROKEN
    const imp = blk.pos.clone().set((att.pos.x + blk.pos.x) / 2, 5.8, (att.pos.z + blk.pos.z) / 2);
    if (perfect) {
      blk.guardMeter = clamp(blk.guardMeter + 0.12, 0, 1);         // a clean parry refunds meter
      this.vfx.impactStar(imp, 11, '#ffd24a', 0.22);
      this.vfx.ring(imp, { color: '#ffd24a', r0: 1, r1: 11, life: 0.3 });
      this.audio.impact(1.0, imp); this.audio.zap(980, imp);
      this.slowmo(0.09, 0.45); this.world.shake(0.9);
      if (this.hud) { this.hud.damageNumber(blk.pos, 'PARRY!', '#ffd24a', true); if (this.isHuman(blk)) this.hud.flashScreen('#ffd24a', 0.1); }
    } else {
      this.vfx.impactStar(imp, 8, '#bfe0ff', 0.18);
      this.audio.zap(520, imp); this.audio.impact(0.55, imp);
      this.world.shake(0.5);
      if (this.hud && (this.isHuman(blk) || this.isHuman(att))) this.hud.damageNumber(att.pos, 'REPELLED', '#bfe0ff', true);
    }
  }

  // Called by Fighter.takeDamage for EVERY hit — damage numbers, sparks, combo.
  onHit(target, amount, opts = {}, blocked = false) {
    const src = opts.src;
    // OVERDRIVE (per-character attribute): when your tank is empty, your FISTS refill it.
    // spend big → go in swinging → recharge. Landing melee while drained/low converts damage to ki.
    if (src && !blocked && opts.strike && amount >= 2 && (src.drainedT > 0 || src.ki < src.maxKi * 0.25)) {
      const od = src.def.overdrive ?? 1;
      if (od > 0) {
        const gain = Math.min(amount * 1.15 * od, src.maxKi - src.ki);
        if (gain > 1) {
          src.ki += gain;
          this.particles.burst(src.pos.x, src.pos.y + 5, src.pos.z, { count: 6, speed: 12, life: 0.4, size: 2, color: ['#7fe6ff', '#fff'], up: 8, drag: 1.2 });
          if (this.isHuman(src) && this.hud) { this.hud.damageNumber(src.pos, '+' + Math.round(gain) + ' KI', '#7fe6ff', true); if (this.hud.overdriveFlash) this.hud.overdriveFlash(); }
        }
      }
    }
    // directional damage cue when the human player is hit
    if (this.hud && this.hud.hitDirection && this.isHuman(target) && src && src !== target) this.hud.hitDirection(src.pos);
    // A HELD BEAM on a raised guard calls onHit EVERY FRAME (blocked + dot). Even with the light
    // count now stable, spawning a flash mesh + a BLOCK number 60×/s is wasted churn and a strobe —
    // throttle the sustained-block cosmetics to ~8/s per target. One tell, not sixty.
    const beamBlock = blocked && opts.dot;
    const showBlockFx = !beamBlock || (this.time - (target._blkFxT || -1) > 0.12);
    if (beamBlock && showBlockFx) target._blkFxT = this.time;
    if (this.hud) {
      if (blocked) { if (showBlockFx) this.hud.damageNumber(target.pos, 'BLOCK', '#bfe0ff', true); }
      else if (opts.dmgClass === 'slash' && amount >= 3) this.hud.damageNumber(target.pos, '⚔ ' + Math.round(amount), '#ffdcdc', false, true);   // claws/blades read as SLASH
      else if (opts.dmgColor && amount >= 1) this.hud.damageNumber(target.pos, Math.round(amount), opts.dmgColor, true);   // DoT ticks keep their status colour
      else if (amount >= 5) this.hud.damageNumber(target.pos, Math.round(amount), src === this.player ? '#ffe08a' : '#ff9a6a');
    }
    // Danger Room: dummies log incoming damage for the live DPS meters
    if (target.isDummy && !blocked) { (target._dmgLog = target._dmgLog || []).push({ t: this.time, a: amount }); target._dmgTotal = (target._dmgTotal || 0) + amount; }
    if (showBlockFx) this.vfx.flash(target.pos.clone().setY(5.6), blocked ? '#cfe6ff' : (target.def.colors.accent || '#fff'), blocked ? 3 : 2.4, 0.1);
    if (src === this.player && !blocked) {
      if (amount >= 5) { this.combo++; if (this.combo > this._p1MaxCombo) this._p1MaxCombo = this.combo; if (this.hud) this.hud.combo(this.combo); }
      this.comboT = 1.3;
    }
    if (src && !blocked && this.isHuman(src) && amount >= 1) this.grantXp(src, amount * 0.35);   // XP for landing damage

    // ---------- DEPTH HOOKS (cheap systems that reward how you fight, not just that you win) ----------
    if (src && !blocked && amount >= 1 && this.isHuman(src) && !target.isDummy) {
      // (1) STYLE — variety pays. Repeating one button decays the meter; mixing tools builds it.
      const sig = opts.strike ? 'melee' : opts.dot ? 'beam' : opts.dmgClass === 'slash' ? 'blade' : 'blast';
      src._styleSeen = src._styleSeen || {};
      const fresh = !src._styleSeen[sig];
      src._styleSeen[sig] = this.time;
      for (const k in src._styleSeen) if (this.time - src._styleSeen[k] > 6) delete src._styleSeen[k];
      src.style = Math.min(120, (src.style || 0) + amount * (fresh ? 1.6 : 0.5));
      src._styleT = 3.2;
      // (2) AERIAL — both of you off the deck is harder, so it pays more
      if (src.pos.y > 10 && target.pos.y > 10) {
        src.score += Math.round(amount * 0.6);
        if ((src._airT || 0) <= 0) { src._airT = 2.5; if (this.hud) this.hud.announce('AERIAL', 'sky duel bonus', '#7fe6ff'); }
      }
      // (3) MOMENTUM — a clean streak with no damage taken ramps your output a little
      src._clean = (src._clean || 0) + 1;
      if (src._clean === 12 && this.hud) this.hud.announce('IN THE POCKET', '+10% while untouched', '#ffd24a');
    }
    // (4) LAST STAND — under a fifth of your health you hit harder. Comebacks should feel possible.
    if (target && !blocked && this.isHuman(target)) {
      target._clean = 0;
      if (target.hp > 0 && target.hp < target.maxHp * 0.2 && !target._lastStand) {
        target._lastStand = true;
        if (this.hud) { this.hud.announce('LAST STAND', '+20% damage — finish it', '#ff5a4a'); this.hud.flashScreen('#ff3b3b', 0.18); }
      } else if (target.hp > target.maxHp * 0.35) target._lastStand = false;
    }
    // (5) NEMESIS — whoever put you down last is marked, and beating them pays
    if (target && this.isHuman(target) && src && src.def && !src.def.police) target._lastAggressor = src;
    // ATTACKING THE POLICE escalates on its own — every hit on a badge books heat and hardens them.
    if (!blocked && target && target.def && target.def.police && src && src.def && !src.def.police && this.police) this.police.onCopHurt(src, amount);
    // a solid hit is LOUD — nearby bots hear the scuffle and come looking (fair discovery)
    if (amount >= 10 && src && src !== target) this.noise(target.pos, Math.min(1.6, 0.5 + amount * 0.02), src);
    // the news desk's ledger: who dealt what, the biggest hit on record, and hot moments worth a camera
    if (!blocked && amount >= 1 && src && src.def && src !== target && !target.isDummy) {
      const kind = opts.strike ? 'fists' : opts.slam ? 'slam' : opts.dot ? 'beam' : opts.dmgClass === 'slash' ? 'blade' : 'blast';
      target._lastHitKind = kind;
      if (src.stats) { src.stats.dmg += amount; if (amount > src.stats.big) { src.stats.big = amount; src.stats.bigKind = kind; } }
      if (target.stats) target.stats.taken += amount;
      if (amount > this.bigHit.amount) this.bigHit = { amount, by: src, kind, t: this.matchT };
      if (amount >= 26 && this.news) this.news.highlight('bighit', src.name + (kind === 'fists' ? ' LANDS A MASSIVE BLOW' : ' — MASSIVE ENERGY DISCHARGE'), { dur: 2.1, priority: 1, focus: target.pos });
    }
  }

  // ---------- dimensional doors (Portal-style paired rifts) ----------
  placePortal(caster, def) {
    const range = def.range || 80;
    let px, pz;
    if (caster.isPlayer) { px = this.aimPoint.x; pz = this.aimPoint.z; }
    else { px = caster.pos.x + caster.aim.x * 34; pz = caster.pos.z + caster.aim.z * 34; }
    const dx = px - caster.pos.x, dz = pz - caster.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d > range) { px = caster.pos.x + dx / d * range; pz = caster.pos.z + dz / d * range; }
    const open = this._openPair && this._openPair.owner === caster && !this._openPair.b ? this._openPair : null;
    if (open) {                                      // second press → BLUE exit door; the pair goes live
      open.b = this._mkPortal(px, pz, def.colorB || '#37c7ff');
      open.life = def.dur || 14; this._openPair = null;
      this.audio.power(true);
    } else {                                         // first press → ORANGE entry door (replaces your old pair)
      const old = this.portals.find(p => p.owner === caster);
      if (old) this._closePair(old);
      const pr = { owner: caster, a: this._mkPortal(px, pz, def.colorA || '#ff8a2a'), b: null, life: (def.dur || 14) + 6 };
      this.portals.push(pr); this._openPair = pr;
      this.audio.teleport();
    }
  }
  _mkPortal(x, z, color) {
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.55, 10, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    grp.add(ring, disc); grp.position.set(x, 6.2, z);
    this.scene.add(grp);
    this.vfx.ring(new THREE.Vector3(x, 1, z), { color, r0: 1, r1: 10, life: 0.4, flat: true, y: 0.5 });
    return { x, z, grp, ring, color };
  }
  _closePair(pr) {
    for (const side of [pr.a, pr.b]) if (side) { this.scene.remove(side.grp); side.grp.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); }
    const i = this.portals.indexOf(pr); if (i >= 0) this.portals.splice(i, 1);
    if (this._openPair === pr) this._openPair = null;
  }
  updatePortals(dt) {
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const pr = this.portals[i];
      pr.life -= dt;
      if (pr.life <= 0 || !pr.owner.alive && !pr.b) { this._closePair(pr); continue; }
      pr._humT = (pr._humT || 0) - dt;
      if (pr._humT <= 0 && pr.b) {                     // an OPEN doorway hums — a soft positional pulse per side (manual §20)
        pr._humT = 1.35;
        this.audio.zap(190, { x: pr.a.x, y: 6, z: pr.a.z });
        this.audio.zap(238, { x: pr.b.x, y: 6, z: pr.b.z });
      }
      for (const side of [pr.a, pr.b]) if (side) {
        side.grp.rotation.y += dt * 1.4; side.ring.rotation.z += dt * 2.2;
        if (Math.random() < 0.2) this.particles.spawn({ x: side.x + rand(-3, 3), y: 6 + rand(-3, 3), z: side.z + rand(-3, 3), vx: 0, vy: rand(2, 6), vz: 0, life: 0.5, size: 1.8, color: [side.color, '#fff'], drag: 1, shrink: true });
      }
      if (!pr.b) continue;                            // only half a doorway — nothing to walk through yet
      const hop = (obj, from, to) => {
        obj.pos.x = to.x + (obj.pos.x - from.x); obj.pos.z = to.z + (obj.pos.z - from.z);
        obj._portalCd = 0.9;
        this.vfx.flash(new THREE.Vector3(from.x, 6, from.z), from.color, 5, 0.18);
        this.vfx.flash(new THREE.Vector3(to.x, 6, to.z), to.color, 6, 0.22);
        this.audio.teleport();
      };
      const tryHop = (obj, yMid) => {
        if (obj._portalCd > 0) { obj._portalCd -= dt; return; }
        if (yMid > 14) return;                        // doors are ground-level
        if (Math.hypot(obj.pos.x - pr.a.x, obj.pos.z - pr.a.z) < 5) hop(obj, pr.a, pr.b);
        else if (Math.hypot(obj.pos.x - pr.b.x, obj.pos.z - pr.b.z) < 5) hop(obj, pr.b, pr.a);
      };
      for (const f of this.entities) if (f.alive) tryHop(f, f.pos.y);
      for (const o of this.projectiles.list) if (o.vel && o.sustaining === undefined && !o.dead) tryHop(o, o.pos.y);
    }
  }

  // ---------- items (gadgets outside the ability slots — no ki, one button) ----------
  // Teleport beacon: press once to PLANT it where you stand, press again — from anywhere — to
  // snap back to it. Bait-and-swap: plant, push in shooting, then vanish back to your spot.
  useItem(f) {
    const it = f.items && f.items[0]; if (!it) return;
    const acc = f.def.colors.accent;
    if (it.state === 'cooldown' || it.state === 'spent') { if (this.isHuman(f) && this.hud) this.hud.feed(it.state === 'spent' ? 'No charges left' : 'Recharging…', '#8b8577'); return; }
    // one-shot gadgets (medkit / flashbang / jump jets / shield cell) — charges, then a recharge gap
    if (it.def.kind !== 'beacon') {
      const spend = () => {
        it.charges = (it.charges ?? it.def.charges ?? 1) - 1;
        if (it.charges > 0) { it.state = 'cooldown'; it.cd = (it.def.cd || 8) * (f.sheet ? f.sheet.cdMult : 1); }
        else it.state = 'spent';   // out until respawn refills the pouch
      };
      switch (it.def.kind) {
        case 'medkit':
          f.heal(it.def.heal || 40);
          this.vfx.ring(f.pos.clone().setY(5), { color: '#8fe08a', r0: 2, r1: 8, life: 0.4 });
          this.particles.burst(f.pos.x, f.pos.y + 5, f.pos.z, { count: 12, speed: 10, life: 0.6, size: 2.2, color: ['#8fe08a', '#fff'], up: 10, drag: 1 });
          this.audio.zap(820, f.pos); spend(); break;
        case 'flashbang': {
          this.vfx.flash(f.pos.clone().setY(6), '#ffffff', 16, 0.3);
          if (this.hud && this.isHuman(f)) this.hud.flashScreen('#fff', 0.2);
          this.audio.zap(1200, f.pos); this.audio.impact(0.7, f.pos);
          for (const e of this.entities) {
            if (!this.isFoe(f, e)) continue;
            const d = Math.hypot(e.pos.x - f.pos.x, e.pos.z - f.pos.z);
            if (d > (it.def.radius || 26)) continue;
            e.staggerT = Math.max(e.staggerT, 0.5);
            if (e.ai) { e.ai._mem = 0; e.ai.belief = null; e.ai._patrol = null; }   // flashbanged: they lose the plot entirely
          }
          spend(); break;
        }
        case 'jetcell':
          if (f._jetT <= 0) f._jetPrev = f.flightTier;
          f.flightTier = 3; f._jetT = it.def.dur || 6;
          if (!f.flying) f.toggleFlight();
          this.audio.zap(560, f.pos); this.audio.power(true); spend(); break;
        case 'shieldpack':
          f._shieldHp = it.def.shield || 45;
          this.vfx.ring(f.pos.clone().setY(5.4), { color: '#7fe6ff', r0: 3, r1: 7, life: 0.4 });
          this.audio.zap(700, f.pos); spend(); break;
      }
      return;
    }
    if (it.state === 'ready') {
      // PLANT — a humming tripod with a light shaft, right at her feet
      const grp = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.5, 10), new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.4, metalness: 0.7 }));
      base.position.y = 0.25; grp.add(base);
      // FIELD KIT, not a spell: tripod legs, a mast and a blinking status lamp. The ONLY part
      // that earns a glow is the recall ring — that bit really is a teleport field.
      const steel = new THREE.MeshStandardMaterial({ color: '#3a4048', roughness: 0.45, metalness: 0.85 });
      for (let s = 0; s < 3; s++) {
        const a = (s / 3) * Math.PI * 2 + 0.5;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.4, 6), steel);
        leg.position.set(Math.cos(a) * 1.4, 1.2, Math.sin(a) * 1.4);
        leg.rotation.z = Math.cos(a) * 0.32; leg.rotation.x = -Math.sin(a) * 0.32; grp.add(leg);
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.4, 6), steel);
      mast.position.y = 3.2; grp.add(mast);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshStandardMaterial({ color: acc, emissive: acc, emissiveIntensity: 1.6, roughness: 0.3 }));
      lamp.position.y = 5.5; grp.add(lamp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.15, 8, 24), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.7; grp.add(ring);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 3.4, 8, 1, true), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      shaft.position.y = 2.4; grp.add(shaft);
      grp.userData.ring = ring; grp.userData.shaft = shaft; grp.userData.lamp = lamp;   // named refs, not child indices
      grp.position.set(f.pos.x, Math.max(0, f.pos.y), f.pos.z);
      this.scene.add(grp);
      it.mesh = grp; it.pos = grp.position.clone(); it.state = 'deployed';
      f._beaconHp = f.hp;   // AI remembers how healthy she was when she planted it
      this.vfx.ring(it.pos.clone().setY(0.5), { color: acc, r0: 1, r1: 9, life: 0.4, flat: true, y: 0.5 });
      this.audio.zap(520); this.audio.zap(760);
      if (this.isHuman(f) && this.hud) this.hud.feed('Beacon planted — press again to recall', acc);
    } else if (it.state === 'deployed') {
      // RECALL — vanish, reappear at the beacon, pick it back up
      this.afterimage(f);
      this.vfx.flash(f.pos.clone().setY(5), acc, 6, 0.2);
      f.pos.set(it.pos.x, it.pos.y, it.pos.z); f.vel.multiplyScalar(0.2);
      f.flying = false; f.invuln = Math.max(f.invuln, 0.35);
      this.afterimage(f);
      this.vfx.flash(f.pos.clone().setY(5), acc, 7, 0.25); this.audio.teleport();
      this.particles.burst(f.pos.x, 4, f.pos.z, { count: 16, speed: 22, life: 0.4, size: 2.4, color: ['#fff', acc] });
      if (it.mesh) { this.scene.remove(it.mesh); it.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); it.mesh = null; }
      it.pos = null; it.state = 'cooldown'; it.cd = it.def.cd || 3;
    }
  }
  updateItems(dt) {
    for (const f of this.entities) if (f.items) for (const it of f.items) {
      if (it.state === 'deployed' && it.mesh) {
        const U = it.mesh.userData;                                               // ⚠ named refs: the beacon
        if (U.ring) U.ring.rotation.z += dt * 2;                                  // is real hardware now, so
        if (U.shaft) U.shaft.material.opacity = 0.1 + Math.sin(this.time * 5) * 0.05;   // child order shifted
        if (U.lamp) U.lamp.material.emissiveIntensity = (this.time * 2 % 1 < 0.5) ? 2.2 : 0.35;
        if (Math.random() < 0.1) this.particles.spawn({ x: it.pos.x + rand(-1, 1), y: 0.6, z: it.pos.z + rand(-1, 1), vx: 0, vy: 8, vz: 0, life: 0.5, size: 1.6, color: f.def.colors.accent, drag: 0.5, shrink: true });
      }
    }
  }

  // ---------- fx helpers used by abilities ----------
  spawnBeamFor(caster, def, p = 1) {
    return this.projectiles.spawnBeam(caster, {
      radius: (def.radius || 1.6) * (def.chargeWidth ? (1 + (p - 1) * 0.6) : 1),
      tipSpeed: def.tipSpeed || 150, maxLen: def.maxLen || 120,
      dps: (def.dps || 60) * p, kiPerSec: def.kiPerSec || 22,
      color: def.color, color2: def.color2, power: (def.power || 1) * p, steer: def.steer,
      might: (def.might || (def.dps || 60) / 50) * p * (caster.def.beamMight || 1),   // char treats the budget differently
      dtype: def.dtype, siphon: def.siphon, spiral: def.spiral, faceOrigin: def.faceOrigin,   // arcane beams drink ki; VEGA spirals; optic blasts fire from the FACE
    });
  }

  chargeGather(caster, color, pos, intensity = 1) {
    const n = Math.ceil(1 + intensity * 2);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), r = rand(8, 16 + intensity * 6), h = rand(-6, 6);
      this.particles.spawn({ x: pos.x + Math.cos(a) * r, y: pos.y + h, z: pos.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 3, vy: -h * 3, vz: -Math.sin(a) * r * 3, life: 0.34, size: 2.4, color: [color, '#fff'], drag: 0.2, shrink: true });
    }
  }

  muzzleFlash(caster, color, scale = 1, off) {
    const m = caster.muzzle(_v.clone()); if (off) m.add(off);
    this.vfx.flash(m, color || '#fff', 4 * scale, 0.1);
    this.particles.burst(m.x, m.y, m.z, { count: 5, speed: 14, life: 0.22, size: 2.2 * scale, color: [color, '#fff'], dir: { x: caster.aim.x, z: caster.aim.z }, spread: 0.6 });
  }

  trail(caster, color) {
    for (let i = 0; i < 5; i++) this.particles.spawn({ x: caster.pos.x + rand(-1, 1), y: 5 + rand(-3, 3), z: caster.pos.z + rand(-1, 1), vx: -caster.vel.x * 0.2, vy: 0, vz: -caster.vel.z * 0.2, life: 0.26, size: 3, color: [color, '#fff'], drag: 2, shrink: true });
  }

  afterimage(caster) {
    const m = new THREE.Mesh(this._ghostGeo, new THREE.MeshBasicMaterial({ color: caster.def.colors.accent, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(caster.pos); m.position.y += 5; m.rotation.y = caster.facing; this.scene.add(m);
    let t = 0; this.vfx._add({ update: (dt) => { t += dt; m.material.opacity = 0.5 * (1 - t / 0.35); m.scale.setScalar(1 + t * 0.5); return t >= 0.35; }, dispose: () => { this.scene.remove(m); m.material.dispose(); } });
  }

  summon(caster, def) {
    // OVERWATCH TURRET BUFF (brief T2.10): a summon flagged `inherit` adopts the OWNER's
    // stat-sheet multipliers, so investing in yourself invests in your hardware too.
    if (def.inherit && caster.sheet) def = { ...def, damage: (def.damage || 10) * (caster.sheet.blastMult || 1) * (caster.powerBuff || 1), _inherited: true };
    const n = def.count || 3;
    for (let i = 0; i < n; i++) this.minions.push(new Minion(this, caster, def, i));
    // cap
    while (this.minions.filter(m => m.owner === caster).length > (def.max || 6)) { const idx = this.minions.findIndex(m => m.owner === caster); this.minions[idx]._dispose(this); this.minions.splice(idx, 1); }
  }

  spawnConstruct(caster, def) {
    const c = new Construct(this, caster, def); this.constructs.push(c); return c;
  }

  // ---------- control ----------
  controlPlayer(dt) {
    const p = this.player; if (!p || !p.alive) { if (p) { p.moveDir = { x: 0, z: 0 }; } this.lockTarget = null; return; }
    const inp = this.input, m = inp.mouse, pad = this.humans.length < 2 ? this.pad : NULL_PAD;   // in 2P the pad drives P2

    // --- targeting: click a character to HARD-LOCK (red triangle → you face it); mouse still AIMs ---
    const a3 = this._aim3pt;
    let soft;
    if (pad.active && pad.aiming) {
      const ax = this.right.x * pad.rx + this.fwd.x * (-pad.ry), az = this.right.z * pad.rx + this.fwd.z * (-pad.ry);
      soft = p.blindT > 0 ? null : this.pickTargetDir(p, ax, az);
      if (soft) soft.center(a3); else a3.set(p.pos.x + ax * 50, 6, p.pos.z + az * 50);
    } else {
      soft = p.blindT > 0 ? null : this.pickTarget(p);             // BLIND: the aim magnet lets go
      if (soft) soft.center(a3); else { this.world.screenToGround(m.clientX, m.clientY, a3); a3.y = 3; }
    }
    // hard lock ONLY on a direct click ON a character (LMB is also fire — the old "any attack
    // click near a foe locks you" was the "faces one way while I aim another" bug)
    if (m.leftEdge && this._hoverPick) this.hardLock = this._hoverPick;
    else if (pad.active && pad.pressed('lmb') && soft) this.hardLock = soft;   // pads have no cursor — keep soft
    if (inp.pressed('KeyT')) this.hardLock = null;                          // T clears the lock
    if (this.hardLock && !this.hardLock.alive) this.hardLock = null;
    if (p.blindT > 0) this.hardLock = null;                       // BLIND breaks the lock (manual §14)
    this.lockTarget = soft;
    this.aimPoint.copy(a3).setY(0);
    p.aim3.set(a3.x - p.pos.x, a3.y - (p.pos.y + 5.8), a3.z - p.pos.z).normalize();
    // facing: hard-locked → always face the lock; otherwise face where you aim
    if (this.hardLock && this.hardLock.alive) p.faceDir(this.hardLock.pos.x - p.pos.x, this.hardLock.pos.z - p.pos.z);
    else p.faceDir(p.aim3.x, p.aim3.z);

    // stunned while held or frozen solid — capable heroes auto-escape via the melee system
    if (p.grabbedBy || p.frozenT > 0) { p.moveDir = { x: 0, z: 0 }; return; }
    // SECOND WIND (manual §13): downed is a held breath — the only input that matters is the rally
    if (p.downedT > 0) {
      p.moveDir = { x: 0, z: 0 };
      const holding = m.left || m.right || inp.down('KeyV') || inp.down('KeyQ') || inp.down('KeyE')
        || inp.down('KeyH') || inp.down('KeyR')
        || pad.down('lmb') || pad.down('rmb') || pad.down('strike') || pad.down('q') || pad.down('e') || pad.down('r') || pad.down('f');
      this.secondWindHold(p, holding, dt);
      return;
    }

    // --- move (iso-relative; analog on pad, digital on keys) ---
    let ix = 0, iz = 0;
    if (pad.active && pad.moving) { ix = pad.lx; iz = -pad.ly; }
    else {
      if (inp.down('KeyW') || inp.down('ArrowUp')) iz += 1;
      if (inp.down('KeyS') || inp.down('ArrowDown')) iz -= 1;
      if (inp.down('KeyA') || inp.down('ArrowLeft')) ix -= 1;
      if (inp.down('KeyD') || inp.down('ArrowRight')) ix += 1;
    }
    const dir = _v.set(0, 0, 0).addScaledVector(this.fwd, iz).addScaledVector(this.right, ix);
    if (dir.lengthSq() > 1) dir.normalize();     // keep analog magnitude, cap at 1
    p.moveDir = { x: dir.x, z: dir.z };
    // double-tap a move key → this hero's evade tech (dash / blink / sprint / slide / phase — data-driven)
    if (!this._tapT) this._tapT = {};
    for (const [k1, k2, tx, tz] of TAP_DIRS) {
      if (inp.pressed(k1) || inp.pressed(k2)) {
        const now = performance.now() / 1000, last = this._tapT[k1] || -9;
        this._tapT[k1] = now;
        if (now - last < 0.28 && now - last > 0.04) {
          const ex = this.right.x * tx + this.fwd.x * tz, ez = this.right.z * tx + this.fwd.z * tz;
          performEvade(p, { x: ex, z: ez }, this);
        }
      }
    }
    // flight + guard keys come from the active control scheme (Options → Control Scheme)
    const KM = keymap(SETTINGS.scheme);
    p.flyHeld = inp.down(KM.up) || pad.down('fly');
    p.descendHeld = inp.down(KM.down) || inp.down('ControlLeft') || inp.down('ControlRight') || pad.down('descend');
    p.cruiseHeld = p.flying && (inp.down('ShiftLeft') || inp.down('ShiftRight'));   // held SHIFT in the air = sustained cruise
    p.move(p.moveDir, dt);

    // --- melee trifecta — Strike (tap=jab, HOLD=haymaker) · Grab · Guard (V/G/C+X+Mouse4, pad ▢/○/L1) ---
    const np = this.netplay && this.netplay.active ? this.netplay : null;
    if (inp.pressed('KeyV') || pad.pressed('strike')) { this.melee.chargeStart(p); if (np) np.queueMelee('cs'); }
    if (inp.released('KeyV') || pad.released('strike')) { this.melee.chargeRelease(p); if (np) np.queueMelee('cr'); }
    // G: carrying → THROW it · something heavy in reach → hoist it · otherwise the normal grab
    if (inp.pressed('KeyG') || pad.pressed('grab')) {
      if (p._carry) this.throwProp(p);
      else if (this.pickupGear(p)) {}                      // a weapon on the ground beats a hoist (manual §16)
      else if (!this.grabProp(p)) { this.melee.grab(p); if (np) np.queueMelee('grab'); }
    }
    this.melee.guard(p, inp.down(KM.guard) || inp.mouse.b3 || inp.mouse.b4 || pad.down('guard'));
    if (p._gearHeld) {                                  // the HELD weapon owns X while you carry it
      const gi = { pressed: inp.pressed(KM.item), held: inp.down(KM.item), released: inp.released(KM.item), dt };
      if (gi.pressed || gi.held || gi.released) runSlot(p, '_gear', gi, this);
      if (gi.held) this.drainGear(p, dt);
    } else if (inp.pressed(KM.item) && p.items.length) this.useItem(p);   // the carried item (beacon: plant / recall)

    // --- powers (keyboard/mouse OR gamepad) ---
    const busy = p.guarding || p.strikeActive > 0 || p.grabState || p.grabbing || p.meleeCharge > 0 || p.staggerT > 0;
    const orK = (code, a) => ({ pressed: inp.pressed(code) || pad.pressed(a), held: inp.down(code) || pad.down(a), released: inp.released(code) || pad.released(a) });
    const intents = {
      lmb: { pressed: m.leftEdge || pad.pressed('lmb'), held: m.left || pad.down('lmb'), released: m.leftUp || pad.released('lmb') },
      rmb: { pressed: m.rightEdge || pad.pressed('rmb'), held: m.right || pad.down('rmb'), released: m.rightUp || pad.released('rmb') },
      q: orK('KeyQ', 'q'), e: orK('KeyE', 'e'), r: orK('KeyR', 'r'), f: orK('KeyH', 'f'),   // 4th power lives on H — F toggles flight
      shift: orK('ShiftLeft', 'dash'),
    };
    // WHEEL-SELECT (PILOT/SOUTHPAW): the wheel PICKS a power and LMB FIRES it. Without this the
    // wheel would only ever light a chip — a selection has to have a trigger, or it isn't a control.
    if (KM.wheel === 'ability' && p._selSlot && p._selSlot !== 'lmb' && p.slots[p._selSlot]) {
      const sel = p._selSlot, L = intents.lmb;
      intents[sel] = { pressed: intents[sel].pressed || L.pressed, held: intents[sel].held || L.held, released: intents[sel].released || L.released };
      intents.lmb = { pressed: false, held: false, released: false };
    }
    if (inp.pressed('KeyF')) p.toggleFlight();   // flight is a MODE now: F on, F off
    if (np) for (const k of SLOT_KEYS) {          // stream ability intents to the other machine
      if (!p.slots[k]) continue;
      if (intents[k].pressed) np.queueSlot(k, 1, p.aim3);
      else if (intents[k].released) np.queueSlot(k, 3, p.aim3);
    }
    for (const k of SLOT_KEYS) if (p.slots[k]) feedSlot(this, p, k, intents[k], busy, dt);
  }

  // Player 2 (gamepad): right-stick auto-aims, left-stick moves.
  controlPad(f, dt) {
    if (!f || !f.alive || this.matchOver) { if (f) f.moveDir = { x: 0, z: 0 }; return; }
    const pad = this.pad;
    if (f.grabbedBy || f.frozenT > 0) { f.moveDir = { x: 0, z: 0 }; return; }
    if (f.downedT > 0) {
      f.moveDir = { x: 0, z: 0 };
      const holding = pad.down('lmb') || pad.down('rmb') || pad.down('strike') || pad.down('q') || pad.down('e') || pad.down('r') || pad.down('f');
      this.secondWindHold(f, holding, dt);
      return;
    }
    let tgt;
    if (pad.aiming) {
      const ax = this.right.x * pad.rx + this.fwd.x * (-pad.ry), az = this.right.z * pad.rx + this.fwd.z * (-pad.ry);
      tgt = this.pickTargetDir(f, ax, az);
      if (!tgt) { f.aim3.set(ax, 0.02, az).normalize(); f.faceDir(ax, az); }
    } else tgt = this.nearestFoe(f, f.pos, 200);
    if (tgt) { f.aim3.set(tgt.pos.x - f.pos.x, (tgt.pos.y + 5.2) - (f.pos.y + 5.8), tgt.pos.z - f.pos.z).normalize(); f.faceDir(tgt.pos.x - f.pos.x, tgt.pos.z - f.pos.z); }
    const dir = _v.set(0, 0, 0).addScaledVector(this.fwd, -pad.ly).addScaledVector(this.right, pad.lx);
    if (dir.lengthSq() > 1) dir.normalize();
    f.moveDir = { x: dir.x, z: dir.z }; f.flyHeld = pad.down('fly'); f.descendHeld = pad.down('descend'); f.move(f.moveDir, dt);
    if (pad.pressed('strike')) this.melee.chargeStart(f);
    if (pad.released('strike')) this.melee.chargeRelease(f);
    if (pad.pressed('grab')) this.melee.grab(f);
    this.melee.guard(f, pad.down('guard'));
    const busy = f.guarding || f.strikeActive > 0 || f.grabState || f.grabbing || f.meleeCharge > 0 || f.staggerT > 0;
    const P = (a) => ({ pressed: pad.pressed(a), held: pad.down(a), released: pad.released(a) });
    const it = { lmb: P('lmb'), rmb: P('rmb'), q: P('q'), e: P('e'), r: P('r'), f: P('f'), shift: P('dash') };
    for (const k of SLOT_KEYS) if (f.slots[k]) feedSlot(this, f, k, it[k], busy, dt);
  }

  controlBot(f, dt) {
    if (!f.ai || !f.alive) { f.moveDir = { x: 0, z: 0 }; return; }
    if (f.grabbedBy || f.frozenT > 0) { f.moveDir = { x: 0, z: 0 }; return; }   // stunned while held / frozen
    // finish an AI haymaker wind-up
    if (f._aiCharge > 0) { f._aiCharge -= dt; if (f._aiCharge <= 0 || f.meleeCharge <= 0) { this.melee.chargeRelease(f); f._aiCharge = 0; } }
    const it = f.ai.intent(dt, this);
    if (it.aimDir) f.faceDir(it.aimDir.x, it.aimDir.z);
    // 3D aim. ⚠ `it.target` is ONLY set when the AI can actually see the foe (honesty law), and
    // `it.aimAt` is where it BELIEVES it should shoot — the target's centre plus its own lead error
    // and hand-wander (fairness law). Never aim at the true body centre: that reads as an aimbot.
    if (it.aimAt) f.aim3.set(it.aimAt.x - f.pos.x, (it.aimAt.y + 5.2) - (f.pos.y + 5.8), it.aimAt.z - f.pos.z).normalize();
    else f.aim3.set(f.aim.x, 0, f.aim.z);
    const dir = _v.set(it.move.x, 0, it.move.z); if (dir.lengthSq() > 1) dir.normalize();
    f.moveDir = { x: dir.x, z: dir.z };
    f.flyHeld = !!it.fly;
    f.descendHeld = f.flying && !it.fly;      // no longer wants to fly → sink back down and land
    f.cruiseHeld = f.flying && !!it.fly;      // chasing through the air → open the throttle
    f.move(f.moveDir, dt);

    // --- defensive reactions to incoming beams / projectiles ---
    // ⚠ FAIRNESS: a bot must not answer a threat on the frame it appears. `_reactT` is its reflex
    // delay (from ai.reflex, so difficulty buys nerves, not precognition) — the threat has to have
    // existed for that long before it may block or juke. Feints and fast openers now WORK.
    if (f._forceBeamT > 0) f._forceBeamT -= dt;
    f._counterCd = (f._counterCd || 0) - dt;
    const threatened = !!(this.incomingBeam(f) || this.incomingProjectile(f));
    if (threatened) f._threatT = (f._threatT || 0) + dt; else f._threatT = 0;
    const reacted = f._threatT > (f.ai.reflex || 0.2);
    if (!f.grabbing && !f.grabState && reacted) {
      const beam = this.incomingBeam(f);
      if (beam) {
        f.faceDir(beam.caster.pos.x - f.pos.x, beam.caster.pos.z - f.pos.z);   // turn to face it (block/clash from the front)
        const bk = ['lmb', 'rmb', 'r', 'e', 'q'].find(k => f.slots[k] && f.slots[k].def.type === 'beam' && f.slots[k].cd <= 0 && f.ki > 30);
        if (bk && f._forceBeamT <= 0 && f._counterCd <= 0 && Math.random() < 0.7) { f._forceBeam = bk; f._forceBeamT = 1.1 + Math.random() * 1.3; f._counterCd = 3.5; } // counter-beam → CLASH
        else if (f._forceBeamT <= 0) f._guardT = Math.max(f._guardT || 0, 0.32);                                                                                    // else block
      } else {
        const proj = this.incomingProjectile(f);
        if (proj && f._forceBeamT <= 0) {
          // juke sideways with the hero's own evade tech, else block
          if (f.def.evade && f.evadeCd <= 0 && Math.random() < 0.35) {
            const vl = Math.hypot(proj.vel.x, proj.vel.z) || 1, side = Math.random() < 0.5 ? 1 : -1;
            performEvade(f, { x: (-proj.vel.z / vl) * side, z: (proj.vel.x / vl) * side }, this);
          } else if (Math.random() < 0.3) f._guardT = Math.max(f._guardT || 0, 0.28);
        }
      }
    }

    // items: bots use their gadgets like players would
    if (f.items.length) {
      const it = f.items[0], k = it.def.kind;
      if (k === 'beacon') {   // plant healthy, BAIL when it turns
        if (it.state === 'ready' && f.hp > f.maxHp * 0.55 && Math.random() < 0.005) this.useItem(f);
        else if (it.state === 'deployed' && (f.hp < (f._beaconHp || f.maxHp) - 28 || (f.hp < f.maxHp * 0.3 && Math.random() < 0.05))) this.useItem(f);
      } else if (it.state === 'ready') {
        if (k === 'medkit' && f.hp < f.maxHp * 0.5) this.useItem(f);
        else if (k === 'shieldpack' && f.hp < f.maxHp * 0.6 && f._shieldHp <= 0) this.useItem(f);
        else if (k === 'flashbang' && this.nearestFoe(f, f.pos, 18) && Math.random() < 0.03) this.useItem(f);
        else if (k === 'jetcell' && f._jetT <= 0) { const foe = this.nearestFoe(f, f.pos, 90); if (foe && foe.pos.y > 14 && Math.random() < 0.02) this.useItem(f); }
      }
    }

    // CLINCH: the bot aims the throw — at a second foe it can SEE if one stands anywhere useful
    // (throwing one enemy into another is the point of the move) — then hurls. Reflex paces it.
    if (f.grabState === 'clinch' && f.grabbing) {
      f._clinchAimT = (f._clinchAimT || 0) + dt;
      const held = f.grabbing;
      let best = null, bd = 90 * 90;
      for (const e of this.entities) {
        if (e === f || e === held || !e.alive || !this.isFoe(f, e)) continue;
        const d2 = (e.pos.x - f.pos.x) ** 2 + (e.pos.z - f.pos.z) ** 2;
        if (d2 < bd && this.canSee(f, e)) { bd = d2; best = e; }
      }
      if (best) {
        f.faceDir(best.pos.x - f.pos.x, best.pos.z - f.pos.z);
        f.aim3.set(best.pos.x - f.pos.x, (best.pos.y + 4.5) - (f.pos.y + 5.2), best.pos.z - f.pos.z).normalize();
      }
      if (f._clinchAimT > Math.max(0.28, (f.ai.reflex || 0.2) * 1.7)) { f._clinchAimT = 0; this.melee.grab(f); }
      f.moveDir = { x: 0, z: 0 };
      return;   // wrestling IS the turn — no other actions while holding a body
    }
    f._clinchAimT = 0;

    // close-range melee mixups (skip if committing to a counter-beam)
    if (!f._forceBeam && !f.grabbing && !f.grabState && !f.strikeActive) {
      const foe = this.nearestFoe(f, f.pos, 16);
      const d = foe ? Math.hypot(foe.pos.x - f.pos.x, foe.pos.z - f.pos.z) : 99;
      f._meleeCd = (f._meleeCd || 0) - dt;
      // a turtling foe is worth stepping INTO grab range for (the bounce pushes bots out of it)
      const turtleReach = foe && foe.guarding && (foe._guardUpT ?? 0) > 0.35 ? 13.5 : 11;
      if (foe && d < turtleReach && f._meleeCd <= 0) {
        f._meleeCd = 0.45 + Math.random() * 0.7;
        const style = f.ai && f.ai.style, r = Math.random();
        // THE TRIFECTA, READ LIVE: a turtling foe gets GRABBED or HAYMAKERED, never jabbed at.
        // (Bots used to spam strikes into a raised shield forever — now they solve it.)
        const turtling = foe.guarding && (foe._guardUpT ?? 0) > 0.35;
        if (turtling) {
          if (r < 0.55) this.melee.grab(f);                                    // grab beats guard
          else if (!f._aiCharge && (f.def.meleeTiers ?? 3) >= 2) { this.melee.chargeStart(f); f._aiCharge = 0.6 + Math.random() * 0.5; f._meleeCd = 1.1; }   // or CRUSH it
          else this.melee.grab(f);
        }
        // ARRIVING AT SPEED = PUNCH (momentum melee, manual §10): a bot that closed under cruise
        // cashes the approach in rather than rolling the normal mixup. Never into a raised guard.
        else if (Math.hypot(f.vel.x, f.vel.y, f.vel.z) > 26) { this.melee.strike(f); f._meleeCd = 0.55 + Math.random() * 0.4; }
        else if (style === 'grappler' && r < 0.55) this.melee.grab(f);         // Cell seeks grabs to absorb/heal
        else if (r < (style === 'rusher' ? 0.72 : 0.5)) this.melee.strike(f);
        else if (r < 0.68) this.melee.grab(f);
        else if (r < 0.85 && !f._aiCharge && (f.def.meleeTiers ?? 3) >= 2) {   // wind up a HAYMAKER (guard-crusher)
          this.melee.chargeStart(f); f._aiCharge = 0.55 + Math.random() * 0.55; f._meleeCd = 1.1;
        }
        else f._guardT = 0.5;
      }
    }
    f._guardT = (f._guardT || 0) - dt;
    // GUARD THE WOUNDED ARM (manual §18): a bot carrying a serious arm wound covers up in
    // stray moments — doctrine, not physics, and it reads as protecting the injury.
    if (f._wounds && f._wounds.arm >= 2 && f.staggerT <= 0 && !f.grabState && Math.random() < 0.012) {
      f._guardT = Math.max(f._guardT, 0.45);
    }
    this.melee.guard(f, f._guardT > 0);

    const busy = f.guarding || f.strikeActive > 0 || f.grabState || f.grabbing || f.meleeCharge > 0 || f.staggerT > 0;
    // committed counter-beam (hold the beam slot → creates a beam battle)
    if (f._forceBeam && f._forceBeamT > 0 && !busy) {
      const first = !f._forceBeamActive; f._forceBeamActive = true;
      runSlot(f, f._forceBeam, { pressed: first, held: true, released: false, dt }, this);
    } else {
      if (f._forceBeamActive) { runSlot(f, f._forceBeam, { pressed: false, held: false, released: true, dt }, this); f._forceBeamActive = false; f._forceBeam = null; }
      if (!busy) for (const k of SLOT_KEYS) if (f.slots[k] && it.slots[k]) feedSlot(this, f, k, it.slots[k], false, dt);
    }
  }

  // ---------- main update ----------
  update(dt) {
    dt = Math.min(dt, 0.05);   // parity floor 20fps (was 0.033/30fps — weak GPUs played in literal slow motion)
    this.pad.update();
    this.audio.sweep();   // kill orphaned sustained sounds (stuck-tone watchdog) — even on title/pause
    if (!this.running) {
      // THE MAP TOOL owns the camera while it is open — authoring a city is not a paused match,
      // and `follow` would drag the view back to the player every frame.
      if (this.mapCam) { this.world.orbit(this.mapCam); this.world.render(); return; }
      this.world.follow(this.player ? _v.copy(this.player.pos).setY(6) : _v.set(0, 6, 0), dt);
      this.world.render(); return;
    }
    if (this._slowT > 0) { this._slowT -= dt; dt *= this._slowMul || 1; }   // impact slow-mo
    this.time += dt;
    if (this.mode && !this.matchOver) this.matchT += dt;   // the match clock the news report cites
    if (this.player) this.audio.listen(this.player.pos.x, this.player.pos.z);   // proximity audio ears

    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; if (this.hud) this.hud.combo(0); } }
    // style bleeds away when you stop fighting, and the two damage multipliers ride powerBuff
    for (const h of this.humans) {
      const f = h.fighter; if (!f) continue;
      if (f._styleT > 0) { f._styleT -= dt; } else if (f.style > 0) f.style = Math.max(0, f.style - dt * 14);
      if (f._airT > 0) f._airT -= dt;
      const bonus = (f._lastStand ? 0.2 : 0) + ((f._clean || 0) >= 12 ? 0.1 : 0);
      f.powerBuff = (f.buffT > 0 ? f.powerBuff : f.levelMult) * (1 + bonus);
    }
    if (this.mode && !this.matchOver) this.mode.tick(this, dt);

    // control: P1 (keyboard+mouse), P2+ (gamepad), everyone else = AI
    this.controlPlayer(dt);
    for (let i = 1; i < this.humans.length; i++) this.controlPad(this.humans[i].fighter, dt);
    for (const f of this.entities) { if (this.isHuman(f)) continue; if (f.remote) this.controlRemote(f, dt); else this.controlBot(f, dt); }

    for (const f of this.entities) {
      if (!f._medChecked) {
        f._medChecked = true;
        // carry-over injuries from the book: small, capped, and announced (manual §18)
        if (f.def && f.def.id && !f.def.police && !f.isDummy) {
          const inj = injuryOf(f.def.id);
          if (inj) {
            f.maxHp = Math.round(f.maxHp * (1 - Math.min(0.08, inj.debuff || 0.05)));
            f.hp = Math.min(f.hp, f.maxHp);
            f._bookInjury = inj;
            if (this.hud && this.isHuman(f)) this.hud.feed(`CARRYING: ${inj.name} — clears after ${inj.bouts} sanctioned bout${inj.bouts > 1 ? 's' : ''}`, '#ff8a6a');
          }
        }
      }
      const wasAlive = f._wasAlive !== false;
      f.update(dt, this);
      if (wasAlive && f.state === 'ko') this.handleKO(f);
      f._wasAlive = f.state !== 'ko';
    }
    for (let i = this.entities.length - 1; i >= 0; i--) if (this.entities[i]._remove) { const e = this.entities[i]; this.scene.remove(e.obj); if (e.dispose) e.dispose(); this.entities.splice(i, 1); }  // survival dead removal

    this.resolveBodies();
    this.updateItems(dt);
    this.updatePortals(dt);
    this.projectiles.update(dt, this);
    for (let i = this.minions.length - 1; i >= 0; i--) if (!this.minions[i].update(dt, this)) this.minions.splice(i, 1);
    for (let i = this.constructs.length - 1; i >= 0; i--) if (!this.constructs[i].update(dt, this)) this.constructs.splice(i, 1);
    this.particles.update(dt);
    this.vfx.update(dt);
    if (this.running && this.peds) this.peds.update(dt, this);
    if (this.police) this.police.update(dt);
    this.updateVision(dt);
    this.updateReticle(dt);
    this.updatePlayerMark(dt);
    this.updateBlinkMark(dt);
    this.updateCarry(dt);
    this.updateThrownBodies(dt);
    this.updateSmoke(dt);
    this.updateSingularity(dt);
    this.updateSpikes(dt);
    this.updateDecoys(dt);
    this.weather.update(dt);
    this.timeFields.update(dt);
    this.gravityZones.update(dt);
    this.updateDrops(dt);
    // LOW ORBIT DEPARTURE (manual §17): a burner-class flier that punches through the ceiling
    // and keeps the throttle open is LEAVING THE THEATER — offer the world map. Once per climb.
    {
      const p = this.player;
      if (this.running && this.mode && p && p.alive && p.def.afterburner && p._burnT > 0.8
          && p.pos.y > BANDS.ceiling + 44 && !this._departing && this.onDepart) {
        this._departing = true;
        this.onDepart(p);
      }
      if (p && p.pos.y < BANDS.ceiling - 40) this._departing = false;   // re-arm after a real descent
    }
    this.updateThrowArc();
    if (this.mode && !this.matchOver) { const over = this.mode.isOver(this); if (over) this.endMatch(over); }

    this.followHumans(dt);
    if (this.player) this.world.updateOcclusion(this.player.pos, dt);   // towers between lens and player go glassy
    if (this.news) this.news.update(dt);   // the crew shoots BEFORE the main pass — their POV render hides under it
    this.world.render();
  }

  followHumans(dt) {
    if (this.humans.length >= 2 && this.humans[1].fighter.alive) {
      const a = this.humans[0].fighter.pos, b = this.humans[1].fighter.pos;
      const spread = Math.hypot(a.x - b.x, a.z - b.z);
      this.world.setBaseZoom(clamp(spread * 0.6 + 56, 78, 128));
      this.world.follow(_v.set((a.x + b.x) / 2, 6 + (a.y + b.y) * 0.2, (a.z + b.z) / 2), dt);
    } else if (this.player) {
      this.world.setBaseZoom(78);
      _v.copy(this.player.pos); _v.x += (this.aimPoint.x - this.player.pos.x) * 0.12; _v.z += (this.aimPoint.z - this.player.pos.z) * 0.12;
      this.world.follow(_v, dt);
    }
  }
}

export { ROSTER };

