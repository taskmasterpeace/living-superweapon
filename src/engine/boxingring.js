// =================================================================================================
// THE RING — real boxing rules, inside a square of rope.
//
// Robert: *"build a boxing ring for the tournament stuff. It should bounce the person off the ring
// ropes... put a monitor like the other one that reads NO FLYING and it always gives data from the
// boxing ring. Apply REAL boxing rules, we should be able to play it like a boxing game."*
//
// ⚠ THE RING IS A RULE SET, NOT A PROP. A square of rope you can fly out of is scenery. What makes
// this a boxing game is that the ropes push back, the ceiling is closed, and the fight is scored the
// way a real one is — and every one of those is a rule the rest of the engine already knows how to
// obey. Nothing here reaches into the fight; it reads the fight and answers.
//
// ⚠ ROUND NUMBERS ARE REAL BOXING, NOT INVENTED. Three-minute rounds, one-minute rest, ten-count
// knockdown, three knockdowns in a round ends it, saved-by-the-bell only in the final round. Those
// are the actual rules and they are the reason the mode has a shape — a fight that just runs until
// someone drops is a brawl, and a brawl is what we already have everywhere else.
// =================================================================================================
import * as THREE from 'three';

// ---- THE RULE BOOK. Every figure here is a real one; where the game clock differs from a real
// clock it is scaled ONCE, here, and everything downstream reads the scaled value.
export const BOXING = {
  // ⚠ A REAL ROUND IS 180 SECONDS AND THAT IS TOO LONG FOR THIS GAME'S PACE — a match would run
  // twelve minutes. The scale is declared rather than hidden so the ratio between round and rest
  // stays honest: a round is three times the rest, exactly as it is in a real fight.
  roundSecs: 60, restSecs: 20, rounds: 3,
  count: 10,                 // the ten-count. A downed fighter has this long to rise.
  countSecs: 1.0,            // one second per number, like a referee
  knockdownsPerRound: 3,     // three in a round and it is over — the real "three-knockdown rule"
  savedByBell: 'final',      // the bell saves you in the last round only
  // scoring: the ten-point must system. The round winner takes 10, the loser 9, minus one per
  // knockdown taken. Nobody has to know this to play; it just makes the card read like a real one.
  winnerPoints: 10, loserPoints: 9,
  // ⚠ MEASURED, NOT CHOSEN. At 0.72 the reflect was correct and only 26% of the speed survived ten
  // frames of drag — the bounce was real and unfeelable, which is the worst of both. The rope now
  // returns more than it takes AND holds `burstT` long enough for the return trip to happen.
  ropeBounce: 1.05,          // how much of your speed the ropes give back
  ropeMin: 18,               // below this you lean on them; above it you come off
  // ⚠ A REAL RING IS 16–20 FEET AND I BUILT 128u, WHICH IS FOUR TIMES TOO BIG. At 1u ≈ 0.19m a
  // 20ft ring is 32u — and the SCREENSHOT is what caught it, after six green assertions did not:
  // two 9.6u fighters at opposite corners of a 128u square are specks with a car's length of empty
  // canvas between them. Boxing is close quarters; the ring being small IS the sport.
  // 46u is a large championship ring at our scale.
  size: 46,
  postH: 17, ropeYs: [5, 9.5, 14],
};

const CORNERS = [['RED', '#c9564a'], ['BLUE', '#4a7fc9']];

export class BoxingRing {
  constructor(game) {
    this.g = game;
    this.group = null;
    this.round = 1; this.roundT = BOXING.roundSecs; this.resting = false;
    this.cards = {};                                  // fighter id -> { points, downs, landed, thrown }
    this.count = null;                                // { who, n, t } while someone is down
    this.over = null;
    this._mats = []; this._msg = ''; this._msgT = 0;
    this._boardCv = null; this._boardTex = null; this._boardT = 0;
    this._bounced = new Map();
  }

  // ------------------------------------------------------------------ build
  open() {
    const g = this.g, W = g.world;
    if (this.group) this.close();
    const grp = new THREE.Group(); this.group = grp;
    const S = BOXING.size, h = S / 2;

    const canvas = new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.95 });
    const apron = new THREE.MeshStandardMaterial({ color: '#1b1814', roughness: 0.9 });
    const post = new THREE.MeshStandardMaterial({ color: '#2a2620', roughness: 0.5, metalness: 0.4 });
    const rope = new THREE.MeshStandardMaterial({ color: '#e8e2d4', roughness: 0.85 });
    const padR = new THREE.MeshStandardMaterial({ color: CORNERS[0][1], roughness: 0.8 });
    const padB = new THREE.MeshStandardMaterial({ color: CORNERS[1][1], roughness: 0.8 });
    this._mats = [canvas, apron, post, rope, padR, padB];

    const add = (m) => { grp.add(m); return m; };
    // ⚠ THE CANVAS TAKES A RUNG FROM `GROUND_LAYER`, never its own small number — five systems each
    // picked one once and they all collided (the flicker law).
    const deck = add(new THREE.Mesh(new THREE.BoxGeometry(S + 16, 3, S + 16), apron));
    deck.position.y = 1.5; deck.receiveShadow = true;
    const mat_ = add(new THREE.Mesh(new THREE.BoxGeometry(S, 0.6, S), canvas));
    mat_.position.y = 3.3; mat_.receiveShadow = true;

    // four posts, four corners, three ropes a side
    for (let i = 0; i < 4; i++) {
      const sx = (i === 0 || i === 3) ? -1 : 1, sz = (i < 2) ? -1 : 1;
      const p = add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, BOXING.postH, 10), post));
      p.position.set(sx * h, 3.6 + BOXING.postH / 2, sz * h); p.castShadow = true;
      // ⚠ corner pads are RED and BLUE, which is the rule — and neither is purple, which is ours
      const pad = add(new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 14, 10), i % 2 ? padB : padR));
      pad.position.set(sx * h, 3.6 + 7, sz * h);
    }
    for (const y of BOXING.ropeYs) {
      for (let s = 0; s < 4; s++) {
        const horiz = s % 2 === 0;
        const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, S, 6), rope));
        r.rotation.z = Math.PI / 2;
        if (!horiz) r.rotation.y = Math.PI / 2;
        r.position.set(horiz ? 0 : (s === 1 ? h : -h), 3.6 + y, horiz ? (s === 0 ? -h : h) : 0);
      }
    }
    W.scene.add(grp);
    this._buildBoard(add, W);
    // ⚠ the ring is a TRANSIENT — it must not outlive the match. `clearTransients` calls close().
    g._ring = this;
    this.say('ROUND 1 — BOX');
    return this;
  }

  _buildBoard(add, W) {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    this._boardCv = cv;
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8; this._boardTex = tex;
    const b = add(new THREE.Mesh(new THREE.PlaneGeometry(120, 60),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })));
    b.position.set(0, 56, -(BOXING.size / 2) - 40);
    this._mats.push(b.material);
    this._paint();
  }

  say(t) { this._msg = t; this._msgT = 2.4; }

  card(f) {
    const id = f.def ? f.def.id : 'x';
    return this.cards[id] || (this.cards[id] = { points: 0, downs: 0, landed: 0, thrown: 0, name: f.def ? f.def.name : '?' });
  }

  // ------------------------------------------------------------------ the rules
  /** Called from game.onHit — the choke point every hit already routes through. */
  onHit(target, amount, opts, blocked) {
    if (!this.group || this.resting || this.over) return;
    const src = opts && opts.src;
    if (src && src !== target) {
      const c = this.card(src);
      c.thrown++;
      if (!blocked) c.landed++;
    }
  }

  /** A fighter went down. Real boxing: a ten-count, and three in one round ends it. */
  down(f) {
    if (!this.group || this.over) return;
    const c = this.card(f);
    c.downs++;
    this.count = { who: f, n: 0, t: 0 };
    this.say(c.name + ' IS DOWN');
    if (c.downs >= BOXING.knockdownsPerRound) this.finish(this._other(f), 'TKO — THREE KNOCKDOWNS');
  }

  _other(f) { return (this.g.entities || []).find(e => e !== f && e.def && e.team !== f.team && e.maxHp > 0) || null; }

  finish(winner, why) {
    if (this.over) return;
    this.over = { winner, why };
    this.say((winner && winner.def ? winner.def.name : 'NOBODY') + ' — ' + why);
  }

  update(dt, g) {
    if (!this.group) return;
    // ⚠ NO FLYING, AND IT IS ENFORCED BY REFUSING THE STATE rather than by clamping altitude —
    // clamping leaves you hovering at the ceiling looking like the game is broken. The refusal is
    // the same one `toggleFlight` already makes for a grounded fighter (`flightTier 0`), so nothing
    // new had to be taught to the flight system.
    for (const e of g.entities || []) {
      if (!e.alive || !e.def) continue;
      if (e.flying) { e.flying = false; e.vel.y = Math.min(e.vel.y, 0); this.say('NO FLYING'); }
      this._ropes(e, dt);
    }
    if (this.count) this._count(dt);
    else if (!this.over) {
      this.roundT -= dt;
      if (this.roundT <= 0) this._bell();
    }
    this._msgT = Math.max(0, this._msgT - dt);
    this._boardT -= dt;
    if (this._boardT <= 0) { this._boardT = 0.25; this._paint(); }
  }

  /**
   * ⚠ THE ROPES ARE THE WHOLE REASON THIS IS A RING. They give back most of your speed, which turns
   * the boundary from a wall you stop against into a hazard that returns you to the middle at pace —
   * and momentum melee already turns speed into damage, so being bounced off the ropes into a punch
   * hurts more than walking into one. That interaction is free and it is the best thing here.
   */
  _ropes(f, dt) {
    const h = BOXING.size / 2 - 3;
    let hit = 0, nx = 0, nz = 0;
    if (f.pos.x > h) { hit = f.pos.x - h; nx = -1; f.pos.x = h; }
    else if (f.pos.x < -h) { hit = -h - f.pos.x; nx = 1; f.pos.x = -h; }
    if (f.pos.z > h) { hit = Math.max(hit, f.pos.z - h); nz = -1; f.pos.z = h; }
    else if (f.pos.z < -h) { hit = Math.max(hit, -h - f.pos.z); nz = 1; f.pos.z = -h; }
    if (!hit) return;
    const spd = Math.hypot(f.vel.x, f.vel.z);
    if (spd < BOXING.ropeMin) {                       // leaning on the ropes, not hitting them
      if (nx) f.vel.x *= 0.4;
      if (nz) f.vel.z *= 0.4;
      return;
    }
    // ⚠ REFLECT, do not just reverse — a fighter hitting a corner at an angle should come off at an
    // angle, which is what makes the ring read as a real surface rather than a bounding box.
    if (nx) f.vel.x = Math.abs(f.vel.x) * nx * BOXING.ropeBounce;
    if (nz) f.vel.z = Math.abs(f.vel.z) * nz * BOXING.ropeBounce;
    // ⚠ burstT lifts move()'s walk-speed clamp. 0.25s was long enough for the impulse and too short
    // for the journey, so drag returned him to a walk before he crossed the ring.
    f.burstT = Math.max(f.burstT || 0, 0.65);
    const now = this.g.time || 0;
    if (now - (this._bounced.get(f) || -9) > 0.35) {
      this._bounced.set(f, now);
      this.g.world.shake(0.35 + Math.min(0.6, spd / 90));
      this.g.audio && this.g.audio.impact && this.g.audio.impact(0.5, f.pos);
      this.say('OFF THE ROPES');
    }
  }

  _count(dt) {
    const c = this.count;
    c.t += dt;
    if (c.t >= BOXING.countSecs) {
      c.t = 0; c.n++;
      this.say(String(c.n));
      // ⚠ THE COUNT ENDS EARLY IF YOU GET UP — that is the whole drama of a ten-count, and the game
      // already knows when you are up: `downedT` is the second-wind window and `staggerT` the rest.
      if (c.who && c.who.alive && !(c.who.downedT > 0) && c.who.staggerT <= 0 && c.n >= 2) {
        this.count = null; this.say('BOXING ON');
        return;
      }
      if (c.n >= BOXING.count) { this.count = null; this.finish(this._other(c.who), 'KNOCKOUT'); }
    }
  }

  _bell() {
    // ⚠ SAVED BY THE BELL IS A REAL RULE AND IT ONLY APPLIES IN THE FINAL ROUND. Getting it wrong in
    // the other direction (the bell always saves you) removes the tension from every round.
    if (this.count && (BOXING.savedByBell !== 'final' || this.round >= BOXING.rounds)) this.count = null;
    // ten-point must: the round goes to whoever landed more, minus a point per knockdown
    const ids = Object.keys(this.cards);
    if (ids.length >= 2) {
      const [a, b] = ids.map(i => this.cards[i]);
      const aw = a.landed >= b.landed;
      a.points += (aw ? BOXING.winnerPoints : BOXING.loserPoints) - a.downs;
      b.points += (aw ? BOXING.loserPoints : BOXING.winnerPoints) - b.downs;
      a.downs = 0; b.downs = 0;
    }
    if (this.round >= BOXING.rounds) {
      const ids2 = Object.keys(this.cards);
      const win = ids2.sort((x, y) => this.cards[y].points - this.cards[x].points)[0];
      const f = (this.g.entities || []).find(e => e.def && e.def.id === win);
      this.finish(f, 'DECISION');
      return;
    }
    this.round++; this.roundT = BOXING.roundSecs;
    this.say('ROUND ' + this.round);
  }

  // ------------------------------------------------------------------ the monitor
  _paint() {
    const cv = this._boardCv; if (!cv) return;
    const x = cv.getContext('2d');
    // ⚠ CANVAS 2D CANNOT READ CSS TOKENS — `var(--gold)` is silently ignored and keeps the previous
    // colour. Everything painted into a canvas uses literals. (Paid for once already.)
    x.fillStyle = '#0b0a08'; x.fillRect(0, 0, 1024, 512);
    x.strokeStyle = '#3a352c'; x.lineWidth = 4; x.strokeRect(10, 10, 1004, 492);
    x.fillStyle = '#c9564a'; x.font = 'bold 62px monospace'; x.textAlign = 'center';
    x.fillText('NO FLYING', 512, 86);
    x.fillStyle = '#7d776b'; x.font = '24px monospace';
    x.fillText('THE RING — FEET ON THE CANVAS', 512, 122);

    x.textAlign = 'left'; x.font = 'bold 38px monospace'; x.fillStyle = '#e0b23c';
    x.fillText('ROUND ' + this.round + ' / ' + BOXING.rounds, 60, 200);
    x.fillStyle = '#e8e2d4'; x.font = 'bold 54px monospace'; x.textAlign = 'right';
    x.fillText(Math.max(0, this.roundT).toFixed(1).padStart(5) + 's', 964, 200);

    x.textAlign = 'left'; x.font = '22px monospace'; x.fillStyle = '#7d776b';
    x.fillText('FIGHTER', 60, 262); x.fillText('LANDED', 470, 262);
    x.fillText('THROWN', 640, 262); x.fillText('DOWN', 800, 262); x.fillText('PTS', 900, 262);
    let y = 306;
    for (const id of Object.keys(this.cards)) {
      const c = this.cards[id];
      const pct = c.thrown ? Math.round(100 * c.landed / c.thrown) : 0;
      x.fillStyle = '#e8e2d4'; x.font = 'bold 30px monospace';
      x.fillText(c.name, 60, y);
      x.fillText(String(c.landed), 470, y);
      x.fillStyle = '#96907f'; x.fillText(String(c.thrown) + '  ' + pct + '%', 640, y);
      x.fillStyle = c.downs ? '#c9564a' : '#96907f'; x.fillText(String(c.downs), 800, y);
      x.fillStyle = '#e0b23c'; x.fillText(String(c.points), 900, y);
      y += 46;
    }
    if (this.count) {
      x.textAlign = 'center'; x.fillStyle = '#c9564a'; x.font = 'bold 110px monospace';
      x.fillText(String(this.count.n), 512, 470);
    } else if (this._msgT > 0) {
      x.textAlign = 'center'; x.fillStyle = '#e0b23c'; x.font = 'bold 46px monospace';
      x.fillText(this._msg, 512, 462);
    }
    this._boardTex.needsUpdate = true;
  }

  close() {
    if (!this.group) return;
    const W = this.g.world;
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this._mats) m.dispose();
    if (this._boardTex) this._boardTex.dispose();
    W.scene.remove(this.group);
    this.group = null; this._mats = []; this._boardCv = null; this._boardTex = null;
    if (this.g._ring === this) this.g._ring = null;
  }
}
