// Living Superweapon — character-authentic AI. Each hero fights in the style of its counterpart:
// beamers zone, rushers blitz, artillery kites, zoners wall up, tricksters teleport/phase, grapplers grab, summoners hide behind minions.
import { rand, chance, pick } from '../core/util.js';

const HOLD = new Set(['beam', 'charge', 'spiritbomb', 'cone', 'volley', 'phase', 'rifle']);
const holdTime = (t) => t === 'charge' ? rand(0.9, 1.9) : t === 'spiritbomb' ? rand(1.1, 2.2) : t === 'beam' ? rand(0.9, 1.8) : t === 'phase' ? rand(0.5, 1.2) : t === 'rifle' ? rand(0.6, 1.5) : rand(0.4, 1.1);

function deriveStyle(def) {
  const types = Object.values(def.abilities || {}).map(a => a.type);
  if (types.includes('summon')) return 'summoner';
  if (types.includes('construct')) return 'zoner';
  if (types.includes('meteor')) return 'artillery';
  if ((def.speed || 30) >= 40) return 'rusher';
  if (types.includes('beam')) return 'beamer';
  return 'bruiser';
}

export class AI {
  constructor(bot, level = 1) {
    this.bot = bot; this.level = level;
    const p = bot.def.ai || {};
    this.style = p.style || deriveStyle(bot.def);
    this.range = p.range ?? 34;
    this.aggro = p.aggro ?? 0.7;
    this.flyTend = p.fly ?? 0.3;
    this.byType = {};
    for (const k in bot.slots) { const t = bot.slots[k].def.type; (this.byType[t] = this.byType[t] || []).push(k); }
    this.think = 0; this.strafe = 1; this.gcd = rand(0.3, 0.9); this.action = null;
    // vision (bots can be juked around walls) — generous cone so they stay aggressive
    this.seeNear = 30; this.seeRange = 118; this.seeCos = Math.cos(1.2); this._mem = 0; this._ls = null; this._scan = null; this._scanDir = 1; this._sees = false;
  }

  intent(dt, game) {
    const b = this.bot;
    const out = { move: { x: 0, z: 0 }, aimDir: null, slots: {}, fly: false, target: null };
    for (const k in b.slots) out.slots[k] = { pressed: false, held: false, released: false };

    // focus the player if it's a foe, else the nearest
    const real = (game.player && game.isFoe(b, game.player) && game.player.alive) ? game.player : game.nearestFoe(b, b.pos, 500);
    if (!real) { out.aimDir = { x: Math.sin(b.facing), z: Math.cos(b.facing) }; return out; }

    // --- vision & memory ---
    const rdx = real.pos.x - b.pos.x, rdz = real.pos.z - b.pos.z, rd = Math.hypot(rdx, rdz) || 1;
    const inCone = rd < this.seeNear || (rd < this.seeRange && (rdx / rd) * b.aim.x + (rdz / rd) * b.aim.z > this.seeCos);
    const sees = inCone && game.canSee(b, real);
    if (sees) { this._mem = 4; (this._ls || (this._ls = {})).x = real.pos.x; this._ls.z = real.pos.z; this._ls.y = real.pos.y; }
    else if (this._mem > 0) this._mem -= dt;
    this._sees = sees;

    if (!sees) {
      // blind: hunt toward last-seen (juke window) or the foe's area; never attack without sight
      const gx = (this._mem > 0 && this._ls) ? this._ls.x : real.pos.x, gz = (this._mem > 0 && this._ls) ? this._ls.z : real.pos.z;
      const hx = gx - b.pos.x, hz = gz - b.pos.z, hd = Math.hypot(hx, hz) || 1;
      out.aimDir = { x: hx / hd, z: hz / hd }; out.move = { x: hx / hd, z: hz / hd };
      out.fly = (real.pos.y - b.pos.y > 8 && this.flyTend > 0.4);
      this.action = null; return out;
    }

    const tx = real.pos.x, tz = real.pos.z, ty = real.pos.y;
    const dx = tx - b.pos.x, dz = tz - b.pos.z, d = Math.hypot(dx, dz) || 1, dh = ty - b.pos.y;
    out.aimDir = { x: dx / d, z: dz / d };
    out.target = real;
    const lowHp = b.hp < b.maxHp * 0.32;
    out.fly = (dh > 6 && this.flyTend > 0.25) || (this.flyTend > 0.6 && ty > 4 && dh > -6);

    // movement — hold preferred range + strafe
    this.think -= dt; if (this.think <= 0) { this.think = rand(0.6, 1.5); this.strafe = chance(0.5) ? 1 : -1; }
    let mx = 0, mz = 0;
    let pref = this.range * (lowHp ? 1.5 : 1); if (this.aggro > 0.85 && !lowHp) pref *= 0.8;
    if (d > pref + 8) { mx = dx / d; mz = dz / d; } else if (d < pref - 8) { mx = -dx / d; mz = -dz / d; }
    const sa = 0.4 + this.aggro * 0.3; mx += (-dz / d) * this.strafe * sa; mz += (dx / d) * this.strafe * sa;
    out.move = { x: mx, z: mz };

    // --- abilities (only when the target is actually in view) ---
    if (this.action) {
      this.action.t -= dt; const k = this.action.key;
      if (b.slots[k] && this.action.t > 0) out.slots[k].held = true;
      else { if (b.slots[k]) out.slots[k].released = true; this.action = null; }
      return out;
    }
    if (lowHp) {
      const buff = (this.byType.buff || []).find(k => b.slots[k].cd <= 0 && b.ki >= (b.slots[k].def.cost || 0));
      if (buff && chance(0.5)) { out.slots[buff].pressed = true; this.gcd = 1; return out; }
    }
    this.gcd -= dt;
    if (this.gcd <= 0) {
      this.gcd = rand(0.35, 0.9) / this.level;
      const key = this.pick(d, dh, lowHp);
      if (key) {
        const type = b.slots[key].def.type;
        if (HOLD.has(type)) { this.action = { key, t: holdTime(type) }; out.slots[key].pressed = true; out.slots[key].held = true; }
        else out.slots[key].pressed = true;
      }
    }
    return out;
  }

  pick(d, dh, lowHp) {
    const b = this.bot, T = this.byType;
    const ok = (k) => b.slots[k].cd <= 0 && b.ki >= (b.slots[k].def.cost || 0);
    const one = (arr) => { const e = (arr || []).filter(ok); return e.length ? pick(e) : null; };
    const close = d < 14, far = d >= 44;

    if (lowHp) {
      if (T.phase && chance(0.5)) return one(T.phase);
      if (T.teleport && chance(0.45)) return one(T.teleport);
    }
    if (b.slots.r && ok('r') && chance(0.14)) return 'r';       // occasional ultimate

    switch (this.style) {
      case 'rusher':
        if (far) return one(T.dash) || one(T.teleport) || one(T.projectile) || one(T.beam);
        if (close) return one(T.rush) || one(T.melee) || one(T.projectile);
        return one(T.rush) || one(T.projectile) || one(T.dash) || one(T.beam);
      case 'beamer':
        if (close) return one(T.melee) || one(T.cone) || one(T.beam);
        return one(T.beam) || one(T.rifle) || one(T.projectile) || one(T.volley);
      case 'artillery':
        if (far) return one(T.meteor) || one(T.charge) || one(T.projectile) || one(T.beam);
        if (close) return one(T.cone) || one(T.dash) || one(T.melee);
        return one(T.charge) || one(T.projectile) || one(T.beam) || one(T.volley);
      case 'zoner':
        if (chance(0.4)) { const c = one(T.construct) || one(T.summon); if (c) return c; }
        if (close) return one(T.cone) || one(T.melee) || one(T.dash);
        return one(T.beam) || one(T.rifle) || one(T.projectile) || one(T.volley) || one(T.construct);
      case 'summoner':
        if (chance(0.5)) { const s = one(T.summon) || one(T.construct); if (s) return s; }
        if (close) return one(T.cone) || one(T.dash);
        return one(T.projectile) || one(T.summon);
      case 'grappler':
        if (far) return one(T.teleport) || one(T.dash) || one(T.projectile) || one(T.beam);
        if (close) return one(T.tentacle) || one(T.melee) || one(T.rush);   // grabs handled by controlBot melee layer
        if (T.tentacle && d < 32 && chance(0.5)) { const t = one(T.tentacle); if (t) return t; }
        return one(T.projectile) || one(T.dash) || one(T.beam);
      case 'trickster':
        if (lowHp && T.phase) return one(T.phase);
        if (T.portal && chance(0.12)) { const p = one(T.portal); if (p) return p; }   // RIFT scatters doors
        if (close) return one(T.rush) || one(T.melee) || one(T.teleport);
        if (far) return one(T.beam) || one(T.projectile) || one(T.charge);
        return one(T.beam) || one(T.projectile) || one(T.teleport);
      case 'bruiser':
      default:
        if (close) return one(T.melee) || one(T.rush) || one(T.cone);
        if (far) return one(T.charge) || one(T.beam) || one(T.projectile) || one(T.dash);
        return one(T.projectile) || one(T.charge) || one(T.beam) || one(T.melee);
    }
  }
}
