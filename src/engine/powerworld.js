// =================================================================================================
// POWERWORLD — THE STAGE. See docs/POWERWORLD.md.
//
// Robert: *"wide open space… no pedestrians, maps look like Bid for Power."*
//
// ⚠ THIS IS A VENUE, NOT A CITY PLAN. `generatePlan` cannot make an empty stage — its base fill
// always builds a city — and a whole new plan KIND is a bigger commitment than this needs. The
// pattern used instead has now been proven three times in this repo (`whiteroom.js`, `baseroom.js`,
// `boxingring.js`): hide the theatre you arrived in, raise your own geometry, and put every single
// thing back on the way out. The restore contract is the hard part, not the rocks.
//
// ⚠ WHAT MAKES A BFP STAGE IS NEGATIVE SPACE. The instinct is to build more; the reference builds
// less. A DBZ arena is a floor, a horizon, and a few things big enough to be thrown through — the
// emptiness is what lets you read a fighter two hundred units away, and it is why these maps still
// look right twenty years on. Every rock here is either something to slam someone into or a scale
// reference so the sky reads as far away. There is nothing decorative.
// =================================================================================================
import * as THREE from 'three';
import { GROUND_LAYER } from '../core/util.js';

export const STAGE = {
  radius: 900,          // the ground disc. Generous: the chase loop needs somewhere to chase TO.
  spires: 15,           // slam targets, sparse on purpose
  boulders: 22,
  // ⚠ PINNED, AND THIS IS THE SINGLE BIGGEST THING IN THE LOOK. The stage used to let Earth's clock
  // keep running — "the sun still crosses, dusk still happens, it simply crosses a different sky" —
  // which sounds right and produced a fight at **9:11 PM**: a black void over a brown plane. A full
  // cycle is 240s, so a four-minute round walked the sky from noon to midnight. BFP is never night.
  // Every reference arena in that game is bright, high daylight, and the sky is most of what you see
  // the moment you leave the floor.
  dayT: 0.2,            // a high sun, just off noon so the rock still has a lit and a shadowed face
  // The distant frame. ⚠ SPEED AND VASTNESS FIGHT EACH OTHER (manual §40, learned on the Earth
  // crossing): vastness is a FAR frame that barely moves. These sit outside the play radius, are
  // never cover, and exist only so the horizon is a place instead of a razor line.
  // ⚠ FAR AND LOW, or they stop being a distance and become obstacles. At r 1150–1950 with heights to
  // 430 they LOOMED over the stage — a 730u-wide mesa 1,200u out fills a 74° frame, so the thing meant
  // to say "the world continues" said "you are in a bowl". Distance is the whole job: further out and
  // shorter reads as bigger country, which is the opposite of the instinct.
  mesas: 18, mesaR: [2200, 3600], mesaH: [140, 320],
  // ⚠ ABOVE THE FIGHT, NOT IN IT. A flat billboard seen from its own altitude is a smear — at 150u the
  // deck cut across the horizon like a scratch on the lens. Put it overhead and the same quad reads
  // correctly, and a full climb still punches through the top of it.
  clouds: 16, cloudY: [260, 430],
  // ⚠ A DIFFERENT DIMENSION SHOULD NOT LOOK LIKE EARTH AT DUSK. This palette is PowerWorld's own —
  // a saturated cyan-blue sky over pale sunlit rock, so the two worlds are told apart in one glance
  // while the fighters, the gold accent and every HUD token stay exactly as they are. Sameness in the
  // chrome is what keeps them one game; the SKY is where a dimension gets to be somewhere else.
  // ⚠ The old `topDay: '#0d2436'` was a near-black navy zenith — at full noon it still read as night.
  // A DBZ sky is a deep saturated blue overhead falling to almost white at the horizon. No purple.
  sky:  { topDay: '#1b6ea6', topNight: '#071627', horDay: '#a9e6f0', horNight: '#12222b',
          glow: '#dff6ff', sunDay: '#fff3d6', sunGold: '#ffc078',
          hemiDay: '#bde8f4', hemiNight: '#16222c', gndDay: '#bb8253', gndNight: '#1a1208' },
  // ⚠ ROCK LIGHTER THAN GROUND. They were both mid-brown, so fifteen spires read as flat cardboard
  // cut out of their own floor. Pale rock against a blue sky is the reference silhouette.
  // ⚠ AND `rockDark` IS THE ACCENT, NOT THE DEFAULT. At #7a5b3d and a 50/50 roll, half the spires
  // still read as black towers — simultaneous contrast against a bright sky drags a mid-brown down
  // hard. Lighter, and only a quarter of the rock uses it.
  rock: '#c1a07c', rockDark: '#9c7c5a', ground: '#9c6e49', darkOdds: 0.25,
};

export class PowerWorldStage {
  constructor(game) {
    this.g = game; this.group = null;
    this._mats = []; this._hidden = []; this._cover = [];
    this._geos = []; this._texs = [];              // shared geometry + the cloud canvas, disposed on close
    this._props = null; this._cover0 = null; this._coverAll0 = null; this._int0 = null;
    this._arena0 = null; this._fog0 = null;
    this._day0 = null; this._dayT0 = null; this._skyScale0 = null; this._sun0 = null;
  }

  open() {
    const g = this.g, W = g.world;
    if (this.group) this.close();
    this._hideTheatre();
    const grp = new THREE.Group(); this.group = grp;
    const add = (m) => { grp.add(m); return m; };

    const groundM = new THREE.MeshStandardMaterial({ color: STAGE.ground, roughness: 0.97 });
    const rockM = new THREE.MeshStandardMaterial({ color: STAGE.rock, roughness: 0.9, flatShading: true });
    const darkM = new THREE.MeshStandardMaterial({ color: STAGE.rockDark, roughness: 0.95, flatShading: true });
    this._mats.push(groundM, rockM, darkM);

    // ---- THE FLOOR. A disc, not a box: a straight edge would read as a level boundary, and the
    // whole point is that the horizon is far away and unremarkable.
    const floor = add(new THREE.Mesh(new THREE.CircleGeometry(STAGE.radius, 64), groundM));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = GROUND_LAYER.shadow * 0.5;   // a rung from the ladder, never an invented number
    floor.receiveShadow = true;

    // ---- SPIRES. Tall, thin, and REGISTERED AS COVER, because the reason they exist is that being
    // hurled into one has to hurt — `onSlam` and `worldImpact` already do that work for free.
    // ⚠ Deterministic placement (a fixed hash, not Math.random) so a stage is the same stage twice.
    let seed = 1337;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let i = 0; i < STAGE.spires; i++) {
      const a = (i / STAGE.spires) * Math.PI * 2 + rnd() * 0.4;
      const r = 90 + rnd() * 470;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 60 + rnd() * 150, w = 9 + rnd() * 16;
      const m = add(new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w, h, 6, 1), rnd() > STAGE.darkOdds ? rockM : darkM));
      m.position.set(x, h / 2, z); m.rotation.y = rnd() * 3.14; m.castShadow = h > 90;
      this._reg(x, z, w, w, h);
    }
    // ---- BOULDERS. Low cover and, more importantly, scale: without something human-sized near the
    // camera a 900u disc reads as a small room.
    for (let i = 0; i < STAGE.boulders; i++) {
      const a = rnd() * Math.PI * 2, r = 40 + rnd() * 520;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 6 + rnd() * 13;
      const m = add(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rnd() > STAGE.darkOdds ? rockM : darkM));
      m.position.set(x, s * 0.55, z); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      this._reg(x, z, s * 1.3, s * 1.3, s * 1.1);
    }
    this._buildHorizon(add, rnd);
    this._buildClouds(add, rnd);
    W.scene.add(grp);
    this._skin();
    g._pwStage = this;
    return this;
  }

  /**
   * THE DISTANT FRAME — flat-topped mesas ringing the stage, outside the play radius.
   *
   * ⚠ NOT COVER, DELIBERATELY. The ropes make a boxing hall's seating unreachable and so it is not
   * registered; here the arena bound does the same job. Registering scenery would buy nothing and cost
   * collision, LOS, AI vision and a fog-raster entry each.
   *
   * ⚠ AERIAL PERSPECTIVE IS AUTHORED HERE, NOT LEFT TO FOG. The stage runs fog at 0.35× and at 1,500u
   * that is under 1% — the mesas would have come back as hard-edged solid rock, which reads as *near*
   * however far away it actually is. The material is the rock colour lerped toward the sky's own
   * horizon value, so distance is a colour fact derived from the palette rather than a second number
   * to keep in sync (manual §43 — the same reasoning as the Earth limb).
   */
  _buildHorizon(add, rnd) {
    const S = STAGE;
    const far = new THREE.MeshStandardMaterial({
      // ⚠ 0.55 toward the sky was too far — they came back pale blue-grey and read as PAPER, not land.
      // Enough haze to sit behind the air, not so much that they stop being rock.
      color: new THREE.Color(S.rock).lerp(new THREE.Color(S.sky.horDay), 0.28),
      roughness: 1, flatShading: true,
    });
    this._mats.push(far);
    // one geometry, scaled per mesa — a unit cylinder with a narrower top is a mesa
    const geo = new THREE.CylinderGeometry(0.72, 1, 1, 7, 1);
    this._geos.push(geo);
    for (let i = 0; i < S.mesas; i++) {
      const a = (i / S.mesas) * Math.PI * 2 + (rnd() - 0.5) * 0.34;
      const r = S.mesaR[0] + rnd() * (S.mesaR[1] - S.mesaR[0]);
      const h = S.mesaH[0] + rnd() * (S.mesaH[1] - S.mesaH[0]);
      const w = h * (0.5 + rnd() * 0.8);
      const m = add(new THREE.Mesh(geo, far));
      m.position.set(Math.cos(a) * r, h * 0.5 - 6, Math.sin(a) * r);
      m.scale.set(w, h, w * (0.7 + rnd() * 0.6));
      m.rotation.y = rnd() * 3.14;
    }
  }

  /**
   * THE CLOUD DECK — the altitude cue. A 456u climb through empty air reads as no climb at all; the
   * moment you punch through a cloud layer the height is a fact you felt rather than a number.
   *
   * ⚠ ONE DRAW CALL. Sixteen separate planes would be sixteen; the quads are written into a single
   * hand-built BufferGeometry instead. This is also why they cannot be individually animated, which
   * is fine — a cloud that drifts at fighting speed is a distraction.
   * ⚠ THE FLICKER LAW, ROUTE 3 (`core/util.js`): coplanar transparent quads would z-fight, so these
   * opt OUT of the depth test entirely with `depthWrite: false` rather than picking a lift, and each
   * deck sits at its own altitude anyway.
   */
  _buildClouds(add, rnd) {
    const S = STAGE, N = S.clouds;
    const pos = new Float32Array(N * 12), uv = new Float32Array(N * 8), idx = [];
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * (S.radius * 1.5);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const y = S.cloudY[0] + rnd() * (S.cloudY[1] - S.cloudY[0]);
      const hw = 150 + rnd() * 190, hd = 110 + rnd() * 170;
      const q = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
      for (let v = 0; v < 4; v++) {
        pos[i * 12 + v * 3] = cx + q[v][0]; pos[i * 12 + v * 3 + 1] = y; pos[i * 12 + v * 3 + 2] = cz + q[v][1];
        uv[i * 8 + v * 2] = v === 1 || v === 2 ? 1 : 0;
        uv[i * 8 + v * 2 + 1] = v >= 2 ? 1 : 0;
      }
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this._geos.push(geo);
    const mat = new THREE.MeshBasicMaterial({
      map: this._cloudTex(), transparent: true, depthWrite: false, opacity: 0.62,
      side: THREE.DoubleSide, fog: false, color: '#f4fbff',
    });
    this._mats.push(mat);
    const m = add(new THREE.Mesh(geo, mat));
    m.renderOrder = 1;
  }

  /**
   * ⚠ SEVEN OVERLAPPING BLOBS, NOT ONE. A single radial gradient is a soft BALL — it reads as a
   * smoke puff or a lens artefact, never as cloud. A cumulus silhouette is lumpy, and the lumps are
   * the whole tell. Drawn once, shared by every quad.
   */
  _cloudTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    for (let i = 0; i < 7; i++) {
      const px = 60 + Math.random() * 136, py = 96 + Math.random() * 64;
      const rr = 34 + Math.random() * 46;
      const gr = x.createRadialGradient(px, py, 0, px, py, rr);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.42)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(px, py, rr, 0, 6.284); x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    this._texs.push(t);
    return t;
  }

  /** A cover record, so physics, LOS and the slam rules all know the rock is there. */
  _reg(x, z, hx, hz, top) {
    const W = this.g.world;
    const co = { x, z, hx: hx * 0.5, hz: hz * 0.5, top, hp: 1e9, maxHp: 1e9 };
    W.cover.push(co); W.coverAll.push(co); this._cover.push(co);
  }

  /**
   * ⚠ THE THEATRE YOU ARRIVED IN IS HIDDEN, NEVER REMOVED — it has to be exactly as you left it when
   * you cross back. This is `boxingring.js`'s pass, including its hard-won second half: the props are
   * ARRAYS (`propInReach` walks `world.cars/planes/rocks/treeSpots`, not the scene) and `interiors`
   * is a THIRD list that physics consults separately from `cover`. Missing either one is an invisible
   * wall or a hoistable car that is not there.
   */
  _hideTheatre() {
    const g = this.g, W = g.world;
    this._arena0 = W.ARENA;
    W.ARENA = STAGE.radius;                       // the sky is open and so is the ground
    this._hidden = [];
    const hide = (m) => { if (m && m.visible) { this._hidden.push(m); m.visible = false; } };
    const keep = new Set([this.group]);
    // ⚠ THE SKY IS NOT SCENERY. "Hide every child that isn't a light" took the sky dome with the city,
    // so a dimension whose defining feature is an open sky rendered as a BLACK VOID — and `_skin()`
    // below has been carefully painting a dome nobody could see. Found by taking a screenshot; six
    // green assertions about the palette could never have caught it.
    if (W.skyMesh) keep.add(W.skyMesh);
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
    this._cover0 = W.cover; this._coverAll0 = W.coverAll; this._int0 = W.interiors;
    W.cover = []; W.coverAll = []; W.interiors = [];
    W.refreshFogBoxes && W.refreshFogBoxes();
    if (W.scene.fog) { this._fog0 = W.scene.fog.density; W.scene.fog.density = this._fog0 * 0.35; }
  }

  /** PowerWorld's own sky, written into the palette the day/night cycle already drives. */
  _skin() {
    const W = this.g.world, P = W._dnc, S = STAGE.sky;
    if (!P) return;
    // ⚠ WRITTEN INTO `_dnc`, NOT ALONGSIDE IT. The clock keeps running here — the sun still crosses,
    // dusk still happens — it simply crosses a different sky. And `setSkyWorld(null)` already knows
    // how to restore every one of these keys from `_dncEarth`, so the exit path costs nothing new.
    // ⚠ STASH WHICH SKY WE CAME FROM. `setSkyWorld(null)` restores EARTH, and the theatre you
    // travelled from may well not be Earth — measured: crossing back into Tranquility Reach handed
    // the Moon an Earth sky. Restore the id, not the default.
    this._sky0 = W.skyWorld || null;
    const set = (k, v) => { if (P[k]) P[k].set(v); };
    set('topDay', S.topDay); set('topNight', S.topNight);
    set('horDay', S.horDay); set('horNight', S.horNight);
    set('glowTint', S.glow); set('sunDay', S.sunDay); set('sunGold', S.sunGold);
    set('hemiDay', S.hemiDay); set('hemiNight', S.hemiNight);
    set('gndDay', S.gndDay); set('gndNight', S.gndNight);
    W.skyWorld = 'powerworld';
    // PIN THE LIGHT. See STAGE.dayT — the clock is a planet's rotation and there is no planet here.
    this._day0 = W.dayFixed ?? null; this._dayT0 = W.dayT;
    W.dayFixed = STAGE.dayT;
    // ⚠ AND THE DOME HAS TO CONTAIN THE STAGE. Its radius is 900 and so is the play radius, so a
    // fighter out at the rim and 400u up is OUTSIDE their own sky and it vanishes. depthWrite is off
    // and fog is off on that material, so scaling it is free.
    if (W.skyMesh) { this._skyScale0 = W.skyMesh.scale.x; W.skyMesh.scale.setScalar(3.4); }
    // ⚠ AIM THE SUN LOWER — a high sun gives a VERTICAL surface almost nothing, and this stage is
    // fifteen vertical spires. At the rig's own (120, 200, 80) the sun sits 54° up, so the spires came
    // out as near-black cardboard against a bright sky while a boulder ten feet away read as pale
    // sunlit rock. At 33° the sides take 0.83 of the light and the floor 0.55 — the floor loses a
    // little and the silhouettes gain everything, which is the trade the reference makes.
    // ⚠ MOVING a light is free. ADDING one is not (THE LIGHT-COUNT LAW — three.js bakes the visible
    // light count into every material's program key, so a new light recompiles the whole scene).
    if (W.sunOff) { this._sun0 = W.sunOff.clone(); W.sunOff.set(150, 118, 96); }
  }

  close() {
    if (!this.group) return;
    const W = this.g.world;
    if (this._arena0 != null) { W.ARENA = this._arena0; this._arena0 = null; }
    if (this._props) { W.cars = this._props.cars; W.planes = this._props.planes; W.rocks = this._props.rocks; W.treeSpots = this._props.trees; this._props = null; }
    // ⚠ our own cover records leave BOTH arrays before the originals come back, or the next match
    // inherits invisible rocks — the exact bug the venue paid for.
    if (this._cover0) { W.cover = this._cover0; W.coverAll = this._coverAll0; this._cover0 = this._coverAll0 = null; }
    if (this._int0) { W.interiors = this._int0; this._int0 = null; }
    this._cover = [];
    W.refreshFogBoxes && W.refreshFogBoxes();
    for (const m of this._hidden) m.visible = true;
    this._hidden = [];
    if (this._fog0 != null && W.scene.fog) { W.scene.fog.density = this._fog0; this._fog0 = null; }
    W.setSkyWorld(this._sky0 || null);       // the one restore path — and back to the sky we CAME from
    this._sky0 = null;
    // the pinned light, and the clock we froze. ⚠ dayT goes back to the value it had on ENTRY: time in
    // another dimension does not advance the clock at home, which is a ruling rather than an accident —
    // the alternative silently jumps the theatre you return to to PowerWorld's fixed noon.
    W.dayFixed = this._day0; if (this._dayT0 != null) W.dayT = this._dayT0;
    this._day0 = this._dayT0 = null;
    if (this._skyScale0 != null && W.skyMesh) { W.skyMesh.scale.setScalar(this._skyScale0); this._skyScale0 = null; }
    if (this._sun0 && W.sunOff) { W.sunOff.copy(this._sun0); this._sun0 = null; }
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const g2 of this._geos) g2.dispose();
    for (const t of this._texs) t.dispose();
    for (const m of this._mats) m.dispose();
    W.scene.remove(this.group);
    this.group = null; this._mats = []; this._geos = []; this._texs = [];
    if (this.g._pwStage === this) this.g._pwStage = null;
  }
}
