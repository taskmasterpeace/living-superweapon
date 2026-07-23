// THRESHOLD — netplay glue. v1 model for a non-deterministic engine:
//   · each client OWNS its fighter (position/hp/ki authority = the victim's own sim)
//   · state streams at 15Hz; ability/melee INTENTS replay on the remote puppet so both
//     screens show real projectiles, beams and swings
//   · my attacks on your puppet only spark locally — YOUR sim replays my intents and
//     applies the damage to the real you, then your hp streams back (victim authority)
// Transport: Supabase Realtime broadcast (core/net.js). WebRTC is the upgrade path.
import { NetSession } from '../core/net.js';
import { runSlot } from './abilities.js';

const TICK = 1 / 15;

export class Netplay {
  constructor(game, hud) {
    this.game = game; this.hud = hud;
    this.net = new NetSession();
    this.active = false; this.remote = null;
    this._acc = 0; this._evQ = [];
    this.onLobby = null; this.onMatchStart = null; this.onMatchEnd = null;
    this.net.onState = (s) => this._applyState(s);
    this.net.onEvent = (e) => this._applyEvents(e);
    this.net.onStart = (cfg) => this._launch(cfg);
    this.net.onPeerJoin = () => this.onLobby && this.onLobby();
    this.net.onPeerUpdate = () => this.onLobby && this.onLobby();
    this.net.onPeerLeave = () => {
      if (this.active) { this.hud.feed('⚠ Opponent disconnected', '#ff8a6a'); this.endMatch(); }
      else if (this.onLobby) this.onLobby();
    };
  }

  async hostRoom(heroId) { await this.net.auth(); return this.net.host(heroId); }
  async joinRoom(code, heroId) { await this.net.auth(); return this.net.join(code, heroId); }

  startOnline() {                       // host presses FIGHT
    if (!this.net.isHost || !this.net.peer) return;
    const cfg = { heroes: { [this.net.identity.uid]: this.net.heroId, [this.net.peer.id]: this.net.peer.heroId } };
    this.net.startMatch(cfg);
    this._launch(cfg);
  }

  _launch(cfg) {
    const mine = cfg.heroes[this.net.identity.uid] || 'sol';
    const theirs = Object.entries(cfg.heroes).find(([id]) => id !== this.net.identity.uid);
    this.active = true; this._acc = 0; this._evQ = [];
    if (this.onMatchStart) this.onMatchStart({ mode: 'duel', p1: mine, net: true });
    const g = this.game;
    this.remote = g.spawnRemote(theirs ? theirs[1] : 'kano');
    this.remote.name = (this.net.peer && this.net.peer.name) || this.remote.name;
    g.ms.enemy = this.remote;
    this.hud.feed('⚔ ONLINE DUEL — ' + this.remote.name + ' connected', '#7fe6ff');
  }

  endMatch() { this.active = false; this.remote = null; if (this.onMatchEnd) this.onMatchEnd(); }
  async leave() { this.active = false; this.remote = null; await this.net.leave(); }

  // ---- capture (called from controlPlayer) ----
  queueSlot(k, phase, aim) { this._evQ.push({ t: 's', k, p: phase, a: aim ? [+aim.x.toFixed(2), +aim.y.toFixed(2), +aim.z.toFixed(2)] : null }); }
  queueMelee(m) { this._evQ.push({ t: 'm', m }); }

  // ---- per-frame ----
  update(dt) {
    if (!this.active) return;
    const g = this.game, p = g.player, r = this.remote;
    if (!p) return;
    // sustain the remote's held slots (beams/cones need `held` every frame)
    if (r && r.alive && r._held) {
      for (const k of r._held) runSlot(r, k, { pressed: false, held: true, released: false, dt }, g);
    }
    this._acc += dt;
    if (this._acc >= TICK) {
      this._acc %= TICK;
      const s = {
        x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2),
        vx: +p.vel.x.toFixed(1), vy: +p.vel.y.toFixed(1), vz: +p.vel.z.toFixed(1),
        f: +p.facing.toFixed(3), a: [+p.aim3.x.toFixed(2), +p.aim3.y.toFixed(2), +p.aim3.z.toFixed(2)],
        fl: p.flying ? 1 : 0, gd: p.guarding ? 1 : 0,
        h: +p.hp.toFixed(1), k: +p.ki.toFixed(1),
      };
      if (this._evQ.length) { s.ev = this._evQ; this._evQ = []; }
      this.net.sendState(s);
    }
  }

  _applyState(s) {
    const r = this.remote; if (!r) return;
    r._net = s;
    if (s.ev) this._applyEvents({ list: s.ev });
  }
  _applyEvents(e) {
    const r = this.remote, g = this.game; if (!r || !r.alive) return;
    if (!r._held) r._held = new Set();
    for (const ev of (e.list || [e])) {
      if (ev.t === 's') {
        if (ev.a) r.aim3.set(ev.a[0], ev.a[1], ev.a[2]);
        if (ev.p === 1) { r._held.add(ev.k); runSlot(r, ev.k, { pressed: true, held: true, released: false, dt: 1 / 60 }, g); }
        else { r._held.delete(ev.k); runSlot(r, ev.k, { pressed: false, held: false, released: true, dt: 1 / 60 }, g); }
      } else if (ev.t === 'm') {
        if (ev.m === 'cs') g.melee.chargeStart(r);
        else if (ev.m === 'cr') g.melee.chargeRelease(r);
        else if (ev.m === 'grab') g.melee.grab(r);
      }
    }
  }
}
