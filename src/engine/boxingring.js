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
  // ⚠ 42, NOT 18 — AND A WALK MEASURES 27.3. At 18 the threshold sat BELOW ordinary walking speed,
  // so simply stepping to the edge of the ring flung you back across it at 105% with a 0.65s burst
  // that lifts the walk-speed clamp. You could not stand at the ropes, work along them, or cut off
  // the ring — which is most of boxing. A boxer LEANS on the ropes; only arriving under real speed
  // comes off them.
  ropeMin: 42,               // below this you lean on them; above it you come off
  pure: true,                // NO POWERS, NO GUNS, NO GADGETS — see PURE BOXING in game.js
  // ⚠ A REAL RING IS 16–20 FEET AND I BUILT 128u, WHICH IS FOUR TIMES TOO BIG. At 1u ≈ 0.19m a
  // 20ft ring is 32u — and the SCREENSHOT is what caught it, after six green assertions did not:
  // two 9.6u fighters at opposite corners of a 128u square are specks with a car's length of empty
  // canvas between them. Boxing is close quarters; the ring being small IS the sport.
  // 46u is a large championship ring at our scale.
  size: 46,
  postH: 17, ropeYs: [5, 9.5, 14],
};

// ---- THE VENUE. A ring standing in a city street is not a boxing match, it is a boxing ring — the
// first screenshot of this mode had street trees and a parked car inside the ropes.
//
// ⚠ THE DARK IS THE VENUE. The single most recognisable thing about a fight hall is not the seating,
// it is that **the ring is an island of light in a black room** — the lights hang directly over the
// canvas and everything past the apron falls away. That is a LIGHTING fact before it is a geometry
// one, which is why this builds far less structure than you would expect and spends its budget on
// `world.setIndoor` instead. A brightly lit hall with beautiful seating reads as a sports centre.
const VENUE = {
  // ⚠ 40, NOT 104 — RINGSIDE. The first pass put the front row 104u from the centre while the
  // camera's ortho half-height is 78, so **the audience was outside the frame at all times**: a
  // venue you can never see the crowd in is a dark field with a ring in it. The ring deck ends at
  // 31u, so the front row goes right up against the apron the way real ringside seats do, and only
  // the first four or five rows are ever on screen — which is correct rather than a compromise,
  // because the rest receding into black IS what a fight hall looks like.
  floorR: 40,       // the dark floor, ring apron out to the first tier
  tiers: 12,        // rows of banked seating, rising away
  rise: 4.8, depth: 7,
  // ⚠ 54, NOT 96, AND THE NUMBER IS DERIVED. The camera is ORTHOGRAPHIC with `frustum` 78 — 78 world
  // units of half-height — sitting at `camDir` (0.86, 0.92, 0.86), i.e. ~37° above the horizontal. A
  // point h above the camera target projects up-screen by about h·cos(37°) ≈ 0.8h, so a board at 96
  // lands at ~77 of the available 78 and clips at the top edge: the SAME out-of-frame bug in a new
  // place. At 54 it sits ~43 up, comfortably in the upper third with room for the zoom to pull out.
  boardY: 54,       // the centre-hung scoreboard, directly over the canvas
  // ⚠ AND THE BOARD ITSELF WAS FOUR TIMES TOO BIG — the ring's own lesson, repeated by me one commit
  // later. Eight green assertions said the venue was correct; the SCREENSHOT showed four 84u panels
  // fanned out over a 46u ring, hiding both fighters completely. A real centre-hung board is smaller
  // than the ring it hangs over. **What made the old size defensible was that the board was the only
  // place the card existed** — now the HUD mode bar carries the round, the clock and both scorecards,
  // so the board can stop trying to be a readable instrument and go back to being an OBJECT.
  boardW: 26, boardH: 13, boardOff: 8,
  // ⚠ MULTIPLIERS, NOT VALUES. The clock still runs the sun; this is how much of it gets in.
  // Not zero: the rig lights the ring and the front rows, and this is the bounce that keeps the
  // back of the hall from being an absolutely black rectangle — dark is a gradient, not an absence.
  light: { sun: 0.10, hemi: 0.34, amb: 0.62, rim: 0.55, sky: 0.05, fog: 0.35 },
  rigI: 1200,       // the ring rig, measured — see _buildRigs
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
    this._hidden = []; this._props = null; this._arena0 = null; this._fog0 = null; this._lights = [];
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
    this._hideWorld();                                 // the city goes dark BEFORE the hall is raised
    this._buildHall(add);
    this._buildBoard(add, W);
    this._buildRigs();
    // ⚠ the ring is a TRANSIENT — it must not outlive the match. `clearTransients` calls close().
    g._ring = this;
    this.say('ROUND 1 — BOX');
    return this;
  }

  /**
   * ⚠ THE CITY IS STILL THERE. `startMode` builds the real theater for any mode that is not the
   * Danger Room, so without this a title fight happens on a downtown street with traffic in it.
   * HIDE, never remove: the city you travelled to has to be exactly as you left it when the card
   * ends. This is the same pass `baseroom.js` runs, including its hard-won second half —
   * ⚠ **the props are ARRAYS, not just pixels.** `propInReach` walks `world.cars/planes/rocks/
   * treeSpots`, not the scene graph, so hiding the meshes alone leaves you able to hoist an invisible
   * car from inside the ropes. (The training hall paid for that one with a "G HOIST" prompt pointing
   * at nothing two hundred units away.)
   */
  _hideWorld() {
    const g = this.g, W = g.world;
    // ⚠ THE ARENA HAS TO FIT THE VENUE. Entity physics clamps to `world.ARENA`, and the ropes clamp
    // far tighter than that anyway — but the news crew, the drops and anything else that spawns
    // "somewhere in the arena" reads this number, and a 240u city arena scatters them across a hall
    // nobody can see.
    this._arena0 = W.ARENA;
    W.ARENA = VENUE.floorR + VENUE.tiers * VENUE.depth;
    this._hidden = [];
    const hide = (m) => { if (m && m.visible) { this._hidden.push(m); m.visible = false; } };
    const keep = new Set([this.group]);
    for (const e of g.entities) if (e && e.obj) keep.add(e.obj);
    if (g.particles && g.particles.points) keep.add(g.particles.points);
    for (const child of W.scene.children) {
      if (keep.has(child) || child.isLight || child.isCamera) continue;
      hide(child);
    }
    for (const m of (W._cityBits || [])) hide(m);
    for (const m of (W._roadMeshes || [])) hide(m);
    this._props = { cars: W.cars, planes: W.planes, rocks: W.rocks, trees: W.treeSpots };
    W.cars = []; W.planes = []; W.rocks = []; W.treeSpots = [];
    // ⚠ AND THE COVER RECORDS, which are not meshes at all. `world.cover` drives collision, `canSee`,
    // AI vision and the fog raster — leave a downtown's worth of it in place and fighters bounce off
    // invisible walls inside the ropes and cannot see each other across the canvas.
    this._cover0 = W.cover; this._coverAll0 = W.coverAll;
    W.cover = []; W.coverAll = [];
    // ⚠ AND `world.interiors`, WHICH IS A SEPARATE LIST AND IS NOT COVER. This was the "I can't even
    // walk around the ring" bug: entity physics consults interior walls SPATIALLY and independently
    // of `cover`, so clearing cover left eight bungalow walls from the city standing invisibly
    // inside the ropes. Measured: a fighter walking from the centre stopped dead after 2.4u against
    // nothing. Anything the venue hides has to be hidden in every list that any system reads.
    this._int0 = W.interiors; W.interiors = [];
    W.refreshFogBoxes && W.refreshFogBoxes();
    W.setFogEnabled && W.setFogEnabled(false);         // there is no fog of war in a lit ring
    // the crowd is not a crowd yet — hide the street population rather than have it walk a city
    // that is not being drawn. Seating them is the next slice.
    if (g.peds && g.peds.mesh) { this._peds0 = g.peds.mesh.visible; g.peds.mesh.visible = false; }
    W.setIndoor(VENUE.light);
  }

  /**
   * The hall: a dark floor, banked seating rising away on all four sides, and a truss overhead.
   * ⚠ THE SEATING IS NOT COVER, and that is a decision rather than an omission. The ropes make it
   * unreachable — you physically cannot get out there — so registering it would buy nothing and cost
   * collision, LOS, AI vision and a slice of the fog raster for scenery. Unreachable geometry is
   * decor; that is the same line the city already draws between a tower and a market stall.
   */
  _buildHall(add) {
    const S = BOXING.size, R = VENUE.floorR;
    // ⚠ MEASURED. At #221d18 the front row rendered at luminance 7 against the ring's 70 — a 10:1
    // drop that makes ringside indistinguishable from the empty dark behind it. The seats are lit by
    // an inverse-square rig, so the material has to carry the range the light cannot: the ratio the
    // eye wants here is nearer 2.5:1 across the front rows, with the back of the hall falling to
    // black on its own because the distance term does it for free.
    const floorM = new THREE.MeshStandardMaterial({ color: '#171410', roughness: 0.95 });
    const tierM = new THREE.MeshStandardMaterial({ color: '#4a4034', roughness: 0.9 });
    const seatM = new THREE.MeshStandardMaterial({ color: '#7d5a3f', roughness: 0.8 });
    const trussM = new THREE.MeshStandardMaterial({ color: '#191612', roughness: 0.6, metalness: 0.5 });
    this._mats.push(floorM, tierM, seatM, trussM);

    // the floor, sunk a rung below the ring deck so the two can never z-fight (the flicker law —
    // never invent your own small number, and never leave two surfaces at the same height).
    // ⚠ it spans the whole HALL, not just the ringside apron — floored to `floorR` it stopped short
    // of the seating and the back rows stood on nothing.
    const hall = R + VENUE.tiers * VENUE.depth;
    const floor = add(new THREE.Mesh(new THREE.BoxGeometry(hall * 2.2, 2, hall * 2.2), floorM));
    floor.position.y = -1; floor.receiveShadow = true;

    // ---- BANKED SEATING. One merged box per tier ring (four walls of a hollow square), so fourteen
    // rows of seating cost 28 draws instead of thousands — and none of it moves, so it is built once.
    for (let t = 0; t < VENUE.tiers; t++) {
      const inner = R + t * VENUE.depth, y = t * VENUE.rise, span = inner * 2 + VENUE.depth * 2;
      for (let s = 0; s < 4; s++) {
        const horiz = s < 2, sign = s % 2 ? 1 : -1;
        const step = add(new THREE.Mesh(new THREE.BoxGeometry(horiz ? span : VENUE.depth, VENUE.rise + 2, horiz ? VENUE.depth : span), tierM));
        step.position.set(horiz ? 0 : sign * (inner + VENUE.depth / 2), y, horiz ? sign * (inner + VENUE.depth / 2) : 0);
        // the seat backs — a thin lighter band per row is what makes a tier read as SEATS and not as
        // a staircase, and it is one extra box per side
        const back = add(new THREE.Mesh(new THREE.BoxGeometry(horiz ? span : 1.6, 3.4, horiz ? 1.6 : span), seatM));
        back.position.set(horiz ? 0 : sign * (inner + VENUE.depth), y + VENUE.rise / 2 + 2.4, horiz ? sign * (inner + VENUE.depth) : 0);
      }
    }

    // ---- THE TRUSS. Two crossed beams over the canvas — the thing the lights and the board hang
    // from, and the only structure the camera ever sees above the fighters.
    // ⚠ AND KEEP IT OVER THE RING. At S*2.4 the beams ran 110u across the frame and read as girders
    // lying in mid-air rather than as a rig above the canvas.
    for (let i = 0; i < 2; i++) {
      const beam = add(new THREE.Mesh(new THREE.BoxGeometry(i ? 2.4 : S * 1.5, 2.4, i ? S * 1.5 : 2.4), trussM));
      beam.position.y = VENUE.boardY + 26;
    }
  }

  /**
   * THE RIG. ⚠ IT BORROWS FROM `vfx`'s FIXED POOL — it never adds a light to the scene. three.js
   * bakes the visible light COUNT into every material's program cache key, so four new lights at
   * mode start rebakes the whole city (a measured 400ms freeze, the light-count law). The pool is
   * always in the scene and always visible; borrowing only drives intensity.
   */
  _buildRigs() {
    const vfx = this.g.vfx; if (!vfx || !vfx.borrowLight) return;
    // ⚠ THE POOL LIGHTS ARE CALIBRATED FOR VFX FLASHES AT ARM'S LENGTH, AND THIS IS AREA LIGHTING AT
    // 1:1 CITY SCALE. `decay` is 2 — real inverse-square — so the 3.2 intensity a muzzle flash uses
    // delivers 3.2/77² ≈ 0.0005 at the front row: the seating was BUILT, and rendered pure black, and
    // every assertion still passed because no assertion can see "too dark". (The base room's comment
    // says exactly this and I still walked into it.) The numbers below are measured, not chosen.
    //
    // ⚠ AND THE RIG HANGS LOW, WHICH IS BOTH REAL AND THE WHOLE GRADIENT. A boxing rig sits ~20-25ft
    // over the canvas — about 34u here. Put it up at the truss and the height term dominates the
    // distance to everything, so the ring and the back row are lit equally and the hall reads flat.
    // Low and tight, inverse-square does the work: canvas ~1.1, front row ~0.8, back row ~0.12.
    const q = BOXING.size * 0.35, y = 34;
    for (const [x, z] of [[-q, -q], [q, -q], [-q, q], [q, q]]) {
      const l = vfx.borrowLight('#fff4e0', VENUE.rigI, 210);
      l.position.set(x, y, z);
      this._lights.push(l);
    }
  }

  /**
   * THE CENTRE-HUNG SCOREBOARD. It used to be a single plane parked at `z = -(size/2) - 40` — off
   * to one side, on a camera that is fixed at an isometric angle and follows the player, so it spent
   * the whole fight out of frame.
   *
   * ⚠ THE FIX IS THE REFERENCE, NOT A TRICK. Billboarding it or mirroring it into the HUD both work
   * and both are worse: a real arena hangs a four-sided board directly over the ring, and doing what
   * the real thing does solves the framing BY CONSTRUCTION — it lives above the fighters, so wherever
   * the camera follows them it is in shot, and the four faces mean it stays readable at any camera
   * yaw once the view is orbited. One canvas, four planes; the texture is painted once per quarter
   * second and every face shows it.
   */
  _buildBoard(add, W) {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    this._boardCv = cv;
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8; this._boardTex = tex;
    const face = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    this._mats.push(face);
    const w = VENUE.boardW, hgt = VENUE.boardH, off = VENUE.boardOff;
    for (let i = 0; i < 4; i++) {
      const b = add(new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), face));
      const a = i * Math.PI / 2;
      b.position.set(Math.sin(a) * off, VENUE.boardY, Math.cos(a) * off);
      // ⚠ ORDER 'YXZ' — yaw first, THEN pitch about the face's own new X axis. Under the default
      // XYZ the pitch is applied in the parent frame, so three of the four faces tip sideways
      // instead of down. This is the same lesson the flight pose is written in.
      b.rotation.order = 'YXZ';
      b.rotation.y = a;
      // tipped DOWN toward the floor: a vertical face above an isometric camera reads almost
      // edge-on, and the tilt is what makes it legible from where the player actually is
      b.rotation.x = -0.12;
    }
    // the housing, so the four faces read as one object hanging off the truss rather than as four
    // floating rectangles
    const shellM = new THREE.MeshStandardMaterial({ color: '#0e0c0a', roughness: 0.8 });
    this._mats.push(shellM);
    const shell = add(new THREE.Mesh(new THREE.BoxGeometry(off * 2 - 2, hgt + 6, off * 2 - 2), shellM));
    shell.position.y = VENUE.boardY;
    const rig = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 18, 1.6), shellM));
    rig.position.y = VENUE.boardY + hgt / 2 + 9;
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
    // ⚠ BEING THROWN INTO THE ROPES IS THE CASE THAT MUST ALWAYS BOUNCE, whatever the raw speed —
    // `launchT` is the engine's existing "you did not arrive here under your own power" signal (the
    // same one the slam rules gate on), so a knockback or a hurl comes off the ropes even if drag
    // has already eaten it below the threshold. Walking is your own power; being hit is not.
    const thrown = (f.launchT || 0) > 0;
    if (spd < BOXING.ropeMin && !thrown) {            // leaning on the ropes, not hitting them
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

  /**
   * ⚠ THE THEATER YOU TRAVELLED TO MUST BE EXACTLY AS YOU LEFT IT. Everything `_hideWorld` touched
   * is put back here — visibility, the four prop ARRAYS, both cover arrays, the arena bounds, the
   * fog and the indoor light multiplier — because a venue that leaks is a city that is permanently
   * missing its cars, and the symptom would show up three matches later somewhere else entirely.
   */
  close() {
    if (!this.group) return;
    const W = this.g.world;
    // ⚠ RETURN THE POOL LIGHTS WITH `returnLight` AND NOTHING ELSE. Removing one from the scene
    // orphans it permanently and re-breaks the constant-count invariant (three projectile dispose
    // sites did exactly that once).
    for (const l of this._lights) this.g.vfx && this.g.vfx.returnLight(l);
    this._lights = [];
    W.setIndoor(null);
    if (this._arena0 != null) { W.ARENA = this._arena0; this._arena0 = null; }
    if (this._props) { W.cars = this._props.cars; W.planes = this._props.planes; W.rocks = this._props.rocks; W.treeSpots = this._props.trees; this._props = null; }
    if (this._cover0) { W.cover = this._cover0; W.coverAll = this._coverAll0; this._cover0 = this._coverAll0 = null; W.refreshFogBoxes && W.refreshFogBoxes(); }
    if (this._int0) { W.interiors = this._int0; this._int0 = null; }
    for (const m of this._hidden) m.visible = true;
    this._hidden = [];
    if (this.g.peds && this.g.peds.mesh && this._peds0 != null) { this.g.peds.mesh.visible = this._peds0; this._peds0 = null; }
    W.setFogEnabled && W.setFogEnabled(true);
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this._mats) m.dispose();
    if (this._boardTex) this._boardTex.dispose();
    W.scene.remove(this.group);
    this.group = null; this._mats = []; this._boardCv = null; this._boardTex = null;
    if (this.g._ring === this) this.g._ring = null;
  }
}
