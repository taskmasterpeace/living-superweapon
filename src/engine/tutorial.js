// THRESHOLD — LEARN TO PLAY: a GTA3-grade guided first hour (Robert's ruling 2026-07-24).
// Four ACTS that watch your REAL inputs — you pass by doing, never by clicking "next".
// Act I proves the weapon in the Danger Room; Act II takes the street (objective markers,
// the city as ammunition); Act III teaches THE LAW live (get flagged, survive the response,
// then ghost until the flag fades — the belief/decay systems, taught by experience); Act IV
// is a sanctioned graduation bout. Steps that don't apply to the hero (no flight, no gadget,
// too weak to lift a car) skip automatically. The world marker is one pulsing gold ring —
// the objective language every open-city game since GTA3 speaks.
import * as THREE from 'three';

const slotUsed = (f, k) => {
  const s = f.slots && f.slots[k];
  return !!s && (s.cd > 0 || s.charging || s.sustainT > 0 || s.chargeT > 0 || (f._slotUse && f._slotUse[k]));
};
const clearUse = (f, k) => { if (f._slotUse) delete f._slotUse[k]; };
// the Danger Room starts EMPTY now — steps that need a target order one themselves
const ensureBot = (f, g) => { if (g && !g.entities.some(e => e.isDummy && e.alive)) try { g.spawnDummy(f.pos.x + 10, f.pos.z); } catch (e) {} };

const ACTS = [
  {
    act: 'ACT I — WEAPONS CHECK', color: '#7fe6ff',
    steps: [
      {
        id: 'move', obj: 'Move', keys: 'W A S D', tip: 'The mouse aims everything. Walk a lap.',
        init: (S, f) => { S.x = f.pos.x; S.z = f.pos.z; S.acc = 0; },
        check: (f, g, S) => { S.acc += Math.hypot(f.pos.x - S.x, f.pos.z - S.z); S.x = f.pos.x; S.z = f.pos.z; return S.acc > 55; },
      },
      {
        id: 'fire', obj: 'Fire your main power', keys: 'LMB', tip: 'Aim at a Training Bot and let it rip.',
        init: (S, f, g) => { clearUse(f, 'lmb'); ensureBot(f, g); }, check: (f) => slotUsed(f, 'lmb'),
      },
      {
        id: 'fire2', obj: 'Fire your second power', keys: 'RMB', tip: 'Some powers charge or sustain — try HOLDING it.',
        init: (S, f) => clearUse(f, 'rmb'), check: (f) => slotUsed(f, 'rmb'),
      },
      {
        id: 'jab', obj: 'Throw a jab', keys: 'V — tap', tip: 'Get close to a bot first.',
        init: (S, f, g) => ensureBot(f, g),
        check: (f) => f.strikeActive > 0,
      },
      {
        id: 'haymaker', obj: 'Charge a HAYMAKER', keys: 'V — hold, then release', tip: 'Hold until you rumble. Haymakers CRUSH guards.',
        init: (S) => { S.charged = false; },
        check: (f, g, S) => { if (f.meleeCharge > 0.6) S.charged = true; return S.charged && f.meleeCharge <= 0 && f._heavyHay === true; },
      },
      {
        id: 'guard', obj: 'Hold your guard', keys: 'C — hold', tip: 'Blocks strikes to chip damage. Grabs go right through it.',
        init: (S) => { S.t = 0; },
        check: (f, g, S, dt) => { if (f.guarding) S.t += dt; return S.t > 0.8; },
      },
      {
        id: 'grab', obj: 'Grab a Training Bot', keys: 'G — up close', tip: 'Strike beats Grab · Grab beats Guard · Guard beats Strike.',
        check: (f) => !!(f.grabState === 'clinch' || f.grabbing),
      },
      {
        id: 'evade', obj: 'Evade', keys: '2×TAP a direction', tip: 'Double-tap W/A/S/D fast. This is your escape hatch.',
        check: (f) => f.evadeCd > 0,
      },
      {
        id: 'fly', obj: 'Take off and climb a band', keys: 'F, then hold SPACE', tip: 'Release to dock on the current deck. Altitude is a ladder, not an axis.',
        enabled: (f) => (f.def.flightTier ?? 3) > 0,
        check: (f) => f.flying && f.pos.y > 6,
      },
      {
        id: 'land', obj: 'Descend and land', keys: 'Z — hold', tip: 'Touch down to fold your wings.',
        enabled: (f) => (f.def.flightTier ?? 3) > 0,
        check: (f) => !f.flying && f.pos.y < 0.5,
      },
      {
        id: 'item', obj: 'Use your gadget', keys: 'X', tip: 'Gadgets cost no ki — cooldown only.',
        enabled: (f) => (f.items || []).length > 0,
        init: (S, f) => { S.snap = JSON.stringify(f.items); },
        check: (f, g, S) => JSON.stringify(f.items) !== S.snap,
      },
      {
        id: 'ult', obj: 'Unleash your ULTIMATE', keys: 'R', tip: 'The big one. Watch the blue ki bar — empty means fizzle.',
        init: (S, f) => clearUse(f, 'r'), check: (f) => slotUsed(f, 'r'),
      },
    ],
  },
  {
    act: 'ACT II — THE STREET', color: '#ffd24a',
    say: 'The Danger Room is over. Out there, everything is real — and everything is a weapon.',
    steps: [
      {
        id: 'goto', obj: 'Reach the marker', keys: 'move out', tip: 'The gold ring is your objective. Fly if you have wings.',
        init: (S, f, g) => {
          const a = Math.random() * Math.PI * 2, d = 70;
          S.mx = Math.max(-160, Math.min(160, f.pos.x + Math.cos(a) * d));
          S.mz = Math.max(-160, Math.min(160, f.pos.z + Math.sin(a) * d));
        },
        marker: (S) => ({ x: S.mx, z: S.mz }),
        check: (f, g, S) => Math.hypot(f.pos.x - S.mx, f.pos.z - S.mz) < 7,
      },
      {
        id: 'hoist', obj: 'HOIST something big', keys: 'G — near a car or tree', tip: 'Strength 6+ lifts cars. Everyone lifts trees and lamps.',
        init: (S, f, g) => { S.car = null; },
        marker: (S, f, g) => {
          let best = null, bd = 1e9;
          for (const c of (g.world.cars || [])) {   // world cars are {mesh, x, z, hp, dead}
            if (c.dead) continue;
            const d = Math.hypot(c.x - f.pos.x, c.z - f.pos.z);
            if (d < bd) { bd = d; best = c; }
          }
          return best ? { x: best.x, z: best.z } : null;
        },
        check: (f) => !!f.carrying,
      },
      {
        id: 'hurl', obj: 'HURL it', keys: 'G again — watch the arc', tip: 'The dotted parabola never lies. Lead your target.',
        init: (S, f) => { S.had = !!f.carrying; },
        check: (f, g, S) => { if (f.carrying) S.had = true; return S.had && !f.carrying; },
      },
      {
        id: 'wreck', obj: 'Break a structure', keys: 'any big hit', tip: 'Charged blasts crater streets and crack towers. The city remembers.',
        init: (S, f, g) => { S.b0 = g.cityStats ? g.cityStats.blocks : 0; S.c0 = g.cityStats ? g.cityStats.craters : 0; },
        check: (f, g, S) => g.cityStats && (g.cityStats.blocks > S.b0 || g.cityStats.craters > S.c0),
      },
    ],
  },
  {
    act: 'ACT III — THE LAW', color: '#5aa0ff',
    say: 'Hurt a human and the city answers. Learn what the response feels like — and how to make it stop.',
    police: true,
    steps: [
      {
        id: 'flag', obj: 'Get FLAGGED', keys: 'knock civilians down', tip: 'A blast near a crowd books HEAT. They get back up — the flag does not, yet.',
        check: (f, g) => g.police && g.police.wantedLevel(f) >= 1,
      },
      {
        id: 'survive', obj: 'Survive the response', keys: '12 seconds', tip: 'Bullets are an annoyance to a superweapon. Do not KO the officers — that ESCALATES.',
        init: (S) => { S.t = 0; },
        check: (f, g, S, dt) => { if (g.police && g.police.wantedLevel(f) >= 1) S.t += dt; return S.t > 12; },
      },
      {
        id: 'ghost', obj: 'GHOST the flag', keys: 'stop · hide · wait', tip: 'Quiet for 6s starts the decay. Break line of sight — they hunt what they BELIEVE, not what is.',
        // the lesson is the LOOP, not the sentence: however wild the rampage got, the ghost
        // wait is bounded (~45s of clean behaviour), so clamp the practice heat on entry
        init: (S, f, g) => { if (g.police && g.police.heat && g.police.heatOf(f) > 90) g.police.heat.set(f, 90); },
        check: (f, g) => g.police && g.police.wantedLevel(f) === 0,
      },
    ],
  },
  {
    act: 'ACT IV — GRADUATION', color: '#9bd07a',
    say: 'One sanctioned bout. Win it clean and the crowd is yours.',
    steps: [
      {
        id: 'rival', obj: 'Defeat SARGE', keys: 'everything you know', tip: 'Guard his gunfire. Crush his guard. Take the win.',
        init: (S, f, g) => {
          if (!S.spawned) { S.spawned = true; try { g.spawnRival('sarge'); } catch (e) {} }
        },
        check: (f, g) => g.entities.some(e => e.def && e.def.id === 'sarge' && e.team !== f.team && (e.state === 'ko' || !e.alive)),
      },
    ],
  },
];

export class Tutorial {
  constructor(game, hud) { this.game = game; this.hud = hud; this.active = false; this._ring = null; }

  begin() {
    const f = this.game.player; if (!f) return;
    this.acts = ACTS.map(a => ({ ...a, steps: a.steps.filter(s => !s.enabled || s.enabled(f)) })).filter(a => a.steps.length);
    this.total = this.acts.reduce((n, a) => n + a.steps.length, 0);
    this.ai = 0; this.si = -1; this.done = 0; this.active = true;
    this._enterAct();
  }

  _act() { return this.acts[this.ai]; }
  _step() { return this._act() && this._act().steps[this.si]; }

  _enterAct() {
    const A = this._act(); if (!A) { this._complete(); return; }
    if (A.say && this.hud.feed) this.hud.feed('📡 TREATY OFFICE — ' + A.say, A.color);
    if (this.hud.announce && this.ai > 0) this.hud.announce(A.act, A.say || '', A.color);
    if (A.police && this.game.police) this.game.police._forced = true;   // the law runs even in the Danger Room
    this.si = -1;
    this._advance();
  }

  _advance() {
    this.si++;
    const A = this._act();
    if (this.si >= A.steps.length) {
      if (A.police && this.game.police) { /* stays forced through the act; released on complete */ }
      this.ai++; this._enterAct(); return;
    }
    const st = A.steps[this.si];
    this.S = {};
    if (st.init) st.init(this.S, this.game.player, this.game);
    this.hud.showTutorial(st, this.done, this.total, A.act);
  }

  _complete() {
    this.active = false;
    if (this.game.police) this.game.police._forced = false;
    this._hideRing();
    try { localStorage.setItem('threshold_tutorial_done', '1'); } catch { /* fine */ }
    this.hud.completeTutorial();
    this.game.audio.sample ? this.game.audio.sample('sting.victory', { bus: 'music' }) : this.game.audio.boom(0.5);
    if (this.hud.announce) this.hud.announce('YOU ARE THE WEAPON', 'graduated — TAB for the roster, the Atlas for a theater', '#ffd24a');
  }

  skip() {
    this.active = false;
    if (this.game.police) this.game.police._forced = false;
    this._hideRing();
    this.hud.hideTutorial();
  }

  // ---- the objective ring (GTA's language: one gold ring, pulsing on the ground) ----
  _showRing(x, z) {
    const g = this.game;
    if (!this._ring) {
      const geo = new THREE.RingGeometry(4.2, 5.4, 40);
      const mat = new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
      this._ring = new THREE.Mesh(geo, mat);
      this._ring.rotation.x = -Math.PI / 2;
      g.scene.add(this._ring);
    }
    const y = (g.world.heightAt ? g.world.heightAt(x, z) : 0) + 0.25;
    this._ring.visible = true;
    this._ring.position.set(x, y, z);
    const p = 1 + Math.sin(performance.now() / 240) * 0.1;
    this._ring.scale.set(p, p, 1);
    this._ring.material.opacity = 0.55 + Math.sin(performance.now() / 240) * 0.3;
  }
  _hideRing() { if (this._ring) this._ring.visible = false; }

  update(dt) {
    if (!this.active) return;
    const f = this.game.player; if (!f) return;
    const st = this._step(); if (!st) return;
    // the marker + live distance
    if (st.marker) {
      const m = st.marker(this.S, f, this.game);
      if (m) {
        this._showRing(m.x, m.z);
        if (this.hud.setTutorialDist) this.hud.setTutorialDist(Math.round(Math.hypot(f.pos.x - m.x, f.pos.z - m.z) * 0.19) + 'm');
      } else this._hideRing();
    } else {
      this._hideRing();
      if (this.hud.setTutorialDist) this.hud.setTutorialDist('');
    }
    if (st.check(f, this.game, this.S, dt)) {
      this.done++;
      this.game.audio.sample ? this.game.audio.sample('ui.confirm', { bus: 'ui' }) : this.game.audio.zap(980);
      this.hud.tutorialStepDone();
      this._advance();
    }
  }
}
