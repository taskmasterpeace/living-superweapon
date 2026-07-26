// THE SPACE LAYER — the crossing, as a cinematic you can steer.
//
// Robert's scope, 2026-07-25: "when going into orbit show the actual Earth view — space/Earth view
// should fit our art style — and we need to be able to see the heliosphere and Oort cloud. Show
// flybys of the planets when travelling past them, and each planet's atmosphere entering. Keep the
// same art style and scale, and feel cinematic. We should see stars. Keep the process open so when
// we add vehicles, characters can travel with ships, space ships and alien ships and all."
// Then: "prioritise customizability, and make sure it's dynamic enough to have groups of flyers, a
// flyer and a ship, and more."
//
// THREE DECISIONS THAT MAKE THE REST FALL OUT:
//
// 1. IT RENDERS THROUGH THE GAME'S OWN COMPOSER. The scene is swapped into the existing RenderPass
//    rather than drawn on a 2D canvas, so the crossing inherits the exact bloom, exposure and ACES
//    tone-map the street does. "Matching the art style" is then not a thing anyone has to maintain
//    — it is the same pipeline, and it cannot drift. (The older transit card is canvas 2D and looks
//    it; this replaces that job.)
//
// 2. THE TRAVELLER IS A PARTY, NEVER A HERO. Everything below flies `party` — a list from
//    data/vessels.js. One flyer, six flyers, a flyer escorting a freighter, an alien scout tailing
//    the lot: same code path, because the formation is a FUNCTION of the index and the camera
//    frames the party's bounding sphere rather than a named subject.
//
// 3. THE ROUTE DECIDES THE BEATS. `buildRoute` (data/planets.js) returns the bodies a crossing
//    actually sweeps past and WHEN, so the flybys are not a scripted list — fly to Pluto and you
//    get Jupiter, Saturn, Uranus and Neptune in order because they are genuinely between you and
//    it. Nothing here hard-codes a journey.
//
// TESTABLE BY CONSTRUCTION: pass `{ manual: true }` and it never touches rAF — step it by hand and
// assert on `beat`, `t` and `done`, the same contract the opening director uses.
import * as THREE from 'three';
import { PLANETS, PLANET_LOOK, lookOf, buildRoute, HELIOPAUSE_AU } from '../data/planets.js';
import { makeParty, FORMATIONS, formationFor } from '../data/vessels.js';
import { figure } from './figure.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// ---------------------------------------------------------------------------------------------
// THE BEAT SHEET. Every beat is data: a name, a duration weight, and what the camera is doing.
// A journey's beat list is ASSEMBLED from the route, so a hop to the Moon and a run to the
// heliopause are the same machine with different rows.
const BEAT_LOOK = {
  departure: { kicker: 'BREAKING ORBIT', hold: 1.0 },
  cruise:    { kicker: 'IN TRANSIT', hold: 0.9 },
  flyby:     { kicker: 'FLYBY', hold: 1.0 },
  helio:     { kicker: 'THE HELIOPAUSE', hold: 1.3 },
  oort:      { kicker: 'THE OORT CLOUD', hold: 1.2 },
  approach:  { kicker: 'APPROACH', hold: 1.0 },
  entry:     { kicker: 'ATMOSPHERIC ENTRY', hold: 1.2 },
  arrival:   { kicker: 'ARRIVAL', hold: 0.8 },
};

export class SpaceFlight {
  constructor(game) {
    this.g = game;
    this.done = false;
    this.beat = null;
    this.t = 0;
  }

  // -------------------------------------------------------------------------------------------
  play(opts = {}, onDone) {
    const g = this.g, W = g.world;
    this.opts = opts;
    this.onDone = onDone;
    this.manual = !!opts.manual;
    this.route = opts.route || buildRoute(opts.from || 'earth', opts.to || 'mars', opts);
    this.party = opts.party || makeParty(opts.partySpec || { hero: g.player && g.player.def });
    this.formation = FORMATIONS[opts.formation || this.party.formation || formationFor(this.party)] || FORMATIONS.solo;

    this.scene = new THREE.Scene();
    this._mats = []; this._geos = [];
    this._buildLights();
    this._buildStars();
    this._buildParty();
    this._buildBodies();
    if (this.route.deep) this._buildDeep();

    this.cam = new THREE.PerspectiveCamera(52, (W.renderer ? W.renderer.domElement.width / Math.max(1, W.renderer.domElement.height) : 1.6), 0.1, 60000);
    this.scene.add(this.cam);

    this._buildBeats();
    this._placeFromBeats();
    this._buildOverlay();

    // ⚠ SWAP THE RENDER PASS, DON'T BUILD A SECOND PIPELINE. One line each way, and the crossing
    // gets bloom + exposure + ACES for free. Restored in finish(), including on a skip.
    this._pass = W.composer && W.composer.passes && W.composer.passes[0];
    if (this._pass) { this._prevScene = this._pass.scene; this._prevCam = this._pass.camera; }
    this._wasRunning = g.running;
    g.running = false;

    // ⚠ THE MATCH HUD IS NOT IN SPACE. Radar, ability chips, the health strip and the controls
    // panel all belong to a fight on a street; left up they sit on top of the crossing and break
    // it completely. Hidden by ELEMENT, restored exactly as found (an element that was already
    // hidden must stay hidden — the tutorial and the phone layout both hide things for reasons).
    this._hidHud = [];
    for (const id of ['hud', 'hHint', 'hRadar', 'labMirror', 'devBtn']) {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') { this._hidHud.push([el, el.style.display]); el.style.display = 'none'; }
    }

    this._apply();
    this._skip = (e) => { if (e && e.key === 'F12') return; this.finish(true); };
    if (!this.manual) {
      window.addEventListener('keydown', this._skip);
      window.addEventListener('pointerdown', this._skip);
      this._last = performance.now();
      this._tick = () => {
        if (this.done) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - this._last) / 1000);
        this._last = now;
        this.step(dt);
        if (!this.done) this._raf = requestAnimationFrame(this._tick);
      };
      this._raf = requestAnimationFrame(this._tick);
    }
    return this;
  }

  // -------------------------------------------------------------------------------------------
  _buildLights() {
    // A star is ONE hard light and almost no fill — that is what makes space read as space, and it
    // is the same lighting grammar as the street (key + rim), just with the fill turned nearly off.
    // ⚠ THE TERMINATOR IS THE TELL. Vacuum has no atmosphere to bounce light, so the unlit side of
    // a world goes nearly black and the line between is HARD. Ambient at 0.55 was filling that in
    // and every planet came out looking like a lit toy. A hard key, a whisper of cold bounce, and
    // almost no ambient is what makes a sphere read as a world a hundred million miles away.
    // ⚠ WHERE THE SUN SITS DECIDES WHETHER YOU CAN SEE ANYTHING. Outbound you fly AWAY from it, so
    // looking back at the world you left is looking at its night side — physically right, and it
    // rendered Earth as a black disc with a rim. Swinging the star wide to one side keeps that
    // honesty (it is still behind and to the side) while giving every body a fat three-quarter
    // phase instead of a crescent: one hard terminator, a lit face worth looking at.
    const sun = new THREE.DirectionalLight(0xfff4dc, 4.2);
    sun.position.set(-1, 0.30, 0.42);
    this.scene.add(sun); this.sunLight = sun;
    const rim = new THREE.DirectionalLight(0x6f92c4, 0.34);
    rim.position.set(1, -0.25, -0.7);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0x121820, 0.30));
  }

  _mat(o) { const m = new THREE.MeshStandardMaterial(o); this._mats.push(m); return m; }
  _basic(o) { const m = new THREE.MeshBasicMaterial(o); this._mats.push(m); return m; }
  _geo(g) { this._geos.push(g); return g; }

  // ⚠ SPACE IS NOT BLACK WITH DOTS ON IT. The first field was 2,600 evenly-scattered white specks
  // on #000, and it read as a screensaver — because the two things that actually say "sky" were
  // both missing. Real deep sky has (a) a GALACTIC PLANE: a broad, dusty, uneven band that most of
  // the stars belong to, and (b) VARIETY — a handful of genuinely bright stars against thousands
  // too faint to resolve, in colours from cold blue-white to old gold. Uniform scatter is the one
  // distribution that never occurs in nature, which is exactly why it looks synthetic.
  //
  // Three layers, one draw each:
  //   1. THE BACKDROP — a painted inverted sphere: not-quite-black gradient, the milky band, and a
  //      few enormous faint dust clouds. This is doing most of the work.
  //   2. THE FIELD — thousands of small stars, CLUSTERED toward the galactic plane rather than
  //      scattered, with a colour temperature ramp.
  //   3. THE BRIGHT ONES — a few dozen big additive sprites, because a sky with no hierarchy has
  //      no depth.
  // ⚠ NO PURPLE, including in the nebulae: the clouds are gold, rust and deep teal.
  _skyTexture() {
    const W = 2048, H = 1024;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    // not-quite-black: a cold floor with a faint warm lift toward one pole, so the sky has a
    // direction even before anything is drawn on it
    const g0 = x.createLinearGradient(0, 0, 0, H);
    g0.addColorStop(0, '#05070c');
    g0.addColorStop(0.5, '#080a10');
    g0.addColorStop(1, '#0a0908');
    x.fillStyle = g0; x.fillRect(0, 0, W, H);

    // THE GALACTIC PLANE — a wide diagonal band of dust, built from many soft blobs so its edge is
    // ragged. A clean ellipse reads as a paint stroke; the raggedness is the whole effect.
    const bandY = (u) => H * 0.52 + Math.sin(u * Math.PI * 2 + 0.6) * H * 0.16;
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 520; i++) {
      const u = Math.random();
      const px = u * W;
      const spread = H * (0.05 + Math.random() * 0.10);
      const py = bandY(u) + (Math.random() - 0.5) * spread * 2.4;
      const r = H * (0.02 + Math.random() * 0.075);
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      const warm = Math.random() < 0.62;
      const a = 0.020 + Math.random() * 0.030;
      g.addColorStop(0, warm ? `rgba(196,166,116,${a})` : `rgba(120,158,178,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }
    // DARK LANES cut through it — the band is dust, and dust blocks as much as it glows
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 90; i++) {
      const u = Math.random(), px = u * W;
      const py = bandY(u) + (Math.random() - 0.5) * H * 0.13;
      const r = H * (0.012 + Math.random() * 0.05);
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(3,4,7,0.55)');
      g.addColorStop(1, 'rgba(3,4,7,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }
    // a few huge, very faint clouds well off the plane, so the sky is not all one feature
    x.globalCompositeOperation = 'lighter';
    for (const [cx, cy, r, col] of [[W * 0.18, H * 0.24, H * 0.34, '160,120,70'],
                                    [W * 0.72, H * 0.78, H * 0.30, '70,120,132'],
                                    [W * 0.46, H * 0.12, H * 0.22, '150,90,60']]) {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${col},0.045)`);
      g.addColorStop(0.55, `rgba(${col},0.018)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    // unresolved star haze INSIDE the band — the milky part of the milky way
    for (let i = 0; i < 9000; i++) {
      const u = Math.random();
      const px = u * W;
      const py = bandY(u) + (Math.random() - 0.5) * H * (0.05 + Math.random() * 0.12);
      x.fillStyle = `rgba(230,226,214,${0.05 + Math.random() * 0.16})`;
      x.fillRect(px, py, 1, 1);
    }
    x.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    this._skyTex = t;
    return t;
  }

  _buildStars() {
    // 1 — the painted sky
    const sky = new THREE.Mesh(
      this._geo(new THREE.SphereGeometry(26000, 48, 32)),
      this._basic({ map: this._skyTexture(), side: THREE.BackSide, depthWrite: false, fog: false }));
    sky.rotation.z = 0.42;                       // tilt the plane so it crosses frame diagonally
    sky.frustumCulled = false;
    this.scene.add(sky); this.sky = sky;

    // 2 — the resolved field, CLUSTERED to the galactic plane rather than scattered
    const N = 3400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const r = 9000 + Math.random() * 11000;
      const th = Math.random() * Math.PI * 2;
      // bias latitude toward the plane: cube of a signed uniform hugs zero
      const u = Math.random() * 2 - 1;
      const lat = (Math.random() < 0.72 ? Math.pow(Math.abs(u), 2.6) * Math.sign(u) : u) * Math.PI * 0.5;
      const ph = Math.PI / 2 - lat;
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      // colour temperature: mostly cold-white, a warm tail, a few red giants
      const k = Math.random();
      const hue = k < 0.55 ? 0.58 : k < 0.86 ? 0.11 : 0.045;
      const sat = k < 0.55 ? 0.18 : k < 0.86 ? 0.30 : 0.55;
      const lum = 0.42 + Math.pow(Math.random(), 2.2) * 0.55;
      c.setHSL(hue, sat, lum);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = this._geo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 26, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    this._mats.push(mat);
    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // 3 — THE BRIGHT ONES. A sky with no hierarchy has no depth, so a few dozen stars get a real
    // glow sprite. Additive, so the bloom pass picks them up the way it picks up a ki blast.
    const B = 46, bp = new Float32Array(B * 3), bc = new Float32Array(B * 3), bs = new Float32Array(B);
    for (let i = 0; i < B; i++) {
      const r = 10000 + Math.random() * 9000;
      const th = Math.random() * Math.PI * 2;
      const u2 = Math.random() * 2 - 1;
      const ph = Math.PI / 2 - (Math.pow(Math.abs(u2), 1.8) * Math.sign(u2)) * Math.PI * 0.5;
      bp[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      bp[i * 3 + 1] = Math.cos(ph) * r;
      bp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      const k = Math.random();
      c.setHSL(k < 0.6 ? 0.58 : 0.1, 0.35, 0.86);
      bc[i * 3] = c.r; bc[i * 3 + 1] = c.g; bc[i * 3 + 2] = c.b;
      bs[i] = 1;
    }
    const bgeo = this._geo(new THREE.BufferGeometry());
    bgeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    bgeo.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    const bmat = new THREE.PointsMaterial({
      size: 300, sizeAttenuation: true, vertexColors: true, map: this._glowTex(),
      transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    this._mats.push(bmat);
    this.bright = new THREE.Points(bgeo, bmat);
    this.bright.frustumCulled = false;
    this.scene.add(this.bright);
  }

  // a soft round falloff — used by the bright stars and the sun's corona
  _glowTex() {
    if (this._glow) return this._glow;
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.16, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    this._glow = new THREE.CanvasTexture(cv);
    return this._glow;
  }

  // A WORLD, painted flat. Icosahedron for the body (flat shading, low subdivision — the same
  // vocabulary as a tree canopy), latitude bands as a second shell of ring strips, an atmosphere
  // as a backside sphere, and rings as flat discs. No textures anywhere.
  _planetMesh(id, radius) {
    const L = lookOf(id);
    const grp = new THREE.Group();
    const body = new THREE.Mesh(
      this._geo(new THREE.IcosahedronGeometry(radius, 4)),
      L.star ? this._basic({ color: L.base }) : this._mat({ color: L.base, roughness: 0.95, metalness: 0, flatShading: true }));
    grp.add(body);
    // bands: thin latitude belts, each a slightly larger sphere clipped to a phi range
    if (L.bands) {
      L.bands.forEach((hex, i) => {
        const n = L.bands.length;
        const p0 = (i / n) * Math.PI * 0.92 + 0.04 * Math.PI;
        const p1 = ((i + 0.82) / n) * Math.PI * 0.92 + 0.04 * Math.PI;
        const belt = new THREE.Mesh(
          this._geo(new THREE.SphereGeometry(radius * 1.004, 40, 10, 0, Math.PI * 2, p0, p1 - p0)),
          this._mat({ color: hex, roughness: 0.95, metalness: 0, flatShading: true }));
        grp.add(belt);
      });
    }
    // CITY LIGHTS on the night side of a settled world. Nothing else in a space shot says
    // "people live there" as fast, and it is what makes the terminator worth having.
    if (L.night) {
      const N = 900, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1;
        const ph = Math.acos(u), r = radius * 1.002;
        // clump them: most of a planet's lights are on a few coasts
        const cl = Math.pow(Math.random(), 2.2);
        pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
        pos[i * 3 + 1] = Math.cos(ph) * r * (0.35 + cl * 0.65);
        pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      }
      const g2 = this._geo(new THREE.BufferGeometry());
      g2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m2 = new THREE.PointsMaterial({ color: '#ffd8a0', size: radius * 0.028, sizeAttenuation: true,
        transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
      this._mats.push(m2);
      grp.add(new THREE.Points(g2, m2));
    }
    if (L.spot) {   // Jupiter earns its eye
      const spot = new THREE.Mesh(this._geo(new THREE.SphereGeometry(radius * 0.22, 16, 12)),
        this._mat({ color: L.spot, roughness: 0.9, flatShading: true }));
      spot.position.set(radius * 0.72, -radius * 0.22, radius * 0.52);
      spot.scale.set(1.6, 0.8, 1);
      grp.add(spot);
    }
    if (L.atmo) {
      const air = new THREE.Mesh(this._geo(new THREE.SphereGeometry(radius * 1.055, 40, 26)),
        this._basic({ color: L.atmo, transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false }));
      grp.add(air); grp.userData.air = air;
    }
    if (L.ring) {
      L.ring.forEach((hex, i) => {
        const r0 = radius * (1.35 + i * 0.28), r1 = r0 + radius * 0.22;
        const ring = new THREE.Mesh(this._geo(new THREE.RingGeometry(r0, r1, 96)),
          this._basic({ color: hex, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false }));
        ring.rotation.x = Math.PI / 2 - 0.22;
        grp.add(ring);
      });
    }
    if (L.tilt) grp.rotation.z = L.tilt;
    grp.userData.body = body;
    return grp;
  }

  // The bodies this route actually passes, laid out along −Z at the fraction of the trip they
  // happen — so the camera flying forward meets them in the right order with the right gaps.
  _buildBodies() {
    const R = this.route;
    this.bodies = [];
    const LANE = 34000;                       // how far the whole crossing is, in scene units
    const place = (id, t, side) => {
      const L = lookOf(id);
      // radius: log-compressed so Jupiter still dwarfs Mars without leaving the frame at 11×Earth
      const rad = 120 * Math.pow(Math.max(0.18, L.r), 0.42);
      const m = this._planetMesh(id, rad);
      // ⚠ A FLYBY HAS TO LOOM. Held out at rad*1.9 + 240 the planets passed as distant marbles —
      // technically a flyby, dramatically nothing. Close enough that the limb crosses the frame.
      // ⚠ A GIANT NEEDS MORE ROOM THAN A MOON. Offsetting every body by the same margin put
      // Jupiter's unlit limb across a third of the frame during somebody ELSE's flyby — a huge
      // shapeless dark mass crowding the shot it wasn't in. Scaling the stand-off with the radius
      // keeps a giant unmistakably vast while leaving the lane clear for whoever's beat it is.
      const off = (side || 1) * (rad * 2.3 + 80);
      m.position.set(off, (side || 1) * rad * 0.22, -t * LANE);
      m.userData.rad = rad; m.userData.id = id; m.userData.t = t;
      this.scene.add(m);
      this.bodies.push(m);
      return m;
    };
    this.LANE = LANE;
    // THE WORLD YOU ARE LEAVING sits behind and below, one radius off — close enough that breaking
    // orbit happens against a full limb rather than a marble.
    this.origin = place(R.from.id, 0.0, 0);
    this.origin.position.set(0, -this.origin.userData.rad * 0.72, this.origin.userData.rad * 1.05);
    R.passes.forEach((p, i) => place(p.id, 0.10 + p.t * 0.72, i % 2 ? 1 : -1));
    this.target = place(R.to.id === 'deep' ? 'pluto' : R.to.id, 1.0, 0);
    // ⚠ THE DESTINATION IS A SURFACE, NOT A POINT. Parked at exactly -LANE the party flew into the
    // planet's CENTRE; pushed back by its own radius they arrive just above the limb, which is what
    // lets an entry fill the bottom of frame with ground instead of showing a marble in the middle.
    this.target.position.set(0, -this.target.userData.rad * 0.55, -LANE - this.target.userData.rad * 1.25);
    if (R.to.id === 'deep') this.target.visible = false;
    // the sun, far behind — it is the key light's source and the reason there is a terminator
    this.sun = this._planetMesh('sun', 620);
    this.sun.position.set(-13000, 3900, 5500);   // matches the key's direction — one star, one shadow
    this.scene.add(this.sun);
    // A STAR IS A GLARE, NOT A DISC. The corona is what stops it reading as a gold ball, and the
    // composer's bloom takes it the rest of the way.
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._glowTex(), color: '#ffd8a0', transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    this._mats.push(corona.material);
    corona.scale.setScalar(8600);
    corona.position.copy(this.sun.position);
    this.scene.add(corona); this.corona = corona;
  }

  // THE HELIOSPHERE and THE OORT CLOUD — only built for a deep crossing, because they are only
  // true for one. The shell is a vast backside sphere you fly THROUGH (you see it as a bow ahead,
  // then it is behind you); the cloud is a sparse spherical shell of points at a far greater radius.
  _buildDeep() {
    // ⚠ THE SHELL IS A HINT, THE BOW IS THE SHOT. At 0.10+ opacity a backside sphere you are
    // INSIDE tints every pixel and the crossing reads as being underwater — the stars vanish, which
    // is the one thing this act cannot afford. The wall is carried by the bow shock arc; the shell
    // only says which side of it you are on.
    const shell = new THREE.Mesh(this._geo(new THREE.SphereGeometry(9000, 48, 32)),
      this._basic({ color: '#5fa8d8', transparent: true, opacity: 0.04, side: THREE.BackSide, depthWrite: false }));
    shell.position.set(0, 0, -this.LANE * 0.62);
    shell.scale.set(1, 0.86, 1.5);
    this.scene.add(shell); this.helio = shell;
    const bow = new THREE.Mesh(this._geo(new THREE.TorusGeometry(2600, 90, 8, 96)),
      this._basic({ color: '#9fd8ff', transparent: true, opacity: 0.5, depthWrite: false }));
    bow.position.copy(shell.position); bow.rotation.x = Math.PI / 2;
    this.scene.add(bow); this.helioBow = bow;

    const N = 1400, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 14000 + Math.random() * 5000;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r * 0.8;
      pos[i * 3 + 2] = -this.LANE * 0.88 + Math.sin(ph) * Math.sin(th) * r;
    }
    const geo = this._geo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: '#cfe6ff', size: 34, sizeAttenuation: true, transparent: true, opacity: 0.0, depthWrite: false });
    this._mats.push(mat);
    this.oort = new THREE.Points(geo, mat);
    this.oort.frustumCulled = false;
    this.scene.add(this.oort);
  }

  // -------------------------------------------------------------------------------------------
  // THE PARTY, built from the parts lists. A flyer gets the REAL figure rig, so the hero crossing
  // the system is the same body that walks the street — including its ORIGIN palette if it is a
  // custom. A ship is assembled from its vessel row. Nothing here knows a specific craft.
  _buildParty() {
    const grp = new THREE.Group();
    this.scene.add(grp);
    this.partyGroup = grp;
    this.craft = [];
    let biggest = 12;
    for (const t of this.party) if (t.vessel) biggest = Math.max(biggest, t.vessel.length);
    this.spread = Math.max(26, biggest * 1.15);

    this.party.forEach((t, i) => {
      const holder = new THREE.Group();
      let obj = null, wake = t.wake || ['#ffd24a', '#ffffff'], exhaust = [[0, 0, 6]];
      if (t.kind === 'flyer') {
        try {
          const P = figure(t.def || { id: 'anon', name: 'ASCENDANT', colors: { primary: '#c9482f', secondary: '#8e3f24', accent: '#ffd24a', skin: '#c98f6a' }, strength: 5 });
          obj = P.g;
          obj.scale.setScalar(1.5);
          if (P.groundRig) P.groundRig.visible = false;    // no shadow disc in vacuum
          // prone and head-first down the lane, with a touch of nose-up so the silhouette reads as
          // FLYING rather than falling — the same law the in-game flight pose follows.
          obj.rotation.x = -Math.PI / 2 + 0.34;
          obj.rotation.y = Math.PI;
        } catch (e) { obj = null; }
        if (!obj) {
          obj = new THREE.Mesh(this._geo(new THREE.CapsuleGeometry(2.2, 7, 6, 10)),
            this._mat({ color: wake[0], roughness: 0.5, flatShading: true }));
          obj.rotation.x = Math.PI / 2;
        }
        exhaust = [[0, 0, 7]];
      } else {
        const V = t.vessel;
        obj = this._vesselMesh(V);
        wake = [V.palette.engine, '#ffffff'];
        exhaust = V.exhaust || [[0, 0, V.length * 0.5]];
      }
      holder.add(obj);
      // the burn: one cone per exhaust, scaled by throttle each frame
      // ⚠ THE BURN POINTS BACKWARD AND TAPERS. A cone with its base at the nozzle and its point
      // trailing reads as thrust; the first pass had a fat 8u cone flaring the wrong way and it
      // came out as a giant orange triangle bigger than the ship. Narrow, long, and scaled on z.
      const burns = exhaust.map(([ex, ey, ez]) => {
        const geo = this._geo(new THREE.ConeGeometry(0.85, 7, 10));
        geo.translate(0, -3.5, 0);                 // pivot at the nozzle, body trailing
        const b = new THREE.Mesh(geo, this._basic({ color: wake[0], transparent: true, opacity: 0.85, depthWrite: false }));
        b.position.set(ex, ey, ez);
        b.rotation.x = -Math.PI / 2;               // trail along +Z, i.e. behind
        holder.add(b);
        return b;
      });
      grp.add(holder);
      this.craft.push({ t, holder, obj, burns, wake, phase: i * 1.7 });
    });
  }

  _vesselMesh(V) {
    const P = V.palette;
    const mats = {
      hull: this._mat({ color: P.hull, roughness: 0.62, metalness: 0.18, flatShading: true }),
      trim: this._mat({ color: P.trim, roughness: 0.5, metalness: 0.3, flatShading: true }),
      glass: this._mat({ color: P.glass, roughness: 0.16, metalness: 0.5, flatShading: true }),
      engine: this._basic({ color: P.engine }),
      dark: this._mat({ color: P.dark, roughness: 0.9, flatShading: true }),
    };
    const g = new THREE.Group();
    for (const p of V.parts) {
      const s = p.s;
      let geo;
      switch (p.g) {
        case 'cyl':    geo = new THREE.CylinderGeometry(s[0], s[1], s[2], 10); break;
        case 'cone':   geo = new THREE.ConeGeometry(s[0], s[1], 10); break;
        case 'ico':    geo = new THREE.IcosahedronGeometry(1, 1); break;
        case 'sphere': geo = new THREE.SphereGeometry(1, 12, 8); break;
        case 'plate':  geo = new THREE.BoxGeometry(1, 1, 1); break;
        default:       geo = new THREE.BoxGeometry(1, 1, 1);
      }
      this._geo(geo);
      const m = new THREE.Mesh(geo, mats[p.m] || mats.hull);
      if (p.g === 'box' || p.g === 'plate' || p.g === 'ico' || p.g === 'sphere') m.scale.set(s[0], s[1], s[2]);
      if (p.at) m.position.set(p.at[0], p.at[1], p.at[2]);
      if (p.rot) m.rotation.set(p.rot[0] || 0, p.rot[1] || 0, p.rot[2] || 0);
      g.add(m);
    }
    return g;
  }

  // -------------------------------------------------------------------------------------------
  // THE BEAT LIST, assembled from the route. This is the "dynamic" the goal asks for: a Moon hop
  // is departure→cruise→approach→entry→arrival; a Pluto run inserts a flyby per body it passes and
  // earns the heliosphere and Oort acts on the way.
  // ⚠ SPACE IS EMPTY AND THAT IS NOT A SHOT. Flown at a constant rate down the lane, the last
  // three beats still played thousands of units out and the destination was a marble in the middle
  // of "ATMOSPHERIC ENTRY". A crossing covers almost all its distance early and then decelerates
  // hard into the arrival, which is both how a real approach works and the only way the final
  // beats can happen CLOSE to the world. The same curve places the bodies, so nothing drifts apart.
  // SMOOTHERSTEP, not a cubic ease-out. A crossing is slow at BOTH ends: you leave a world you can
  // still see and you arrive at one that fills the frame, with the empty middle covered fast. The
  // first curve only decelerated at the end, so "BREAKING ORBIT" played with Earth already a
  // crescent thousands of units astern — the one shot Robert asked for by name.
  _lane(t) { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); }

  _buildBeats() {
    const R = this.route, beats = [];
    const add = (kind, dur, data) => beats.push({ kind, dur, data: data || {}, look: BEAT_LOOK[kind] });
    add('departure', 2.6, { body: this.origin });
    const flyBodies = this.bodies.filter(b => b !== this.origin && b !== this.target && b !== this.sun);
    if (!flyBodies.length) add('cruise', 2.2, {});
    flyBodies.forEach((b, i) => {
      if (i === 0) add('cruise', 1.6, {});
      add('flyby', 2.4, { body: b, name: (PLANETS.find(p => p.id === b.userData.id) || {}).name || '' });
    });
    if (R.deep) { add('helio', 3.0, {}); add('oort', 2.8, {}); }
    add('approach', 2.2, { body: this.target });
    if (R.to.landable !== false && R.to.id !== 'deep') add('entry', 2.6, { body: this.target });
    add('arrival', 1.8, { body: this.target });
    // total duration honours the caller's ask while keeping the SHAPE
    const raw = beats.reduce((a, b) => a + b.dur, 0);
    const want = this.opts.secs || Math.max(9, Math.min(26, raw));
    const k = want / raw;
    let at = 0;
    for (const b of beats) { b.t0 = at; b.dur *= k; at += b.dur; }
    this.beats = beats; this.total = at; this.clock = 0; this.beat = beats[0];
  }

  // ⚠ THE PARTY AND THE PLANETS WERE ON TWO DIFFERENT CLOCKS. Bodies were laid out by their ROUTE
  // fraction (where they sit in AU between origin and destination) while the party flies the BEAT
  // clock (how long each beat lasts) — so during "the Moon flyby" the travellers were somewhere
  // else entirely on the lane, and the shot framed empty space with a planet in it. A flyby is a
  // COINCIDENCE IN TIME, so the body must be parked where the party will actually be when its own
  // beat plays. Placing from the beat sheet makes that true by construction rather than by tuning.
  _placeFromBeats() {
    const L = this.LANE;
    for (const b of this.beats) {
      const mid = (b.t0 + b.dur * 0.5) / this.total;
      if (b.kind === 'flyby' && b.data.body) {
        b.data.body.position.z = -this._lane(mid) * L;
      } else if (b.kind === 'entry' || b.kind === 'arrival') {
        const rad = this.target.userData.rad;
        this.target.position.set(0, -rad * 0.62, -L - rad * 1.15);
      }
    }
    if (this.helio) {
      const hb = this.beats.find(x => x.kind === 'helio');
      if (hb) this.helio.position.z = this.helioBow.position.z = -this._lane((hb.t0 + hb.dur * 0.5) / this.total) * L;
    }
  }

  // -------------------------------------------------------------------------------------------
  _buildOverlay() {
    const el = document.createElement('div');
    el.id = 'spaceHud';
    el.style.cssText = 'position:fixed;inset:0;z-index:63;pointer-events:none;font-family:var(--f-mono,monospace)';
    el.innerHTML =
      '<div id="sfTop" style="position:absolute;left:32px;top:28px;color:#f2efe6">' +
      '<div id="sfKick" style="font:700 12px var(--f-mono,monospace);letter-spacing:.28em;color:#ffd24a;opacity:.9"></div>' +
      '<div id="sfName" style="font:800 34px var(--f-display,Rajdhani),sans-serif;letter-spacing:-.02em;margin-top:2px"></div>' +
      '<div id="sfSub" style="font:12px var(--f-mono,monospace);color:#8b8577;letter-spacing:.14em;margin-top:2px"></div></div>' +
      '<div id="sfParty" style="position:absolute;left:32px;bottom:30px;color:#cfc9bb;font:11px var(--f-mono,monospace);letter-spacing:.12em"></div>' +
      '<div id="sfBar" style="position:absolute;left:32px;right:32px;bottom:18px;height:2px;background:rgba(255,255,255,.14)">' +
      '<div id="sfFill" style="height:100%;width:0;background:#ffd24a"></div></div>' +
      '<div style="position:absolute;right:32px;bottom:30px;color:#8b8577;font:11px var(--f-mono,monospace);letter-spacing:.18em">ANY KEY — SKIP</div>';
    document.body.appendChild(el);
    this.el = el;
    const names = this.party.map(t => t.name).join('  ·  ');
    el.querySelector('#sfParty').textContent = (this.party.length > 1 ? this.party.length + ' TRAVELLING  ·  ' : '') + names;
  }

  _say(kicker, name, sub) {
    if (!this.el) return;
    const k = this.el.querySelector('#sfKick'), n = this.el.querySelector('#sfName'), s = this.el.querySelector('#sfSub');
    if (k.textContent !== kicker) k.textContent = kicker;
    if (n.textContent !== name) n.textContent = name;
    if (s.textContent !== sub) s.textContent = sub;
  }

  // -------------------------------------------------------------------------------------------
  // ONE STEP. Everything the camera does is derived from the current beat and its local t, so the
  // whole cinematic is a pure function of the clock — which is what makes `manual` stepping give
  // byte-identical results to a real-time run.
  step(dt) {
    if (this.done) return;
    this.clock += dt;
    if (this.clock >= this.total) { this.finish(false); return; }
    let b = this.beats[0];
    for (const x of this.beats) if (this.clock >= x.t0) b = x;
    this.beat = b;
    const lt = clamp01((this.clock - b.t0) / Math.max(0.001, b.dur));
    this.t = this.clock / this.total;

    const along = -this._lane(this.t) * this.LANE;         // the party's position down the lane
    this.partyGroup.position.set(0, 0, along);

    // formation + life: a gentle roll and bob per craft so a group never reads as a rigid prop
    this.craft.forEach((c, i) => {
      const f = this.formation(i);
      const S = this.spread;
      c.holder.position.set(f[0] * S, f[1] * S, f[2] * S);
      const ph = this.clock * 1.4 + c.phase;
      c.holder.position.x += Math.sin(ph) * S * 0.045;
      c.holder.position.y += Math.sin(ph * 0.77) * S * 0.05;
      c.holder.rotation.z = Math.sin(ph * 0.6) * 0.12;
      c.holder.rotation.y = Math.sin(ph * 0.4) * 0.05;
      const throttle = b.kind === 'departure' ? 0.5 + lt * 0.9
        : b.kind === 'entry' ? 1.5 - lt * 1.2
        : b.kind === 'arrival' ? 0.25 : 1;
      for (const burn of c.burns) {
        burn.scale.set(0.85 + throttle * 0.35, 0.6 + throttle * 1.7, 0.85 + throttle * 0.35);
        burn.material.opacity = 0.3 + throttle * 0.45;
      }
    });

    this._camera(b, lt);
    this._beatFx(b, lt);

    if (this.el) {
      this.el.querySelector('#sfFill').style.width = (this.t * 100).toFixed(1) + '%';
      const R = this.route;
      if (b.kind === 'flyby') this._say(b.look.kicker, (b.data.name || '').toUpperCase(), this._auLine(b.data.body));
      else if (b.kind === 'departure') this._say(b.look.kicker, (R.from.name || '').toUpperCase(), 'DEPARTING');
      else if (b.kind === 'helio') this._say(b.look.kicker, 'THE SOLAR WIND STOPS', HELIOPAUSE_AU + ' AU  ·  VOYAGER 1 CROSSED HERE');
      else if (b.kind === 'oort') this._say(b.look.kicker, 'A TRILLION SLEEPING COMETS', '2,000 – 100,000 AU');
      else if (b.kind === 'entry') this._say(b.look.kicker, (R.to.name || '').toUpperCase(), 'INTERFACE');
      else if (b.kind === 'arrival') this._say(b.look.kicker, (R.to.name || '').toUpperCase(), (R.to.settlement && R.to.settlement.name) || '');
      else this._say(b.look.kicker, (R.to.name || '').toUpperCase(), this._cruiseLine());
    }
    this._apply();
  }

  _auLine(body) {
    const p = PLANETS.find(x => x.id === (body && body.userData.id));
    return p ? p.au.toFixed(2) + ' AU FROM THE SUN' : '';
  }
  _cruiseLine() {
    const R = this.route;
    return (R.au >= 1 ? R.au.toFixed(2) + ' AU' : (R.au * 149.6).toFixed(1) + ' MILLION KM') + '  ·  ' + this.party.length + ' UNDER WAY';
  }

  // Camera choreography. Each beat frames the party differently — chase, side-on against the body,
  // over the shoulder into the glow — and every one of them looks at the party, so it works for a
  // lone flyer and a convoy without a special case.
  // CAMERA. ⚠ EVERY SHOT IS AN OFFSET FROM THE PARTY AND A LOOK-AT THAT INCLUDES THEM. The first
  // version positioned and aimed at the BODY during a flyby, and the travellers — the entire
  // subject — left the frame completely. Framing as (party + a blend toward whatever the beat is
  // about) means it cannot happen again, and it works identically for a lone flyer and a convoy
  // because the offsets are scaled by the party's own spread.
  _camera(b, lt) {
    // ⚠ A CONVOY NEEDS MORE ROOM THAN A SOLO FLYER. Offsets are in party-spreads, but six craft in
    // echelon occupy several spreads — without this the nearest one fills a third of the frame and
    // clips. Log so a party of two barely changes and a party of eight is comfortably framed.
    const P = this.partyGroup.position, cam = this.cam;
    const S = this.spread * (1 + Math.log2(Math.max(1, this.party.length)) * 0.34);
    const k = ease(lt);
    let off = { x: S * 1.7, y: S * 0.8, z: S * 3.0 };
    let focus = null, blend = 0;

    if (b.kind === 'departure') {
      // ⚠ AHEAD OF THEM, LOOKING BACK. The camera sat BEHIND the party (+z) while aiming forward at
      // the world they were leaving (also +z), so the travellers were behind the lens and Earth was
      // outside the cone — the one beat Robert asked for by name rendered as an empty starfield.
      // Standing off the bow and looking back puts the party in the near field with their own
      // planet filling the space behind them, which is the shot.
      off = { x: S * (1.15 + k * 0.5), y: S * (0.42 + k * 0.3), z: -S * (1.5 + k * 0.7) };
      focus = this.origin.position; blend = 0.62 - k * 0.12;
    } else if (b.kind === 'flyby' && b.data.body) {
      const bp = b.data.body.position, side = Math.sign(bp.x) || 1;
      // ride on the OPPOSITE side of the lane so the planet passes between the camera and the party
      off = { x: -side * S * (2.1 + k * 0.6), y: S * (0.7 + k * 0.25), z: S * (2.6 + k * 1.1) };
      focus = bp; blend = 0.30 + Math.sin(k * Math.PI) * 0.18;
    } else if (b.kind === 'helio' || b.kind === 'oort') {
      off = { x: S * (2.0 - k * 0.9), y: S * (0.8 + k * 0.35), z: S * 3.2 };
      focus = { x: 0, y: 0, z: P.z - S * 22 }; blend = 0.28;
    } else if (b.kind === 'approach') {
      off = { x: S * (1.9 - k * 0.7), y: S * (0.9 - k * 0.3), z: S * (2.8 + k * 0.6) };
      focus = this.target.position; blend = 0.30 + k * 0.16;
    } else if (b.kind === 'entry') {
      // low and behind, so the world's limb fills the bottom of frame and the burn is between us
      off = { x: S * (0.9 - k * 0.3), y: S * (0.55 - k * 0.25), z: S * (2.5 + k * 0.5) };
      focus = this.target.position; blend = 0.34 + k * 0.14;
    } else if (b.kind === 'arrival') {
      off = { x: S * (1.2 + k * 0.5), y: S * (0.7 + k * 0.3), z: S * 2.6 };
      focus = this.target.position; blend = 0.34;
    } else {                                  // cruise
      off = { x: S * (1.5 + Math.sin(this.clock * 0.35) * 0.35), y: S * 0.7, z: S * 2.9 };
      focus = { x: 0, y: 0, z: P.z - S * 18 }; blend = 0.45;
    }

    cam.position.set(P.x + off.x, P.y + off.y, P.z + off.z);
    const look = new THREE.Vector3(P.x, P.y, P.z - S * 1.2);
    if (focus) look.lerp(new THREE.Vector3(focus.x, focus.y, focus.z), clamp01(blend));
    cam.lookAt(look);
    cam.updateProjectionMatrix();
  }

  // Per-beat effects: the deep-space shells fade in when you reach them, an entry heats the target's
  // atmosphere and burns the party's leading edge.
  _beatFx(b, lt) {
    if (this.oort) this.oort.material.opacity = b.kind === 'oort' ? 0.25 + ease(lt) * 0.6 : (b.kind === 'helio' ? ease(lt) * 0.2 : 0);
    if (this.helio) this.helio.material.opacity = b.kind === 'helio' ? 0.03 + ease(lt) * 0.07 : 0.02;
    if (this.helioBow) this.helioBow.material.opacity = b.kind === 'helio' ? 0.35 + Math.sin(this.clock * 3) * 0.14 + ease(lt) * 0.45 : 0.0;
    // ENTRY: the world's air lights up and the party glows with it
    const air = this.target && this.target.userData.air;
    if (air) air.material.opacity = b.kind === 'entry' ? 0.22 + ease(lt) * 0.6 : 0.22;
    if (b.kind === 'entry') {
      const heat = ease(lt);
      for (const c of this.craft) for (const burn of c.burns) burn.material.color.setStyle(heat > 0.5 ? '#ff6a1a' : c.wake[0]);
    }
    for (const b2 of this.bodies) if (b2.userData.body) b2.rotation.y += 0.06 * (b2 === this.sun ? 0.1 : 1) * 0.016;
    // the sky is infinitely far away, so it rides with the camera — otherwise a 34,000-unit lane
    // walks straight out of a 26,000-unit sphere and the stars simply stop
    const pz = this.partyGroup.position.z;
    if (this.stars) this.stars.position.z = pz;
    if (this.bright) this.bright.position.z = pz;
    if (this.sky) this.sky.position.z = pz;
  }

  _apply() {
    const W = this.g.world;
    if (this._pass) { this._pass.scene = this.scene; this._pass.camera = this.cam; }
    if (!this.manual && W && W.composer) {
      const el = W.renderer.domElement;
      this.cam.aspect = el.width / Math.max(1, el.height);
      this.cam.updateProjectionMatrix();
      W.composer.render();
    }
  }

  // -------------------------------------------------------------------------------------------
  finish(skipped) {
    if (this.done) return;
    this.done = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._skip);
    window.removeEventListener('pointerdown', this._skip);
    const g = this.g, W = g.world;
    if (this._pass) { this._pass.scene = this._prevScene; this._pass.camera = this._prevCam; }
    g.running = this._wasRunning;
    if (this.el) { this.el.remove(); this.el = null; }
    for (const [el, disp] of (this._hidHud || [])) el.style.display = disp;
    this._hidHud = null;
    if (this.scene) {
      this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      for (const m of this._mats) m.dispose();
      this.scene = null; this._mats = []; this._geos = [];
    }
    this.skipped = !!skipped;
    if (this.onDone) { const d = this.onDone; this.onDone = null; try { d(this); } catch (e) { g.reportError && g.reportError(e, 'spaceflight.onDone'); } }
  }
}

// The one entry point the rest of the game uses.
export function playSpaceFlight(game, opts, onDone) {
  if (game._spaceflight && !game._spaceflight.done) game._spaceflight.finish(true);
  const sf = new SpaceFlight(game);
  game._spaceflight = sf;
  return sf.play(opts || {}, onDone);
}
