// Living Superweapon — 3D world: renderer, scene, iso camera, lights, arena, bloom.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, damp } from '../core/util.js';

export const ARENA = 240; // half-extent of playfield — big enough to fly across

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ARENA = ARENA;   // instance mirror — the radar reads g.world.ARENA
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this._maxPR = Math.min(devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this._maxPR);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    // adaptive quality (keeps frame-rate smooth by scaling resolution)
    this._ema = 16.7; this._qTier = 2; this._qCool = 2; this._lastRender = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0e1119');
    this.scene.fog = new THREE.FogExp2('#0e1119', 0.00055);

    // --- Isometric orthographic camera ---
    this.camTarget = new THREE.Vector3(0, 6, 0);
    this.camPos = new THREE.Vector3();
    this.frustum = 78;          // world units of vertical view (zoom)
    this.frustumTarget = 78;
    this.camDir = new THREE.Vector3(0.86, 0.92, 0.86).normalize(); // iso-ish angle
    this.camDist = 260;
    const asp = innerWidth / innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -this.frustum * asp, this.frustum * asp, this.frustum, -this.frustum, 1, 1400
    );
    this._shake = 0; this.shakeV = new THREE.Vector3();

    this._buildLights();
    this._buildSky();
    this._buildArena();
    this._buildGrass();
    this._buildFogOfWar();
    this._buildComposer();

    addEventListener('resize', () => this.resize());
    this.resize();
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight('#bcd4ff', '#43352a', 1.28);
    this.scene.add(hemi); this.hemi = hemi;
    this.amb = new THREE.AmbientLight('#6a7890', 0.5);
    this.scene.add(this.amb);
    const sun = new THREE.DirectionalLight('#fff2dc', 1.8);
    sun.position.set(120, 200, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);   // 55% of 2048²'s pixels — visually identical at iso zoom
    // tight frustum that FOLLOWS the camera target (see follow()) — the visible area is ~160 units,
    // so a 110-unit half-extent doubles effective shadow texel density vs. covering the whole arena
    const d = 110;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 40; sun.shadow.camera.far = 520;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun); this.scene.add(sun.target);
    this.sun = sun;
    // cool back-rim (opposite the sun) — edge-lights heroes so they pop off the dark arena
    const rim = new THREE.DirectionalLight('#8fb8ff', 0.75);
    rim.position.set(-130, 90, -150);
    this.scene.add(rim); this.rim = rim;
    // subtle warm kicker from below-front for drama
    const kick = new THREE.DirectionalLight('#ff8a3a', 0.22);
    kick.position.set(70, 24, 120);
    this.scene.add(kick);
  }

  _buildSky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop:  { value: new THREE.Color(0.03, 0.04, 0.075) },
        uHor:  { value: new THREE.Color(0.075, 0.07, 0.10) },
        uGlow: { value: new THREE.Color(0.10, 0.05, 0.01) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 uTop, uHor, uGlow; void main(){
        vec3 n = normalize(vP); float h = n.y*0.5+0.5;
        vec3 c = mix(uHor, uTop, smoothstep(0.30,0.9,h));
        c += uGlow * pow(max(0.0, dot(n, normalize(vec3(0.7,0.12,0.7)))), 5.0);   // sun-side horizon glow
        gl_FragColor = vec4(c, 1.0);
      }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), mat);
    sky.renderOrder = -1; this.scene.add(sky);
    this.skyMat = mat;
    // ---- day/night state (ruled: a 2-minute match ≈ 12 in-game hours → 240s full day) ----
    this.dayT = 0.3;                       // start late morning
    this._dnc = {                          // preallocated palette — alloc-free per-frame lerps
      work: new THREE.Color(), work2: new THREE.Color(),
      sunDay: new THREE.Color('#fff2dc'), sunGold: new THREE.Color('#ffbe72'), sunNight: new THREE.Color('#8fa5d8'),
      hemiDay: new THREE.Color('#cfe0ff'), hemiNight: new THREE.Color('#8fa8d8'),
      gndDay: new THREE.Color('#6a5f4c'), gndNight: new THREE.Color('#3a3428'),
      topDay: new THREE.Color(0.15, 0.23, 0.42), topNight: new THREE.Color(0.03, 0.04, 0.075),
      horDay: new THREE.Color(0.50, 0.44, 0.34), horNight: new THREE.Color(0.075, 0.07, 0.10),
      glowTint: new THREE.Color(1.0, 0.45, 0.12),
    };
  }

  // Advance the day and push it into the lights, sky, and building windows. dl: 1 = noon,
  // 0 = midnight; night NEVER drops below the original arena look (Robert's rule: keep it bright).
  updateDayNight(dts) {
    this.dayT = (this.dayT + dts / 240) % 1;
    const P = this._dnc; if (!P) return;
    const dl = 0.5 + 0.5 * Math.cos((this.dayT - 0.25) * Math.PI * 2);
    const gold = Math.exp(-((dl - 0.5) ** 2) / 0.02);                     // sunrise / sunset bell
    if (this.sun) {
      this.sun.intensity = 0.7 + dl * 1.1;
      P.work.lerpColors(P.sunNight, P.sunDay, dl).lerp(P.sunGold, gold * 0.65);
      this.sun.color.copy(P.work);
    }
    if (this.hemi) {
      this.hemi.intensity = 0.95 + dl * 0.4;
      this.hemi.color.lerpColors(P.hemiNight, P.hemiDay, dl);
      this.hemi.groundColor.lerpColors(P.gndNight, P.gndDay, dl);
    }
    if (this.amb) this.amb.intensity = 0.34 + dl * 0.18;
    if (this.rim) this.rim.intensity = 0.6 + (1 - dl) * 0.35;
    const u = this.skyMat.uniforms;
    u.uTop.value.lerpColors(P.topNight, P.topDay, dl);
    u.uHor.value.lerpColors(P.horNight, P.horDay, dl);
    u.uGlow.value.copy(P.glowTint).multiplyScalar(0.06 + gold * 0.22);
    if (this._winMats) { const e = 0.08 + (1 - dl) * 0.5; for (const m of this._winMats) m.emissiveIntensity = e; }
    if (this._lampMat) this._lampMat.emissiveIntensity = 0.12 + (1 - dl) * 1.6;            // streetlights wake at dusk
    if (this._billMats) for (const m of this._billMats) m.emissiveIntensity = 0.22 + (1 - dl) * 0.85;
  }

  _buildArena() {
    const g = new THREE.Group();
    // ground: the White City — bone plaza + street grid (texture carries the whites; the
    // multiply color keeps it from blowing out under ACES at noon)
    const tex = this._gridTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0, color: '#8f897d' });
    const SEG = 112;
    const groundGeo = new THREE.PlaneGeometry(ARENA * 2, ARENA * 2, SEG, SEG);
    const ground = new THREE.Mesh(groundGeo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);
    this.ground = ground; this.groundGeo = groundGeo;
    // per-vertex world XZ + accumulated height (for GeoMod-style craters); local +z maps to world +y
    const pa = groundGeo.attributes.position.array; const nV = pa.length / 3;
    this._gvx = new Float32Array(nV); this._gvz = new Float32Array(nV); this._gh = new Float32Array(nV);
    for (let i = 0; i < nV; i++) { this._gvx[i] = pa[i * 3]; this._gvz[i] = -pa[i * 3 + 1]; }

    // (the gold emblem ring is baked into the radial glow texture now — one draw fewer)
    // soft center glow — smaller & subtler on the bright plaza (less additive overdraw too)
    const glow = new THREE.Mesh(new THREE.CircleGeometry(56, 40), new THREE.MeshBasicMaterial({ map: this._radialTex(), transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.06; g.add(glow);

    // border walls — white stone parapets with the city's gold trim, MERGED into one
    // mesh (4 walls → 1 draw + 1 shadow draw)
    const wallMat = new THREE.MeshStandardMaterial({ color: '#d8d0be', emissive: '#f5b21a', emissiveIntensity: 0.22, roughness: 0.7 });
    const wh = 6, t = 3;
    const wallGeos = [
      [ARENA * 2 + t, t, 0, -ARENA], [ARENA * 2 + t, t, 0, ARENA],
      [t, ARENA * 2 + t, -ARENA, 0], [t, ARENA * 2 + t, ARENA, 0],
    ].map(([w, d, x, z]) => new THREE.BoxGeometry(w, wh, d).translate(x, wh / 2, z));
    const walls = new THREE.Mesh(mergeGeometries(wallGeos), wallMat);
    wallGeos.forEach(gg => gg.dispose());
    walls.castShadow = false; walls.receiveShadow = true; g.add(walls);   // their shadows fall OUTSIDE the arena

    // The district: cover blocks are BUILDINGS now — white stone, windowed faces, varied
    // skyline. Same footprints as before (cover balance is tuned), heights re-sculpted.
    this.cover = []; this.coverAll = [];
    const mkWin = (tex, tint, emissive = '#ffca7a') => new THREE.MeshStandardMaterial({
      map: tex.map, emissiveMap: tex.glow, emissive, emissiveIntensity: 0.1,
      color: tint, roughness: 0.82, metalness: 0.05,
    });
    const texC = this._windowTexture('commercial');
    this._winMats = [
      mkWin(texC, '#e6e0d2'), mkWin(texC, '#d6cfbd'),                       // commercial A/B
      mkWin(this._windowTexture('residential'), '#e2cfae'),                 // residential
      mkWin(this._windowTexture('industrial'), '#b8bcc0', '#cfe8ff'),       // industrial (cool glow)
      mkWin(this._windowTexture('military'), '#8f9472', '#b8ffb0'),         // military (green slits)
    ];
    const bridgeMat = new THREE.MeshStandardMaterial({ color: '#c5beb0', roughness: 0.9, metalness: 0.05 });
    // per-district ROOFS — from the sky you see rooftops, not facades; this is what makes
    // the four sections readable on the full-map view
    const roofMats = [
      new THREE.MeshStandardMaterial({ color: '#b9b2a0', roughness: 0.9, metalness: 0.04 }),   // commercial pale
      new THREE.MeshStandardMaterial({ color: '#b9b2a0', roughness: 0.9, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({ color: '#a85c3e', roughness: 0.92, metalness: 0.02 }),  // residential terracotta
      new THREE.MeshStandardMaterial({ color: '#5f666c', roughness: 0.75, metalness: 0.35 }),  // industrial steel
      new THREE.MeshStandardMaterial({ color: '#5c6044', roughness: 0.92, metalness: 0.05 }),  // military olive
    ];
    const roofMat = roofMats[0];
    // one window bay tile ≈ 28 units; scale each face's UVs so windows stay true-size per building
    const scaleBoxUV = (geo, w, h, d) => {
      const uv = geo.attributes.uv, B = 28, R = 16;
      const f = [[d / B, h / B], [d / B, h / B], [w / R, d / R], [w / R, d / R], [w / B, h / B], [w / B, h / B]];
      for (let fi = 0; fi < 6; fi++) for (let v = 0; v < 4; v++) {
        const i = fi * 4 + v;
        uv.setXY(i, uv.getX(i) * f[fi][0], uv.getY(i) * f[fi][1]);
      }
      uv.needsUpdate = true;
    };
    // FOUR NAMED DISTRICTS at city scale (96u block cells; total cover ≤20 = fog cap).
    // style: 0/1 = COMMERCIAL glass · 2 = RESIDENTIAL warm stone · 3 = INDUSTRIAL steel ·
    // 4 = MILITARY olive · 5 = the BRIDGE deck (standable — block-top physics is free)
    const spots = [
      // COMMERCIAL — the downtown skyline, NW + north
      [-192, -192, 48, 44, 40, 0], [-96, -192, 40, 38, 40, 1], [-192, -96, 40, 34, 40, 1], [-96, -96, 36, 28, 36, 0],
      [0, -192, 56, 22, 40, 1], [96, -192, 44, 26, 36, 0], [96, -96, 40, 20, 36, 1], [0, -96, 44, 18, 36, 0],
      // RESIDENTIAL — warm low homes, south
      [-96, 96, 44, 12, 36, 2], [0, 96, 50, 10, 40, 2], [96, 96, 40, 14, 34, 2], [0, 192, 54, 12, 38, 2],
      // INDUSTRIAL — dockside warehouses against the harbor
      [169, -96, 28, 12, 50, 3], [169, 40, 28, 14, 44, 3],
      // MILITARY — the SW compound: two bunkers + a watchtower
      [-192, 192, 40, 10, 34, 4], [-96, 192, 34, 8, 28, 4], [-146, 168, 8, 26, 8, 4],
      // THE BRIDGE — a deck across the harbor at z=0 (top y=3: dry feet over deep water)
      [195, 0, 80, 3, 16, 5],
      // west park cells (-192,0) and (-192,96) stay OPEN — the park belt
    ];
    const crackTex = this._crackTexture();
    for (const [x, z, w, h, d, style = 0] of spots) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const isBridge = style === 5;
      if (!isBridge) scaleBoxUV(geo, w, h, d);
      const win = isBridge ? bridgeMat : this._winMats[Math.min(style, 4)];
      // ONE material per box (1 draw + 1 shadow draw — material arrays would 6× that);
      // the roof is a child slab that inherits the shatter-sink transform and casts nothing.
      // Only TALL buildings cast shadows — every caster is another pass over the shadow map.
      const m = new THREE.Mesh(geo, win);
      m.position.set(x, h / 2, z); m.castShadow = h >= 20; m.receiveShadow = true;
      if (!isBridge) {
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roofMats[Math.min(style, 4)]);
        roof.rotation.x = -Math.PI / 2; roof.position.y = h / 2 + 0.05;
        roof.receiveShadow = true;
        m.add(roof);
      } else {
        // guard rails ride the deck (children — shatter carries them into the drink)
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, 0.5), bridgeMat);
          rail.position.set(0, h / 2 + 0.7, side * (d / 2 - 0.35)); m.add(rail);
        }
      }
      g.add(m);
      // crack overlay — fades in as the block takes damage
      const crack = new THREE.Mesh(new THREE.BoxGeometry(w * 1.015, h * 1.006, d * 1.015), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false }));
      crack.position.copy(m.position); crack.visible = false; g.add(crack);   // hidden until damaged — 16 fewer transparent draws

      const hp = Math.round(70 + w * h * d * 0.017);   // destructible, but tough — bigger = tougher
      const co = { mesh: m, crack, x, z, r: Math.max(w, d) * 0.6, h, hx: w / 2, hz: d / 2, top: h, hp, maxHp: hp, y0: h / 2, w, d, destroyed: false };
      this.cover.push(co); this.coverAll.push(co);
    }
    this.scene.add(g);
    this.arena = g;
    this._buildCity(g);
  }

  // ---- the city dressing: harbor, cars, streetlights, billboards, rooftop units ----
  _buildCity(g) {
    // THE HARBOR (ruled: "first map is a city district near water") — east edge.
    // waterAt(x): 0 dry · 1 shallow shelf (slows) · 2 deep (swim-slow)
    this.waterX = ARENA - 52;                      // the quay line
    this.deepX = ARENA - 26;
    const wTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const x = c.getContext('2d');
      const grd = x.createLinearGradient(0, 0, 256, 0);
      grd.addColorStop(0, 'rgba(70,140,160,0.62)'); grd.addColorStop(0.42, 'rgba(40,100,130,0.78)'); grd.addColorStop(1, 'rgba(16,52,84,0.92)');
      x.fillStyle = grd; x.fillRect(0, 0, 256, 64);
      x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { const y = Math.random() * 64; x.beginPath(); x.moveTo(Math.random() * 40, y); x.lineTo(40 + Math.random() * 200, y); x.stroke(); }
      const t = new THREE.CanvasTexture(c); return t;
    })();
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA - this.waterX + 6, ARENA * 2, 12, 1),
      new THREE.MeshStandardMaterial({ map: wTex, transparent: true, opacity: 0.88, roughness: 0.25, metalness: 0.35, color: '#9fd4e8', depthWrite: false })
    );
    water.rotation.x = -Math.PI / 2; water.rotation.z = 0;
    water.position.set((this.waterX + ARENA + 6) / 2, 0.34, 0);
    water.material.onBeforeCompile = (sh) => {                       // gentle swell
      sh.uniforms.uT = this._waterT = { value: 0 };
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>\n transformed.z += sin(uT*1.3 + position.x*0.14 + position.y*0.05) * 0.22;`);
    };
    g.add(water); this.water = water;
    // quay edge — a pale stone lip along the shore
    const quay = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, ARENA * 2), new THREE.MeshStandardMaterial({ color: '#cfc8b6', roughness: 0.85 }));
    quay.position.set(this.waterX - 1.5, 0.55, 0); quay.receiveShadow = true; g.add(quay);

    // PARKED CARS (ruled props) — hero-scale now (~13u long vs a 9.6u fighter), curbside on
    // the real streets. Destructible, they EXPLODE and chain. One merged geometry, 4 paints.
    const carGeo = (() => {
      const body = new THREE.BoxGeometry(13, 3.2, 5.4); body.translate(0, 1.9, 0);
      const cabin = new THREE.BoxGeometry(6.2, 2.4, 4.6); cabin.translate(-0.9, 4.4, 0);
      return mergeGeometries([body, cabin]);
    })();
    const paints = ['#8a2a24', '#2a4a6a', '#c9c2b4', '#3a3f34'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.35 }));
    this._charred = new THREE.MeshStandardMaterial({ color: '#1c1a17', roughness: 0.95, metalness: 0.1 });
    const carSpots = [   // [x, z, alongZ] — parked at the curb (streets at ±48/±144, curb ≈ ±9)
      [57, -120, 1], [39, -20, 1], [57, 60, 1], [-57, -160, 1], [-39, 90, 1], [-57, 170, 1], [153, -130, 1], [-135, -57, 0],
      [-120, 57, 0], [20, 39, 0], [80, -57, 0], [-20, -135, 0], [110, 135, 0], [-160, -39, 0],
    ];
    this.cars = [];
    carSpots.forEach(([x, z, axis], i) => {
      const m = new THREE.Mesh(carGeo, paints[i % paints.length]);
      m.position.set(x, 0, z); m.rotation.y = axis ? Math.PI / 2 : 0; m.castShadow = false; m.receiveShadow = true;   // hugs the ground — a cast shadow buys nothing
      g.add(m);
      this.cars.push({ mesh: m, x, z, hp: 30, maxHp: 30, dead: false, paint: paints[i % paints.length] });
    });

    // STREETLIGHTS — hero-scale poles (15u) at the street intersections; heads glow at night
    const lampSpots = [];
    for (const lx of [-144, -48, 48, 144]) for (const lz of [-144, -48, 48, 144]) lampSpots.push([lx + 6, lz + 6]);
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.42, 15, 6); poleGeo.translate(0, 7.5, 0);
    const headGeo = new THREE.SphereGeometry(0.95, 8, 6); headGeo.translate(0, 15.4, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: '#4a463c', roughness: 0.7, metalness: 0.4 });
    this._lampMat = new THREE.MeshStandardMaterial({ color: '#fff2cc', emissive: '#ffca7a', emissiveIntensity: 0.15, roughness: 0.4 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
    const heads = new THREE.InstancedMesh(headGeo, this._lampMat, lampSpots.length);
    const lm = new THREE.Matrix4();
    lampSpots.forEach(([x, z], i) => { lm.makeTranslation(x, 0, z); poles.setMatrixAt(i, lm); heads.setMatrixAt(i, lm); });
    poles.castShadow = false; heads.castShadow = false;
    g.add(poles); g.add(heads);

    // BILLBOARDS — in-world lore, glow at night
    const billTex = (txt, accent) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#12141c'; x.fillRect(0, 0, 256, 128);
      x.strokeStyle = accent; x.lineWidth = 6; x.strokeRect(6, 6, 244, 116);
      x.fillStyle = accent; x.font = '800 42px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(txt, 128, 54);
      x.fillStyle = '#c9c2b4'; x.font = '600 17px sans-serif'; x.fillText('THE WHITE CITY', 128, 96);
      return new THREE.CanvasTexture(c);
    };
    this._billMats = [];
    const addBill = (tex, x, y, z, ry, w = 16, h = 8) => {
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.6 });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      b.position.set(x, y, z); b.rotation.y = ry; g.add(b); this._billMats.push(mat);
    };
    addBill(billTex('THRESHOLD', '#f5b21a'), -167.6, 28, -192, Math.PI / 2, 26, 12);   // downtown tower, east face
    addBill(billTex('KANO COLA', '#ff5a2a'), 96, 17, -173.6, 0, 22, 10);               // midtown tower, south face

    // ROOFTOP UNITS on the 6 tallest — children so shatter carries them
    const acMat = new THREE.MeshStandardMaterial({ color: '#9a948a', roughness: 0.9 });
    const tall = [...this.cover].sort((a, b) => b.h - a.h).slice(0, 6);
    for (const c of tall) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6, c.w * 0.22), 2.6, Math.min(6, c.d * 0.22)), acMat);
      ac.position.set(c.w * 0.24, c.h / 2 + 1.35, -c.d * 0.22); c.mesh.add(ac);
    }

    // ---- district dressing (decor only — no cover slots, no fog boxes) ----
    // INDUSTRIAL: storage tanks + a quay crane over the water
    const tankGeos = [[160, -30], [172, -22], [158, -12]].map(([x, z]) =>
      new THREE.CylinderGeometry(6.5, 6.5, 11, 12).translate(x, 5.5, z));
    const tanks = new THREE.Mesh(mergeGeometries(tankGeos), new THREE.MeshStandardMaterial({ color: '#8f979c', roughness: 0.6, metalness: 0.5 }));
    tankGeos.forEach(t => t.dispose()); tanks.castShadow = false; tanks.receiveShadow = true; g.add(tanks);
    const craneGeos = [
      new THREE.BoxGeometry(8, 4, 8).translate(180, 2, 74),        // base
      new THREE.BoxGeometry(2.6, 38, 2.6).translate(180, 21, 74),  // mast
      new THREE.BoxGeometry(44, 2.2, 2.2).translate(196, 38, 74),  // jib out over the water
      new THREE.BoxGeometry(12, 2.2, 2.2).translate(170, 38, 74),  // counter-jib
      new THREE.BoxGeometry(1, 10, 1).translate(212, 32.8, 74),    // cable
    ];
    const crane = new THREE.Mesh(mergeGeometries(craneGeos), new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.55, metalness: 0.4 }));
    craneGeos.forEach(t => t.dispose()); crane.castShadow = true; g.add(crane);

    // MILITARY: perimeter fence (with a gate gap) + helipad
    const fenceMat = new THREE.MeshStandardMaterial({ color: '#55583f', roughness: 0.8, metalness: 0.3 });
    const fenceGeos = [
      new THREE.BoxGeometry(180, 3.5, 1).translate(-138, 1.75, 146),   // north run
      new THREE.BoxGeometry(1, 3.5, 88).translate(-48, 1.75, 190),     // east run
      new THREE.BoxGeometry(60, 3.5, 1).translate(-198, 1.75, 234),    // south-west stub (gate gap mid-south)
    ];
    const fence = new THREE.Mesh(mergeGeometries(fenceGeos), fenceMat);
    fenceGeos.forEach(t => t.dispose()); fence.castShadow = false; g.add(fence);
    const heliTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.strokeStyle = '#e8e2d4'; x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke();
      x.font = '900 64px sans-serif'; x.fillStyle = '#e8e2d4'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', 64, 68);
      return new THREE.CanvasTexture(c);
    })();
    const heli = new THREE.Mesh(new THREE.CircleGeometry(13, 24), new THREE.MeshBasicMaterial({ map: heliTex, transparent: true, opacity: 0.8, depthWrite: false }));
    heli.rotation.x = -Math.PI / 2; heli.position.set(-144, 0.12, 205); g.add(heli);

    // DISTRICT WASHES — faint color fields so the sections read from the sky (+ the radar labels)
    const wash = (wd, dp, x, z, col, op) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(wd, dp), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }));
      p.rotation.x = -Math.PI / 2; p.position.set(x, 0.09, z); g.add(p);
    };
    wash(288, 192, -96, -144, '#7fb0ff', 0.07);   // commercial — cool
    wash(288, 192, 0, 144, '#ff9a3a', 0.07);      // residential — warm
    wash(64, 240, 156, -24, '#9fb2c9', 0.1);      // industrial — steel
    wash(192, 92, -144, 196, '#7a8a4a', 0.12);    // military — olive
  }

  // 0 = dry land · 1 = shallow shelf · 2 = deep water
  waterAt(x) { return x < this.waterX ? 0 : x < this.deepX ? 1 : 2; }

  // --- grass: ONE InstancedMesh (single draw call), wind sway in the vertex shader,
  // and every crater/scorch FLATTENS the blades inside it — cheap mileage from destruction.
  _buildGrass() {
    const COUNT = 2400;
    const geo = new THREE.PlaneGeometry(1.5, 2.1, 1, 2); geo.translate(0, 1.05, 0);   // pivot at the roots
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this._grassTime = { value: 0 };
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 gw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         transformed.x += sin(uTime * 1.7 + gw.x * 0.33 + gw.z * 0.29) * 0.26 * position.y;`
      );
    };
    const grass = new THREE.InstancedMesh(geo, mat, COUNT);
    grass.frustumCulled = false; grass.receiveShadow = true; grass.renderOrder = 1;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    this._gPos = new Float32Array(COUNT * 2); this._gRot = new Float32Array(COUNT); this._gScale = new Float32Array(COUNT); this._gOn = new Uint8Array(COUNT).fill(1);
    // city grass lives in PARKS — two full park BLOCKS on the west belt + pocket squares
    const PARKS = [
      [-192, 0, 38], [-192, 96, 36],                    // the west park blocks (open cells)
      [-96, 20, 18], [-40, 148, 16], [148, 140, 15],    // pocket squares
      [-40, -40, 14], [140, 12, 14], [40, 170, 14],
    ];
    let placed = 0, tries = 0;
    while (placed < COUNT && tries++ < COUNT * 30) {
      const [px, pz, pr] = PARKS[(Math.random() * PARKS.length) | 0];
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * pr;
      const x = px + Math.cos(a) * rr, z = pz + Math.sin(a) * rr;
      if (Math.hypot(x, z) < 44 || Math.abs(x) > ARENA - 8 || Math.abs(z) > ARENA - 8) continue;
      let blocked = false;
      for (const c of this.coverAll) if (Math.abs(x - c.x) < c.hx + 2 && Math.abs(z - c.z) < c.hz + 2) { blocked = true; break; }
      if (blocked) continue;
      const i = placed++;
      this._gPos[i * 2] = x; this._gPos[i * 2 + 1] = z;
      this._gRot[i] = Math.random() * Math.PI; this._gScale[i] = 0.7 + Math.random() * 0.85;
      m4.compose(pv.set(x, 0, z), q.setFromAxisAngle(Y, this._gRot[i]), sv.setScalar(this._gScale[i]));
      grass.setMatrixAt(i, m4);
      grass.setColorAt(i, col.setHSL(0.22 + Math.random() * 0.05, 0.34, 0.20 + Math.random() * 0.11));   // olive park green
    }
    grass.count = placed;
    grass.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    this.grass = grass; this.scene.add(grass);
  }
  // scorch it, crater it, burn it — the blades in the radius go down and stay down until reset
  flattenGrass(cx, cz, r) {
    if (!this.grass) return;
    const r2 = r * r; let touched = false;
    for (let i = 0; i < this.grass.count; i++) {
      if (!this._gOn[i]) continue;
      const dx = this._gPos[i * 2] - cx, dz = this._gPos[i * 2 + 1] - cz;
      if (dx * dx + dz * dz > r2) continue;
      this._gOn[i] = 0; touched = true;
      _gm4.makeScale(0.001, 0.001, 0.001); _gm4.setPosition(this._gPos[i * 2], -2, this._gPos[i * 2 + 1]);
      this.grass.setMatrixAt(i, _gm4);
    }
    if (touched) this.grass.instanceMatrix.needsUpdate = true;
  }
  _restoreGrass() {
    if (!this.grass) return;
    const q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.grass.count; i++) {
      if (this._gOn[i]) continue;
      this._gOn[i] = 1;
      _gm4.compose(pv.set(this._gPos[i * 2], 0, this._gPos[i * 2 + 1]), q.setFromAxisAngle(Y, this._gRot[i]), sv.setScalar(this._gScale[i]));
      this.grass.setMatrixAt(i, _gm4);
    }
    this.grass.instanceMatrix.needsUpdate = true;
  }

  // The White City tile — one 24-unit district block per repeat: bone plaza + asphalt
  // cross-streets with lane dashes and crosswalks. Repeats 20× across the arena.
  _gridTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    // plaza — pale bone stone with a soft paver grid
    x.fillStyle = '#cfc8b6'; x.fillRect(0, 0, 512, 512);
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(64, 64, 192, 192); x.fillRect(256, 256, 192, 192);
    x.strokeStyle = 'rgba(90,80,60,0.12)'; x.lineWidth = 1.5;
    for (let i = 64; i <= 512; i += 64) { x.beginPath(); x.moveTo(i + .5, 0); x.lineTo(i + .5, 512); x.stroke(); x.beginPath(); x.moveTo(0, i + .5); x.lineTo(512, i + .5); x.stroke(); }
    // the streets — an asphalt cross along the tile edges (wraps into a full grid)
    const ST = 116;                                     // street width in px (~5.4u)
    x.fillStyle = '#57544c';
    x.fillRect(0, 0, ST / 2, 512); x.fillRect(512 - ST / 2, 0, ST / 2, 512);
    x.fillRect(0, 0, 512, ST / 2); x.fillRect(0, 512 - ST / 2, 512, ST / 2);
    // curbs
    x.strokeStyle = 'rgba(240,234,218,0.85)'; x.lineWidth = 4;
    for (const p of [ST / 2, 512 - ST / 2]) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 512); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(512, p); x.stroke(); }
    // lane dashes (gold — the city's trim color)
    x.strokeStyle = 'rgba(245,178,26,0.55)'; x.lineWidth = 5; x.setLineDash([26, 22]);
    x.beginPath(); x.moveTo(0.5, 0); x.lineTo(0.5, 512); x.stroke();
    x.beginPath(); x.moveTo(0, 0.5); x.lineTo(512, 0.5); x.stroke();
    x.setLineDash([]);
    // crosswalk ticks where street meets plaza
    x.fillStyle = 'rgba(240,234,218,0.7)';
    for (let i = -40; i <= 40; i += 16) {
      x.fillRect(256 + i, ST / 2 + 4, 9, 26); x.fillRect(256 + i, 512 - ST / 2 - 30, 9, 26);
      x.fillRect(ST / 2 + 4, 256 + i, 26, 9); x.fillRect(512 - ST / 2 - 30, 256 + i, 26, 9);
    }
    const t = new THREE.CanvasTexture(c);
    // 5 repeats over 480u = a 96-unit CITY BLOCK per tile with ~22u-wide streets — real streets
    // a 9.6u-tall hero fights DOWN, not a train-set grid he towers over
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
    t.anisotropy = 8;
    return t;
  }

  // Building facades per DISTRICT — a shared tile (repeats every ~28 units) + a separate
  // pure-glow map (black except the LIT windows) so night emissive lights ONLY the glass.
  _windowTexture(style = 'commercial') {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = document.createElement('canvas'); g.width = g.height = 256;
    const x = c.getContext('2d'), y = g.getContext('2d');
    y.fillStyle = '#000'; y.fillRect(0, 0, 256, 256);
    const win = (px, py, w, h, lit, litCol, glass) => {
      x.fillStyle = lit ? litCol : glass;
      x.fillRect(px, py, w, h);
      x.strokeStyle = 'rgba(60,54,40,0.55)'; x.lineWidth = 3; x.strokeRect(px, py, w, h);
      x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(px + 3, py + 3, w - 6, Math.max(6, h * 0.22));
      if (lit) { y.fillStyle = litCol; y.fillRect(px, py, w, h); }
    };
    if (style === 'residential') {                                 // warm stone, homey 2×3 windows + sills
      x.fillStyle = '#d9c9ae'; x.fillRect(0, 0, 256, 256);
      x.fillStyle = 'rgba(150,100,60,0.12)'; for (let i = 0; i < 256; i += 22) x.fillRect(0, i, 256, 3);   // course lines
      for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) {
        const px = col * 84 + 16, py = r * 84 + 16, lit = Math.random() < 0.42;
        win(px, py, 52, 56, lit, '#ffcf8a', '#3a3630');
        x.fillStyle = 'rgba(120,80,50,0.5)'; x.fillRect(px - 4, py + 56, 60, 5);    // sill
      }
    } else if (style === 'industrial') {                           // corrugated steel + one big bay door
      x.fillStyle = '#9aa0a2'; x.fillRect(0, 0, 256, 256);
      x.fillStyle = 'rgba(60,66,70,0.35)'; for (let i = 0; i < 256; i += 12) x.fillRect(i, 0, 4, 256);     // corrugation
      x.fillStyle = '#5b6165'; x.fillRect(70, 96, 116, 160);                                                // bay door
      x.strokeStyle = 'rgba(30,34,38,0.6)'; x.lineWidth = 4; x.strokeRect(70, 96, 116, 160);
      for (let i = 108; i < 256; i += 24) { x.beginPath(); x.moveTo(70, i); x.lineTo(186, i); x.stroke(); }
      win(16, 18, 52, 34, Math.random() < 0.3, '#cfe8ff', '#2c3342');                                       // hi window
      win(188, 18, 52, 34, Math.random() < 0.3, '#cfe8ff', '#2c3342');
      x.fillStyle = '#f5b21a'; for (let i = 0; i < 256; i += 32) x.fillRect(i, 250, 16, 6);                 // hazard base stripe
    } else if (style === 'military') {                             // olive drab, slit windows, stencil band
      x.fillStyle = '#6b6f52'; x.fillRect(0, 0, 256, 256);
      x.fillStyle = 'rgba(40,44,30,0.35)'; for (let i = 0; i < 256; i += 64) x.fillRect(0, i, 256, 6);
      for (let col = 0; col < 3; col++) win(col * 84 + 22, 44, 44, 16, Math.random() < 0.25, '#b8ffb0', '#20261e');
      for (let col = 0; col < 3; col++) win(col * 84 + 22, 150, 44, 16, Math.random() < 0.25, '#b8ffb0', '#20261e');
      x.fillStyle = 'rgba(20,22,16,0.55)'; x.fillRect(0, 208, 256, 26);
      x.fillStyle = '#c9c2a0'; x.font = '800 20px monospace'; x.textAlign = 'center'; x.fillText('RESTRICTED', 128, 227);
    } else {                                                       // commercial — the glass grid
      x.fillStyle = '#ddd6c6'; x.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
        const px = col * 64 + 12, py = r * 64 + 10;
        win(px, py, 40, 44, Math.random() < 0.3, '#ffd9a0', Math.random() < 0.5 ? '#2c3342' : '#39414f');
        x.fillStyle = 'rgba(90,80,60,0.35)'; x.fillRect(px - 3, py + 44, 46, 4);
      }
    }
    const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
    return { map: mk(c), glow: mk(g) };
  }
  _radialTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(245,178,26,0.5)'); gr.addColorStop(0.5, 'rgba(245,178,26,0.11)'); gr.addColorStop(1, 'rgba(245,178,26,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    // the emblem ring, baked in (was its own mesh + draw call): world r 30–33 of the 56u glow disc
    x.strokeStyle = 'rgba(245,178,26,0.5)'; x.lineWidth = 7;
    x.beginPath(); x.arc(128, 128, 128 * (31.5 / 56), 0, Math.PI * 2); x.stroke();
    return new THREE.CanvasTexture(c);
  }

  _buildComposer() {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 2 });  // HDR + light MSAA (crisp edges)
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5), 0.66, 0.6, 0.8);      // half-res bloom (~4× cheaper)
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize() {
    const w = innerWidth, h = innerHeight, asp = w / h;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w * 0.5, h * 0.5);
    this.camera.left = -this.frustum * asp; this.camera.right = this.frustum * asp;
    this.camera.top = this.frustum; this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();
    if (this.bloom) this._applyQuality();   // re-derive the pixel cap for the new window size
  }

  setBaseZoom(f) { this._baseFrustum = f; }
  shake(a) { this._shake = Math.min(this._shake + a * (this.shakeMult ?? 1), 8); }
  punch(z) { this.frustumTarget = Math.min(this.frustumTarget, this.frustum * z); } // zoom IN briefly

  follow(target, dt) {
    // target: Vector3 (player world pos). Ease camera focus toward it.
    this.camTarget.x = damp(this.camTarget.x, target.x, 8, dt);
    this.camTarget.y = damp(this.camTarget.y, 6 + target.y * 0.4, 6, dt);
    this.camTarget.z = damp(this.camTarget.z, target.z, 8, dt);

    // zoom easing (punch back to base)
    this._shake *= Math.exp(-7 * dt);
    this.frustumTarget = damp(this.frustumTarget, this._baseFrustum || 78, 3.5, dt);
    this.frustum = damp(this.frustum, this.frustumTarget, 10, dt);
    const asp = innerWidth / innerHeight;
    this.camera.left = -this.frustum * asp; this.camera.right = this.frustum * asp;
    this.camera.top = this.frustum; this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();

    this.shakeV.set((Math.random() * 2 - 1), (Math.random() * 2 - 1), (Math.random() * 2 - 1)).multiplyScalar(this._shake);
    this.camPos.copy(this.camDir).multiplyScalar(this.camDist).add(this.camTarget);
    this.camera.position.copy(this.camPos).add(this.shakeV);
    this.camera.lookAt(this.camTarget.x + this.shakeV.x, this.camTarget.y + this.shakeV.y, this.camTarget.z + this.shakeV.z);
    // drag the sun's tight shadow frustum along with the view (snapped to whole units so texels don't swim)
    const sx = Math.round(this.camTarget.x), sz = Math.round(this.camTarget.z);
    this.sun.position.set(sx + 120, 200, sz + 80);
    this.sun.target.position.set(sx, 0, sz);
  }

  // Screen (client px) -> ground world point (y=0 plane). Reuses one raycaster/plane (called every frame).
  screenToGround(mx, my, out = new THREE.Vector3()) {
    _ndc.set((mx / innerWidth) * 2 - 1, -(my / innerHeight) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    _ray.ray.intersectPlane(_groundPlane, out);
    return out;
  }

  // --- Fog of war: darken the ground outside a vision cone + near radius, with wall shadows ---
  _buildFogOfWar() {
    const MAX = 20;
    const bc = [], bh = [];
    for (let i = 0; i < MAX; i++) { bc.push(new THREE.Vector2()); bh.push(new THREE.Vector2()); }
    let n = 0;
    for (const c of this.cover) { if (n >= MAX) break; bc[n].set(c.x, c.z); bh[n].set((c.hx ?? c.r) + 1, (c.hz ?? c.r) + 1); n++; }
    this.fogMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uPlayer: { value: new THREE.Vector2(0, 0) }, uDir: { value: new THREE.Vector2(0, 1) },
        uP2: { value: new THREE.Vector2(0, 0) }, uHas2: { value: 0 },
        uCos: { value: Math.cos(0.96) }, uRange: { value: 96 }, uNear: { value: 26 }, uDark: { value: 0.74 },   // softened for the White City — unseen streets ghost through instead of blacking out
        uTint: { value: new THREE.Color('#ffd24a') }, uBoxC: { value: bc }, uBoxH: { value: bh }, uBoxN: { value: n },
      },
      vertexShader: `varying vec2 vW; void main(){ vW=(modelMatrix*vec4(position,1.0)).xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vW; uniform vec2 uPlayer; uniform vec2 uDir; uniform vec2 uP2; uniform float uHas2, uCos, uRange, uNear, uDark;
        uniform vec3 uTint; uniform vec2 uBoxC[${MAX}]; uniform vec2 uBoxH[${MAX}]; uniform int uBoxN;
        bool segBox(vec2 p0, vec2 p1, vec2 c, vec2 h){
          vec2 d=p1-p0, mn=c-h, mx=c+h; float tmin=0.0, tmax=1.0;
          for(int a=0;a<2;a++){
            float dd=(a==0)?d.x:d.y, pa=(a==0)?p0.x:p0.y, na=(a==0)?mn.x:mn.y, xa=(a==0)?mx.x:mx.y;
            if(abs(dd)<1e-4){ if(pa<na||pa>xa) return false; }
            else { float t1=(na-pa)/dd, t2=(xa-pa)/dd; if(t1>t2){float t=t1;t1=t2;t2=t;} tmin=max(tmin,t1); tmax=min(tmax,t2); if(tmin>tmax) return false; }
          }
          return tmin>0.03 && tmin<0.985;
        }
        void main(){
          vec2 d = vW - uPlayer; float dist = length(d); vec2 nd = d/max(dist,0.001);
          float near = 1.0 - smoothstep(uNear*0.72, uNear, dist);
          float cone = smoothstep(uCos-0.10, uCos+0.03, dot(nd,uDir)) * (1.0 - smoothstep(uRange*0.72, uRange, dist));
          // walls cast vision shadows over the cone (not the near bubble)
          if(cone > 0.01){ for(int i=0;i<${MAX};i++){ if(i>=uBoxN) break; if(segBox(uPlayer, vW, uBoxC[i], uBoxH[i])){ cone=0.0; break; } } }
          float near2 = uHas2 * (1.0 - smoothstep(uNear * 0.72, uNear, length(vW - uP2)));   // 2nd player reveal bubble
          float vis = clamp(max(max(near, cone), near2), 0.0, 1.0);
          // faint warm rim right at the vision edge
          float rim = smoothstep(0.15,0.5,vis)*(1.0-smoothstep(0.5,0.85,vis));
          vec3 col = mix(vec3(0.015,0.02,0.035), uTint*0.6, rim*0.25);
          gl_FragColor = vec4(col, (1.0 - vis) * uDark);
        }`,
    });
    const g = new THREE.PlaneGeometry(ARENA * 2 + 40, ARENA * 2 + 40);
    this.fog = new THREE.Mesh(g, this.fogMat);
    this.fog.rotation.x = -Math.PI / 2; this.fog.position.y = 0.4; this.fog.renderOrder = 2;
    this.scene.add(this.fog);
  }

  updateFog(px, pz, dx, dz, tint, p2) {
    if (!this.fogMat) return;
    const u = this.fogMat.uniforms;
    u.uPlayer.value.set(px, pz); u.uDir.value.set(dx, dz);
    if (tint) u.uTint.value.set(tint);
    if (p2) { u.uP2.value.set(p2.x, p2.z); u.uHas2.value = 1; } else u.uHas2.value = 0;
  }
  setFogEnabled(on) { if (this.fog) this.fog.visible = on; }
  refreshFogBoxes() {
    if (!this.fogMat) return;
    const u = this.fogMat.uniforms, bc = u.uBoxC.value, bh = u.uBoxH.value; let n = 0;
    for (const c of this.cover) { if (n >= bc.length) break; bc[n].set(c.x, c.z); bh[n].set((c.hx ?? c.r) + 1, (c.hz ?? c.r) + 1); n++; }
    u.uBoxN.value = n;
  }

  // --- destructible terrain (GeoMod-lite): crater the ground ---
  crater(cx, cz, radius, depth) {
    if (!this.groundGeo) return;
    const pa = this.groundGeo.attributes.position.array, r132 = (radius * 1.3) * (radius * 1.3);
    let touched = false;
    for (let i = 0; i < this._gh.length; i++) {
      const dx = this._gvx[i] - cx, dz = this._gvz[i] - cz, d2 = dx * dx + dz * dz;
      if (d2 > r132) continue;
      const d = Math.sqrt(d2); let dh;
      if (d < radius) { const t = d / radius; dh = -depth * Math.pow(1 - t * t, 1.5); }   // bowl
      else { const t = (d - radius) / (radius * 0.3); dh = depth * 0.22 * Math.max(0, 1 - t); } // raised rim
      this._gh[i] = clamp(this._gh[i] + dh, -6.5, 1.4);                                        // accumulate, clamped (the limit)
      pa[i * 3 + 2] = this._gh[i]; touched = true;
    }
    // normals recompute is ~12ms on the 112×112 grid — BATCH it: chained explosions (car
    // rows, meteor storms) mark dirty and the render loop recomputes ONCE per frame
    if (touched) { this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true; }
    this.flattenGrass(cx, cz, radius * 1.2);
  }

  setBlockCracks(c) {
    if (!c.crack) return;
    const dmg = 1 - Math.max(0, c.hp) / c.maxHp;
    c.crack.visible = dmg > 0.001;
    c.crack.material.opacity = Math.min(0.92, dmg * 1.15);
    const s = 1 - dmg * 0.05; c.mesh.scale.set(s, 1 - dmg * 0.12, s); c.crack.scale.set(s, 1 - dmg * 0.12, s);
  }
  removeBlockFromCover(c) {
    const i = this.cover.indexOf(c); if (i >= 0) this.cover.splice(i, 1);
    this.refreshFogBoxes();
  }

  // Restore all cover + flatten the ground (called on match start).
  resetTerrain() {
    for (const car of this.cars || []) {
      car.hp = car.maxHp; car.dead = false;
      car.mesh.material = car.paint; car.mesh.visible = true; car.mesh.position.y = 0;
    }
    for (const c of this.coverAll) {
      c.hp = c.maxHp; c.destroyed = false;
      c.mesh.visible = true; c.mesh.position.set(c.x, c.y0, c.z); c.mesh.scale.set(1, 1, 1);
      if (c.crack) { c.crack.visible = false; c.crack.material.opacity = 0; c.crack.position.copy(c.mesh.position); c.crack.scale.set(1, 1, 1); }
    }
    this.cover = this.coverAll.slice();
    this.refreshFogBoxes();
    this._restoreGrass();
    if (this.groundGeo) {
      const pa = this.groundGeo.attributes.position.array;
      for (let i = 0; i < this._gh.length; i++) { this._gh[i] = 0; pa[i * 3 + 2] = 0; }
      this.groundGeo.attributes.position.needsUpdate = true; this.groundGeo.computeVertexNormals();
    }
  }

  _crackTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.strokeStyle = 'rgba(214,222,236,0.92)'; x.lineCap = 'round';
    const rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(99991);
    const branch = (x0, y0, ang, len, w) => {
      if (len < 6 || w < 0.4) return;
      x.lineWidth = w; const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      const mx = (x0 + x1) / 2 + Math.cos(ang + 1.5) * len * 0.18, my = (y0 + y1) / 2 + Math.sin(ang + 1.5) * len * 0.18;
      x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(mx, my, x1, y1); x.stroke();
      branch(x1, y1, ang + (rnd() - 0.5) * 0.9, len * 0.7, w * 0.7);
      if (rnd() < 0.6) branch(x1, y1, ang + (rnd() - 0.5) * 1.7, len * 0.55, w * 0.6);
    };
    for (let i = 0; i < 7; i++) branch(128, 128, i / 7 * 6.283 + rnd(), 55 + rnd() * 45, 3);
    return new THREE.CanvasTexture(c);
  }

  // World point -> client (CSS) pixel position, for cursor-space targeting/HUD.
  screenPosOf(x, y, z, out = { x: 0, y: 0, behind: false }) {
    _proj.set(x, y, z).project(this.camera);
    out.x = (_proj.x * 0.5 + 0.5) * innerWidth;
    out.y = (-_proj.y * 0.5 + 0.5) * innerHeight;
    out.behind = _proj.z > 1;
    return out;
  }

  render() {
    const now = performance.now();
    if (this._normalsDirty) { this._normalsDirty = false; this.groundGeo.computeVertexNormals(); }   // one recompute per frame, no matter how many craters landed
    if (this._grassTime) this._grassTime.value = now / 1000;   // wind
    if (this._waterT) this._waterT.value = now / 1000;         // harbor swell
    if (this._lastRender) {
      const d = Math.min(now - this._lastRender, 100);
      this._ema = this._ema * 0.9 + d * 0.1;
      this.updateDayNight(d / 1000);                            // the sun keeps its own schedule
    }
    this._lastRender = now;
    this.composer.render();
    this._qCool -= 0.016;
    if (this._qCool <= 0 && this.qualityOverride == null) {   // settings can lock the tier
      if (this._ema > 24 && this._qTier > 0) { this._qTier--; this._applyQuality(); this._qCool = 1.4; }
      else if (this._ema < 17.2 && this._qTier < 2) { this._qTier++; this._applyQuality(); this._qCool = 4; }   // 13.5 was unreachable under 60Hz vsync — tiers only ever ratcheted DOWN
    }
  }
  // clamp total shaded pixels (~2.6MP): a 4K dpr-2 fullscreen was 10-30× the pixel load
  // of a small pane — the #1 "fast in the pane, slow in my browser" multiplier
  _pixelCap(pr) {
    const cap = Math.sqrt(2.6e6 / Math.max(1, innerWidth * innerHeight));
    return Math.min(pr, Math.max(0.55, cap));
  }
  _applyQuality() {
    const t = this._qTier;
    const pr = this._pixelCap(t === 2 ? this._maxPR : t === 1 ? Math.min(this._maxPR, 1) : 0.72);
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);   // THE tier bug: EffectComposer caches its construction-time
    this.composer.setSize(innerWidth, innerHeight);   // ratio — tiers never actually shrank the scene pass
    this.bloom.setSize(innerWidth * 0.5, innerHeight * 0.5);
    this.bloom.strength = t === 2 ? 0.66 : t === 1 ? 0.55 : 0.42;
    this.bloom.enabled = t > 0;                       // potato tier: drop the whole bloom chain
    if (this.sun) this.sun.castShadow = t > 0;        // ...and the shadow pass
  }
  get fps() { return this._ema ? Math.round(1000 / this._ema) : 60; }

  // Compile the material variants that transient FX create lazily (beams, orbs, lightning, sprites)
  // so their first use mid-fight doesn't hitch on shader compilation.
  prewarm() {
    const g = new THREE.Group(); g.position.set(0, -400, 0);
    const geo = new THREE.SphereGeometry(1, 8, 6);
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial()));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })));
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2, emissive: '#111' })));
    const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    g.add(new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    g.add(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false })));
    this.scene.add(g);
    this.renderer.compile(this.scene, this.camera);
    this.scene.remove(g);
    geo.dispose(); lgeo.dispose(); g.traverse(o => { if (o.material) o.material.dispose(); });
  }
}

const _proj = new THREE.Vector3();
const _gm4 = new THREE.Matrix4();
const _ndc = new THREE.Vector2();
const _ray = new THREE.Raycaster();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
