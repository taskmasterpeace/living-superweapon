// WAR WORLD: ASCENDANTS — 3D world: renderer, scene, iso camera, lights, arena, bloom.
import { FogMixin } from './fog.js';
import {flightTurbulence} from './flight-sense.js';
import { RoadMixin } from './roads.js';
import { Wildlife } from './wildlife.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { PrintPass } from './printpass.js';
import { goldenHour, GOLDEN } from '../data/weather.js';
import {daylightPreset} from '../data/daylight.js';
const _C1 = new THREE.Color(), _C2 = new THREE.Color(), _C3 = new THREE.Color();
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, damp, lerp, smoothstep, dampStiff, angleDiff, setBands, DECAL_LIFT, PW_AIR, PW_FX } from '../core/util.js';
import { reachOf } from '../data/martial.js';
import { CAMERA_DEFAULTS } from '../data/flight-tuning.js';
import {cameraProfileOf} from '../data/camera-presets.js';
import {getCameraPreferences} from '../core/camera-settings.js';
import {createFreeLook,advanceFreeLook,clearFreeLook,FREE_LOOK_DEFAULTS} from '../core/free-look.js';
import {resolveGroundCamera,traceCameraGround} from './camera-ground.js';
import {frameFreeLook} from './free-look-framing.js';
import {firearmSightZoom} from './firearm-aim.js';
import {terrainEntry} from './projectile-contact.js';
import {updateForegroundVisibility,clearForegroundVisibility} from './foreground-visibility.js';
const BFP_PITCH_MAX = Math.PI * .497; // Shared mouse/lock limit; leave a stable horizon at the poles.
import { skyFor, worldOf } from '../data/environments.js';
import { buildTiles , scaleBoxUV, resetDecalLadder, redrapeDecals } from './citytiles.js';
import { CELL, districtNameAt, districtTypeAt, thresholdPlan, ROAD, junctionAt, WATER_DEPTHS, roadClear, surveyCity, surveyAt } from '../data/cityplan.js';
import { mulberry } from '../data/news.js';

// FOG OCCLUSION GRID — the replacement for the old 24-box uniform array. 256² texels over the
// 700u fog plane is ~2.7u a texel: finer than any wall is thin, and the march is 26 taps whether
// the city has 20 buildings or 200. FOG_STEPS is baked into the shader source, so it must be a
// literal the GLSL compiler can see.
// FOG_RES / FOG_EXT / FOG_STEPS moved to engine/fog.js with the code that uses them.

export const ARENA = 240; // half-extent of the FLAGSHIP playfield (generated cities set world.ARENA per plan)

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
    this._pixelBudget = 2.6e6;      // total shaded pixels; the device ladder narrows it (see _pixelCap)
    this._refreshMs = 16.7;         // the display's OWN cadence, learned — see the governor

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
    // ⚠ `this.camera` IS A POINTER TO THE ACTIVE CAMERA, and that is the whole architecture of the
    // POWERWORLD chase view. Eight places read `world.camera` (projection, the composer's RenderPass,
    // the print pass's uniforms, screenToGround, the occlusion corridor…) and every one of them stays
    // correct with no edit as long as the pointer is what moves. The alternative — teaching each
    // reader which camera to use — is eight chances to miss one.
    this.camOrtho = new THREE.OrthographicCamera(
      -this.frustum * asp, this.frustum * asp, this.frustum, -this.frustum, 1, 1400
    );
    this.camChase = null;                 // built on first use — a city session never pays for it
    this.camera = this.camOrtho;
    this.camMode = 'iso';
    this._shake = 0; this.shakeV = new THREE.Vector3();
    this._shakeT = 0; this._shakeAxTh = 0;   // aaa-06 §4: chase-view angular ring-down clock + per-event axis angle
    // THE UNCLAIMED CAMERA AXIS (aaa-04 §5.6) — the direction the camera is TRYING to look along,
    // published by chase() after the degenerate blend and BEFORE any frame claim. game.cameraDrive
    // reads it for the move/aim basis (RIDER), so a camera flourish can never invert the controls.
    this.camBasis = new THREE.Vector3(0, 0, 1);
    // POINTER-LOCK MOUSE-LOOK state (aaa-01 §2.3). Yaw is UNBOUNDED; pitch clamped to ±asin(camPitch)
    // = ±80°. Fed per frame by world.mouseLook(dx,dy) (called from the chase-mode branch of
    // game.cameraDrive — RIDER); consumed by chase() as the view axis when there is no lock target.
    this._lookYaw = 0; this._lookPitch = 0; this._lookActive = false;
    this._lookSens = 0.0024;   // rad per locked-pointer pixel
    this._freeLook=createFreeLook();

    this._buildLights();
    this._buildSky();
    this._cityBits = [];                 // meshes outside the arena group (trees, lawns) — tracked for city rebuilds
    this.doors = [];                     // every building entrance the tiles registered — the interior system's way in
    this._spinners = [];                 // things that TURN (the Ferris wheel) — ticked in render()
    this.interiors = [];                 // enterable buildings: wall AABBs physics/sight/fog consult spatially
    this._crackTex = this._crackTexture();
    this.plan = thresholdPlan();         // the flagship WHITE CITY ships as the boot theater
    this._buildArena();
    this._buildGrass();
    this._buildFogOfWar();
    this._buildComposer();
    // THE LIVING STREET — birds and blown litter. Allocated ONCE here and only ever re-seeded, so
    // a city rebuild costs nothing. Ticked in render(), which is why the ATLAS tool (a World with
    // no Game) gets a sky full of birds without any wiring of its own.
    this.wildlife = new Wildlife(this.scene);
    this.wildlife.setCity(this.ARENA, this.cover, this);

    addEventListener('resize', () => this.resize());
    this.resize();
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight('#bcd4ff', '#43352a', 1.28);
    this.scene.add(hemi); this.hemi = hemi;
    this.amb = new THREE.AmbientLight('#6a7890', 0.5);
    this.scene.add(this.amb);
    const sun = new THREE.DirectionalLight('#fff2dc', 1.8);
    // ⚠ THE SUN'S DIRECTION IS THIS OFFSET, AND IT IS THE ONLY COPY. `sun.position` is rewritten every
    // frame as `camTarget + offset` to drag the tight shadow frustum along with the view, so writing a
    // position is writing to something that is overwritten before it is ever rendered — a venue that
    // wants different light has to change the OFFSET. It was the literal `(120, 200, 80)` at THREE call
    // sites, which is both a duplicated magic number and the reason PowerWorld could not aim it.
    this.sunOff = new THREE.Vector3(120, 200, 80);   // 54° elevation — right for an isometric city
    sun.position.copy(this.sunOff);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);   // 55% of 2048²'s pixels — visually identical at iso zoom
    // tight frustum that FOLLOWS the camera target (see follow()) — the visible area is ~160 units,
    // so a 110-unit half-extent doubles effective shadow texel density vs. covering the whole arena
    const d = 110;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 40; sun.shadow.camera.far = 520;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = .035;
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
        // ⚠ "FROM BLUE TO SPACE" IS ONE DERIVED NUMBER — AIR RUNS OUT (manual §43, learned on the
        // Earth globe). It is not a colour grade applied to a climb: the sky is thin because there is
        // less of it above you, so ONE fraction darkens the gradient, kills the scattering glow and
        // brings the stars out together. Driven by altitude — see `setSpace`.
        uSpace: { value: 0 },
      },
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 uTop, uHor, uGlow; uniform float uSpace;
      // ⚠ STARS ARE A HASH, NOT GEOMETRY. A background needs no vertices, and a point cloud on the
      // dome would have to be scaled, hidden, faded and disposed by every venue that touches the sky.
      // ⚠ AND HIERARCHY IS THE WHOLE TELL (manual §35): a uniform scatter of identical dots is the one
      // distribution that never occurs in nature, so the cell's own hash sets each star's brightness.
      float starAt(vec3 n, float density, float thresh){
        vec3 p = n * density; vec3 c = floor(p); vec3 f = fract(p) - 0.5;
        float h = fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        return step(thresh, h) * smoothstep(0.17, 0.0, length(f)) * (0.35 + h * 0.65);
      }
      void main(){
        vec3 n = normalize(vP); float h = n.y*0.5+0.5;
        vec3 c = mix(uHor, uTop, smoothstep(0.30,0.9,h));
        c += uGlow * pow(max(0.0, dot(n, normalize(vec3(0.7,0.12,0.7)))), 5.0);   // sun-side horizon glow
        if (uSpace > 0.001) {
          c *= 1.0 - uSpace * 0.95;                                  // the air, thinning out
          float s = starAt(n, 190.0, 0.9972) + starAt(n, 78.0, 0.9948) * 1.5;   // faint field + bright few
          c += vec3(s) * uSpace;
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), mat);
    sky.renderOrder = -1; this.scene.add(sky);
    // ⚠ KEEP THE HANDLE, NOT JUST THE MATERIAL. Only `skyMat` was stored, so nothing could exempt the
    // dome from a venue's "hide every child" pass — and PowerWorld hid it along with the city, which
    // is why another dimension rendered as a BLACK VOID with a carefully skinned sky nobody could see.
    // The radius also matters to a venue: 900 is generous inside a 240u city and exactly the play
    // radius in PowerWorld, so a fighter at the far edge and at altitude is OUTSIDE their own sky.
    sky.name = 'sky'; this.skyMesh = sky;
    this.skyMat = mat;
    // ---- day/night state (ruled: a 2-minute match ≈ 12 in-game hours → 240s full day) ----
    this.dayT = 0.3;                       // start late morning
    this.dayFixed = null;                  // a world that does not turn pins its own light (see updateDayNight)
    this._dnc = {                          // preallocated palette — alloc-free per-frame lerps
      work: new THREE.Color(), work2: new THREE.Color(),
      sunDay: new THREE.Color('#fff2dc'), sunGold: new THREE.Color('#ffbe72'), sunNight: new THREE.Color('#8fa5d8'),
      hemiDay: new THREE.Color('#cfe0ff'), hemiNight: new THREE.Color('#8fa8d8'),
      gndDay: new THREE.Color('#6a5f4c'), gndNight: new THREE.Color('#3a3428'),
      topDay: new THREE.Color(0.15, 0.23, 0.42), topNight: new THREE.Color(0.03, 0.04, 0.075),
      horDay: new THREE.Color(0.50, 0.44, 0.34), horNight: new THREE.Color(0.075, 0.07, 0.10),
      glowTint: new THREE.Color(1.0, 0.45, 0.12),
    };
    // ⚠ CLONE THE COLOURS, don't spread the object. `{...this._dnc}` copies REFERENCES to the same
    // THREE.Color instances, so mutating the live palette mutated the "saved" one too — the backup
    // was the same object. Flying Earth → Pluto → Earth came home to Pluto's sky.
    this._dncEarth = {};
    for (const k in this._dnc) {
      const v = this._dnc[k];
      this._dncEarth[k] = (v && v.isColor) ? v.clone() : v;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // THE SKY IS A FACT ABOUT AN ATMOSPHERE (data/environments.js). Air is what makes a sky, so the
  // dome over a match is decided by WHERE the match is, not by a texture choice:
  //   · MARS has a butterscotch day and a BLUE sunset — the exact inverse of Earth, for the exact
  //     same reason (fine dust scatters red forward where our air scatters blue).
  //   · THE MOON has no sky at all. Black at noon, with the sun up and the stars still out.
  //   · TITAN is a dim orange ceiling you cannot see through.
  //   · At PLUTO the sun is a fiftieth of a degree wide — a very bright star with no disc — and
  //     noon is about as bright as our dusk, so the whole world is lit at 2% strength.
  // ⚠ The LIGHT drops with the square of the sun's apparent size, which is the part that makes an
  // outer-system match actually feel like one: it is not a colour grade, it is less light.
  /**
   * World point → screen UV (0..1, y measured from the BOTTOM like a texture, because that is what
   * the shader wants). Used by the speed lines so the streaks radiate from where the blow actually
   * landed rather than from the middle of the frame.
   * ⚠ `project` needs an up-to-date camera matrix; the render loop has already updated it by the
   * time onHit fires, but a posed/manual call must updateMatrixWorld first.
   */
  toScreen(p, out) {
    const v = (this._tsV || (this._tsV = new THREE.Vector3())).set(p.x, p.y || 0, p.z);
    v.project(this.camera);
    const o = out || { x: 0, y: 0 };
    o.x = v.x * 0.5 + 0.5;
    o.y = v.y * 0.5 + 0.5;
    return o;
  }

  /**
   * The world's own grade. ⚠ DERIVED from the sky the planet already declares, never a per-planet
   * LUT asset — two vec3s of arithmetic do the job of a 3D texture lookup, cost less, and cannot
   * drift from the atmosphere the player is standing in.
   */
  applyWorldGrade(tint) {
    if (this.print) this.print.setWorldGrade(tint || (this._dnc && this._dnc.sky) || '#ffffff',
      this.print.settings.grade);
  }

  setSkyWorld(id) {
    const sky = id && id !== 'earth' ? skyFor(id) : null;
    const env = id ? worldOf(id) : null;
    this.skyWorld = sky ? id : null;
    const P = this._dnc, E = this._dncEarth;
    if (!sky) {                                   // home: put every colour back exactly as found
      for (const k of ['topDay', 'topNight', 'horDay', 'horNight', 'glowTint', 'sunDay', 'sunGold', 'hemiDay', 'hemiNight'])
        if (P[k] && E[k]) P[k].copy(E[k]);
      this.skyLightMult = 1; this.skyStarsByDay = false;
      return null;
    }
    P.topDay.set(sky.day);
    P.topNight.set(sky.night);
    P.horDay.set(sky.horizon);
    P.horNight.set(sky.night);
    P.glowTint.set(sky.sunset);                   // the sunset colour IS the low-sun glow
    P.sunGold.set(sky.sunset);
    P.sunDay.set(sky.airless ? '#ffffff' : sky.day);
    P.hemiDay.set(sky.horizon);
    P.hemiNight.set(sky.night);
    this.skyLightMult = sky.lightMult;
    this.skyStarsByDay = !!sky.starsByDay;
    this.skyEnv = env;
    return sky;
  }

  // Advance the day and push it into the lights, sky, and building windows. dl: 1 = noon,
  // 0 = midnight; night NEVER drops below the original arena look (Robert's rule: keep it bright).
  /**
   * How much of the sky has run out — 0 is sea level, 1 is space. Nothing calls this on Earth, where
   * the atmosphere is a LID and leaving it is a ceremony (manual §17); it is for a world with no
   * ceiling, where the only thing between you and space is how long you hold the climb.
   * ⚠ It sets a uniform and nothing else. It must never touch the light rig, the fog or the exposure:
   * a fighter has to look the same at 1,400u as at 14, or the roster reads as a different palette in
   * the third act of every fight.
   */
  setSpace(v) {
    const s = Math.max(0, Math.min(1, v || 0));
    if (this.skyMat) this.skyMat.uniforms.uSpace.value = s;
    this.spaceFrac = s;
  }

  updateDayNight(dts) {
    // ⚠ A DIMENSION IS NOT A ROTATING PLANET. `dayT` is a fact about a world turning under its star,
    // and a full cycle here is 240s — so in a place that has no star the sky walked from noon to
    // midnight inside one four-minute fight. `dayFixed` pins it. This is not "stopping the clock" as a
    // dodge: a locked sky is the honest model for somewhere that does not orbit anything.
    if (this.dayFixed != null) this.dayT = this.dayFixed;
    else this.dayT = (this.dayT + dts / 240) % 1;
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
    // The flight arena needs a directional key, not uniform sky/ambient wash.
    // Apply within the owning daylight update so the next render cannot undo it.
    if(this.skyWorld==='powerworld'){
      const preset=daylightPreset(this.powerworldDaylight);
      if(this.sun)this.sun.intensity=preset.sun;
      if(this.hemi)this.hemi.intensity=preset.hemi;
      // Reset before golden-hour blending; otherwise each frame adds more warmth.
      if(this.amb){this.amb.intensity=preset.ambient;this.amb.color.set('#6a7890');}
      if(this.rim){this.rim.intensity=preset.rim;this.rim.color.set('#8fb8ff');}
    }
    const u = this.skyMat.uniforms;
    // ⚠ AN OUTER-SYSTEM NOON IS GENUINELY DARK. Sunlight falls off as the square of distance, so
    // this is the difference between a colour grade and a place: at Saturn the sun delivers 1% of
    // what it does here. Floored so a match never becomes unplayable — honest, not punishing.
    const lm = this.skyLightMult == null ? 1 : Math.max(0.34, this.skyLightMult);
    if (this.sun) this.sun.intensity = (this.skyWorld==='powerworld' ? this.sun.intensity : (this._sunI0 ??= this.sun.intensity)) * lm;
    u.uTop.value.lerpColors(P.topNight, P.topDay, dl);
    u.uHor.value.lerpColors(P.horNight, P.horDay, dl);
    u.uGlow.value.copy(P.glowTint).multiplyScalar(0.06 + gold * 0.22);
    if (this._winMats) { const e = 0.08 + (1 - dl) * 0.5; for (const m of this._winMats) m.emissiveIntensity = e; }
    if (this._lampMat) this._lampMat.emissiveIntensity = 0.12 + (1 - dl) * 1.6;            // streetlights wake at dusk
    if (this._billMats) for (const m of this._billMats) m.emissiveIntensity = 0.22 + (1 - dl) * 0.85;

    // ---- GOLDEN HOUR ------------------------------------------------------------------------
    // ⚠ IT IS A FACT ABOUT THE SUN'S ELEVATION, NOT A CLOCK READING. The old `gold` bell above
    // peaks at dl = 0.5, which is HALFWAY UP — a bright mid-morning. Real golden hour is when the
    // sun is LOW and still above the horizon, so the light travels through far more atmosphere:
    // the bell belongs at dl ≈ 0.30. Deriving it from elevation also means it falls out correctly
    // at a high latitude in winter, where the sun never climbs and the light stays gold for hours.
    const G = goldenHour(this.dayT);
    this.golden = G.k;
    if (G.k > 0.01) {
      // ⚠ A SUNRISE IS NOT A SUNSET. Morning air is cool and clean; evening air has had all day to
      // collect dust, so it goes deeper and oranger. Same event, two colours — and neither drifts
      // toward magenta, because the no-purple law reaches the sky as well.
      const warm = _C1.set(G.rising ? GOLDEN.sunRise : GOLDEN.sunSet);
      const skyW = _C2.set(G.rising ? GOLDEN.skyRise : GOLDEN.skySet);
      if (this.sun) {
        this.sun.color.lerp(warm, G.k * 0.75);
        this.sun.intensity *= 1 - G.k * 0.22;                 // low sun is DIMMER as well as warmer
      }
      if (this.amb) this.amb.color.lerp(_C3.set(GOLDEN.ambient), G.k * 0.45);
      // the horizon takes most of it — that is where the long light actually is
      u.uHor.value.lerp(skyW, G.k * 0.62);
      u.uTop.value.lerp(skyW, G.k * 0.16);
      u.uGlow.value.lerp(warm, G.k * 0.7).multiplyScalar(1 + G.k * 1.5);
      // ⚠ and the RIM light swings warm too, or fighters keep a cold edge in a warm world and read
      // as cut out of a different picture — the exact thing the rim exists to prevent.
      if (this.rim) this.rim.color.lerp(warm, G.k * 0.4);
    }
    if(this.skyWorld==='powerworld'){
      const preset=daylightPreset(this.powerworldDaylight);
      // Avoid a lavender midpoint when the cool daytime HDR meets golden hour.
      if(preset.skyTop)u.uTop.value.set(preset.skyTop);
      if(preset.skyHorizon)u.uHor.value.set(preset.skyHorizon);
      const cloud=Math.max(0,Math.min(1,this.weatherCloud||0));
      const overcast=Math.max(0,(cloud-.05)/.95);
      if(this.sun)this.sun.intensity*=1-overcast*.55;
      if(this.hemi)this.hemi.intensity*=1-overcast*.12;
      const skyCloud=this.skyMesh?.material.uniforms?.uWeatherCloud;
      if(skyCloud)skyCloud.value=cloud;
      const cloudTime=this.skyMesh?.material.uniforms?.uCloudTime;
      if(cloudTime)cloudTime.value=this.weatherTime||0;
      const flash=Math.max(0,Math.min(1,this.weatherFlash||0));
      const skyFlash=this.skyMesh?.material.uniforms?.uWeatherFlash;
      if(skyFlash)skyFlash.value=flash;
      if(this.hemi)this.hemi.intensity+=flash*1.4;
      if(this.rim)this.rim.intensity+=flash*1.8;
    }
    // ⚠ stash what the CLOCK decided before weather scales it — the weather multiplies these every
    // frame, so without a clean baseline it would compound and the world would go black.
    this._dnSunI = this.sun ? this.sun.intensity : null;
    this._dnHemiI = this.hemi ? this.hemi.intensity : null;
    if (this.scene && this.scene.fog && this._dnFog == null) this._dnFog = this.scene.fog.density;
    if (this._indoor) this._applyIndoor();
  }

  /**
   * INDOORS — a venue with a roof on it (the boxing hall, engine/boxingring.js).
   *
   * ⚠ IT MULTIPLIES THE CLOCK, IT DOES NOT REPLACE IT. `updateDayNight` still owns the sun and runs
   * its whole schedule — the day keeps turning outside, so a card that starts at dusk still ends at
   * night and the crowd noise and the news bug still agree with it. This scales what the clock just
   * decided, at the END of that pass, off the baseline it stashes one line above. Writing the sun
   * from outside instead means fighting the clock for the same property every frame, and multiplying
   * the LIVE value rather than the baseline compounds — the world goes black in about two seconds.
   * That is precisely the trap the `_dn*` stash was put there to prevent, and until now **nothing in
   * the repo read it**: the weather's light dimming was described in a comment and never wired.
   *
   * ⚠ IT NEVER TOUCHES THE LIGHT COUNT. Intensity is free; adding, removing or hiding a light rebakes
   * every material in the scene (the light-count law, and a measured 400ms freeze). An indoor room
   * turns down what is already there and borrows from `vfx`'s fixed pool for anything new.
   */
  setIndoor(mult) {
    if (!mult) {
      this._indoor = null;
      // the sun/hemi/amb/rim and every sky uniform are rewritten from scratch by the next
      // updateDayNight pass, so they need no restoring. Fog is only ever STASHED there, never
      // written — so it is the one thing that must be put back by hand.
      if (this.scene && this.scene.fog && this._dnFog != null) this.scene.fog.density = this._dnFog;
      return;
    }
    this._indoor = mult;
    this._applyIndoor();
  }

  _applyIndoor() {
    const M = this._indoor;
    if (this.sun) this.sun.intensity *= M.sun ?? 1;
    if (this.hemi) this.hemi.intensity *= M.hemi ?? 1;
    if (this.amb) this.amb.intensity *= M.amb ?? 1;
    if (this.rim) this.rim.intensity *= M.rim ?? 1;
    // ⚠ THE SKY HAS TO GO WITH THEM. Dimming the lights under a bright dome gives you dark fighters
    // standing in daylight — the roof is the whole point of being indoors, and on this camera the
    // sky is most of the upper frame.
    if (this.skyMat && M.sky != null) {
      const u = this.skyMat.uniforms;
      u.uTop.value.multiplyScalar(M.sky); u.uHor.value.multiplyScalar(M.sky); u.uGlow.value.multiplyScalar(M.sky);
    }
    if (this.scene && this.scene.fog && M.fog != null && this._dnFog != null) this.scene.fog.density = this._dnFog * M.fog;
  }

  _buildArena() {
    setBands(this.plan && this.plan.bands);   // the flagship boot path never goes through rebuildCity
    const g = new THREE.Group();
    // ground: the White City — bone plaza + street grid (texture carries the whites; the
    // multiply color keeps it from blowing out under ACES at noon)
    const tex = this._groundTex || (this._groundTex = this._gridTexture());
    tex.repeat.set(5, 5);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.0, color: '#b9b1a2' });
    const SEG = 112;
    const groundGeo = new THREE.PlaneGeometry(ARENA * 2, ARENA * 2, SEG, SEG);
    const ground = new THREE.Mesh(groundGeo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);
    this.ground = ground; this.groundGeo = groundGeo;
    // per-vertex world XZ + accumulated height (for GeoMod-style craters); local +z maps to world +y
    const pa = groundGeo.attributes.position.array; const nV = pa.length / 3;
    this._gvx = new Float32Array(nV); this._gvz = new Float32Array(nV); this._gh = new Float32Array(nV); this._gseg = SEG; this._ghArena = this.ARENA;
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
    // ⚠ `bay` = the world HEIGHT OF ONE TEXTURE TILE, and every facade texture draws a GRID of
    // windows, so it is 17 units per window ROW — not 17 per tile. Getting this wrong squeezed
    // four storeys into seventeen units and made every building in the game read as a toy.
    const mkWin = (tex, tint, emissive = '#ffca7a', bay = 68) => {
      const m = new THREE.MeshStandardMaterial({
        map: tex.map, emissiveMap: tex.glow, emissive, emissiveIntensity: 0.1,
        color: tint, roughness: 0.82, metalness: 0.05,
      });
      m.userData.bay = bay;
      return m;
    };
    const texC = this._windowTexture('commercial');
    this._winMats = [
      mkWin(texC, '#e6e0d2', undefined, 68), mkWin(texC, '#d6cfbd', undefined, 68),   // commercial — 4 rows
      mkWin(this._windowTexture('residential'), '#e2cfae', undefined, 51),            // residential — 3 rows
      mkWin(this._windowTexture('industrial'), '#b8bcc0', '#cfe8ff', 30),             // industrial — one warehouse bay
      mkWin(this._windowTexture('military'), '#8f9472', '#b8ffb0', 34),               // military — 2 rows of slits
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
    // one window ROW ≈ 17 units — a REAL ~3.2m floor next to the 9.6u (1.8m) heroes. `bay` is the
    // height of the whole texture TILE, which draws several rows (see the note on mkWin above).
    // ONE scaleBoxUV now — imported from citytiles (the review flagged the hand-synced twin)
    // FOUR NAMED DISTRICTS at city scale (96u block cells; total cover ≤20 = fog cap).
    // style: 0/1 = COMMERCIAL glass · 2 = RESIDENTIAL warm stone · 3 = INDUSTRIAL steel ·
    // 4 = MILITARY olive · 5 = the BRIDGE deck (standable — block-top physics is free)
    // heights at TRUE HERO SCALE (1u ≈ 0.19m; one floor ≈ 17u): downtown = 4-8 story towers,
    // residential = 1-2 story homes, industrial = tall sheds, military = low bunkers
    const spots = [
      // COMMERCIAL — the downtown skyline, NW + north
      [-192, -192, 48, 132, 40, 0], [-96, -192, 40, 114, 40, 1], [-192, -96, 40, 102, 40, 1], [-96, -96, 36, 84, 36, 0],
      [0, -192, 56, 66, 40, 1], [96, -192, 44, 78, 36, 0], [96, -96, 40, 60, 36, 1], [0, -96, 44, 54, 36, 0],
      // RESIDENTIAL — warm low homes, south
      [-96, 96, 44, 22, 36, 2], [0, 96, 50, 18, 40, 2], [96, 96, 40, 25, 34, 2], [0, 192, 54, 22, 38, 2],
      // INDUSTRIAL — dockside warehouses against the harbor
      [169, -96, 28, 20, 50, 3], [169, 40, 28, 24, 44, 3],
      // MILITARY — the SW compound: two bunkers + a watchtower
      [-192, 192, 40, 14, 34, 4], [-96, 192, 34, 12, 28, 4], [-146, 168, 8, 38, 8, 4],
      // THE BRIDGE — a deck across the harbor at z=0 (top y=3: dry feet over deep water)
      [195, 0, 80, 3, 16, 5],
      // west park cells (-192,0) and (-192,96) stay OPEN — the park belt
    ];
    const crackTex = this._crackTex;
    for (const [x, z, w, h, d, style = 0] of spots) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const isBridge = style === 5;
      const win = isBridge ? bridgeMat : this._winMats[Math.min(style, 4)];
      if (!isBridge) scaleBoxUV(geo, w, h, d, win.userData.bay || 68);
      // ONE material per box (1 draw + 1 shadow draw — material arrays would 6× that);
      // the roof is a child slab that inherits the shatter-sink transform and casts nothing.
      // Only TALL buildings cast shadows — every caster is another pass over the shadow map.
      const m = new THREE.Mesh(geo, win);
      m.position.set(x, h / 2, z); m.castShadow = h >= 44; m.receiveShadow = true;   // only true towers pay the shadow pass
      if (!isBridge) {
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roofMats[Math.min(style, 4)]);
        // ⚠ same nine-millimetre roof as citytiles' tower() — the flagship keeps its own bespoke
        // builder, so the fix has to be made in BOTH copies or half the game still flickers.
        roof.rotation.x = -Math.PI / 2; roof.position.y = h / 2 + DECAL_LIFT;
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
      // ⚠ AN ABSOLUTE OFFSET, NOT A PERCENTAGE. This shell used to be `w * 1.015`, which makes the
      // gap PROPORTIONAL to the building — 0.33u on a 44u block but 0.075u (1.4 cm) on a 10u one,
      // far under the depth buffer's floor at camera range. Everything narrower than 47u tore. It
      // survived the 2026-07-25 flicker sweep because a crack overlay is only visible on a DAMAGED
      // building, so a still scene never showed it. Same lesson as that sweep: a "small number"
      // chosen per-system is the failure mode — take the rung from GROUND_LAYER/DECAL_LIFT.
      const crack = new THREE.Mesh(new THREE.BoxGeometry(w + DECAL_LIFT * 2, h + DECAL_LIFT * 2, d + DECAL_LIFT * 2), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false }));
      crack.position.copy(m.position); crack.visible = false; g.add(crack);   // hidden until damaged — 16 fewer transparent draws

      const hp = Math.round(70 + w * h * d * 0.0075);   // destructible, but tough — bigger = tougher (rescaled for 1:1 heights)
      const co = { mesh: m, crack, x, z, r: Math.max(w, d) * 0.6, h, hx: w / 2, hz: d / 2, top: h, hp, maxHp: hp, y0: h / 2, w, d, destroyed: false };
      this.cover.push(co); this.coverAll.push(co);
    }
    this.scene.add(g);
    this.arena = g;
    this._buildCity(g);
    // ⚠ AT THE END, NOT THE TOP. fitBands is a MEASUREMENT of the built city; called before the
    // buildings exist it measures an empty scene, returns null, and quietly leaves the planner's
    // guess in place — which looks exactly like working.
    this.fitBands();
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
    // (geometry + paints CACHED on the world — generated cities park the same fleet)
    const carGeo = this._carGeo || (this._carGeo = (() => {
      // TRUE SCALE: ~4.6m sedan → 24u long, roof at 8.4u (chest height on a 9.6u hero)
      const body = new THREE.BoxGeometry(24, 5, 9.6); body.translate(0, 2.7, 0);
      const cabin = new THREE.BoxGeometry(11.5, 3.4, 8.6); cabin.translate(-1.6, 6.8, 0);
      return mergeGeometries([body, cabin]);
    })());
    const paints = this._carPaints || (this._carPaints = ['#8a2a24', '#2a4a6a', '#c9c2b4', '#3a3f34'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.35 })));
    this._charred = this._charred || new THREE.MeshStandardMaterial({ color: '#1c1a17', roughness: 0.95, metalness: 0.1 });
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

    // STREETLIGHTS — true-scale poles (32u ≈ 6m) at the street intersections; heads glow at night
    const lampSpots = [];
    for (const lx of [-144, -48, 48, 144]) for (const lz of [-144, -48, 48, 144]) lampSpots.push([lx + 6, lz + 6]);
    const poleGeo = new THREE.CylinderGeometry(0.35, 0.5, 32, 6); poleGeo.translate(0, 16, 0);
    const headGeo = new THREE.SphereGeometry(1.15, 8, 6); headGeo.translate(0, 32.8, 0);
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
    addBill(billTex('THRESHOLD', '#f5b21a'), -167.6, 84, -192, Math.PI / 2, 26, 12);   // downtown tower, east face
    addBill(billTex('KANO COLA', '#ff5a2a'), 96, 46, -173.6, 0, 22, 10);               // midtown tower, south face

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
      new THREE.CylinderGeometry(6.5, 6.5, 18, 12).translate(x, 9, z));
    const tanks = new THREE.Mesh(mergeGeometries(tankGeos), new THREE.MeshStandardMaterial({ color: '#8f979c', roughness: 0.6, metalness: 0.5 }));
    tankGeos.forEach(t => t.dispose()); tanks.castShadow = false; tanks.receiveShadow = true; g.add(tanks);
    const craneGeos = [
      new THREE.BoxGeometry(8, 4, 8).translate(180, 2, 74),        // base
      new THREE.BoxGeometry(2.6, 52, 2.6).translate(180, 26, 74),  // mast
      new THREE.BoxGeometry(44, 2.2, 2.2).translate(196, 52, 74),  // jib out over the water
      new THREE.BoxGeometry(12, 2.2, 2.2).translate(170, 52, 74),  // counter-jib
      new THREE.BoxGeometry(1, 14, 1).translate(212, 45, 74),      // cable
    ];
    const crane = new THREE.Mesh(mergeGeometries(craneGeos), new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.55, metalness: 0.4 }));
    craneGeos.forEach(t => t.dispose()); crane.castShadow = true; g.add(crane);

    // MILITARY: perimeter fence (with a gate gap) + helipad
    const fenceMat = new THREE.MeshStandardMaterial({ color: '#55583f', roughness: 0.8, metalness: 0.3 });
    const fenceGeos = [
      new THREE.BoxGeometry(180, 6, 1).translate(-138, 3, 146),   // north run
      new THREE.BoxGeometry(1, 6, 88).translate(-48, 3, 190),     // east run
      new THREE.BoxGeometry(60, 6, 1).translate(-198, 3, 234),    // south-west stub (gate gap mid-south)
    ];
    const fence = new THREE.Mesh(mergeGeometries(fenceGeos), fenceMat);
    fenceGeos.forEach(t => t.dispose()); fence.castShadow = false; g.add(fence);
    const heliTex = this._heliTex || (this._heliTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.strokeStyle = '#e8e2d4'; x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke();
      x.font = '900 64px sans-serif'; x.fillStyle = '#e8e2d4'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', 64, 68);
      return new THREE.CanvasTexture(c);
    })());
    const heli = new THREE.Mesh(new THREE.CircleGeometry(13, 24), new THREE.MeshBasicMaterial({ map: heliTex, transparent: true, opacity: 0.8, depthWrite: false }));
    heli.rotation.x = -Math.PI / 2; heli.position.set(-144, 0.12, 205); g.add(heli);

    // DISTRICT WASHES — faint color fields so the sections read from the sky (+ the radar labels)
    // ⚠ the washes overlap each other by design (they are broad district fields), so they need the
    // same no-two-decals-share-a-plane ladder the tile library uses — see core/util.js.
    let washN = 0;
    const wash = (wd, dp, x, z, col, op) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(wd, dp), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }));
      p.rotation.x = -Math.PI / 2; p.position.set(x, 0.09 + (washN++) * 0.014, z); g.add(p);
    };
    wash(288, 192, -96, -144, '#7fb0ff', 0.07);   // commercial — cool
    wash(288, 192, 0, 144, '#ff9a3a', 0.07);      // residential — warm
    wash(64, 240, 156, -24, '#9fb2c9', 0.1);      // industrial — steel
    wash(192, 92, -144, 196, '#7a8a4a', 0.12);    // military — olive
  }

  // 0 = dry land · 1 = shallow shelf · 2 = deep water
  // A projectile (or anything point-like) hitting an interior wall — spatially gated by building.
  hitInteriorWall(x, y, z, r = 1) {
    for (const it of this.interiors) {
      if (y > it.top) continue;
      if (Math.abs(x - it.x) > it.hx + r || Math.abs(z - it.z) > it.hz + r) continue;
      for (const wl of it.walls)
        if (Math.abs(x - wl.x) <= wl.hx + r && Math.abs(z - wl.z) <= wl.hz + r) return true;
    }
    return false;
  }
  // 0 dry · 1 shallows (wade) · 2 deep/trench (swim-slow). Plan-aware: a painted lake in the
  // middle of a city counts. The flagship (no cell grid) keeps its legacy x-thresholds.
  waterAt(x, z) {
    const G = this._wGrid;
    if (G) {
      if (z === undefined) return x < this.waterX ? 0 : x < this.deepX ? 1 : 2;   // legacy 1-arg caller
      const c = Math.floor((x + G.A) / G.K), r = Math.floor((z + G.A) / G.K);
      if (r < 0 || c < 0 || r >= G.N || c >= G.N) return 0;
      const t = G.tg[r * G.N + c];
      return t === 0 ? 0 : t === 1 ? 1 : 2;
    }
    return x < this.waterX ? 0 : x < this.deepX ? 1 : 2;
  }
  // the DESIGNED bed depth under a point (negative, world units) — smooth across tier boundaries
  waterDepthAt(x, z) {
    const G = this._wGrid;
    if (!G) return this.waterAt(x, z) ? -6 : 0;
    return this._sampleDepthGrid(G, x, z);
  }
  _sampleDepthGrid(G, x, z) {
    const fx = (x + G.A) / G.K - 0.5, fz = (z + G.A) / G.K - 0.5;
    const c0 = Math.floor(fx), r0 = Math.floor(fz);
    const tx = fx - c0, tz = fz - r0;
    const at = (r, c) => (r < 0 || c < 0 || r >= G.N || c >= G.N) ? 0 : G.dg[r * G.N + c];
    const a = at(r0, c0) * (1 - tx) + at(r0, c0 + 1) * tx;
    const b = at(r0 + 1, c0) * (1 - tx) + at(r0 + 1, c0 + 1) * tx;
    return a * (1 - tz) + b * tz;
  }
  // Build the per-cell water grid from the plan: tg = tier (0 land), dg = target bed depth.
  _computeWaterGrid(plan) {
    this._wGrid = null;
    if (!plan || !plan.cells) return;
    const N = plan.N, K = plan.cell || 96, A = plan.arena, sc = plan.scale || 1;
    const tg = new Uint8Array(N * N), dg = new Float32Array(N * N);
    let any = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const cell = plan.cells[r][c];
      if (cell && cell.t === 'water') {
        const d = Math.min(3, cell.d || 1);
        tg[r * N + c] = d; dg[r * N + c] = WATER_DEPTHS[d] * sc; any = 1;
      }
    }
    if (any) this._wGrid = { tg, dg, N, K, A };
  }
  // BATHYMETRY — the sea gets a real bed. Runs on FLAT cities too (the old seaward push lived
  // inside _buildRelief and silently skipped any city without relief).
  _buildBathymetry(plan) {
    const G = this._wGrid;
    if (!G || !this._gh) return;
    const pa = this.groundGeo.attributes.position.array;
    for (let i = 0; i < this._gh.length; i++) {
      const bed = this._sampleDepthGrid(G, this._gvx[i], this._gvz[i]);
      if (bed >= -0.2) continue;
      const t = Math.min(1, -bed / 6), sw = t * t * (3 - 2 * t);   // shore apron eases in
      const h2 = this._gh[i] * (1 - sw) + bed * sw;
      if (h2 < this._gh[i]) { this._gh[i] = h2; pa[i * 3 + 2] = h2; }
    }
    this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true;
  }

  // district naming for the news desk / lower thirds — plan-aware, flagship keeps canon names
  districtAt(x, z) { return districtNameAt(this.plan, x, z) || 'THE CITY'; }
  // WHAT KIND of place this is — the key data/districts.js is read on. `districtAt` says what the
  // news desk CALLS this block; this says what it IS, which is what the crowd, the police, the
  // hazard and the nameplate all react to.
  districtTypeAt(x, z) { return districtTypeAt(this.plan, x, z); }

  // ---- SIMULATION MODE: the Danger Room renders the WORLD as a projection ----
  // Everything the room fabricates (city, props, greenery, water) goes translucent holo-cyan
  // with lit edges; the player is never touched, so the live subject reads solid against a
  // fabricated set. Reversible: originals are stashed per-material and restored on exit.
  // NIGHT VISION — an image intensifier, not a filter over the game. It lifts EXPOSURE (which is
  // what amplification actually does) and pushes the tone toward phosphor green.
  // ⚠ It must not touch the light COUNT — the light-count law. Exposure and a tint are free.
  setNightVision(on) {
    if (!!on === !!this._nvOn) return;
    this._nvOn = !!on;
    if (on) {
      this._nvSave = { exp: this.renderer.toneMappingExposure, fog: this.scene.fog && this.scene.fog.color.clone() };
      this.renderer.toneMappingExposure = this._nvSave.exp * 2.35;
      if (this.scene.fog) this.scene.fog.color.set('#0d2a16');
    } else if (this._nvSave) {
      this.renderer.toneMappingExposure = this._nvSave.exp;
      if (this.scene.fog && this._nvSave.fog) this.scene.fog.color.copy(this._nvSave.fog);
      this._nvSave = null;
    }
  }

  setSim(on) {
    if (!!on === !!this._simOn) return;
    this._simOn = !!on;
    const mats = new Set();
    const collect = (o) => { if (!o) return; o.traverse(m => { if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => mats.add(x)); }); };
    collect(this.arena); collect(this.grass); collect(this._canopy);
    for (const m of this._cityBits) collect(m);
    const HOLO = new THREE.Color('#5fd8ff');
    if (on) {
      this._simSaved = [];
      for (const m of mats) {
        this._simSaved.push({ m, c: m.color && m.color.clone(), o: m.opacity, t: m.transparent, e: m.emissive && m.emissive.clone(), ei: m.emissiveIntensity, w: m.wireframe, d: m.depthWrite });
        if (m.color) m.color.lerp(HOLO, 0.62);
        m.transparent = true; m.opacity = Math.min(m.opacity ?? 1, 0.42);
        if (m.emissive) { m.emissive.copy(HOLO); m.emissiveIntensity = 0.55; }
        m.needsUpdate = true;
      }
      // a scan-line cage over the deck so the floor reads as projected, not paved
      if (!this._simCage) {
        const g = new THREE.PlaneGeometry(this.ARENA * 2, this.ARENA * 2, 48, 48);
        this._simCage = new THREE.LineSegments(new THREE.WireframeGeometry(g),
          new THREE.LineBasicMaterial({ color: '#5fd8ff', transparent: true, opacity: 0.13, depthWrite: false }));
        this._simCage.rotation.x = -Math.PI / 2; this._simCage.position.y = 0.35;
        g.dispose();
      }
      this.scene.add(this._simCage);
    } else {
      for (const s of (this._simSaved || [])) {
        const m = s.m;
        if (s.c && m.color) m.color.copy(s.c);
        m.opacity = s.o; m.transparent = s.t; m.wireframe = s.w; m.depthWrite = s.d;
        if (s.e && m.emissive) { m.emissive.copy(s.e); m.emissiveIntensity = s.ei; }
        m.needsUpdate = true;
      }
      this._simSaved = null;
      if (this._simCage) this.scene.remove(this._simCage);
    }
  }

  // ---------------- PROCEDURAL CITIES (the world sheet) ----------------
  // Tear the current city down to bare terrain systems, then raise a new one from a plan.
  _teardownCity() {
    // ⚠ the AO material clones are PER-CITY, like the crack overlays — the shared caches
    // (_tileMats, _winMats, _lampMat, _carPaints) are explicitly preserved, these are not.
    if (this._aoMats) { for (const m of this._aoMats.values()) m.dispose(); this._aoMats.clear(); }
    // THE TEARDOWN TRAP (altitude plan 3a): interactables a city tile registered MUST go with
    // the city, or a rebuilt map inherits ghost prompts pointing at deleted geometry.
    if (this.game && this.game.clearCityInteractables) this.game.clearCityInteractables();
    this.planes = [];   // the airliners die with the arena group
    this.rocks = [];
    this.doors = [];
    this._wGrid = null;
    this._spinners = [];
    this.interiors = [];
    if (this._ifades) { for (const [, f] of this._ifades) for (const [m] of f.mats) m.material.dispose(); this._ifades.clear(); }
    // ⚠ MATERIALS LEAK IF YOU ONLY DISPOSE GEOMETRY. Every rebuild allocates a fresh ground,
    // wall, water, quay and lamp material, plus ONE MeshBasicMaterial per building for its crack
    // overlay — dozens per city. Rebuilding 7 cities in a row took a soak from 6.4ms to 48.6ms
    // a frame. Shared/cached materials (_tileMats, _winMats, _lampMat, _carPaints, _crackTex
    // owners) must SURVIVE, so dispose only what this city uniquely owns.
    const keep = new Set();
    for (const m of Object.values(this._tileMats || {})) { if (Array.isArray(m)) m.forEach(x => keep.add(x)); else keep.add(m); }
    for (const m of (this._winMats || [])) keep.add(m);
    for (const m of (this._carPaints || [])) keep.add(m);
    if (this._lampMat) keep.add(this._lampMat);
    const killMat = (mat) => {
      if (!mat) return;
      if (Array.isArray(mat)) { mat.forEach(killMat); return; }
      if (keep.has(mat) || mat.userData._shared) return;
      mat.dispose();
    };
    if (this.arena) {
      this.scene.remove(this.arena);
      this.arena.traverse(o => {
        if (o.geometry && o.geometry !== this._carGeo) o.geometry.dispose();
        killMat(o.material);
      });
      this.arena = null;
    }
    for (const m of this._cityBits) { this.scene.remove(m); if (m.geometry) m.geometry.dispose(); killMat(m.material); }
    this._cityBits.length = 0;
    this.cover = []; this.coverAll = []; this.cars = [];
    this.grass = null; this._canopy = null; this.water = null; this._waterT = null;
    this.ground = null; this.groundGeo = null; this._ghBase = null; this._pendingPits = []; this._pendingCuts = [];
    if (this._fades) this._fades.clear();   // cloned cutaway materials died with their meshes
  }
  rebuildCity(plan) {
    setBands(plan && plan.bands);   // the plan's estimate, replaced by a measurement below
    if (!plan) return;
    this._teardownCity();
    this.plan = plan;
    if (plan.flagship) {
      this.ARENA = 240;
      this._buildArena(); this._buildGrass();
      this._ghBase = null;
      // ⚠ THE FLAGSHIP HAS NO TILE BUILDERS, so `buildTiles`' district tag never reaches it — and it
      // is the DEFAULT theatre, which would have made the hazard layer invisible in the map most
      // players see first. (Same shape as the vertex-AO gap: a bespoke builder skipping a rule every
      // generated city gets for free.) Its districts are POSITIONAL, so a positional tag is not a
      // workaround here, it is the correct answer — ask the same `districtTypeAt` everything else asks.
      for (const c of this.coverAll) c.district = districtTypeAt(plan, c.x, c.z);
    } else {
      this.ARENA = plan.arena;
      this._buildGenCity(plan);
    }
    this._fitFog(plan);
    this.fitBands();          // ⚠ AFTER the build — the bands are a measurement, not a prediction
    this.refreshFogBoxes();
    this.resize();
    // ⚠ ONE NOTIFICATION POINT for everything that is keyed to the old map. Re-gridding the
    // civilians used to happen only in beginMatch, so a rebuild from the map tool left a crowd
    // standing in the void outside a smaller arena, and old scorch decals hung in mid-air.
    if (this.onRebuilt) this.onRebuilt(plan);
  }
  _buildGenCity(plan) {
    const A = plan.arena, N = plan.N;
    // THE PLAN OWNS THE SCALE. `plan.cell` (default 96) sizes every cell, road, lamp and shore, so
    // the same generator produces a tight 48u-cell arena or a 200u-cell open world.
    const K = plan.cell || CELL, S = plan.scale || 1;
    const rng = mulberry((plan.seed * 131 + N * 17) | 0);
    const g = new THREE.Group();
    // ground — same crater-able plane, sized to the plan; the road texture tiles one ring per cell
    const tex = plan.roads
      ? (this._lotTex || (this._lotTex = this._gridTexture(false)))   // roads are geometry — don't paint them twice
      : (this._groundTex || (this._groundTex = this._gridTexture()));
    tex.repeat.set(N, N);
    const SEG = 22 * N + 2;
    const groundGeo = new THREE.PlaneGeometry(A * 2, A * 2, SEG, SEG);
    // THE GROUND CARRIES THE REGION. It is the single biggest surface in frame, so tinting it is
    // what actually makes Kabul stop looking like Oslo — the facades alone were too subtle to read.
    // In the COUNTRY it also carries the countryside: a hamlet standing on pale urban lot-surface
    // read as a car park with barns on it.
    const R = plan.region || { ground: '#b9b1a2', green: '#6f9a4e' };
    const gCol = plan.rural
      ? '#' + new THREE.Color(R.ground).lerp(new THREE.Color(R.green), 0.45).getHexString()
      : R.ground;
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.0, color: gCol }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    this.ground = ground; this.groundGeo = groundGeo;
    const pa = groundGeo.attributes.position.array; const nV = pa.length / 3;
    this._gvx = new Float32Array(nV); this._gvz = new Float32Array(nV); this._gh = new Float32Array(nV); this._gseg = SEG; this._ghArena = this.ARENA;
    for (let i = 0; i < nV; i++) { this._gvx[i] = pa[i * 3]; this._gvz[i] = -pa[i * 3 + 1]; }
    // border parapets
    const wallMat = new THREE.MeshStandardMaterial({ color: '#d8d0be', emissive: '#f5b21a', emissiveIntensity: 0.22, roughness: 0.7 });
    const wh = 6, t = 3;
    const wallGeos = [
      [A * 2 + t, t, 0, -A], [A * 2 + t, t, 0, A],
      [t, A * 2 + t, -A, 0], [t, A * 2 + t, A, 0],
    ].map(([w, d, x, z]) => new THREE.BoxGeometry(w, wh, d).translate(x, wh / 2, z));
    const walls = new THREE.Mesh(mergeGeometries(wallGeos), wallMat);
    wallGeos.forEach(gg => gg.dispose());
    walls.castShadow = false; walls.receiveShadow = true; g.add(walls);
    this._computeWaterGrid(plan);          // FIRST — the quay, the surface and the bed all read it
    // water column (seaport / resort shores)
    if (plan.water) {
      this.waterX = A - plan.waterCols * K + 10 * S; this.deepX = A - (plan.waterCols - 0.5) * K - 2 * S;
      const wTex = this._waterTex || (this._waterTex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 64;
        const x = c.getContext('2d');
        const grd = x.createLinearGradient(0, 0, 256, 0);
        grd.addColorStop(0, 'rgba(70,140,160,0.62)'); grd.addColorStop(0.42, 'rgba(40,100,130,0.78)'); grd.addColorStop(1, 'rgba(16,52,84,0.92)');
        x.fillStyle = grd; x.fillRect(0, 0, 256, 64);
        x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) { const y = Math.random() * 64; x.beginPath(); x.moveTo(Math.random() * 40, y); x.lineTo(40 + Math.random() * 200, y); x.stroke(); }
        return new THREE.CanvasTexture(c);
      })());
      // (surface built below from the water GRID — every painted cell gets water, not just the
      // eastern columns; see _buildWaterSurface)
      const quay = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, A * 2), new THREE.MeshStandardMaterial({ color: '#cfc8b6', roughness: 0.85 }));
      quay.position.set(this.waterX - 1.5, 0.55, 0); quay.receiveShadow = true; g.add(quay);
    } else { this.waterX = A + 500; this.deepX = A + 600; }
    this._buildWaterSurface(g);
    // THE LAND FIRST. Relief is raised, then every built-up cell is levelled to its own terrace,
    // and only then do the tiles go up — so a building sits on the ground rather than fighting it.
    this._buildRelief(plan);
    this._buildBathymetry(plan);   // the sea gets its bed — flat cities included
    // SURVEY → CUT THE LOTS TO IT → GRADE THE CORRIDOR.
    // ⚠ THE STREET IS THE FINAL AUTHORITY, and the order is load-bearing. Grading before the lots
    // did not hold: _padCells' apron reaches K*0.42 (40u) past a lot edge, far wider than the road
    // corridor, so it promptly re-raised the carriageway it had just been cut through.
    this._survey(plan);
    this._padCells(plan);
    this._gradeRoads(plan);
    // THE TILES — every cell raised by its type builder
    this.doors = [];                       // the tiles re-register every entrance
    this.interiors = [];
    resetDecalLadder();          // the rung counter is per-CITY, so a long session can't drift it up
    const { treeSpots, planeProps, rockProps, decals } = buildTiles(this, g, plan, rng);
    this.planes = planeProps || [];   // 24-ton props for whoever can lift them (manual §21)
    this.rocks = rockProps || [];     // loose 0.5t stones — the bottom of the same ladder
    const M = ((plan.metric && plan.metric.humanH) || 9.6) / 9.6;   // the METRIC — people size, not map size
    // STREETLIGHTS FOLLOW THE ROAD GRAPH. They used to be stamped at every interior lattice point
    // regardless of whether a road was there — which is how a village ended up with lamp posts
    // standing in the middle of a ploughed field. A lamp needs a METALLED road and a junction.
    const lampSpots = [];
    for (let k = 1; k < N; k++) for (let j = 1; j < N; j++) {
      const jn = junctionAt(plan, j, k);
      if (!jn || jn.deg < 2 || Math.max(jn.n, jn.e, jn.s, jn.w) < 2) continue;   // dirt tracks are unlit
      lampSpots.push([-A + k * K + 6 * S, -A + j * K + 6 * S]);
    }
    if (lampSpots.length) {
      // ⚠ THE METRIC, not the cell dial: a streetlight is a human-scale object. It used to scale
      // with S, so a 240u-cell city had 80u lamp posts towering over its own buildings.
      const poleGeo = new THREE.CylinderGeometry(0.35 * M, 0.5 * M, 32 * M, 6); poleGeo.translate(0, 16 * M, 0);
      const headGeo = new THREE.SphereGeometry(1.15 * M, 8, 6); headGeo.translate(0, 32.8 * M, 0);
      this._lampMat = this._lampMat || new THREE.MeshStandardMaterial({ color: '#fff2cc', emissive: '#ffca7a', emissiveIntensity: 0.15, roughness: 0.4 });
      const poleMat = new THREE.MeshStandardMaterial({ color: '#4a463c', roughness: 0.7, metalness: 0.4 });
      const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
      const heads = new THREE.InstancedMesh(headGeo, this._lampMat, lampSpots.length);
      const lm = new THREE.Matrix4();
      lampSpots.forEach(([x, z], i) => { if (x < this.waterX - 4) { lm.makeTranslation(x, this.heightAt(x, z), z); } else { lm.makeScale(0.001, 0.001, 0.001); lm.setPosition(x, -5, z); } poles.setMatrixAt(i, lm); heads.setMatrixAt(i, lm); });
      poles.castShadow = false; heads.castShadow = false;
      g.add(poles); g.add(heads);
    }
    // PARKED CARS SIT ON REAL ROADS. They used to be scattered on the lattice whether or not a
    // road was there, so cars were parked in fields and inside buildings. Pick an actual edge from
    // the graph and park along its kerb — and a hamlet gets a couple of vehicles, not sixteen.
    this.cars = [];
    const edges = [];
    for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (plan.roads.h[r][c] >= 2) edges.push([true, r, c, plan.roads.h[r][c]]);
    for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (plan.roads.v[r][c] >= 2) edges.push([false, r, c, plan.roads.v[r][c]]);
    const nCars = edges.length ? Math.min(plan.rural ? 3 : 18, Math.max(2, Math.round(edges.length * 0.45))) : 0;
    for (let i = 0; i < nCars; i++) {
      const [alongX, er, ec, cls] = edges[(rng() * edges.length) | 0];
      const kerb = (ROAD[cls].width * S) / 2 - 4.5 * M;                       // just inside the gutter
      const off = (rng() < 0.5 ? -1 : 1) * kerb;
      const t = 0.18 + rng() * 0.64;                                          // somewhere along the block
      let x, z;
      if (alongX) { x = -A + (ec + t) * K; z = -A + er * K + off; }
      else { x = -A + ec * K + off; z = -A + (er + t) * K; }
      if (plan.water && x > this.waterX - 12 * S) continue;
      const m = new THREE.Mesh(this._carGeo, this._carPaints[i % this._carPaints.length]);
      m.position.set(x, this.heightAt(x, z), z); m.rotation.y = alongX ? Math.PI / 2 : 0; m.castShadow = false; m.receiveShadow = true;
      if (M !== 1) m.scale.setScalar(M);          // cars are people-sized — the METRIC, never the cell dial
      g.add(m);
      this.cars.push({ mesh: m, x, z, hp: 30, maxHp: 30, dead: false, paint: this._carPaints[i % this._carPaints.length] });
    }
    this.scene.add(g);
    this.arena = g;
    // fog occlusion budget: the shader reads the FIRST 24 boxes — give it the biggest buildings
    this.cover.sort((a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d));
    // EXCAVATION — mining pits and metro cuts dig into the fresh terrain, then freeze as the
    // city's BASE heights (resetTerrain restores to these, so the land survives every match).
    // ⚠ crater() clamps to ±a few units around `_ghBase`, so the BASE has to be the land as it
    // stands right now. Without this the first mining pit dug into a hillside would clamp the whole
    // hill back down to ~0 — the relief would be silently erased by the excavation that follows it.
    this._ghBase = Float32Array.from(this._gh);
    for (const [px, pz, r, dep] of (this._pendingPits || [])) this.crater(px, pz, r, dep);
    for (const [px, pz, hw, hd, dep, ry] of (this._pendingCuts || [])) this.trench(px, pz, hw, hd, dep, 11, ry);
    this._pendingPits = []; this._pendingCuts = [];
    // ⚠ RE-ASSERT THE CORRIDOR ONCE THE GROUND IS FINAL. Grading before the tiles is what lets the
    // LOTS be cut to street level, but everything after it also writes the heightfield — mining
    // craters throw up a RIM, metro trenches undercut, bathymetry pushes the shore — and any of
    // those reaching into a carriageway puts ground back through the tarmac. Measured: this second
    // pass is what takes the worst intrusion from 17 units to nothing. It is idempotent (the same
    // survey, the same profile), so running it twice costs a pass over the vertices and no risk.
    this._gradeRoads(plan);
    this._ghBase = Float32Array.from(this._gh);
    // ROADS LAST — they drape over the finished ground, so they dip into the metro cut and
    // ride the mining spoil instead of hovering over a hole they can't see.
    this._buildRoadNet(plan, g);
    // ⚠ NOW the ground has finished moving — relief, lot terracing, mining pits, metro trenches
    // and BOTH road grades are all in. Every ground decal was draped during buildTiles, which
    // runs before the last three of those, so it was fitted to a floor that then changed.
    // Re-drape against the final terrain. This is the pass that makes 'follow the ground' true
    // rather than nearly true.
    redrapeDecals(this, decals);
    this.groundGeo.computeVertexNormals(); this._normalsDirty = false;
    // greenery from what the tiles asked for
    this._buildGreenery([], treeSpots, 0);
    // re-seed the birds onto THIS city's rooftops (no allocation — see wildlife.js)
    if (this.wildlife) this.wildlife.setCity(this.ARENA, this.cover, this);
  }

  // --- the GREEN layer: real TREES in ORGANIZED rows (trunks + canopies, two instanced
  // draws) over lawn decals. The old grass blades read as floating confetti at every zoom —
  // gone forever. Blasts still FELL trees in the radius; resetTerrain replants.
  _buildGrass() {
    // the FLAGSHIP greenery: park lawns + tree rings + residential sidewalk rows
    const spots = [];
    const ring = (px, pz, r, n) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3; spots.push([px + Math.cos(a) * r + (Math.random() * 2 - 1) * 2, pz + Math.sin(a) * r + (Math.random() * 2 - 1) * 2]); } };
    ring(-192, 0, 33, 8); ring(-192, 96, 31, 8);
    ring(-96, 20, 13, 4); ring(-40, 148, 12, 4); ring(148, 140, 11, 4);
    for (const z of [57, 153]) for (const x of [-120, -96, -72, -24, 0, 24, 72, 96, 120]) spots.push([x + (Math.random() * 2 - 1) * 1.5, z]);
    this._buildGreenery([[-192, 0, 42], [-192, 96, 40], [-96, 20, 17], [-40, 148, 15], [148, 140, 14]], spots, 50);
  }
  // lawns + ONE instanced tree system from a spot list — flagship and generated cities both ride this
  _buildGreenery(lawns, spots, clearCenter = 0) {
    // ⚠ THE ONE CHOKE POINT FOR EVERY GROWING THING. Trees and lawns are appended by the TILE
    // BUILDERS — a residential court plants street trees, a park plants a copse — so striking the
    // park and forest ZONING in the planner is not enough on its own; the ordinary blocks would
    // still have come up green. Every tree and every lawn in the game arrives here, which is why
    // this is the line that makes a vacuum world actually barren.
    if (this.plan && this.plan.biosphere === false) return;
    const lawnTex = this._lawnTex || (this._lawnTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(64, 64, 10, 64, 64, 64);
      // ⚠ these are UNLIT (MeshBasic) decals — whatever value you write here is what you SEE, with
      // no sun to lift it. The old greens were mid-dark and read as holes cut in the pavement.
      gr.addColorStop(0, 'rgba(122,164,86,0.95)'); gr.addColorStop(0.7, 'rgba(104,146,74,0.82)'); gr.addColorStop(1, 'rgba(92,132,66,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      x.fillStyle = 'rgba(150,190,110,0.45)';
      for (let i = 0; i < 260; i++) x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
      return new THREE.CanvasTexture(c);
    })());
    // ⚠ lawns overlap each other and the tile library's own plazas — same ladder, same reason
    // (core/util.js, THE SURFACE-SEPARATION LAW). A flat +0.11 made every overlap a coin toss.
    // a lawn decal is a disc with a radius; if the radius crosses a road the grass runs over the
    // tarmac. Shrink it until it fits its own lot rather than dropping it — a park with a smaller
    // lawn is right, a park with no lawn is a bug.
    lawns.forEach(([x, z, r0], i) => {
      let r = r0;
      while (r > 4 && !roadClear(this.plan, x, z, r)) r -= 3;
      if (r <= 4) return;
      const p = new THREE.Mesh(new THREE.CircleGeometry(r, 26), new THREE.MeshBasicMaterial({ map: lawnTex, transparent: true, depthWrite: false }));
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, this.heightAt(x, z) + 0.11 + (i % 9) * 0.014, z);
      this.scene.add(p); this._cityBits.push(p);
    });
    const A = this.ARENA;
    // ⚠ A TREE IS NOT A POINT. This filter used to check ONLY that a spot was clear of cover boxes
    // — it never consulted the road graph at all — so street trees grew out of the carriageway and
    // hung a 19u-wide canopy over it. The keep-clear tests the CANOPY, not the trunk, because the
    // canopy is what actually blocks the street. (core: cityplan.roadClear)
    const CANOPY = 9.5;
    const P = spots.filter(([x, z]) => Math.hypot(x, z) > clearCenter && x < this.waterX - 8 && Math.abs(x) < A - 8 && Math.abs(z) < A - 8 &&
      roadClear(this.plan, x, z, CANOPY) &&
      !this.coverAll.some(c => Math.abs(x - c.x) < c.hx + 4 && Math.abs(z - c.z) < c.hz + 4));
    if (!P.length) { this.grass = null; this._canopy = null; return; }
    const COUNT = P.length;
    const trunkGeo = new THREE.CylinderGeometry(1.0, 1.5, 14, 6); trunkGeo.translate(0, 7, 0);   // ~5m street trees — a hero stands UNDER them now
    const canopyGeo = new THREE.IcosahedronGeometry(9.5, 0); canopyGeo.translate(0, 19.5, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.9, flatShading: true }), COUNT);
    const canopy = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), COUNT);
    trunks.frustumCulled = false; canopy.frustumCulled = false;
    trunks.receiveShadow = true; canopy.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    this._gPos = new Float32Array(COUNT * 2); this._gRot = new Float32Array(COUNT); this._gScale = new Float32Array(COUNT); this._gOn = new Uint8Array(COUNT).fill(1);
    P.forEach(([x, z, k], i) => {
      this._gPos[i * 2] = x; this._gPos[i * 2 + 1] = z;
      this._gRot[i] = Math.random() * Math.PI * 2;
      // KIND: 1 = emergent giant (jungle upper canopy) · 2 = understory · else a street tree
      this._gScale[i] = k === 1 ? 1.45 + Math.random() * 0.45 : k === 2 ? 0.6 + Math.random() * 0.18 : 0.85 + Math.random() * 0.4;
      // ⚠ a tree grows out of the GROUND. Planting at y=0 was invisible while the world was flat;
      // the moment relief existed, every tree on a hillside hung in the air or sank into it.
      m4.compose(pv.set(x, this.heightAt(x, z), z), q.setFromAxisAngle(Y, this._gRot[i]), sv.setScalar(this._gScale[i]));
      trunks.setMatrixAt(i, m4); canopy.setMatrixAt(i, m4);
      canopy.setColorAt(i, (P[i][2] ? col.setHSL(0.27 + Math.random() * 0.04, 0.5, 0.185 + Math.random() * 0.05)
                                    : col.setHSL(0.24 + Math.random() * 0.05, 0.38, 0.26 + Math.random() * 0.08)));
    });
    trunks.instanceMatrix.needsUpdate = true; canopy.instanceMatrix.needsUpdate = true;
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;
    this.grass = trunks; this._canopy = canopy;   // this.grass keeps every old integration hook alive
    this._gCut = new Float32Array(COUNT);          // canopy-cutaway lerp state, per instance
    this.scene.add(trunks); this.scene.add(canopy);
    this._cityBits.push(trunks, canopy);
  }
  // a blast in the radius FELLS the trees — gone until the next match replants them
  flattenGrass(cx, cz, r) {
    if (!this.grass) return;
    const r2 = (r + 4) * (r + 4); let touched = false;
    for (let i = 0; i < this.grass.count; i++) {
      if (!this._gOn[i]) continue;
      const dx = this._gPos[i * 2] - cx, dz = this._gPos[i * 2 + 1] - cz;
      if (dx * dx + dz * dz > r2) continue;
      this._gOn[i] = 0; touched = true;
      _gm4.makeScale(0.001, 0.001, 0.001); _gm4.setPosition(this._gPos[i * 2], -2, this._gPos[i * 2 + 1]);
      this.grass.setMatrixAt(i, _gm4); this._canopy.setMatrixAt(i, _gm4);
    }
    if (touched) { this.grass.instanceMatrix.needsUpdate = true; this._canopy.instanceMatrix.needsUpdate = true; }
  }
  _restoreGrass() {
    if (!this.grass) return;
    const q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.grass.count; i++) {
      if (this._gOn[i]) continue;
      this._gOn[i] = 1;
      _gm4.compose(pv.set(this._gPos[i * 2], 0, this._gPos[i * 2 + 1]), q.setFromAxisAngle(Y, this._gRot[i]), sv.setScalar(this._gScale[i]));
      this.grass.setMatrixAt(i, _gm4); this._canopy.setMatrixAt(i, _gm4);
    }
    this.grass.instanceMatrix.needsUpdate = true; this._canopy.instanceMatrix.needsUpdate = true;
  }

  // The White City tile — one 24-unit district block per repeat: bone plaza + asphalt
  // cross-streets with lane dashes and crosswalks. Repeats 20× across the arena.
  _gridTexture(streets = true) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    // plaza — pale bone stone with a soft paver grid
    x.fillStyle = '#cfc8b6'; x.fillRect(0, 0, 512, 512);
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(64, 64, 192, 192); x.fillRect(256, 256, 192, 192);
    x.strokeStyle = 'rgba(90,80,60,0.12)'; x.lineWidth = 1.5;
    for (let i = 64; i <= 512; i += 64) { x.beginPath(); x.moveTo(i + .5, 0); x.lineTo(i + .5, 512); x.stroke(); x.beginPath(); x.moveTo(0, i + .5); x.lineTo(512, i + .5); x.stroke(); }
    if (streets) {
      // ---- THE STREET SECTION -------------------------------------------------------------------
      // ⚠ The ground is the single biggest surface in frame and it used to read as a near-black slab:
      // the asphalt was #57544c under a #8f897d multiply, so ~40% of every tile went to mud. A street
      // is layered — SIDEWALK, curb, gutter, carriageway, markings — and each layer needs its own value.
      const ST = 116;                                     // carriageway width in px (~22u at 96u cells)
      const SW = 30;                                      // sidewalk band OUTSIDE the curb
      // sidewalk: pale concrete, slightly cooler than the plaza so the kerb line reads
      x.fillStyle = '#c3bcac';
      x.fillRect(0, 0, ST / 2 + SW, 512); x.fillRect(512 - ST / 2 - SW, 0, ST / 2 + SW, 512);
      x.fillRect(0, 0, 512, ST / 2 + SW); x.fillRect(0, 512 - ST / 2 - SW, 512, ST / 2 + SW);
      // paving joints on the sidewalk — stops it reading as flat card
      x.strokeStyle = 'rgba(120,112,96,0.16)'; x.lineWidth = 1.2;
      for (let i = 0; i <= 512; i += 22) { x.beginPath(); x.moveTo(i + .5, 0); x.lineTo(i + .5, 512); x.stroke(); x.beginPath(); x.moveTo(0, i + .5); x.lineTo(512, i + .5); x.stroke(); }
      // carriageway: real asphalt grey, not black
      x.fillStyle = '#6e6a61';
      x.fillRect(0, 0, ST / 2, 512); x.fillRect(512 - ST / 2, 0, ST / 2, 512);
      x.fillRect(0, 0, 512, ST / 2); x.fillRect(0, 512 - ST / 2, 512, ST / 2);
      // a darker gutter strip where the road meets the kerb — the shadow line that sells depth
      x.fillStyle = 'rgba(40,38,33,0.30)';
      for (const p of [ST / 2 - 7, 512 - ST / 2]) { x.fillRect(p, 0, 7, 512); x.fillRect(0, p, 512, 7); }
      // curbs — bright concrete edge
      x.strokeStyle = 'rgba(246,241,228,0.95)'; x.lineWidth = 5;
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
    // ⚠ THE PRINT PASS RUNS LAST, AFTER TONE MAPPING. Halftone, palette snapping, grain and dither
    // are operations on a FINISHED image — run them upstream and they land on HDR values nobody
    // sees. It is one pass doing the work of eleven; a disabled effect is a uniform test, not a blit.
    this.print = new PrintPass();
    this.print.setSize(innerWidth * this.renderer.getPixelRatio(), innerHeight * this.renderer.getPixelRatio());
    this.composer.addPass(this.print);
  }

  resize() {
    const w = innerWidth, h = innerHeight, asp = w / h;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.print) this.print.setSize(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
    this.bloom.setSize(w * 0.5, h * 0.5);
    // ⚠ ONE PLACE, because these four properties exist only on an orthographic camera and the chase
    // view swaps a perspective one in — writing `left/right/top/bottom` onto it is silently ignored
    // and the aspect never updates. `_applyProj()` asks which camera it is holding.
    this._applyProj();
    if (this.bloom) this._applyQuality();   // re-derive the pixel cap for the new window size
  }

  setBaseZoom(f) { this._baseFrustum = f; }
  shake(a) {
    this._shake = Math.min(this._shake + a * (this.shakeMult ?? 1), 8);
    // aaa-06 §4.2: in the chase view the shake is an angular RING-DOWN on an axis stamped ONCE per
    // EVENT (a real blow, a >= axisEvent — the 0.12 rumble and the 0.1 beam tick are texture), not
    // white noise re-rolled per frame. A second real blow restarts the ring-down. The city
    // (camMode iso) never reads _shakeAxTh/_shakeT, so follow()'s shake is byte-identical.
    if (this.camMode === 'chase' && a >= PW_FX.axisEvent) { this._shakeAxTh = Math.random() * (Math.PI * 2); this._shakeT = 0; }
  }
  // ⚠ punch() WAS A NO-OP IN THE CHASE VIEW (aaa-04 §9 / aaa-06 §5): `frustumTarget` is read only by
  // the orthographic projection branch, so ~24 combat-feel beats died in PowerWorld AND leaked —
  // `Math.min` only ratchets `frustumTarget` down and nothing in chase() damped it home, so the city
  // came back punched-in. Under a perspective camera a punch is an FOV KICK. The early return is the
  // leak fix: `frustumTarget` is never written while chase is up, so the city is byte-unchanged.
  // The kick is compressed through PW_FX.punchK so a 0.62 call site is a −9.9° shove, not a 22° lens
  // change, preserving the ordering all call sites authored (aaa-06 §5.2) — the PW_KB discipline.
  punch(z) {
    if (this.camMode === 'chase') { this._fovKick = Math.min(this._fovKick ?? 1, 1 - (1 - z) * PW_FX.punchK); return; }
    this.frustumTarget = Math.min(this.frustumTarget, this.frustum * z);   // zoom IN briefly
  }

  // THE KILL SWITCH (aaa-04 §4.8). Consumed by the NEXT chase() call, which copies ideal → damped
  // with no lerp so the eye does not fly across the map on a discontinuity. setCameraMode('chase')
  // arms it for the FIRST chase frame (the inherited iso eye is 260u away); the other five triggers
  // — mapCam release, match reset, teleport-intercept, portal hop, respawn — live in game.js (RIDERS).
  snapChase() { this._chaseSnap = true; this._fovKick = 1; }

  // POINTER-LOCK MOUSE-LOOK (aaa-01 §2.3, requirement table). Integrates a per-frame pointer delta
  // into view yaw (unbounded) and pitch (BFP shares the lock limit; legacy view uses ±80°).
  // Marks the look active so chase() uses
  // it as the axis when there is no lock target. dy is inverted: pushing the mouse UP looks UP.
  mouseLook(dx, dy) {
    if (!dx && !dy) return;
    const pMax = this._bfpCameraActive ? BFP_PITCH_MAX : Math.asin(clamp(PW_AIR.camPitch, 0, 1));
    // +Z is forward for a fighter, so camera-right is -X. Positive yaw would turn LEFT.
    this._lookYaw -= (dx || 0) * this._lookSens;
    this._lookPitch = clamp(this._lookPitch - (dy || 0) * this._lookSens, -pMax, pMax);
    this._lookActive = true;
  }

  clearFreeLook(){if(this._freeLook)clearFreeLook(this._freeLook);}
  freeLookInput(input,dt,sight=1){
    const state=this._freeLook||(this._freeLook=createFreeLook());
    advanceFreeLook(state,{held:input.down('AltLeft')||input.down('AltRight'),dx:input.mouse.dx/sight,dy:input.mouse.dy/sight,
      dt,sensitivity:this._lookSens,cancelVersion:input.cancelVersion});
    return state.held;
  }
  get freeLooking(){return !!(this._freeLook&&(this._freeLook.yaw||this._freeLook.pitch));}
  combatAimDirection(out){
    return this.freeLooking&&this._combatAimDirection?out.copy(this._combatAimDirection):this.camera.getWorldDirection(out);
  }
  combatAimOrigin(out){
    return this.freeLooking&&this._combatAimOrigin?out.copy(this._combatAimOrigin):out.copy(this.camera.position);
  }

  // ---- THE MAP TOOL CAMERA ---------------------------------------------------------------------
  // A free orbit/pan/zoom over the plan, for authoring rather than playing. The match camera is a
  // fixed isometric that eases toward the player; this one takes its direction straight from the
  // tool so you can get under a bridge or look along a runway. Same orthographic camera — only
  // `camDir` and the frustum change, so nothing else in the pipeline has to know about it.
  orbit(cam) {
    this.setCameraMode('iso');   // the map tool and every cinematic are isometric — see follow()
    const p = Math.max(0.12, Math.min(1.52, cam.pitch));
    this.camDir.set(Math.sin(cam.yaw) * Math.cos(p), Math.sin(p), Math.cos(cam.yaw) * Math.cos(p)).normalize();
    this.camTarget.set(cam.x || 0, 0, cam.z || 0);
    this.frustum = this.frustumTarget = this._baseFrustum = cam.zoom;
    const asp = innerWidth / innerHeight;
    // ⚠ ONE PLACE, because these four properties exist only on an orthographic camera and the chase
    // view swaps a perspective one in — writing `left/right/top/bottom` onto it is silently ignored
    // and the aspect never updates. `_applyProj()` asks which camera it is holding.
    this._applyProj();
    this.camPos.copy(this.camDir).multiplyScalar(this.camDist).add(this.camTarget);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    const sx = Math.round(this.camTarget.x), sz = Math.round(this.camTarget.z);
    const so = this.sunOff;
    this.sun.position.set(sx + so.x, so.y, sz + so.z);
    this.sun.target.position.set(sx, 0, sz);
  }

  follow(target, dt) {
    // ⚠ THE DRIVE FUNCTION CLAIMS ITS OWN CAMERA. `follow` IS the isometric view, so whichever
    // function runs decides the mode — no separate mode flag to keep in sync, and leaving a
    // dimension cannot strand the chase camera on a city fight.
    this.setCameraMode('iso');
    // target: Vector3 (player world pos). Ease camera focus toward it.
    this.camTarget.x = damp(this.camTarget.x, target.x, 8, dt);
    this.camTarget.y = damp(this.camTarget.y, 6 + target.y * 0.4, 6, dt);
    this.camTarget.z = damp(this.camTarget.z, target.z, 8, dt);

    // zoom easing (punch back to base)
    this._shake *= Math.exp(-7 * dt);
    this.frustumTarget = damp(this.frustumTarget, this._baseFrustum || 78, 3.5, dt);
    this.frustum = damp(this.frustum, this.frustumTarget, 10, dt);
    const asp = innerWidth / innerHeight;
    // ⚠ ONE PLACE, because these four properties exist only on an orthographic camera and the chase
    // view swaps a perspective one in — writing `left/right/top/bottom` onto it is silently ignored
    // and the aspect never updates. `_applyProj()` asks which camera it is holding.
    this._applyProj();

    this.shakeV.set((Math.random() * 2 - 1), (Math.random() * 2 - 1), (Math.random() * 2 - 1)).multiplyScalar(this._shake);
    this.camPos.copy(this.camDir).multiplyScalar(this.camDist).add(this.camTarget);
    this.camera.position.copy(this.camPos).add(this.shakeV);
    this.camera.lookAt(this.camTarget.x + this.shakeV.x, this.camTarget.y + this.shakeV.y, this.camTarget.z + this.shakeV.z);
    // drag the sun's tight shadow frustum along with the view (snapped to whole units so texels don't swim)
    const sx = Math.round(this.camTarget.x), sz = Math.round(this.camTarget.z);
    const so = this.sunOff;
    this.sun.position.set(sx + so.x, so.y, sz + so.z);
    this.sun.target.position.set(sx, 0, sz);
  }

  // ---- tower cutaway: at 1:1 scale, buildings between the camera and the player go translucent.
  // Materials are SHARED per district — clone lazily on first fade, restore + dispose when clear.
  updateOcclusion(p, dt = 0.016) {
    this._fades = this._fades || new Map();
    const cam = this.camera.position;
    for (const c of this.cover) {
      if (!c.mesh || c.noCam || (c.top ?? c.h) < 44) continue;
      const hit = this._segBox3(cam.x, cam.y, cam.z, p.x, p.y + 6, p.z, c);
      let f = this._fades.get(c);
      if (hit && !f) {
        const mats = [];
        const clone = (m) => {
          const orig = m.material, copy = material => { const next=material.clone(); next.transparent=true; return next; };
          m.material = Array.isArray(orig) ? orig.map(copy) : copy(orig); mats.push([m, orig]);
        };
        c.mesh.traverse(ch=>{if(ch.material)clone(ch);});
        f = { o: 1, mats }; this._fades.set(c, f);
      }
      if (f) {
        f.hit = hit;
        f.o = damp(f.o, hit ? 0.16 : 1, 7, dt);
        for (const [m] of f.mats) for (const material of Array.isArray(m.material)?m.material:[m.material]) material.opacity = f.o;
        // battle damage respects the cutaway: the crack overlay dims with its building
        if (c.crack && c.crack.visible) c.crack.material.opacity = Math.min(c.crack.userData.baseO ?? c.crack.material.opacity, f.o);
        if (!hit && f.o > 0.985) {
          for (const [m, orig] of f.mats) { for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose(); m.material = orig; }
          if (c.crack && c.crack.visible && c.crack.userData.baseO != null) c.crack.material.opacity = c.crack.userData.baseO;
          this._fades.delete(c);
        }
      }
    }
    // ENTERABLE buildings: shell + roof fade when the player is INSIDE — the interior cutaway.
    // Interior walls stay solid (they are the fight); only the box you are looking through goes.
    for (const it of this.interiors) {
      const inside = Math.abs(p.x - it.x) < it.hx && Math.abs(p.z - it.z) < it.hz && p.y < it.top - 1;
      let f = this._ifades && this._ifades.get(it);
      if (inside && !f) {
        this._ifades = this._ifades || new Map();
        f = { o: 1, mats: it.fadeMeshes.map((m) => { const orig = m.material; m.material = orig.clone(); m.material.transparent = true; return [m, orig]; }) };
        this._ifades.set(it, f);
      }
      if (f) {
        f.o = damp(f.o, inside ? 0.13 : 1, 7, dt);
        for (const [m] of f.mats) m.material.opacity = f.o;
        if (!inside && f.o > 0.985) {
          for (const [m, orig] of f.mats) { m.material.dispose(); m.material = orig; }
          this._ifades.delete(it);
        }
      }
    }
    this._updateCanopyCut(p, cam, dt);
  }
  // THE CANOPY CUTAWAY — tree tops between the lens and the player scale away exactly like the
  // tower cutaway, so a fighter under the trees is visible. The TRUNKS stay ("the top of the tree
  // cuts off" — Robert), the forest keeps its shape, and this is VISUAL ONLY: fog, _vis and AI
  // belief never read it, so a fog-hidden enemy can never be leaked by it.
  // Budgeted: state advances every frame, matrix writes cap at 160/frame and catch up.
  _updateCanopyCut(p, cam, dt) {
    const cv = this._canopy;
    if (!cv || !this._gPos || !this._gCut) return;
    const dx = p.x - cam.x, dz = p.z - cam.z, len2 = dx * dx + dz * dz || 1;
    let writes = 0;
    for (let i = 0; i < cv.count; i++) {
      if (!this._gOn[i]) continue;
      const tx = this._gPos[i * 2] - cam.x, tz = this._gPos[i * 2 + 1] - cam.z;
      let t = (tx * dx + tz * dz) / len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = tx - dx * t, ez = tz - dz * t;
      const r = 10.5 * this._gScale[i] + 4;
      const want = (t > 0.03 && t < 0.99 && ex * ex + ez * ez < r * r) ? 1 : 0;
      const c0 = this._gCut[i];
      if (c0 === want && (want === 0 || c0 === 1)) continue;
      const c1 = c0 + (want - c0) * Math.min(1, dt * 7);
      if (Math.abs(c1 - c0) < 0.01) { this._gCut[i] = want; continue; }
      if (writes >= 160) continue;                       // catch up next frame — never spike
      this._gCut[i] = c1; writes++;
      const gy = this.heightAt(this._gPos[i * 2], this._gPos[i * 2 + 1]);
      _gcp.set(this._gPos[i * 2], gy, this._gPos[i * 2 + 1]);
      _gcq.setFromAxisAngle(_gcY, this._gRot[i]);
      _gcs.set(this._gScale[i] * (1 - c1 * 0.5), this._gScale[i] * (1 - c1 * 0.88), this._gScale[i] * (1 - c1 * 0.5));
      _gm4.compose(_gcp, _gcq, _gcs);
      cv.setMatrixAt(i, _gm4);
    }
    if (writes) cv.instanceMatrix.needsUpdate = true;
  }
  // THE TRACE PRIMITIVE (aaa-05 §5.1). Parametric entry distance along the segment in [0,1], or -1
  // for a miss / an unreadable record. NO gating — the caller decides what range it cares about.
  // ⚠ REFUSES a half-filled record (aaa-05 §5.4): PowerWorld's spires shipped with no hx/hz/top, and
  // `x < undefined` is false, so they were transparent to every ray. A trace that silently declines
  // to see a mountain is the same defect as a bullet flying through it — return -1, never compute
  // with `undefined`.
  // ⚠ THE Y FLOOR IS 0, NOT `c.y0`. In THIS codebase `y0` is the box CENTRE (world.js:515,
  // citytiles.js:193), not its bottom — reading it would halve every building's occlusion box and
  // break the byte-identical contract below. The old `_segBox3` used the literal 0; so does this.
  traceBox3(x0, y0, z0, x1, y1, z1, c, pad = 0) {
    const hxr = c.hx ?? c.r, hzr = c.hz ?? c.r, topr = c.top ?? c.h;
    if (hxr == null || hzr == null || topr == null) return -1;
    // ⚠ `pad` INFLATES THE BOX — this is JKA's box-sweep (CAMERA_SIZE 4, openjk.md:286), a moving box
    // vs a fixed box, done as a segment vs the box grown by the camera's half-size. At the default
    // `pad = 0` this is BYTE-IDENTICAL to the old ray-vs-box (bottom stays the literal 0), so
    // updateOcclusion and aimTrace are unchanged; the camera passes `CAM_PAD` so it stops that far off
    // a wall on ANY approach, not only where the look→eye segment crosses a face.
    const hx = hxr + pad, hz = hzr + pad, top = topr + pad, bot = (c.frontlineAircraft||c.finiteBuilding)&&Number.isFinite(c.bottom)?c.bottom-pad:pad ? -pad : 0;
    let tmin = 0, tmax = 1;
    const axes = [[x0, x1 - x0, c.x - hx, c.x + hx], [y0, y1 - y0, bot, top], [z0, z1 - z0, c.z - hz, c.z + hz]];
    for (const [p0, d, mn, mx] of axes) {
      if (Math.abs(d) < 1e-6) { if (p0 < mn || p0 > mx) return -1; continue; }
      let t1 = (mn - p0) / d, t2 = (mx - p0) / d;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }
    return tmin;
  }
  // ⚠ BYTE-IDENTICAL to the old _segBox3 (aaa-05 §5.1). updateOcclusion calls this on the camera→
  // player segment every frame; the tower/canopy cutaway depends on it, and any drift is a visible
  // regression in the city. -1 (miss or unreadable) → false, exactly as the old NaN path returned.
  _segBox3(x0, y0, z0, x1, y1, z1, c) {
    const t = this.traceBox3(x0, y0, z0, x1, y1, z1, c);
    return t > 0.02 && t < 0.98;
  }

  /**
   * CAMERA-COLLISION BROADPHASE (aaa-04 §3.3/§3.5). The nearest entry parameter t ∈ [0,1] along the
   * segment across EVERY blocker (cover + interior walls), or 1 for a clean segment. The blocker set
   * is `MASK_CAMERACLIP` (openjk.md:291-293): `c.noCam === true` is solid to bodies but invisible to
   * the lens — the other half of the boxing venue's "this blocks nothing but keep the camera out of
   * it" (CLAUDE.md THE VENUE). ⚠ ONE slab test, never two — this reuses `traceBox3` (the NO_RESCUE /
   * validatePlan law: export the rule, never reimplement it). Cost is `updateOcclusion`'s class
   * (§3.6): ~99 cover + ~224 interior walls, twice a frame, and updateOcclusion already loops cover
   * unguarded every frame for nothing measurable.
   */
  _camNearestT(x0, y0, z0, x1, y1, z1, pad = 0) {
    let best = 1;
    const cov = this.cover;
    for (let i = 0; i < cov.length; i++) {
      const c = cov[i];
      if (!c || c.hidden || c.noCam === true) continue;
      const t = this.traceBox3(x0, y0, z0, x1, y1, z1, c, pad);
      if (t >= 0 && t < best) best = t;
    }
    const ints = this.interiors;
    if (ints) for (let i = 0; i < ints.length; i++) {
      const it = ints[i], walls = it && it.walls;
      if (!walls) continue;
      for (let j = 0; j < walls.length; j++) {
        const wl = walls[j];
        const t = this.traceBox3(x0, y0, z0, x1, y1, z1, { x: wl.x, z: wl.z, hx: wl.hx, hz: wl.hz, top: it.top }, pad);
        if (t >= 0 && t < best) best = t;
      }
    }
    return best;
  }

  // Screen (client px) -> ground world point (y=0 plane). Reuses one raycaster/plane (called every frame).
  screenToGround(mx, my, out = new THREE.Vector3()) {
    _ndc.set((mx / innerWidth) * 2 - 1, -(my / innerHeight) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    _ray.ray.intersectPlane(_groundPlane, out);
    return out;
  }

  /**
   * THE AIM TRACE (aaa-05 §5.2). One ray — from the camera, through the crosshair, into the world —
   * and the NEAREST hit written into `out`. This is what makes the reticle stop lying: MARK builds a
   * convergent aim from `out.point` instead of applying the camera's DIRECTION from the player's
   * POSITION (two parallel rays that never meet — a constant 6.8u miss).
   *
   * ⚠ FROZEN SIGNATURE (POWERWORLD_AAA.md WAVE 1). MARK provides, VIEW never changes it:
   *     aimTrace(out, { origin, dir, maxD, foes, ignore, blind })   — plus optional { flung, pad }
   *     out = { point: Vector3, dist, hit: 'foe'|'flung'|'cover'|'interior'|'ground'|null, ent }
   * Returns `out`, always. `origin`/`dir` are GIVEN (MARK reads them off the camera); `dir` unit.
   *
   * ⚠ THE HONESTY LAW. Only a foe you can SEE stops the ray — the same `_vis > 0.4` gate pickTarget
   * and cycleLock use — and when `blind` the foe pass is skipped entirely, so a blinded crosshair can
   * never converge on a body and the reticle can never be read as a wallhack (GATE R5).
   */
  aimTrace(out, o) {
    const D = o.maxD, O = o.origin, R = o.dir, pad = o.pad || 0;
    const x1 = O.x + R.x * D, y1 = O.y + R.y * D, z1 = O.z + R.z * D;
    let best = 1, kind = null, ent = null;
    // 1. FOES — a body under the crosshair is the case the whole feature exists for; hitting it
    //    exactly is what makes the miss ZERO rather than small. Eye offset +5.2u (chest, not feet).
    if (!o.blind && o.foes) {
      for (const f of o.foes) {
        if (!f || f === o.ignore || !f.alive) continue;
        if (f._vis != null && f._vis <= 0.4) continue;                 // honesty gate
        const t = raySphere(O, R, f.pos.x, f.pos.y + 5.2, f.pos.z, (f.radius || 2.2) + pad, D);
        if (t >= 0 && t / D < best) { best = t / D; kind = 'foe'; ent = f; }
      }
    }
    // 2. FLUNG PROPS — a thrown car IS a target (manual §47). Optional list MARK passes from game._flung.
    if (o.flung) {
      for (const fl of o.flung) {
        if (!fl || fl.dead) continue;
        const t = raySphere(O, R, fl.x, fl.y, fl.z, (fl.r || 2) + pad, D);
        if (t >= 0 && t / D < best) { best = t / D; kind = 'flung'; ent = fl; }
      }
    }
    // 3. COVER — buildings, spires, boulders, rubble. traceBox3 in the same [0,1] segment space.
    for (const c of this.cover) {
      const t = this.traceBox3(O.x, O.y, O.z, x1, y1, z1, c);
      if (t >= 0 && t < best) { best = t; kind = 'cover'; ent = c; }
    }
    // 4. INTERIOR WALLS — never ordinary cover (they must not be shootable), so a separate list every
    //    consumer queries separately. The half-filled-record guard in traceBox3 protects this too.
    if (this.interiors) for (const it of this.interiors) {
      if (!it.walls) continue;
      for (const wl of it.walls) {
        const t = this.traceBox3(O.x, O.y, O.z, x1, y1, z1, { x: wl.x, z: wl.z, hx: wl.hx, hz: wl.hz, top: it.top });
        if (t >= 0 && t < best) { best = t; kind = 'interior'; ent = wl; }
      }
    }
    // 5. THE GROUND, and it is `heightAt`, NOT a y=0 plane — that plane is nonsense on relief and on a
    //    city with metro trenches. March the ray and take the first crossing (STEP 4u = the ~4u
    //    heightfield lattice; a coarser step steps over a spire's foot, a finer buys nothing).
    if(this._ghTriangles){
      const end={x:O.x+R.x*best*D,y:O.y+R.y*best*D,z:O.z+R.z*best*D};
      const t=terrainEntry(this,O,end,0);
      if(Number.isFinite(t)&&t<1){best*=t;kind='ground';ent=null;}
    }else if (R.y < 0) {
      const far = best * D, step = 4;
      let pt = 0;
      for (let t = step; t <= far; t += step) {
        const h = O.y + R.y * t - this.heightAt(O.x + R.x * t, O.z + R.z * t);
        if (h <= 0) {
          let lo = pt, hi = t;
          for (let i = 0; i < 4; i++) {
            const mid = (lo + hi) * 0.5;
            const hm = O.y + R.y * mid - this.heightAt(O.x + R.x * mid, O.z + R.z * mid);
            if (hm <= 0) hi = mid; else lo = mid;
          }
          if (hi / D < best) { best = hi / D; kind = 'ground'; ent = null; }
          break;
        }
        pt = t;
      }
    }
    const P = out.point || (out.point = new THREE.Vector3());
    P.set(O.x + R.x * best * D, O.y + R.y * best * D, O.z + R.z * best * D);
    out.dist = best * D; out.hit = kind; out.ent = ent;
    return out;
  }

  // --- Fog of war: darken the ground outside a vision cone + near radius, with wall shadows ---
  // The fog plane and the occupancy grid must COVER THE WHOLE MAP. They were a fixed 700 units,
  // which was fine while the biggest city was 576 across — an 8×8 grid is 768, and a scaled plan
  // can be far bigger, so anything past the edge simply had no fog at all.

  // Rasterise every live cover box into the occupancy grid. No budget, no sort, no ceiling —
  // a 40-building city and a 400-building city cost the same to look through.

  // THE GROUND IS REAL. Bilinear sample of the terrain heightfield at a world point.
  // ⚠ Before this existed, physics used a hard y=0 plane and every crater, quarry and metro
  // cut was PURELY COSMETIC — you walked on an invisible flat floor over a 5-unit pit.
  // Everything that digs (mining pits, the metro trench, blast craters) is now standable,
  // fall-into-able terrain. Entities cache it per frame as `f.groundY`; never call this in a
  // tight inner loop without caching.
  heightAt(x, z) {
    const gh = this._gh, S = this._gseg;
    if (!gh || !S) return 0;
    // ⚠ THE FIELD IS INDEXED BY THE ARENA IT WAS BUILT WITH, NEVER THE LIVE ONE. This read the live
    // `this.ARENA`, and every venue CHANGES that on the way in — the boxing hall, the base, the
    // training hall and PowerWorld all resize it so that spawns and the news crew stay inside the
    // room. The moment they do, every ground query maps world coordinates onto the wrong part of the
    // heightfield: measured inside the ring in a city with relief, `_gh` was dead flat at 23.39 while
    // `heightAt` reported 21.48 → 25.81 across the same 46u. Physics, the ragdoll floor, the ground
    // markers and every decal were reading a floor that was not there.
    // ⚠ It is invisible in a FLAT theatre — the Moon town the venue was built and screenshotted in —
    // which is exactly why it survived: a mis-scaled index into a constant field returns the right
    // answer every time. The bug needs relief to show, and most of the 1,050-city sheet has it.
    const A = this._ghArena || this.ARENA, W = S + 1, k = S / (A * 2);
    if(this._outerTerrain&&(Math.abs(x)>A||Math.abs(z)>A)){
      const outer=this._outerTerrain.heightAt(x,z);
      if(outer!==undefined)return outer;
    }
    const fx = clamp((x + A) * k, 0, S - 0.0001), fz = clamp((z + A) * k, 0, S - 0.0001);
    const c0 = fx | 0, r0 = fz | 0, tx = fx - c0, tz = fz - r0;
    const i0 = r0 * W + c0, i1 = i0 + W;
    if (this._ghTriangles) {
      // PowerWorld's visible PlaneGeometry splits each cell across top-right
      // to bottom-left (indices a,b,d / b,c,d). Sample that rendered surface;
      // bilinear interpolation can put feet above or beneath a crater face.
      if (tx + tz <= 1) return gh[i0] + (gh[i0 + 1] - gh[i0]) * tx + (gh[i1] - gh[i0]) * tz;
      return gh[i1 + 1] + (gh[i1] - gh[i1 + 1]) * (1 - tx) + (gh[i0 + 1] - gh[i1 + 1]) * (1 - tz);
    }
    const a = gh[i0] + (gh[i0 + 1] - gh[i0]) * tx;
    const b = gh[i1] + (gh[i1 + 1] - gh[i1]) * tx;
    return a + (b - a) * tz;
  }

  // ---- RELIEF: the land is not a table ----------------------------------------------------------
  // The terrain was flat everywhere except where something dug into it. A city in a valley, a town
  // on a ridge, a fortress on the high ground — none of it could exist. `plan.relief` raises the
  // heightfield BEFORE any tile is built, so the tiles can then sit on the land they find.
  //
  // Two-part design, and the second part is the one that matters:
  //   1. RELIEF   — a few octaves of value noise shaped by the relief kind, written into _gh.
  //   2. PADS     — every structural cell is then LEVELLED to its own mean height, with a smooth
  //                 apron at its edge. Real cities terrace their hillsides; without this a block
  //                 on a slope has one corner in the air and another buried, and no amount of
  //                 per-building fiddling fixes it. Roads drape over the result, so they ramp
  //                 between terraces on their own.
  _reliefNoise(seed) {
    // deterministic value noise — a small lattice, smoothstep-interpolated. No libraries, no
    // trig-hash artefacts, and the same city always grows the same hills.
    const R = 16, g = new Float32Array((R + 1) * (R + 1));
    const rnd = mulberry(seed | 0);
    for (let i = 0; i < g.length; i++) g[i] = rnd() * 2 - 1;
    return (u, v) => {                       // u,v in 0..1
      const fu = clamp(u, 0, 0.9999) * R, fv = clamp(v, 0, 0.9999) * R;
      const c0 = fu | 0, r0 = fv | 0;
      const tu = fu - c0, tv = fv - r0;
      const su = tu * tu * (3 - 2 * tu), sv = tv * tv * (3 - 2 * tv);
      const i0 = r0 * (R + 1) + c0, i1 = i0 + R + 1;
      const a = g[i0] + (g[i0 + 1] - g[i0]) * su;
      const b = g[i1] + (g[i1 + 1] - g[i1]) * su;
      return a + (b - a) * sv;
    };
  }
  // THE LIVING WATER SURFACE — one subdivided quad per water cell, merged, depth-tinted:
  // turquoise over the shallows, near-black over the trench ("the deep end is night"), waves in
  // the vertex stage and a drifting glint band in the fragment. NO PURPLE; ki is the only glow.
  _buildWaterSurface(g) {
    const G = this._wGrid;
    if (!G) return;
    const SEG = 6, pos = [], dep = [], idx = [];
    for (let r = 0; r < G.N; r++) for (let c = 0; c < G.N; c++) {
      if (!G.tg[r * G.N + c]) continue;
      const x0 = -G.A + c * G.K, z0 = -G.A + r * G.K, base = pos.length / 3;
      for (let i = 0; i <= SEG; i++) for (let j = 0; j <= SEG; j++) {
        const x = x0 + (j / SEG) * G.K, z = z0 + (i / SEG) * G.K;
        pos.push(x, 0.34, z);
        dep.push(this._sampleDepthGrid(G, x, z));
      }
      for (let i = 0; i < SEG; i++) for (let j = 0; j < SEG; j++) {
        const a = base + i * (SEG + 1) + j, b = a + 1, cc = a + SEG + 1, d2 = cc + 1;
        idx.push(a, cc, b, b, cc, d2);
      }
    }
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 } },
      vertexShader: `
        uniform float uT; attribute float aDepth; varying float vD; varying vec3 vP;
        void main() {
          vD = -aDepth; vP = position;
          float k = 0.14 + min(1.0, vD / 30.0) * 0.12;
          vec3 p = position;
          p.y += sin(uT * 1.15 + position.x * 0.11 + position.z * 0.05) * k
               + sin(uT * 1.9 - position.z * 0.14 + position.x * 0.03) * k * 0.55;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uT; varying float vD; varying vec3 vP;
        void main() {
          vec3 shal = vec3(0.180, 0.435, 0.459);       // #2e6f75
          vec3 deep = vec3(0.071, 0.220, 0.251);       // #123840
          vec3 tren = vec3(0.027, 0.051, 0.063);       // #070d10
          vec3 col = mix(shal, deep, smoothstep(6.0, 22.0, vD));
          col = mix(col, tren, smoothstep(22.0, 42.0, vD));
          float g = sin(vP.x * 0.42 + uT * 0.8) * sin(vP.z * 0.31 - uT * 0.62);
          col += smoothstep(0.93, 1.0, g) * 0.055 / (1.0 + vD * 0.08);
          float a = (0.80 + min(1.0, vD / 34.0) * 0.16) * smoothstep(0.0, 3.0, vD);
          gl_FragColor = vec4(col, a);
        }`,
    });
    const water = new THREE.Mesh(geo, mat);
    water.renderOrder = 1;
    g.add(water);
    this.water = water;
    this._waterT = mat.uniforms.uT;                     // the render loop drives the swell
  }
  _buildRelief(plan) {
    const rel = plan.relief;
    if (!rel || !rel.amp || !this._gh) return 0;
    const A = plan.arena, amp = rel.amp * (plan.scale || 1);
    const n1 = this._reliefNoise(plan.seed * 7717 + 13);
    const n2 = this._reliefNoise(plan.seed * 3313 + 71);
    const pa = this.groundGeo.attributes.position.array;
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < this._gh.length; i++) {
      const x = this._gvx[i], z = this._gvz[i];
      const u = (x + A) / (A * 2), v = (z + A) / (A * 2);
      const d = Math.max(Math.abs(x), Math.abs(z)) / A;                 // 0 centre → 1 edge
      let h = n1(u, v) * 0.68 + n2(u * 2.7, v * 2.7) * 0.32;
      if (rel.kind === 'valley') h = h * 0.4 + d * d * 1.35;            // ringed by high ground
      else if (rel.kind === 'plateau') h = h * 0.4 + (1 - d * d) * 1.1; // the town sits up on it
      else if (rel.kind === 'coastal') h = (h * 0.5 + 0.5) * (1 - u) * 1.6;   // falls to the east shore
      else if (rel.kind === 'mountains') h = h * 1.15 + Math.pow(d, 1.6) * 1.5;
      this._gh[i] = h * amp;
      pa[i * 3 + 2] = this._gh[i];
      if (this._gh[i] < lo) lo = this._gh[i];
      if (this._gh[i] > hi) hi = this._gh[i];
    }
    // (The old x-threshold seaward push lived here; per-cell BATHYMETRY in _buildBathymetry —
    // called for every generated city, flat ones included — replaced it.)
    this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true;
    return hi - lo;
  }
  // ---------------------------------------------------------------------------------------------
  // THE STREET SETS THE LEVEL (Robert, 2026-07-25: "streets should be unobstructed… this stuff
  // should [be] connected by streets, our city builder must fix this" — with a shot of two roads
  // meeting at different heights with a wall between them).
  //
  // ⚠ THE ORDER OF OPERATIONS WAS BACKWARDS. `_padCells` levelled every built-up cell to the
  // terrain height at its OWN CENTRE — a number with no relationship to the street at its edge —
  // and the roads were then DRAPED over whatever those terraces left behind. So two neighbouring
  // lots terraced to two different heights, the road between them inherited the step, and where a
  // carriageway met a cross street it met it as a CLIFF. Measured before this: up to 52 units —
  // ten metres — of ground standing above the road surface. No amount of subdividing the ribbon
  // fixes that, because the ribbon was never the problem: it was faithfully following broken ground.
  //
  // A real city is surveyed the other way round. The junctions fix the levels, the streets run a
  // graded profile between them, and the lots are cut to meet their own frontage. Three passes:
  //   1. NODE HEIGHTS — one level per lattice junction, sampled off the relief.
  //   2. SMOOTH ALONG RUNS — a street is surveyed, so its profile is gentle; each node relaxes
  //      toward the nodes it is actually CONNECTED TO by road. A node with no roads keeps its
  //      landform, which is what stops open country being flattened.
  //   3. GRADE THE CORRIDOR — every terrain vertex inside a carriageway (plus a pavement shoulder)
  //      is pulled onto the road's own interpolated profile, blending out over a verge.
  // `_padCells` then terraces each lot to the mean of ITS OWN four corner nodes, so a block stands
  // flush with the streets that surround it instead of on a pedestal beside them.
  // THE WORLD REALISES THE SURVEY, IT DOES NOT INVENT IT. `surveyCity` (data/cityplan.js) decides
  // every level from the road graph and a grade limit, with no reference to Three.js; everything
  // below simply stamps those numbers into the heightfield. Keeping the decision in the plan is
  // what lets the map tool draw it, the validator check it, and a future traffic system agree with
  // it — three things that were impossible while levels were a side effect of building geometry.
  _survey(plan) {
    if (!plan || !plan.roads || !this._gh) return null;
    return plan.survey || surveyCity(plan, (x, z) => this.heightAt(x, z));
  }

  // Pull every vertex inside a carriageway onto the surveyed profile, blending out across the
  // verge. GRIP: heightAt interpolates a ~4u lattice, coarse next to a 22u street, so a vertex
  // just OUTSIDE the kerb still drags the sampled height inside it — hold full grade one vertex
  // wider or a kerb-height lip survives on the tarmac.
  _gradeRoads(plan) {
    if (!plan || !plan.roads || !this._gh || !this.groundGeo) return 0;
    if (!plan.survey) this._survey(plan);
    if (!plan.survey) return 0;
    const pa = this.groundGeo.attributes.position.array;
    const GRIP = (plan.arena * 2) / 112;
    let touched = 0;
    for (let i = 0; i < this._gh.length; i++) {
      const hit = surveyAt(plan, this._gvx[i], this._gvz[i], GRIP);
      if (!hit) continue;
      this._gh[i] = this._gh[i] * (1 - hit.w) + hit.y * hit.w;
      pa[i * 3 + 2] = this._gh[i];
      touched++;
    }
    this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true;
    return touched;
  }

  // Level each built-up cell so a block stands on flat ground, with an apron so the terrace edge
  // is a slope you can run up rather than a cliff.
  _padCells(plan) {
    if (!plan.relief || !plan.relief.amp || !plan.cells || !this._gh) return;
    const A = plan.arena, K = plan.cell || CELL;
    const OPEN = { water: 1, park: 1, farmland: 1, forest: 1, mountain: 1 };
    const pads = [];
    for (let r = 0; r < plan.N; r++) for (let c = 0; c < plan.N; c++) {
      const cell = plan.cells[r][c];
      if (!cell || cell.ref || OPEN[cell.t]) continue;
      const fw = cell.fw || 1, fh = cell.fh || 1;
      const cx = -A + (c + fw / 2) * K, cz = -A + (r + fh / 2) * K;
      // ⚠ THE LOT IS CUT TO ITS OWN FRONTAGE, not to the ground under its middle — that is what
      // let a block sit several units above the road at its kerb (the step walls in Robert's shot).
      // ⚠ AND A LOT IS NOT FLAT. Levelling a block to ONE height is the classic mistake: on a slope
      // it can meet the street at the top of the hill or the one at the bottom, never both, and the
      // difference comes out as a retaining wall at the kerb — measured at 22 units on a mountain
      // city. A real block is a gently tilted plane pinned to its own four corners. Carrying the
      // corner levels and interpolating BILINEARLY means every frontage meets its street exactly,
      // by construction, and the tilt across a 96u block is bounded by the same grade limit the
      // streets were surveyed under — so it is always ground you can build on and run up.
      const SV = plan.survey;
      const c0 = Math.min(c, plan.N), c1 = Math.min(c + fw, plan.N);
      const r0 = Math.min(r, plan.N), r1 = Math.min(r + fh, plan.N);
      const corners = SV
        ? [SV.node[r0][c0], SV.node[r0][c1], SV.node[r1][c0], SV.node[r1][c1]]
        : null;
      const y = SV ? SV.cell[r][c] : this.heightAt(cx, cz);
      pads.push({ cx, cz, hx: (fw * K) / 2 - 6, hz: (fh * K) / 2 - 6, y,
                  corners, x0: -A + c * K, z0: -A + r * K, w: fw * K, d: fh * K });
    }
    // A generous apron. Too tight and every block stands on a visible earth plinth; this is the
    // difference between a terraced hillside and a set of buildings on pedestals.
    const pa = this.groundGeo.attributes.position.array, apron = K * 0.42;
    for (let i = 0; i < this._gh.length; i++) {
      const x = this._gvx[i], z = this._gvz[i];
      let best = null, bw = 0;
      for (const p of pads) {
        const dx = Math.abs(x - p.cx) - p.hx, dz = Math.abs(z - p.cz) - p.hz;
        const d = Math.max(dx, dz);
        if (d > apron) continue;
        const t = d <= 0 ? 1 : 1 - d / apron;
        const w = t * t * (3 - 2 * t);
        if (w > bw) { bw = w; best = p; }
      }
      if (!best) continue;
      // the lot's own surface at this point: bilinear across its four surveyed corners
      let target = best.y;
      if (best.corners) {
        const u = Math.min(1, Math.max(0, (x - best.x0) / best.w));
        const v = Math.min(1, Math.max(0, (z - best.z0) / best.d));
        const [h00, h01, h10, h11] = best.corners;
        target = (h00 * (1 - u) + h01 * u) * (1 - v) + (h10 * (1 - u) + h11 * u) * v;
      }
      this._gh[i] = this._gh[i] * (1 - bw) + target * bw;
      pa[i * 3 + 2] = this._gh[i];
    }
    this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true;
  }

  // A RECTANGULAR CUT into the land — what crater() is to a bomb, this is to an excavator.
  // Used by the METRO to open a cut-and-cover trench (and available to any tile that wants a
  // canal, a rail cut or a sunken plaza). Cuts with min(), so it carves instead of accumulating.
  trench(cx, cz, hw, hd, depth, slope = 11, ry = 0) {
    if (!this.groundGeo) return;
    const pa = this.groundGeo.attributes.position.array;
    const cs = Math.cos(-ry), sn = Math.sin(-ry);
    for (let i = 0; i < this._gh.length; i++) {
      const ox = this._gvx[i] - cx, oz = this._gvz[i] - cz;
      const lx = ox * cs - oz * sn, lz = ox * sn + oz * cs;          // into the cut's local frame
      const d = Math.max(Math.abs(lx) - hw, Math.abs(lz) - hd);      // distance outside the rectangle
      if (d > slope) continue;
      const t = d <= 0 ? 1 : 1 - d / slope;
      const dh = -depth * (t * t * (3 - 2 * t));                     // smoothstep walls, flat floor
      if (dh < this._gh[i]) { this._gh[i] = dh; pa[i * 3 + 2] = dh; }
    }
    this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true;
    this.flattenGrass(cx, cz, Math.max(hw, hd) + slope);
  }

  // ---- THE ROAD NETWORK ---------------------------------------------------------------------
  // Roads used to be a WRAPPED GROUND TEXTURE. That one fact is why every cell had a street on
  // all four sides, forever: no junctions, no dead ends, no dirt lanes, no highway, and no way to
  // connect one specific cell to another. Roads are GEOMETRY now, built from `plan.roads` — an
  // edge whose class is R_NONE is simply not built, which is what makes a dead end possible.
  // Each edge is a subdivided ribbon DRAPED over the heightfield (so it dips into the metro cut
  // and rides the mining spoil instead of floating), textured with a real street CROSS-SECTION
  // that tiles along the run, and merged into ONE mesh per road class — five draws for a city.
  // Road paint — crosswalks, stop lines, roundabout chevrons. One shared unlit material, because
  // paint is paint: it must read the same at noon and midnight and must never take a specular hit.

  // ---- JUNCTIONS -------------------------------------------------------------------------------
  // A crossing was a flat square patch of the widest approach. That reads as a hole in the network:
  // no corner radius, no crosswalks, no stop line, and a T-junction looked exactly like a
  // crossroads. A junction is now built from what `junctionAt` actually says — its DEGREE and the
  // CLASS of each arm — so the network has grammar instead of one repeated stamp.
  //
  //   deg 1  dead end     → turning head (a circle, so it reads as a cul-de-sac not a cut mesh)
  //   deg 2  corner/through → patch + a corner fillet on the inside of the turn
  //   deg 3  tee          → patch + fillets + crosswalks on each arm
  //   deg 4  crossroads   → the same, on four arms
  //   arterial+ and deg≥3 → a ROUNDABOUT: annulus carriageway + a kerbed island
  //
  // Everything merges into the same per-class buckets, so a junction costs no extra draw calls.
  _isRoundabout(plan, r, c) {
    return !!(plan.roundabouts && plan.roundabouts.some(([rr, cc]) => rr === r && cc === c));
  }
  // The middle of a roundabout: a kerbed, planted island. It is REAL COVER — the reason to build a
  // roundabout instead of painting one is that it puts a hard object in the middle of a crossroads.
  _roundaboutIsland(group, x, z, r, plan) {
    const y = this.heightAt(x, z);
    const kerbMat = new THREE.MeshStandardMaterial({ color: '#cfc8b6', roughness: 0.9 });
    const kerb = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.6, 20), kerbMat);
    kerb.position.set(x, y + 0.8, z); kerb.receiveShadow = true; group.add(kerb);
    const grass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 20),
      new THREE.MeshBasicMaterial({ color: (plan.region && plan.region.green) || '#6f9a4e', depthWrite: false }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(x, y + 1.65, z); group.add(grass);
    // a monument on the island — small, but it is the thing you navigate by
    const h = r * 1.5;
    const ob = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.18, h, 4),
      new THREE.MeshStandardMaterial({ color: '#dcd4c0', roughness: 0.8 }));
    ob.position.set(x, y + 1.6 + h / 2, z); ob.castShadow = true; group.add(ob);
    const co = { mesh: kerb, crack: null, x, z, r: r * 1.05, h: y + h + 2, hx: r, hz: r,
                 top: y + 1.6, hp: 400, maxHp: 400, y0: kerb.position.y, w: r * 2, d: r * 2, destroyed: false };
    this.cover.push(co); this.coverAll.push(co);
  }

  // --- destructible terrain (GeoMod-lite): crater the ground ---
  /**
   * LEVEL A RECTANGULAR PAD TO ONE HEIGHT, with a sloped apron so it does not leave a cliff.
   *
   * ⚠ A VENUE CANNOT INHERIT THE GROUND IT LANDS ON. The boxing hall was built on whatever terrain the
   * theatre had at the origin, and in a city with relief that is a HILLSIDE: measured across the 46u
   * canvas, `heightAt` ran 19.7 → 28.1 — an 8.4u rise, 22 distinct heights. The canvas draws flat, so
   * the floor the fighters actually stand on disagreed with the floor they could see, one boxer stood
   * eight units above the other, and a corner read as someone floating outside the ropes. It only ever
   * looked right because the reference shot was taken on the Moon, where that spot happens to be flat.
   *
   * Returns an undo record; pass it to `restoreTerrainPatch` to put the land back exactly.
   */
  levelArea(cx, cz, hw, hd, y, apron = 26) {
    if (!this.groundGeo) return null;
    const pa = this.groundGeo.attributes.position.array, undo = [];
    for (let i = 0; i < this._gh.length; i++) {
      const dx = Math.abs(this._gvx[i] - cx) - hw, dz = Math.abs(this._gvz[i] - cz) - hd;
      const out = Math.max(0, dx, dz);
      if (out > apron) continue;
      const t = out <= 0 ? 1 : 1 - out / apron;                       // 1 inside the pad, easing out
      const k = t * t * (3 - 2 * t);                                  // smoothstep, so no rim
      undo.push(i, this._gh[i]);
      this._gh[i] = this._gh[i] + (y - this._gh[i]) * k;
      pa[i * 3 + 2] = this._gh[i];
    }
    this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true;
    return undo;
  }

  /** Put back exactly what `levelArea` changed — the venue restore contract, for the land. */
  restoreTerrainPatch(undo) {
    if (!undo || !this.groundGeo) return;
    const pa = this.groundGeo.attributes.position.array;
    for (let n = 0; n < undo.length; n += 2) {
      const i = undo[n]; this._gh[i] = undo[n + 1]; pa[i * 3 + 2] = this._gh[i];
    }
    this.groundGeo.attributes.position.needsUpdate = true; this._normalsDirty = true;
  }

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
      const base = this._ghBase ? this._ghBase[i] : 0;                                    // mining pits are part of the land
      this._gh[i] = clamp(this._gh[i] + dh, base - 6.5, base + 1.4);                      // accumulate, clamped (the limit)
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
    c.crack.userData.baseO = c.crack.material.opacity;   // the cutaway fade needs the damage-truth to restore to
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
      if(c.frontlineAircraft)continue; // Dynamic flight owner retains its pose on terrain reset.
      if(c.finiteBuilding){c.onReset?.();continue;} // Authored nodes remain local to the building root.
      c.mesh.visible = true; c.mesh.position.set(c.x, c.y0, c.z); c.mesh.scale.set(1, 1, 1);
      if (c.crack) { c.crack.visible = false; c.crack.material.opacity = 0; c.crack.position.copy(c.mesh.position); c.crack.scale.set(1, 1, 1); }
    }
    this.cover = this.coverAll.slice();
    this.refreshFogBoxes();
    this._restoreGrass();
    if (this.groundGeo) {
      const pa = this.groundGeo.attributes.position.array;
      for (let i = 0; i < this._gh.length; i++) { const b = this._ghBase ? this._ghBase[i] : 0; this._gh[i] = b; pa[i * 3 + 2] = b; }   // back to the city's base land (pits stay dug)
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


  // ---------------------------------------------------------------------------------------------
  // THE BANDS FIT THE BUILDINGS (Robert, 2026-07-25: "building height should only be as high as
  // standing/levitating on top of our tallest building… you can stand on. We need to establish
  // that first — right now stuff seems too high").
  //
  // ⚠ computeBands NEVER MEASURED ANYTHING. It read TILE_MAX_H — a DECLARED ceiling per tile type,
  // not a built one — added the relief amplitude and a flat +8, then hung SKY and CEILING off that
  // at fixed +110 / +170. Measured on the flagship: the tallest surface you can stand on is 132u,
  // BUILDING sat at 158 (26u of air above every roof), and CEILING at 328 — 196u, thirty-seven
  // metres, of nothing, over a city 132u tall. The sky was 2.5× the city.
  //
  // A band is a claim about where the BUILDINGS are, so it has to be measured after they exist.
  // This runs once per city build, reads the actual tops of the actual standable surfaces, and
  // rescales the ladder around that. BAND_SHAPE holds the multipliers so they are one place to
  // argue with, not three magic numbers buried in a planner.
  // THE SHAPE OF THE SKY, as multiples of the tallest roof. These are the numbers to argue with —
  // `bands sky 1.6` in the console changes them live so a ruling can be FLOWN before it is written.
  //   sky 1.45 — the lane above the roofs is about half a city deep
  //   ceiling 1.9 — and the lid is about one more city above that
  // (was: a flat +110 and +170 on a band that itself floated 26u over every building)
  static BAND_SHAPE = { sky: 1.45, ceiling: 1.9 };

  fitBands() {
    let top = 0;
    for (const c of (this.coverAll || [])) { const t = c.top ?? c.h; if (t != null && t > top) top = t; }
    for (const it of (this.interiors || [])) { const t = it.top ?? it.h; if (t != null && t > top) top = t; }
    if (!(top > 0)) return null;                    // open country: keep whatever the plan said
    const S = this.BAND_SHAPE || World.BAND_SHAPE;
    // ⚠ THE CEILING NEEDS A FLOOR, AND THIS IS WHY "THEY DON'T SEEM TO FLY ANYMORE" IN THE CITY.
    // Deriving the lid from the tallest building is right for the band SHAPE — it is what keeps
    // rooftop play working — but as an absolute cap it collapses on a small map. Measured on Robert's
    // own saved theatre (TRANQUILITY REACH, a Moon village: three buildings, tallest 25u) the flight
    // ceiling came out at **42u — about four times a fighter's own height.** The flagship, with 132u
    // towers, gets 224. Most of the 1,050-city sheet is villages, small towns and towns, so most
    // theatres in the game have had a sky you hit almost immediately.
    // ⚠ A superhero has to be able to get above the map whether or not the map has skyscrapers. The
    // shape still scales with what was built; only the floor is absolute.
    const MIN_CEIL = 260, MIN_SKY = 150;
    const b = {
      ground: 8,
      // ⚠ "as high as STANDING on top of our tallest building" — a fighter on that roof has their
      // feet at `top` and their head at top + 9.6. Ending the band exactly at the roof puts anyone
      // standing on the tallest building in the SKY band while their boots are on concrete.
      building: Math.round(top + 10),
      sky: Math.max(MIN_SKY, Math.round(top * S.sky)),
      ceiling: Math.max(MIN_CEIL, Math.round(top * S.ceiling)),
      shallows: (this.plan && this.plan.bands && this.plan.bands.shallows) ?? -10,
      depths: (this.plan && this.plan.bands && this.plan.bands.depths) ?? -26,
    };
    this._measuredTop = top;
    setBands(b);
    if (this.plan) this.plan.bands = b;
    return b;
  }

  // ---------------------------------------------------------------------------------------------
  // THE FLICKER AUDIT — find z-fighting before a player does. See THE SURFACE-SEPARATION LAW in
  // core/util.js for why this exists. It walks the LIVE scene, takes the top face of every visible
  // mesh, and reports any pair that overlaps in XZ while sitting closer together in Y than
  // DECAL_LIFT. That is exactly the condition the depth buffer cannot resolve at camera range.
  //
  // ⚠ It reads the BUILT scene, not the source, so it cannot be fooled by a builder that looks
  // correct and computes a bad number — which is the only kind of mistake that has actually
  // shipped here. Run it after any interior, tile or decal work:  LSW.game.world.auditSurfaces()
  auditSurfaces(opts = {}) {
    const minSep = opts.minSep ?? DECAL_LIFT, minArea = opts.minArea ?? 6;
    const box = new THREE.Box3(), items = [], skipped = [];
    this.scene.updateMatrixWorld(true);
    this.scene.traverse(o => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      for (let p = o.parent; p; p = p.parent) {
        if (!p.visible) return;                                          // hidden branch
        if (p.userData && p.userData.rig) return;                        // a character, not the level
      }
      // ⚠ a surface faded to nothing cannot flicker. Crack overlays sit at +0.05 on every building
      // face and live at opacity 0 until something hits them, so counting them would bury the real
      // findings under one false positive per destructible block in the city.
      const mm = Array.isArray(o.material) ? o.material : [o.material];
      if (mm.every(m => m && m.transparent && (m.opacity ?? 1) < 0.02)) return;
      // ⚠ `depthWrite: false` is a surface DECLARING that it will not take part in the depth test —
      // additive glows, rings, washes, tracers. It cannot z-fight by construction, so counting it
      // buries the surfaces that can. This is the difference between an audit and a noise generator.
      if (mm.every(m => m && m.depthWrite === false)) return;
      // ⚠ THE BOX MUST BE THIS MESH ALONE. Box3.setFromObject walks DESCENDANTS, and a building
      // carries its own roof plane as a child — so every tower in the city was reported as
      // z-fighting with its own roof at a gap of exactly 0, which is both a lie and a very
      // convincing one. Take the geometry's own bounds through the world matrix instead.
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      if (!isFinite(box.min.x) || !isFinite(box.max.y)) return;
      const w = box.max.x - box.min.x, d = box.max.z - box.min.z;
      if (w * d < minArea) return;                                     // too small to read as a plane
      // ⚠ THE SPARSE-MESH BLIND SPOT, now declared instead of silently crying wolf. An AABB test
      // assumes a mesh FILLS its box. A hollow ring of four border walls is 96 vertices spanning
      // 483x483, so its box covers the entire city and it "overlaps" every prop in it — that one
      // mesh accounted for 95 of 98 reported problems on a real city, all of them false. Same for
      // any merged sparse set. Vertices per unit of footprint separates a real surface (a road
      // ribbon is 3,098 verts over its span) from a frame around empty air. Untestable pairs are
      // COUNTED AND NAMED in `skipped` — an audit that hides what it could not check is worse than
      // one that cries wolf, because you stop looking.
      const density = o.geometry.attributes.position.count / (w * d);
      if (w * d > 20000 && density < 0.004) { skipped.push(o.name || o.geometry.type); return; }
      items.push({ o, y: box.max.y, x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, w, d });
    });
    items.sort((a, b) => a.y - b.y);
    const hits = [];
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      for (let j = i + 1; j < items.length; j++) {
        const b = items[j];
        const dy = b.y - a.y;
        if (dy >= minSep - 1e-4) break;   // sorted — nothing further can match. The epsilon matters:
        // a surface deliberately placed at exactly DECAL_LIFT is CORRECT, and without it every
        // rooftop in the game reports itself as a problem for obeying the rule.
        if (b.x0 >= a.x1 || b.x1 <= a.x0 || b.z0 >= a.z1 || b.z1 <= a.z0) continue;
        // an honest overlap must be big enough to actually be seen tearing
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
        if (ox * oz < minArea) continue;
        // a surface deliberately sunk in depth has already declared a winner — not a fight
        const sunk = (m) => { const l = Array.isArray(m) ? m : [m]; return l.some(x => x && x.polygonOffset); };
        if (sunk(a.o.material) || sunk(b.o.material)) continue;
        const tag = (m) => m.o.name || (m.o.parent && m.o.parent.name) || m.o.geometry.type;
        hits.push({ gap: +dy.toFixed(4), y: +a.y.toFixed(2), area: Math.round(ox * oz),
                    a: tag(a), b: tag(b), size: `${Math.round(a.w)}x${Math.round(a.d)}` });
      }
    }
    hits.sort((p2, q) => (p2.gap - q.gap) || (q.area - p2.area));
    const ground = this.auditGround(opts);
    // ⚠ TWO KNOWN BLIND SPOTS, both inherent to testing axis-aligned boxes:
    //   · A MERGED or INSTANCED mesh spanning the whole map (the road classes, the grass) has a
    //     map-wide bounding box, so two of them always "overlap" even when their ribbons never
    //     touch. Expect a standing pair at road height; it is not a defect.
    //   · Two SOLIDS that interpenetrate (a head inside a torso) are reported, but a solid
    //     intersection is resolved correctly by the depth test — only near-COPLANAR surfaces tear.
    // Both over-report. Neither can hide a real fight, which is the trade worth making.
    return { surfaces: items.length, problems: hits.length, worst: hits.slice(0, 12),
             untestable: skipped.length, untestableNames: [...new Set(skipped)],
             ground: ground.problems, groundWorst: ground.worst, groundSolids: ground.solids };
  }

  /**
   * THE OTHER HALF OF THE AUDIT — every surface against THE GROUND ITSELF.
   *
   * ⚠ THIS IS THE ONE THAT WAS MISSING, AND ITS ABSENCE IS WHY THE FLICKER KEPT COMING BACK.
   * `auditSurfaces` compares mesh AABB to mesh AABB. The terrain is ONE mesh, and on a city with
   * relief its box spans y −13 → +122.65 — so `box.max.y` is the highest peak in the map. Every
   * decal in the city sits more than `DECAL_LIFT` below that peak, the sorted loop breaks, and
   * **nothing is ever compared against the ground at all**. Measured proof that the instrument was
   * inverted: it reported FEWER problems on mountains (24) than on hills (36) while the real defect
   * count went the other way. Every previous fix was verified against a gauge that could not see
   * the fault, which is exactly how you "keep trying to fix it and keep getting it wrong".
   *
   * ⚠ IT SAMPLES TRIANGLE CENTROIDS, NOT ONLY VERTICES. A road junction fillet is an 8-triangle fan
   * whose three corners each sit exactly `ROAD_LIFT` above the terrain while the middle of the
   * triangle is **13 units underneath it**. A vertex-only test says that surface is perfect. Any
   * flat triangle spanning sloped ground has this property; it is the whole reason a constant
   * offset cannot save a coarse mesh on a hill.
   */
  auditGround(opts = {}) {
    const minSep = opts.minSep ?? DECAL_LIFT, hits = [];
    let solids = 0;
    if (!this._gh) return { problems: 0, worst: [], solids: 0 };
    const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    this.scene.updateMatrixWorld(true);
    this.scene.traverse(o => {
      if (!o.isMesh || !o.visible || !o.geometry || o === this.ground) return;
      for (let p = o.parent; p; p = p.parent) {
        if (!p.visible) return;
        if (p.userData && p.userData.rig) return;      // a character stands ON the ground, by design
      }
      const g = o.geometry, pos = g.attributes && g.attributes.position;
      if (!pos || pos.count < 3) return;
      // ⚠ ONLY SHEETS CAN TEAR. A boulder half-buried in a hillside, a building sunk into its own
      // terrace and a tree with its roots under the soil are all INTENDED, and the depth test
      // resolves a solid intersection correctly — only near-COPLANAR surfaces fight. Without this
      // the ground audit reports 300+ "problems" that are the city working as designed, which is
      // just the old blind spot inverted: an audit that cries wolf is one you stop reading.
      // A sheet is thin in its own Y relative to its footprint; a draped ribbon still is.
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox, gh = (bb.max.y - bb.min.y) * Math.abs(o.scale.y || 1);
      const gw = (bb.max.x - bb.min.x) * Math.abs(o.scale.x || 1);
      const gd = (bb.max.z - bb.min.z) * Math.abs(o.scale.z || 1);
      const foot = Math.min(gw, gd);
      if (!(gh <= 1.5 || gh < foot * 0.12)) { solids++; return; }        // a solid — declared, not counted
      // ⚠ The terrain itself, the sky, the water and anything that opts out of depth are all
      // legitimately not "clearing the ground" — skip them rather than report 400 false hits.
      if (o === this.skyMesh || (o.name && /^(sky|water|fog|ground)/i.test(o.name))) return;
      const mm = Array.isArray(o.material) ? o.material : [o.material];
      if (mm.every(m => m && m.depthWrite === false)) return;
      if (mm.every(m => m && m.transparent && (m.opacity ?? 1) < 0.02)) return;
      let worst = Infinity, wx = 0, wz = 0, kind = 'vertex';
      const idx = g.index, n = idx ? idx.count : pos.count;
      const stride = Math.max(3, Math.floor(n / 900) * 3);   // bounded work on a merged city mesh
      for (let i = 0; i + 2 < n; i += stride) {
        const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
        b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
        c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
        // the three corners AND the centroid — the centroid is what catches a big flat triangle
        // laid across a slope, which no vertex test can see
        for (let k = 0; k < 4; k++) {
          if (k === 0) v.copy(a); else if (k === 1) v.copy(b); else if (k === 2) v.copy(c);
          else v.copy(a).add(b).add(c).multiplyScalar(1 / 3);
          const clear = v.y - this.heightAt(v.x, v.z);
          if (clear < worst) { worst = clear; wx = v.x; wz = v.z; kind = k === 3 ? 'centroid' : 'vertex'; }
        }
      }
      // ⚠ A PIER IS SUPPOSED TO BE ABOVE A SEABED THAT FALLS AWAY. The last survivors of this audit
      // were all seaport decking and quays (`wood`, container paint) reported at -80u clearance —
      // which is not a defect, it is a jetty over deep water doing exactly its job. A ground audit
      // that does not know about water reports the harbour as broken forever, and an audit you learn
      // to ignore is worse than none. Counted as a solid (declared) rather than a problem.
      if (worst < minSep && this.waterAt && this.waterAt(wx, wz)) { solids++; return; }
      if (worst < minSep) {
        hits.push({ clear: +worst.toFixed(2), at: kind,
                    name: o.name || (o.parent && o.parent.name) || g.type,
                    x: Math.round(wx), z: Math.round(wz) });
      }
    });
    hits.sort((p2, q) => p2.clear - q.clear);
    return { problems: hits.length, worst: hits.slice(0, 14), solids };
  }

  render() {
    const now = performance.now();
    if (this._normalsDirty) { this._normalsDirty = false; this.groundGeo.computeVertexNormals(); }   // one recompute per frame, no matter how many craters landed
    if (this._grassTime) this._grassTime.value = now / 1000;   // wind
    if (this._waterT) this._waterT.value = now / 1000;         // harbor swell
    const sdt = Math.min((now - (this._lastRender || now)) / 1000, 0.1);
    if (this._spinners.length) {
      for (let i = 0; i < this._spinners.length; i++) this._spinners[i].obj.rotation.z += this._spinners[i].rate * sdt;
    }
    if (this.wildlife) this.wildlife.update(sdt);   // birds + litter — see wildlife.js
    if (this._lastRender) {
      const d = Math.min(now - this._lastRender, 100);
      this._ema = this._ema * 0.9 + d * 0.1;
      // LEARN THE DISPLAY'S CADENCE — the governor's thresholds are relative to it (see below).
      // ⚠ IT HAS TO BE ABLE TO LEARN *UPWARD*. Learning only the minimum looks right — a vsynced
      // display cannot present faster than its refresh — but starting from an optimistic 16.7 it can
      // then never discover that it is on a 40 Hz panel, which is the whole bug.
      // ⚠ AND IT IS CAPPED AT 26 ms, which is what keeps this from excusing real failure: a locked
      // 40 Hz panel is 25 ms, so anything slower than 26 is treated as the game missing frames
      // rather than as the display's cadence. (A perfectly steady 38 ms is genuinely ambiguous with
      // a locked 26 Hz display; we resolve it as failure, because no target device is 26 Hz.)
      if (d > 6) {
        if (d < this._refreshMs) this._refreshMs = this._refreshMs * 0.7 + d * 0.3;        // snap to a faster floor
        else this._refreshMs = Math.min(26, Math.min(d, this._refreshMs + 0.06));          // creep up to a slower one
      }
      if(!this._threatRoom?.active)this.updateDayNight(d / 1000);                            // the sun keeps its own schedule
    }
    this._lastRender = now;
    // THE SKY IS A DIRECTION, NOT A PLACE. The dome used to sit parked at the origin, so any
    // camera away from center saw a 900u balloon — horizon too close on one side, too far on
    // the other, and a PowerWorld fighter at the play edge was literally outside the sky
    // (the old note on _buildSky). Riding the active camera every frame makes it optically
    // infinite: the horizon sits at eye level from every seat — the curb, the far edge, orbit.
    // (Shader-safe: the star hash keys off the dome-space DIRECTION, which is exactly the view
    // direction once the center is the eye. News POV recenters for its own pass in newscrew.)
    if (this.skyMesh) this.skyMesh.position.copy(this.camera.position);
    this._qCool -= 0.016;
    // ⚠ THE GOVERNOR INVERTED AT 40 Hz, AND THE STEAM DECK GUIDE TELLS PLAYERS TO LOCK 40 Hz.
    // `_ema` tracks the PRESENTED interval, and the loop is rAF-driven — so a display locked at
    // 40 Hz reports 25 ms even with the GPU asleep. Against fixed thresholds that is `> 24`
    // forever: the tier fell to 0 in about five seconds and could never come back, because 17.2 ms
    // is unreachable at 40 Hz. Exactly the bug the old comment on the raise line describes, one
    // refresh rate further down.
    //
    // The fix is that the thresholds are RELATIVE to the display's own cadence, learned as the
    // fastest interval this session (a vsynced display cannot present faster than its refresh, so
    // the floor IS the cadence). Verify the arithmetic: at 60 Hz this reproduces the old numbers
    // almost exactly — drop 16.7×1.45 = 24.2 (was 24), raise 16.7×1.08 = 18.0 (was 17.2) — so
    // desktop behaviour is unchanged. At 40 Hz it becomes drop 36.3 / raise 27.0, and a comfortable
    // 25 ms now reads as headroom instead of as failure.
    if (this._qCool <= 0 && this.qualityOverride == null) {   // settings can lock the tier
      const R = Math.max(8, Math.min(34, this._refreshMs));
      if (this._ema > R * 1.45 && this._qTier > 0) { this._qTier--; this._applyQuality(); this._qCool = 1.4; }
      else if (this._ema < R * 1.08 && this._qTier < 2) { this._qTier++; this._applyQuality(); this._qCool = 4; }
    }
    // Quality changes resize (and clear) the canvas. Finish them BEFORE drawing so
    // every presented frame contains the scene, including the transition frame.
    this.composer.render();
    // ⚠ TICK AFTER THE RENDER, NEVER BEFORE. The impact frame is a ONE-FRAME uniform: ticking first
    // decrements it to zero and clears `uInvert` before the frame it belongs to is ever drawn, so
    // the punch lands and the screen does not change. Measured as identical mean brightness before,
    // during and after — a effect that is switched on and off between the same two renders.
    // The print pass keeps its own clock because the sim stops for menus and this must not.
    if (this.print) this.print.tick(sdt);
  }
  /**
   * THE PROJECTION, for whichever camera is active. One place, because an orthographic camera is
   * sized by `left/right/top/bottom` and a perspective one by `fov/aspect` — and three separate
   * sites in this file were writing the ortho four by hand.
   */
  _applyProj() {
    const asp = innerWidth / innerHeight, c = this.camera;
    if (c.isOrthographicCamera) {
      c.left = -this.frustum * asp; c.right = this.frustum * asp;
      c.top = this.frustum; c.bottom = -this.frustum;
    } else {
      c.aspect = asp; c.fov = this._chaseFov || 58;
    }
    c.updateProjectionMatrix();
  }

  /**
   * World height of the frame at a world point (aaa-06 §1.3). The ONE number every screen-relative
   * size reads — the GROUND_LAYER/DECAL_LIFT ladder shape (core/util.js) applied to sizes instead of
   * heights, so forty call sites stop each picking a small number. On the ortho camera the frame is a
   * constant `2·frustum` (156u); on the perspective chase camera it is `2·dist·tan(fov/2)`, so a
   * 9.6u fighter is 6.2% of the frame at ortho and 29% at a clinch — which is the whole point.
   */
  frameHeightAt(p) {
    const c = this.camera;
    if (c.isOrthographicCamera) return this.frustum * 2;
    const dx = c.position.x - p.x, dy = c.position.y - p.y, dz = c.position.z - p.z;
    return 2 * Math.hypot(dx, dy, dz) * Math.tan((c.fov * Math.PI / 180) / 2);
  }

  /**
   * SWAP THE ACTIVE CAMERA. Verified live before any of this was written: the existing
   * `EffectComposer` renders a `PerspectiveCamera` through the identical chain — bloom, ACES tone
   * mapping and the print pass all simply work — for 0.65ms and **zero new shader programs**. The
   * swap really is one assignment on the RenderPass; `spaceflight.js` already does the same trick on
   * the other axis by swapping a whole SCENE into that pass.
   */
  setCameraMode(mode) {
    if(mode!=='chase')clearForegroundVisibility(this);
    if (mode === this.camMode) return this.camera;
    if (mode === 'chase' && !this.camChase) {
      this.camChase = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.6, 4200);
      this._chaseFov = 58;
    }
    // First frame in chase: the eye is inherited from the ortho drive (a 260u-distant iso position).
    // Snap so it does not fly in from there (aaa-04 §4.8, trigger 1 — the only one in this lane).
    if (mode === 'chase') this.snapChase();
    this.camera = mode === 'chase' ? this.camChase : this.camOrtho;
    this.camMode = mode;
    this._applyQuality();   // the tier ladder reads camMode (the shadow pass) — re-apply on a swap
    // ⚠ the RenderPass holds its OWN reference, so moving the pointer is not enough
    for (const p of (this.composer ? this.composer.passes : [])) if (p.camera) p.camera = this.camera;
    this._applyProj();
    return this.camera;
  }

  // ================================================================================================
  // THE FRAME CLAIM (aaa-04 §5). A move may briefly BORROW the camera through an ADDITIVE, per-
  // parameter override, and it can NEVER invert the controls.
  //
  // ⚠ EVERY FIELD ADDS OR MULTIPLIES; NONE REPLACES (§5.2). Ours are computed every frame from the
  // gap, the speed and the altitude — a claim that REPLACED `range` with 60 would defeat the fit rule
  // and reintroduce the cutscene framing world.js already paid for once. Additive claims compose with
  // derived framing; replacing ones fight it. Absent field = a null claim (JS makes the flag word free
  // — JKA needed a bitmask only because C has no null float).
  //
  // ⚠ PLAYER-ONLY BY CONSTRUCTION (§5.4, openjk.md:687-689). The claim is tagged with its CLAIMANT and
  // applied only when that claimant is the chased subject. `cameraDrive` only ever frames `this.player`
  // (game.js), so an AI throwing the IDENTICAL move moves the camera by exactly 0 — the door is
  // player-gated with no reference to `game.humans` from inside the world. An AI claim still ramps its
  // envelope out and is reaped; it is simply never selected as the effective claim.
  //
  // ⚠ THE ENVELOPE IS READ FROM THE MOVE'S OWN CLOCK, NEVER A TIMER THE CAMERA OWNS (§5.3). `phase`
  // names which live field of the move drives liveness; when that clock is exhausted the claim releases
  // itself, so it cannot desynchronise from the move. The in/out ramps are ASYMMETRIC by default
  // (in 1.0 / out 0.5 — JKA's own ratio, cg Force Speed eases out twice as fast) so a power reads as
  // ENDING rather than fading. ⚠ It is a TRANSIENT: a live claim surviving a match reset is a camera
  // stuck 18u back next fight. The reset path (game.clearTransients) must call `world.clearFrameClaims()`
  // — RIDER to the game.js owner; documented in aaa-04 §5.4.
  clearFrameClaims() { if (this._camClaims) this._camClaims.clear(); }
  frameClaim(f, spec, key = 'default') {
    if (!f || !spec) return;
    const m = this._camClaims || (this._camClaims = new Map());
    const prev = m.get(key);
    const seq = this._camSeq = (this._camSeq || 0) + 1;   // monotonic — 'newest wins on a pri tie' (§5.2)
    m.set(key, { f, spec, key, seq, rel: false,
                 env: prev && prev.f === f && !prev.rel ? prev.env : 0 });
  }
  frameRelease(f, key = 'default') {
    const c = this._camClaims && this._camClaims.get(key);
    if (c && c.f === f) c.rel = true;
  }
  // The move clock a `phase` points at (§5.3). Returns { v: 0..1 progress, alive: is the move running }.
  // Unknown/'live' is held-until-released — the default, the in/out ramps do the rest.
  _camPhase(f, phase) {
    if (phase === 'charge') { const v = (f.meleeCharge || 0) / 0.55; return { v: Math.min(1, v), alive: (f.meleeCharge || 0) > 1e-3 }; }
    if (phase === 'anim')   { const a = f.strikeActive || 0;         return { v: a > 0 ? 0 : 1,   alive: a > 0 }; }
    return { v: 1, alive: true };
  }
  // Advance every live claim's envelope once per frame off the MOVE'S clock, reap the dead, and return
  // the effective additive override for the chased subject (highest `pri`, newest on a tie). Called
  // ONCE at the top of chase(); the six read sites below only read the returned object.
  _camClaimTick(subject, dt) {
    const ov = { fov: 0, range: 0, vert: 0, horz: 0, pitch: 0, yaw: 0, damp: 1 };
    const m = this._camClaims;
    if (!m || !m.size) return ov;
    let best = null, bestPri = -Infinity, bestSeq = -1;
    for (const c of m.values()) {
      const s = c.spec, ph = this._camPhase(c.f, s.phase);
      if (!c.rel && s.phase && !ph.alive && c.env > 0) c.rel = true;   // the move ended — release itself
      const target = c.rel ? 0
                   : (s.shape === 'tri' ? (ph.v < 0.5 ? ph.v * 2 : (1 - ph.v) * 2) : 1);
      const dur = target >= c.env ? (s.in ?? 1.0) : (s.out ?? 0.5);    // asymmetric BY DEFAULT
      const step = dur > 0 ? dt / dur : 1;
      c.env = target > c.env ? Math.min(target, c.env + step) : Math.max(target, c.env - step);
      if (c.rel && c.env <= 1e-4) { m.delete(c.key); continue; }
      if (c.f !== subject) continue;                                   // an AI's claim moves no camera
      const pri = s.pri || 0;
      if (pri > bestPri || (pri === bestPri && c.seq > bestSeq)) { best = c; bestPri = pri; bestSeq = c.seq; }
    }
    if (best) {
      const e = best.env, s = best.spec;
      ov.fov = (s.fov || 0) * e; ov.range = (s.range || 0) * e; ov.vert = (s.vert || 0) * e;
      ov.horz = (s.horz || 0) * e; ov.pitch = (s.pitch || 0) * e; ov.yaw = (s.yaw || 0) * e;
      if (s.damp != null) ov.damp = lerp(1, s.damp, e);               // multiplies the eye lambda
    }
    return ov;
  }

  /**
   * THE LOCK-ON CHASE CAMERA (docs/POWERWORLD.md §9). Sits behind `subject` on the subject→target
   * axis and frames BOTH bodies, because the whole readability model of this genre is that you can
   * see the other fighter.
   *
   * ⚠ THE TARGET IS PINNED OFF-CENTRE, NOT CENTRED. Centring the opponent puts your own fighter
   * behind them at range and hides your own wind-up; the offset is what keeps two bodies legible.
   * ⚠ AND THE OFFSET IS CONVERTED THROUGH `tan(fov/2)`, or it is not a constant offset ON SCREEN —
   * it would drift every time the FOV widened with speed, which is exactly when you need it stable.
   * ⚠ ESF's own changelog says it forced FIRST person during melee "so the screen doesn't fuck up"
   * — the benchmark gave up on this case rather than solve it. There is no reference to copy here.
   */
  // BFP's camera is a view-space offset, not a two-body cinematic composition.
  // Keep the same raised rear boom through flight, aim and lock. In particular,
  // do not orbit shoulders, compress the lens at range, or flatten dive angles.
  // Values are adapted to our rig, not copied Quake world units.
  _chaseBfp(subject,target,dt) {
    const c=this.setCameraMode('chase'),S=subject.pos,snap=this._chaseSnap;
    const passenger=subject._passengerTransport;
    const profile=cameraProfileOf(subject,this.game?.player===subject?getCameraPreferences():null),value=key=>(passenger?({range:65,height:18,shoulder:22})[key]:undefined)??profile?.[key]??CAMERA_DEFAULTS[key];
    this._camClaimTick(subject,dt); // Reap gameplay claims; they do not reframe this camera.
    if(!this._lookActive){this._lookYaw=subject.facing;this._lookPitch=0;this._lookActive=true;}
    if(subject._aircraftVehicle){
      const aircraft=subject._aircraftVehicle;
      this._lookYaw=snap?aircraft.yaw:this._lookYaw+angleDiff(this._lookYaw,aircraft.yaw)*(1-Math.exp(-5*dt));
      this._lookPitch=damp(this._lookPitch,aircraft.kind==='jet'?(aircraft.pitch||0)*.6:0,5,dt);
      target=null;
    }
    if(subject._fleetVehicle){
      const motion=subject._fleetVehicle.motion;
      this._lookYaw=snap?motion.yaw:this._lookYaw+angleDiff(this._lookYaw,motion.yaw)*(1-Math.exp(-5*dt));
      this._lookPitch=damp(this._lookPitch,subject._fleetVehicle.cls==='fixedwing'?(motion.pitch||0)*.6:0,5,dt);
      target=null;
    }
    if(passenger){this._lookYaw=passenger.model.rotation.y+Math.PI;this._lookPitch=-.12;target=null;}
    const a=this._flightAnchor||(this._flightAnchor=new THREE.Vector3());
    // Movement already accelerates/brakes in physics. A second translation
    // spring makes the fighter slide under the reticle and adds braking lag.
    a.set(S.x,S.y+5.4-(subject._pronePose?.drop||subject._crouchPose?.drop||0),S.z);
    if(this._sightOwner!==subject){this._sightOwner=subject;this._sightZoom=1;}
    this._sightZoom=damp(this._sightZoom??1,firearmSightZoom(subject),12,dt);
    const sight=this._sightZoom,lift=value('height');
    if(target) {
      const focus=target.center(this._combatFocus||(this._combatFocus=new THREE.Vector3()));
      const dx=focus.x-a.x,dy=focus.y-a.y,dz=focus.z-a.z,horizontal=Math.hypot(dx,dz),distance=Math.hypot(horizontal,dy);
      // Keep BFP's full raised boom. Inside close contact the target may sit
      // below screen center: shrinking lift to force perfect centering stacks
      // the bodies and pitches a level fight toward the floor. Bound only the
      // parallax correction, not the viewing angle toward high/low opponents.
      // Below boom distance, accept an off-centre target instead of turning a
      // level exchange into an overhead view. Keep vertical target tracking;
      // only the raised-eye parallax correction is bounded by the authored boom.
      const focusDistance=Math.max(distance,value('range')*sight,lift*1.5,.001);
      const yaw=horizontal>.001?Math.atan2(dx,dz):this._lookYaw;
      // At the nadir, keep the raised boom and horizon rather than rolling
      // through -90 degrees to force perfect centering. The projected lock
      // reticle still identifies the target slightly above screen center.
      const pitch=clamp(Math.atan2(dy,horizontal)-Math.asin(clamp(lift/focusDistance,0,.999)),-BFP_PITCH_MAX,BFP_PITCH_MAX);
      this._lookYaw=snap?yaw:this._lookYaw+angleDiff(this._lookYaw,yaw)*(1-Math.exp(-12*dt));
      this._lookPitch=snap?pitch:damp(this._lookPitch,pitch,12,dt);
    }
    const yaw=this._lookYaw,pitch=this._lookPitch,cp=Math.cos(pitch),sp=Math.sin(pitch),sy=Math.sin(yaw),cy=Math.cos(yaw);
    const ax=sy*cp,ay=sp,az=cy*cp,ux=-sy*sp,uy=cp,uz=-cy*sp;
    this.camBasis.set(ax,ay,az);
    // Studio can explicitly author boost offsets. The BFP default is fixed.
    const boost=subject.cruiseHeld?clamp(subject.vel.length()/Math.max(1,PW_AIR.top),0,1):0;
    // Lengthen only the axial boom as the lens narrows: body scale and its
    // screen offset stay stable, and the camera ray remains on the same line.
    const range=(value('range')+value('boostRange')*boost)*sight,shoulder=value('shoulder');
    const wideFov=clamp(value('fov')+value('boostFov')*boost,30,100);
    this._chaseDist=range;this._chaseFov=2*Math.atan(Math.tan(wideFov*Math.PI/360)/sight)*180/Math.PI;
    this._chaseFovBase=this._chaseFov;this._combatLensGain=1;this._flightRelease=null;
    this.camPos.set(a.x-ax*range-cy*shoulder+ux*lift,a.y-ay*range+uy*lift,a.z-az*range+sy*shoulder+uz*lift);
    const aspect=c.aspect||16/9,tan=Math.tan(this._chaseFov*Math.PI/360),pad=c.near*Math.sqrt(1+tan*tan*(1+aspect*aspect))*1.35;
    resolveGroundCamera(this,subject,a,this.camPos,pad,dt);
    this._shake*=Math.exp(-7*dt);this._shakeT=(this._shakeT??0)+dt;
    const kick=Math.min(PW_FX.shakeMaxDeg,this._shake*PW_FX.shakeDegPer)*Math.PI/180*Math.sin(this._shakeT*PW_FX.oct1Hz*Math.PI*2);
    this.camTarget.set(this.camPos.x+ax*100+ux*kick*100,this.camPos.y+ay*100+uy*kick*100,this.camPos.z+az*100+uz*kick*100);
    this._applyProj();c.position.copy(this.camPos);c.lookAt(this.camTarget);
    // Preserve the normal, collision-resolved eye and shot ray before turning
    // the head. camBasis and _lookYaw/Pitch still own movement and flight.
    const aim=this._combatAimDirection||(this._combatAimDirection=new THREE.Vector3());
    c.getWorldDirection(aim);
    (this._combatAimOrigin||(this._combatAimOrigin=new THREE.Vector3())).copy(c.position);
    if(this.freeLooking){
      // Slide the camera toward the requested shoulder and toe it inward. This
      // holds the player and target in a rear three-quarter composition while
      // the captured combat ray above continues to own travel and attacks.
      const side=clamp(this._freeLook.yaw/FREE_LOOK_DEFAULTS.yawLimit,-1,1);
      const easedSide=Math.sin(Math.abs(side)*Math.PI*.5)*Math.sign(side);
      const sideShift=FREE_LOOK_DEFAULTS.sideShift*easedSide,backShift=FREE_LOOK_DEFAULTS.backShift*Math.abs(easedSide);
      c.position.x+=cy*sideShift-ax*backShift;c.position.y-=ay*backShift;c.position.z-=sy*sideShift+az*backShift;
      // The normal boom was resolved before independent look. Sweep this
      // additional shoulder displacement too, including the near-plane pad.
      const eye=this._combatAimOrigin;
      const slideT=Math.min(this._camNearestT(eye.x,eye.y,eye.z,c.position.x,c.position.y,c.position.z,pad),traceCameraGround(this,eye,c.position,pad));
      if(slideT<1)c.position.lerpVectors(eye,c.position,Math.max(0,slideT-1e-5));
      this.camPos.copy(c.position);
      const focus=this._freeLookFocus||(this._freeLookFocus=new THREE.Vector3());
      if(target&&target.alive)focus.copy(a).lerp(target.center(this._combatFocus||(this._combatFocus=new THREE.Vector3())),FREE_LOOK_DEFAULTS.targetWeight);
      else focus.copy(a).addScaledVector(aim,Math.max(12,range*.65));
      focus.y+=Math.tan(this._freeLook.pitch)*Math.max(8,c.position.distanceTo(focus));
      frameFreeLook(c,subject,focus);
      this.camTarget.copy(focus);c.lookAt(this.camTarget);
    }
    this._combatLocked=!!target;
    this.sun.position.set(Math.round(S.x)+this.sunOff.x,S.y+5.4+this.sunOff.y,Math.round(S.z)+this.sunOff.z);
    this.sun.target.position.set(Math.round(S.x),S.y+5.4,Math.round(S.z));
    this._chaseSnap=false;
    updateForegroundVisibility(this,subject,target,dt);
  }

  chase(subject, target, dt, style='auto') {
    this._bfpCameraActive=style==='bfp'||(style==='auto'&&!!subject._openSky);
    // Ownership can change while both views remain 'chase'. Refresh the cheap
    // shadow flag without resizing buffers or waiting for a quality transition.
    if(this.sun)this.sun.castShadow=(this._qTier??2)>0&&this._bfpCameraActive;
    if(this._bfpCameraActive)return this._chaseBfp(subject,target,dt);
    clearForegroundVisibility(this);
    const c = this.setCameraMode('chase');
    const cameraProfile = cameraProfileOf(subject,this.game?.player===subject?getCameraPreferences():null);
    const cameraValue = key => cameraProfile?.[key] ?? CAMERA_DEFAULTS[key];
    const combatView = !!subject._openSky;
    if(!target && !this._lookActive) {
      this._lookYaw=subject.facing;this._lookPitch=0;this._lookActive=true;
    }
    const S = subject.pos, spd = Math.hypot(subject.vel.x, subject.vel.y, subject.vel.z);
    const gap = target ? Math.hypot(target.pos.x - S.x, target.pos.y - S.y, target.pos.z - S.z) : 40;
    // ---- FOV rides speed. BFP exposes FOV as a player dial and the reason is that it is the single
    // cheapest sensation of pace in the genre: the frame widens as you commit.
    // ⚠ `vRef` KILLS THE SEVENTH HAND-PICKED LADDER (aaa-04 §7). The old `k = (spd−14)/96` measured
    // speed against a 96 u/s constant, so a tier-2 levitator flying flat out reached k=0.275 and TORCH
    // saturated with 21% of their range left — the camera told two thirds of the roster they were
    // standing still. `k` is now measured against YOUR OWN top speed, built from the SAME expression
    // `move()` uses (entity.js:1578) so it cannot drift. The buff is multiplied at read time
    // (aaa-04 §7.2), and the air/ground reference is blended on the melee vertical gate (=10, the
    // engine's own definition of a ground fight, game.js coneFoe) so a sprinting brawler earns FOV too.
    const airMul = subject.flightTier >= 3 ? (subject.flySpeed || 1) * 1.2 : subject.flightTier === 2 ? 0.78 : 0.95;
    const ab = subject.def && subject.def.afterburner;
    const vRefAir = (subject.speed || 30) * 1.08 * airMul * 1.5 * (ab ? ab.mult / 1.5 : 1);
    const vRefGnd = (subject.speed || 30) * 1.08;
    const gGrammar = 1 - smoothstep(clamp((S.y - (subject.groundY || 0)) / 10, 0, 1));   // 1 ground, 0 air
    subject._camG = gGrammar;   // PUBLISH g ON THE FIGHTER (aaa-04 §6.4) — one honest number a future move gate reads. Nothing gates on it in slice 1.
    const vRef = lerp(vRefAir, vRefGnd, gGrammar) * (subject.powerBuff || 1);
    const k = smoothstep(clamp((spd - 0.30 * vRef) / Math.max(1, 0.62 * vRef), 0, 1));
    // ⚠ THE CLINCH NARROWING is derived from the STRIKE TABLE, not from a picked 14/30 (aaa-04 §7.3).
    // `reachOf('jab')` is the same 11u the spacing rings draw and melee.js reads — one number, no drift.
    // A wide lens at clinch range distorts two bodies into fish-eye; the narrowing is the ground
    // grammar's single most important framing beat, and it rides `gap` (so it needs no altitude gate).
    const Rj = reachOf('jab');
    const clinch = 1 - smoothstep(clamp((gap - Rj) / (2 * Rj), 0, 1));   // 1 at ≤11u, 0 beyond 33u
    // ⚠ THE FRAME CLAIM (aaa-04 §5). Advance every live claim's envelope ONCE per frame off the move's
    // own clock, reap the dead, and read off the effective additive override for the chased subject.
    // Every `ov.*` is an ADD (0 = null claim) except `ov.damp`, a multiplier (1 = null). Six read sites
    // below + the ov.yaw axis rotation after camBasis is published (§5.5/§5.6). An AI's identical claim
    // ramps and is reaped here but is never selected — the camera does not move for it.
    const ov = this._camClaimTick(subject, dt);
    // ⚠ FOV is TWO gestures that must not fight: the speed ride (slow, aesthetic) and the punch KICK
    // (instant in, eased out). Split so a punch cannot be smeared by the speed damp (aaa-06 §5.1).
    const freeFov = cameraValue('fov') + cameraValue('boostFov') * k;
    const fovTarget = target && !combatView ? clamp(58 + k * 16 - 6 * clinch + ov.fov,40,76) : clamp(freeFov + ov.fov,30,100);
    this._chaseFovBase = damp(this._chaseFovBase ?? cameraValue('fov'), fovTarget, 4, dt);
    this._fovKick = damp(this._fovKick ?? 1, 1, PW_FX.punchHome, dt);   // fast in (Math.min), slow out
    // At range a wide, short boom makes the enemy a speck beside the player.
    // Pair lens compression with the same boom multiplier: foreground scale
    // stays steady while the opponent gains pixels. Close combat/free look
    // retain their authored lens; unlocking releases this envelope smoothly.
    const lensBase=this._chaseFovBase*this._fovKick;
    const previousLens=this._chaseFov ?? lensBase;
    const focusTarget=combatView&&target ? 1+.8*smoothstep(clamp((gap-3*Rj)/(6*Rj),0,1)) : 1;
    const releasing=combatView&&!target&&(this._combatLocked||this._flightRelease);
    this._combatLensGain=this._chaseSnap ? focusTarget : releasing ? (this._combatLensGain ?? 1) : damp(this._combatLensGain ?? 1,focusTarget,4,dt);
    const maxLensGain=Math.max(1,Math.tan(lensBase*Math.PI/360)/Math.tan(Math.PI/12));
    let lensGain=combatView ? Math.min(this._combatLensGain,maxLensGain) : 1;
    this._chaseFov=2*Math.atan(Math.tan(lensBase*Math.PI/360)/lensGain)*180/Math.PI;
    // CAM_PAD — DERIVED from the near-plane corner radius (aaa-04 §3.4), at the WIDEST fov the frustum
    // can present (the clamp ceiling), NOT the live fov: the FOV can widen the frame AFTER a trace, so
    // the pad must protect the largest near plane the frustum will ever show, or a wall cleared at 40°
    // reappears inside the near corners at 74°. The 1.35 factor covers one frame of damping between
    // the trace and the next. Never hand-pick the pad.
    const _asp = (typeof innerWidth === 'number' ? innerWidth / Math.max(1, innerHeight) : 16 / 9);
    const maxFov = Math.max(76, clamp(cameraValue('fov') + cameraValue('boostFov'),30,100), this._chaseFov);
    const CAM_PAD = c.near * Math.sqrt(1 + Math.tan((maxFov * Math.PI / 180) / 2) ** 2 * (1 + _asp * _asp)) * 1.35;
    // ---- the axis toward what we are looking at: a lock target frames both bodies; else the player's
    // own MOUSE-LOOK steers the view (aaa-01 §2.3 — a lock overrides look for movement, never the
    // camera); else fall back to travel direction, then facing. When the mouse is not steering, seed
    // the look angles from the live axis so activation is seamless (no snap when the player grabs it).
    let ax = 0, ay = 0, az = 1;
    if (target) { ax = target.pos.x - S.x; ay = (target.pos.y + 5) - (S.y + 5); az = target.pos.z - S.z; }
    else if (this._lookActive) {
      const cp = Math.cos(this._lookPitch);
      ax = Math.sin(this._lookYaw) * cp; ay = Math.sin(this._lookPitch); az = Math.cos(this._lookYaw) * cp;
    }
    else if (spd > 6) { ax = subject.vel.x; ay = subject.vel.y * 0.4; az = subject.vel.z; }
    else { ax = Math.sin(subject.facing); az = Math.cos(subject.facing); }
    if (!this._lookActive || target) { this._lookYaw = Math.atan2(ax, az); this._lookPitch = clamp(Math.asin(clamp(ay / (Math.hypot(ax, ay, az) || 1), -1, 1)), -Math.asin(PW_AIR.camPitch), Math.asin(PW_AIR.camPitch)); }
    let L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
    // ⚠ CLAMP THE PITCH. Full-sphere means the target can be directly overhead, and a camera that
    // rolls to follow that is nausea. The vertical component is damped, not obeyed — EXCEPT under the
    // player's own mouse-look, where the pitch is a deliberate choice and is obeyed to ±80°
    // (PW_AIR.camPitch); that lands inside the degenerate-blend case below, which already handles it.
    ay = (combatView || (this._lookActive && !target)) ? clamp(ay, -PW_AIR.camPitch, PW_AIR.camPitch)
                                       : clamp(ay * 0.55, -0.82, 0.82);
    // ⚠ AND THE DEGENERATE CASE HAS TO BE HANDLED EXPLICITLY. With the target straight up, `ax` and
    // `az` both go to zero — the axis has no horizontal part to sit behind, the perpendicular is
    // undefined, and the eye placement collapses. Measured before this fix: with a foe 46u directly
    // overhead the subject spanned **94.6% of the frame** and sat at y = −2.17, i.e. the camera was
    // effectively inside him. The screenshot matrix found this; no single-framing test could.
    // The fix is to borrow the horizontal direction from the subject's own FACING, which always has
    // one, and blend it in as the axis approaches vertical.
    const horiz = Math.hypot(ax, az);
    if (target && !combatView && horiz < 0.35) {
      const w = 1 - horiz / 0.35;
      ax += Math.sin(subject.facing) * w; az += Math.cos(subject.facing) * w;
    }
    if (target && combatView && horiz < .174) {
      // Preserve a stable horizon at the poles without flattening ordinary climbs/dives.
      const yaw = horiz > .001 ? Math.atan2(ax,az) : (this._chaseYaw ?? subject.facing);
      ax=Math.sin(yaw)*.174;az=Math.cos(yaw)*.174;
    }
    L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
    // Publish the normalized, unclaimed axis for preview/debug consumers before
    // cosmetic framing adjustments. PowerWorld's controller derives its locked
    // approach from the actual opponent, never from the claimed camera orbit.
    this.camBasis.set(ax, ay, az);
    if (combatView && target) {
      // A close fly-by can flip atan2 almost 180 degrees in one frame. Bound
      // the orbit, not mouse look or the movement basis. Fast opponents need
      // a larger angular budget or a sustained circle leaves the player behind.
      const relative=this._combatRelative || (this._combatRelative=new THREE.Vector3());
      const velocity=this._combatRelativeVelocity || (this._combatRelativeVelocity=new THREE.Vector3());
      const tx=target.pos.x-S.x,ty=target.pos.y-S.y,tz=target.pos.z-S.z;
      const continuous=!this._chaseSnap && this._orbitTarget===target && dt>0;
      const vx=continuous?(tx-relative.x)/dt:0,vy=continuous?(ty-relative.y)/dt:0,vz=continuous?(tz-relative.z)/dt:0;
      const relativeSpeed=Math.hypot(vx,vy,vz),lastSpeed=velocity.length();
      if(!continuous) {this._combatLaneSide=1;this._combatPassArc=0;}
      // Choose the side of an approaching pass while the lane is still open.
      // A lock acquired in a clinch commits its already-visible default side.
      // Hold it through the encounter: switching at closest approach swings
      // the camera across the attack. Mirrored passes deserve mirrored routes.
      const turnSide=vx*tz-vz*tx;
      // A distant vertical lock still has an open shoulder lane. Reselect only
      // while BOTH automatic openings are zero, never from small vertical jukes.
      if(gap>3*Rj && Math.abs(ay)<=.35 && relativeSpeed>4 &&
        Math.abs(turnSide)>relativeSpeed*.5 && tx*vx+ty*vy+tz*vz<0) {
        this._combatLaneSide=-Math.sign(turnSide);
      }
      // Track a sustained curved path at its own turn rate. Speed alone cannot
      // distinguish a close circle from a straight pass through the aim axis.
      const turnCos=continuous && relativeSpeed>4 && lastSpeed>4
        ? clamp((vx*velocity.x+vy*velocity.y+vz*velocity.z)/(relativeSpeed*lastSpeed),-1,1) : 1;
      // An abrupt reversal is not a sustained orbit. Treating its pi/dt impulse
      // as curvature removed the angular limit for exactly the juke frame.
      const pathTurn=turnCos>0?Math.acos(turnCos)/Math.max(dt,.001):0;
      velocity.set(vx,vy,vz);
      relative.set(tx,ty,tz);this._orbitTarget=target;
      const orbitRate=Math.max(4,2*relativeSpeed/(gap+cameraValue('range')),pathTurn*1.1);
      let yaw = Math.atan2(ax, az);
      let passing=false;
      const horizontalSpeed=Math.hypot(vx,vz);
      if(continuous && horizontalSpeed>30 && pathTurn<1 && Math.abs(ay)<.35) {
        // A near-zero miss distance makes the target's azimuth singular. Give
        // the camera (not the fighter or aim) a continuous, body-sized turn arc.
        const sx=vz/horizontalSpeed,sz=-vx/horizontalSpeed;
        const lateral=tx*sx+tz*sz;
        // Orbit the eye on the passing side, not behind the target's azimuth:
        // the latter necessarily sweeps the subject between the eye and foe.
        if(Math.abs(lateral)<2*Rj) {
          const cameraLateral=-Math.sign(lateral || -this._combatLaneSide)*2*Rj;
          yaw=Math.atan2(tx+sx*(cameraLateral-lateral),tz+sz*(cameraLateral-lateral));
          passing=true;
        }
      }
      // The angular limiter handles route changes; this separate envelope keeps
      // the shoulder continuous when speed, curvature or elevation changes mode.
      this._combatPassArc=damp(this._combatPassArc ?? 0,passing?1:0,6,dt);
      const nearPole = Math.abs(ay) > .85;
      if (!this._chaseSnap && this._combatOrbitYaw != null) {
        const delta = angleDiff(this._combatOrbitYaw, yaw), step = (nearPole ? 2.4 : orbitRate) * dt;
        yaw = this._combatOrbitYaw + clamp(delta, -step, step);
        this._poleOrbit = nearPole || Math.abs(delta) > step;
        const horizontal = Math.hypot(ax, az);
        ax = Math.sin(yaw) * horizontal; az = Math.cos(yaw) * horizontal;
      } else this._poleOrbit = nearPole;
      this._combatOrbitYaw = yaw;
    } else { this._combatOrbitYaw = null; this._combatLaneSide=null; this._combatPassArc=false; this._poleOrbit = false; this._orbitTarget=null; }
    // ⚠ THE CLAIM MAY NEVER ROTATE THE MOVEMENT BASIS (aaa-04 §5.6, openjk.md:2177-2180). `ov.yaw`
    // orbits the FRAME — the axis the eye and look point are placed from — AFTER camBasis is published
    // above, so a full 360° flourish spins the picture while movement/aim stay keyed to the unclaimed
    // axis. A camera flourish that inverts the controls is a bug; publishing camBasis first is what
    // prevents it. Rotation about Y preserves the xz length and leaves `ay` (pitch) untouched.
    if (ov.yaw) {
      const cy = Math.cos(ov.yaw), sy = Math.sin(ov.yaw);
      const nx = ax * cy + az * sy, nz = -ax * sy + az * cy;
      ax = nx; az = nz;
    }
    // ---- THE YAW-RATE STIFFENER (aaa-04 §4, openjk.md:228-234). "The single cheapest thing in the
    // whole reference": during ordinary tracking (tens of °/s) it is inert, and it saturates only on a
    // flick that crosses ~42° in a single frame — so a damped camera stops feeling like it is fighting
    // you without ever being visible. Measured on the axis yaw AFTER the degenerate blend (the direction
    // the camera is actually trying to look along, JKA's `pm->ps->viewangles`). ⚠ THE ±180° SEAM IS
    // SOLVED BY `angleDiff` — never subtract two atan2 results (the pirouette bug).
    const _yaw = Math.atan2(ax, az);
    const _dYaw = Math.abs(angleDiff(this._chaseYaw ?? _yaw, _yaw)) * 57.29577951;   // degrees
    const _rate = _dYaw / Math.max(0.001, dt * 1000);                                // JKA's unit: °/ms
    const _yawStiff = _rate < 1 ? 0 : _rate > 2.5 ? 0.75 : (_rate - 1) * 0.5;
    // ⚠ PITCH ALSO REDUCES DAMPING, and the divisor is DERIVED, not copied (aaa-04 §4.4). JA divides
    // by 115 against an 89° clamp (ratio 1.292) so damping never quite switches off; JO divided by the
    // clamp itself and cut damping dead. Our `ay` clamp is asin(0.82)=0.961 rad, so the matching divisor
    // is 0.961·1.292 = 1.242 rad — max term (0.82/1.242)² = 0.598, JA's 0.599, derived not copied.
    const _pStiff = (Math.abs(Math.asin(clamp(ay, -1, 1))) / 1.242) ** 2;
    // `max`, not sum: two symptoms of one problem (the eye swinging a large arc for a small angular
    // change) — adding them double-counts a diving flick. The 0.85 cap is the JO→JA lesson: damping
    // must never switch off entirely or a hard flick teleports the lens. `_stiffScale` is a test seam
    // (default 1) so the gate can force `stiff = 0` and prove the known-bad ≥40° residual.
    // Combat view already aims directly at the target each frame. The legacy
    // per-frame pitch stiffener made its eye fight actor-clearance constraints
    // and jump metres at high refresh rates; keep its eye a time-based spring.
    const stiff = this._chaseSnap || combatView ? 0 : Math.min(0.85, Math.max(_yawStiff, _pStiff)) * (this._stiffScale ?? 1);
    this._chaseYaw = _yaw;
    // ---- DISTANCE, and it is DERIVED, not chosen. A perspective camera at FOV f sees a vertical
    // extent of `2·D·tan(f/2)` — at 58° that is 1.11·D. To hold two 9.6u fighters AND the gap
    // between them the frame has to be at least `gap + 2 fighters` tall, so `D ≥ (gap + 20) / 1.11`.
    // ⚠ THE FIRST VERSION WAS 21 + gap·0.24, WHICH IS 28u AT A 29u GAP — and the screenshot showed
    // exactly what the arithmetic predicts: the player filling the bottom corner, cropped, reading
    // as a cutscene rather than a fight. Ten green assertions had said the framing was fine, because
    // "both bodies are within the frustum" is not the same question as "can you read the fight".
    // This project has now made that mistake three times (the ring 4× too big, the venue's audience
    // built outside the frame, and this). `gap` is computed once at the top of chase() now (the FOV
    // clinch term and the vRef grammar blend both need it).
    // ⚠ AND IT STOPS TRYING PAST A POINT. Framing a 100u gap means pulling back until both fighters
    // are specks — measured, the foe still left frame at x = −0.93 while the subject shrank. Beyond
    // FRAME_MAX the camera frames YOU and the HUD's off-screen foe arrow does its job, which is what
    // that arrow already exists for. Chasing an unwinnable framing costs readability at every range.
    const FRAME_MAX = 52;
    const fit = (Math.min(gap, FRAME_MAX) + 20) / (2 * Math.tan((this._chaseFov * Math.PI / 180) / 2));
    // ⚠ AIR RIDER (from AIR, aaa doc §Wave3): `k·16 → k·26`. Open-sky top speed rose to PW_AIR.top=210,
    // so two fighters close far faster (gate A2: both in frame at 210 u/s) — the speed pull-back must
    // earn more standoff. `ov.range` is the frame claim's additive distance (0 = null claim).
    const want = target && !combatView ? clamp(Math.max(24, fit * 1.15) + k * 16 + ov.range, 24, 76)
      : cameraValue('range') + cameraValue('boostRange') * k + ov.range;
    // ⚠ THE SNAP (aaa-04 §4.8): on a discontinuity the damped state copies ideal with no lerp, so the
    // eye does not fly across the map. `snapChase()` sets `_chaseSnap`; this helper honours it once.
    const snap = this._chaseSnap;
    const D1 = (a, b, l) => snap ? b : damp(a, b, l, dt);
    this._chaseDist = D1(this._chaseDist ?? want, want, 3.2);
    // ---- the look point: biased toward the target so both bodies sit in frame
    const bias = target ? clamp(gap * 0.012, 0.16, 0.42) : 0.2;
    const lx = S.x + ax * gap * bias, ly = S.y + 5.4 + ay * gap * bias + ov.vert, lz = S.z + az * gap * bias;
    // ⚠ THE LOOK POINT IS THE FAST CHANNEL (aaa-04 §4.7, C1-C3). Our two damped points ran at almost
    // the same rate (9 vs 8, ratio 1.13), so the two-damped-point structure produced ONE behaviour —
    // "two channels at one rate is a single-channel camera wearing two names." Raised to JKA's own
    // relationship (look:eye ≈ 1.8, cg_thirdPersonTargetDamp 0.5 = λ 13.86 vs the eye's 7.13). The eye
    // stays at 8/6/8; only the look point moves, which is what makes the connecting view angle lively.
    this.camTarget.x = D1(this.camTarget.x, lx, 14.5);
    this.camTarget.y = D1(this.camTarget.y, ly, 11);
    this.camTarget.z = D1(this.camTarget.z, lz, 14.5);
    // ---- CAMERA COLLISION, TRACE A (aaa-04 §3.3, openjk.md:298-311). Validate the LOOK POINT against
    // the subject's own eye FIRST, so the eye trace below can never be pulled to a look-at that is
    // itself inside geometry — the corner-spin failure that makes naive chase cameras pirouette. The
    // clip is written BACK INTO the damped `camTarget`, so recovery when you step off the wall is the
    // damping, for free (openjk.md:2113-2115: one state, not two). Runs on snap frames too — a snapped
    // `camTarget` is already the ideal value, and a teleport that lands the look point in a wall should
    // be corrected the same frame, not one frame later.
    {
      const ox = S.x, oy = S.y + 5.4, oz = S.z;
      const dx = this.camTarget.x - ox, dy = this.camTarget.y - oy, dz = this.camTarget.z - oz;
      const len = Math.hypot(dx, dy, dz);
      if (len > 1e-4) {
        const t = this._camNearestT(ox, oy, oz, this.camTarget.x, this.camTarget.y, this.camTarget.z, CAM_PAD);
        if (t < 0.999) {
          const stop = Math.max(0, t * len);   // inflated-box entry already sits CAM_PAD off the wall
          this.camTarget.x = ox + dx / len * stop; this.camTarget.y = oy + dy / len * stop; this.camTarget.z = oz + dz / len * stop;
        }
      }
    }
    // ---- and the eye, behind the subject along that axis, lifted
    // Unlock puts the entire extra standoff into the one release spring.
    // A shrinking ideal boom would add a second, unbudgeted translation.
    const d = this._chaseDist*(target?lensGain:1);
    // ⚠ AND IT LOOKS SLIGHTLY DOWN, not up. The first version lifted the eye by `d·0.20` and pulled
    // it down again by `ay·d·0.35`, so against a target above you the camera ended up UNDERNEATH the
    // pair looking up — which is where the screenshot's "staring up at a giant" framing came from.
    // ⚠ AND IT STANDS OFF THE SHOULDER, because sitting exactly ON the subject→target axis stacks the
    // two bodies at the same screen x — measured (0.00, −0.14) and (−0.00, 0.17) — so your own
    // fighter can eclipse the one you are fighting, and your own wind-up is the thing you most need
    // to see. The offset is a fraction of the DISTANCE, so it is a constant offset on screen at any
    // range. (ESF shipped centred-behind and a player's objection to an offset was that it "shrinks
    // your right side view angle" — a real 360°-threat point, which is why this is 0.17 and not 0.5.)
    const px = az / Math.hypot(ax, az || 1e-6), pz = -ax / Math.hypot(ax, az || 1e-6);   // perpendicular, level
    const off = d * (0.17 + ov.horz);
    // ⚠ THE GRAMMAR BLEND `g` GOVERNS THE FRAME (aaa-04 §6.2, C9). The eye height fraction rides the
    // continuous scalar, not `gait`: 0.30 (16.7° down) grounded, so you read the FLOOR you fight on —
    // the Jedi Academy read — and 0.16 (9.1° down) airborne, where the horizon is the reference and a
    // high camera reads as a map view. A smoothstep of altitude, so a fighter bobbing across 5u cannot
    // chatter it and no hysteresis is needed. `ov.pitch` is the claim's additive lift fraction.
    // ⚠ AIRBORNE THE CAMERA IS NEARLY LEVEL, SO THE CENTRE RETICLE POINTS FORWARD AT FOES, NOT AT THE
    // GROUND (Robert 2026-07-28: "the crosshair isn't on point"). At 0.16 the eye rode d·0.16 above the
    // look point, tilting the view ~20° down — so a foe at your own altitude appeared near the TOP of
    // the screen and the shot went into the ground. 0.04 keeps a hair of height for depth without
    // aiming you at the dirt. Grounded stays 0.30 (the Jedi-Academy floor read).
    const hFrac = lerp(0.04, 0.30, gGrammar);
    const ex = S.x - ax * d + px * off, ey = S.y + 5.4 - ay * d * 0.18 + d * (hFrac + ov.pitch), ez = S.z - az * d + pz * off;
    // ⚠ THE STIFFENER RIDES THE EYE CHANNELS ONLY (aaa-04 §4.6). JKA applies it in the camera block,
    // not the look point (already the fast channel). `dampStiff` closes an extra `stiff` fraction of
    // the REMAINING lag — 0 is plain damp, so a snap frame (D1) or slow tracking (stiff=0) is unchanged.
    // ⚠ `ov.damp` MULTIPLIES the eye lambda (aaa-04 §5.5): 0.5 = twice as loose, 2 = twice as tight.
    // Rides the eye channels only, the same channels JKA applies the stiffener to.
    const E1 = (a, b, l) => this._chaseSnap ? b : dampStiff(a, b, l * ov.damp, dt, stiff);
    this.camPos.x = E1(this.camPos.x, ex, 8);
    this.camPos.y = E1(this.camPos.y, ey, 6);
    this.camPos.z = E1(this.camPos.z, ez, 8);
    let pairedBoom=0;
    if (!target || combatView) {
      // Mouse rotation is direct. Only the follow anchor has a short spring, so world motion
      // has weight without adding rotational input latency or changing the requested pitch.
      if (!this._flightAnchor || snap) this._flightAnchor = new THREE.Vector3(S.x,S.y+5.4-(subject._pronePose?.drop||subject._crouchPose?.drop||0),S.z);
      const a=this._flightAnchor;
      const anchorX=a.x,anchorY=a.y,anchorZ=a.z;
      a.x=D1(a.x,S.x+subject.vel.x*.035,22);
      a.y=D1(a.y,S.y+5.4-(subject._pronePose?.drop||subject._crouchPose?.drop||0)+subject.vel.y*.035,22);
      a.z=D1(a.z,S.z+subject.vel.z*.035,22);
      const upx=-ax*ay/(Math.hypot(ax,az)||1), upy=Math.hypot(ax,az), upz=-az*ay/(Math.hypot(ax,az)||1);
      const lift=(target ? Math.max(14,cameraValue('height')) : cameraValue('height')) + ov.vert + (target ? d*ov.pitch : 0);
      // In a clinch, a short lateral opening stops the foreground torso eclipsing the foe.
      // At range we return to BFP's centered rear view; never zoom out to fit empty space.
      const closeOpening=12*smoothstep(clamp((14-gap)/8,0,1));
      // Automatic opening was calibrated with a 28u boom. Preserve its clearance
      // at the player's plane as the boom changes, including bulky forearm shields.
      // The authored shoulder offset remains additive and free aim stays centered.
      const separationScale=(d+gap)/(28+gap);
      // Tilting the view across a vertical fight also needs a side lane: with
      // a centered boom, that tilted sightline can pass straight through the
      // player's torso. Reserve a stable lane from the combat axis, not limbs.
      const verticalOpening=combatView?12*smoothstep(clamp((Math.abs(ay)-.35)/.5,0,1)):0;
      // The pass arc already reserves the viewing lane. Adding the stationary
      // clinch shoulder would count that clearance twice and accelerate the view.
      let opening=target?(12*clinch+closeOpening+verticalOpening)*separationScale*(1-(this._combatPassArc || 0)):0;
      if(combatView && target && subject.airborne && closeOpening>0) {
        // A prone sideways flyer presents body LENGTH across the shot lane.
        // Reserve that envelope while the flight pose engages (4→34u/s), then
        // relax it as the clinch opens. This does not swap camera shoulders.
        const sideSpeed=Math.abs(subject.vel.x*px+subject.vel.z*pz);
        const sideFlight=smoothstep(clamp((sideSpeed-4)/30,0,1))*closeOpening/12;
        const lane=(subject.radius || 2.2)+8*(subject.parts?.g?.userData.frame?.scale || 1);
        const angle=Math.atan2(lane,Math.max(1,gap))+Math.asin(clamp(lane*gap/(d*Math.hypot(lane,gap)),0,.95));
        opening=Math.max(opening,d*Math.tan(Math.min(1.3,angle))*sideFlight);
      }
      // Orbit the automatic opening around a constant-length horizontal boom.
      // Adding it to the rear offset made a clinch pull out to ~44u and shrank
      // both bodies. Authored shoulder/claim offsets remain separate additions.
      const orbitScale=d/Math.hypot(d,opening);
      const rear=d*orbitScale;
      const shoulder=cameraValue('shoulder') + opening*orbitScale*(this._combatLaneSide ?? 1) + (target?d*ov.horz:0);
      let bx=a.x-ax*rear-px*shoulder+upx*lift,by=a.y-ay*rear+upy*lift,bz=a.z-az*rear-pz*shoulder+upz*lift;
      if(combatView && target) {
        // A close vertical lock needs a view across the bodies, not down the
        // player's boots (or up their torso). Limit only the cosmetic eye's
        // elevation: a level-to-30° view in a clinch, opening to ±45° at range.
        // Beyond that, a ten-unit body reads as a head-sized top-down sliver.
        // Keep its azimuth and start from the authored distance, then spring toward this ideal;
        // never choose a new camera route from animated limb intersections.
        const focus=target.center(this._combatFocus || (this._combatFocus=new THREE.Vector3()));
        const dx=bx-focus.x,dy=by-focus.y,dz=bz-focus.z;
        const horizontal=Math.hypot(dx,dz);
        let radius=Math.hypot(horizontal,dy);
        const elevation=Math.atan2(dy,horizontal);
        const close=1-smoothstep(clamp((gap-10)/23,0,1));
        const limit=Math.PI/4;
        const limited=clamp(elevation,lerp(-limit,0,close),lerp(limit,Math.PI/6,close));
        const fitWeight=1-smoothstep(clamp((gap-FRAME_MAX)/(FRAME_MAX*.5),0,1));
        if(fitWeight>0 && Math.abs(limited-elevation)>.0001) {
          // An oblique view must still contain the player. Solve the minimum
          // target distance from the projected rest-body envelope, rather than
          // a gap-based zoom multiplier. Stable proportions, not animated bones,
          // keep idle motion from pumping the lens. Very distant locks still
          // use the existing offscreen indicator instead of shrinking the fight.
          const ch=Math.cos(limited),ny=Math.sin(limited);
          const nx=dx/Math.max(horizontal,.001)*ch,nz=dz/Math.max(horizontal,.001)*ch;
          const ux=-nx*ny/ch,uy=ch,uz=-nz*ny/ch;
          const height=12*(subject.parts?.g?.userData.frame?.scale || 1);
          const extent=Math.tan(this._chaseFov*Math.PI/360)*.88;
          let fitRadius=radius;
          for(const h of [0,height]) {
            const vx=S.x-focus.x,vy=S.y+h-focus.y,vz=S.z-focus.z;
            fitRadius=Math.max(fitRadius,vx*nx+vy*ny+vz*nz+Math.abs(vx*ux+vy*uy+vz*uz)/extent);
          }
          radius=lerp(radius,fitRadius,fitWeight);
        }
        const scale=radius*Math.cos(limited)/Math.max(horizontal,.001);
        bx=focus.x+dx*scale;by=focus.y+radius*Math.sin(limited);bz=focus.z+dz*scale;
      }
      // Keep the intended standoff, not the eye's damped excursion from last
      // frame's wall. Otherwise a pinned camera regains zoom every frame.
      pairedBoom=Math.hypot(bx-a.x,by-a.y,bz-a.z);
      if(target) {
        // Translation belongs to the follow anchor. Damping it again in world
        // space lets a fast strafe erase the shoulder clearance. Only spring
        // the orbit relative to that moving anchor; collision still runs last.
        this.camPos.set(E1(c.position.x+a.x-anchorX,bx,14),E1(c.position.y+a.y-anchorY,by,14),E1(c.position.z+a.z-anchorZ,bz,14));
      }
      else {
        this.camPos.set(bx,by,bz);
        if(snap) this._flightRelease=null;
        else if(combatView && this._combatLocked) {
          this._flightRelease=(this._flightRelease || new THREE.Vector3()).copy(c.position).sub(this.camPos);
          this._flightReleaseVelocity=(this._flightReleaseVelocity || new THREE.Vector3()).set(0,0,0);
          this._flightReleaseLength=this._flightRelease.length();
          this._flightReleaseLens=Math.max(1,Math.tan(lensBase*Math.PI/360)/Math.tan(previousLens*Math.PI/360));
          this._flightReleaseBoom=c.position.distanceTo(a)/this._flightReleaseLens;
          // A zero-velocity critical spring starts gently even when the combat
          // fit and free boom are far apart. Bound its peak translation speed.
          this._flightReleaseRate=Math.min(16,120*Math.E/Math.max(1,this._flightRelease.length()));
        }
        if(this._flightRelease) {
          const offset=this._flightRelease,velocity=this._flightReleaseVelocity;
          const rate=this._flightReleaseRate,decay=Math.exp(-rate*dt);
          const jx=(velocity.x+rate*offset.x)*dt,jy=(velocity.y+rate*offset.y)*dt,jz=(velocity.z+rate*offset.z)*dt;
          offset.set((offset.x+jx)*decay,(offset.y+jy)*decay,(offset.z+jz)*decay);
          velocity.set((velocity.x-rate*jx)*decay,(velocity.y-rate*jy)*decay,(velocity.z-rate*jz)*decay);
          this.camPos.add(this._flightRelease);
          // Lens recovery follows the same zero-velocity spring progress; it
          // cannot start a second camera movement or keep zoom after standoff ends.
          const progress=Math.min(1,offset.length()/Math.max(.0001,this._flightReleaseLength));
          this._flightReleaseProgress=progress;
          lensGain=Math.min(maxLensGain,1+(this._flightReleaseLens-1)*progress);
          this._combatLensGain=lensGain;
          if(this._flightRelease.lengthSq()<.0001) this._flightRelease=null;
        }
      }
      this.camTarget.set(a.x,a.y,a.z);
      // Prediction can carry the anchor into cover; validate the trace origin in free flight too.
      const anchorT=this._camNearestT(S.x,S.y+5.4,S.z,a.x,a.y,a.z,CAM_PAD);
      if(anchorT<.999) this.camTarget.set(S.x+(a.x-S.x)*anchorT,S.y+5.4+(a.y-S.y-5.4)*anchorT,S.z+(a.z-S.z)*anchorT);
    }
    // ---- CAMERA COLLISION, TRACE B (aaa-04 §3.3). The eye against the CORRECTED look point. The
    // shoulder offset is already INSIDE the eye expression above (§3.3: do not refactor it out — trace
    // B covers it). No push-out, no lerp, no swing-around: the camera stops PAD-before the wall and the
    // damping is the recovery (openjk.md:313-318, Raven removed id's `view[2] += (1-frac)*32` fudge).
    {
      const ox = this.camTarget.x, oy = this.camTarget.y, oz = this.camTarget.z;
      const dx = this.camPos.x - ox, dy = this.camPos.y - oy, dz = this.camPos.z - oz;
      const len = Math.hypot(dx, dy, dz);
      if (len > 1e-4) {
        const t = this._camNearestT(ox, oy, oz, this.camPos.x, this.camPos.y, this.camPos.z, CAM_PAD);
        if (t < 0.999) {
          const stop = Math.max(0, t * len);   // inflated-box entry already sits CAM_PAD off the wall
          this.camPos.x = ox + dx / len * stop; this.camPos.y = oy + dy / len * stop; this.camPos.z = oz + dz / len * stop;
        }
      }
    }
    // ---- TRACE C: the terrain floor, unconditional (aaa-04 §3.3). The camera never sinks below the
    // ground under it. Only ever RAISES y, and only when already below `heightAt + PAD` — which is open
    // ground by construction (a footprint below the terrain would have been caught by trace B), so it
    // can never push the eye up into a building it just cleared.
    this.camPos.y = Math.max(this.camPos.y, this.heightAt(this.camPos.x, this.camPos.z) + CAM_PAD);
    // A wall can remove the extra standoff. Give its matching zoom back on the
    // same frame rather than magnifying the foreground body against the wall.
    // Locked and free lift differ. Preserve the effective reference on the
    // unlock frame, then recover the authored free reference with the spring.
    const lensReference=!target&&this._flightRelease ? lerp(pairedBoom,this._flightReleaseBoom,this._flightReleaseProgress) : pairedBoom;
    const availableBoom=lensReference>1e-4?this.camPos.distanceTo(this.camTarget)/lensReference:1;
    const clearGain=Math.max(1,Math.min(lensGain,(target?lensGain:1)*availableBoom));
    this._chaseFov=2*Math.atan(Math.tan(lensBase*Math.PI/360)/clearGain)*180/Math.PI;
    if (!target) this.camTarget.set(this.camPos.x+ax*(d+30),this.camPos.y+ay*(d+30),this.camPos.z+az*(d+30));
    else if(combatView) {
      // The actual opponent is the attack point, not a compressed fraction of their altitude.
      target.center(this.camTarget);
    }
    // ⚠ ANGULAR SHAKE, NEVER THE WORLD-SPACE ONE. `follow()` adds a metres-long random vector to both
    // the eye and the look point; at ortho that is ~1.8° of jitter, but at a chase distance the same
    // 8u clamp would swing the camera through the fighter. Here the shake is an ANGLE on the look
    // point only, capped at PW_FX.shakeMaxDeg — see the ring-down below.
    // ⚠ ANGULAR RING-DOWN, NOT WHITE NOISE (aaa-06 §4). Two decaying octaves — the CRACK (oct1)
    // riding the BODY (oct2, which carries most of the amplitude) — on an axis stamped once per
    // EVENT in the camera's own screen plane, so the shake reads as impact and not as interference,
    // and its per-frame step stays under budget at the 40 Hz Steam-Deck lock (26 Hz would alias).
    // Frequencies are DERIVED from that lock; amplitude/mix are PW_FX dials. Applied to the LOOK
    // POINT only — the eye position is never touched, so camera POSITION deviation is exactly 0.
    this._shake *= Math.exp(-7 * dt);
    this._shakeT = (this._shakeT ?? 0) + dt;
    const _A = Math.min(PW_FX.shakeMaxDeg, this._shake * PW_FX.shakeDegPer) * (Math.PI / 180);
    // eye->look view axis, then a screen-plane basis perpendicular to it (worldUp = +Y)
    let _vx = this.camTarget.x - this.camPos.x, _vy = this.camTarget.y - this.camPos.y, _vz = this.camTarget.z - this.camPos.z;
    const _D = Math.hypot(_vx, _vy, _vz) || 1; _vx /= _D; _vy /= _D; _vz /= _D;
    const _rn = Math.hypot(_vz, _vx) || 1;                         // right = normalize(view × up), no Y
    const _rgx = -_vz / _rn, _rgz = _vx / _rn;
    const _ugx = -_vx * _vy / _rn, _ugy = _rn, _ugz = -_vz * _vy / _rn;   // up' = right × view (unit)
    const _th = this._shakeAxTh ?? 0, _ct = Math.cos(_th), _st = Math.sin(_th) * 0.55;   // biased horizontal
    const _axx = _rgx * _ct + _ugx * _st, _axy = _ugy * _st, _axz = _rgz * _ct + _ugz * _st;
    const _TAU = Math.PI * 2, _t = this._shakeT;
    const _w = PW_FX.oct1Mix * Math.sin(_TAU * PW_FX.oct1Hz * _t) + (1 - PW_FX.oct1Mix) * Math.sin(_TAU * PW_FX.oct2Hz * _t + 1.9);
    const _ang = _A * _w + flightTurbulence(subject,this._shakeT);
    const jx = _axx * _ang * _D, jy = _axy * _ang * _D, jz = _axz * _ang * _D;
    this._applyProj();
    c.position.set(this.camPos.x, this.camPos.y, this.camPos.z);
    c.lookAt(this.camTarget.x + jx, this.camTarget.y + jy, this.camTarget.z + jz);
    if(combatView && target) {
      // Hand free aim the view the player actually saw, not the body-to-body axis.
      // Otherwise releasing a raised/shoulder lock kicks the reticle by 10–20 degrees.
      this._lookYaw=Math.atan2(_vx,_vz);
      this._lookPitch=Math.asin(clamp(_vy,-1,1));
    }
    this._combatLocked=combatView && !!target;
    // the sun's tight shadow frustum still has to follow the view
    const sx = Math.round(this.camTarget.x), sz = Math.round(this.camTarget.z);
    const so = this.sunOff;
    this.sun.position.set(sx + so.x, so.y, sz + so.z);
    this.sun.target.position.set(sx, 0, sz);
    this._chaseSnap = false;   // consumed for exactly one frame (aaa-04 §4.8)
  }

  // clamp total shaded pixels: a 4K dpr-2 fullscreen was 10-30× the pixel load of a small pane —
  // the #1 "fast in the pane, slow in my browser" multiplier.
  //
  // ⚠ THE BUDGET IS A FIELD AND THE CLAMP IS A METHOD, AND CONFLATING THEM BROKE BOTH TOUCH
  // PLATFORMS. `main.js`'s device ladder wanted a smaller budget for a phone and a tablet, and did
  // `_pixelCap = Math.min(_pixelCap || 2.6e6, 1.35e6)` — but `_pixelCap` was this METHOD, which is
  // truthy, so `||` returned the function and `Math.min(fn, …)` is **NaN**. `_pixelCap` then held a
  // number, so every later call threw:
  //   · **iPhone / any short-edge ≤500 touch device: the game did not boot.** The phone branch calls
  //     `_applyQuality()` immediately, at MODULE TOP LEVEL, so the throw took out everything after
  //     it — including the rAF loop. Nothing after that line in main.js ever ran.
  //   · **iPad: the quality governor was pinned at tier 2 forever.** Its throw lands inside the
  //     frame try/catch, so it was counted and swallowed, and the 2.0MP tablet cap never applied.
  // It shipped green because a desktop-sized window never enters either branch. Budget and clamp are
  // now separate names, so the ladder can set the budget without overwriting the function.
  _pixelCap(pr) {
    const cap = Math.sqrt((this._pixelBudget || 2.6e6) / Math.max(1, innerWidth * innerHeight));
    return Math.min(pr, Math.max(0.55, cap));
  }
  _applyQuality() {
    const t = this._qTier;
    // ⚠ A THREE-POSITION LADDER WITH TWO POSITIONS. Tier 1 was `min(_maxPR, 1)` — and on a Steam Deck
    // `_maxPR` IS 1 (devicePixelRatio 1 at 1280×800), so tiers 2 and 1 rendered at exactly the same
    // resolution and the governor's first step down did nothing at all. On the device with the least
    // headroom, the middle rung was a placebo. Tier 1 is now a real fraction of whatever the top rung
    // is, which reproduces the old value on a dpr-2 display (2 → 1.0) and actually steps on a dpr-1 one.
    // ⚠ AND THE RUNGS MUST BE IN ORDER. My first fix used `max(0.62, …)`, which on a dpr-1 display gave
    // tier 1 = 0.62 against tier 0's fixed 0.72 — an INVERTED ladder where dropping to the lowest tier
    // would have RAISED the resolution. The assertion said "three distinct rungs" and passed; distinct
    // is not ordered. The floor is above tier 0, and the test checks the ordering now.
    const pr = this._pixelCap(t === 2 ? this._maxPR : t === 1 ? Math.max(0.86, this._maxPR * 0.5) : 0.72);
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);   // THE tier bug: EffectComposer caches its construction-time
    this.composer.setSize(innerWidth, innerHeight);   // ratio — tiers never actually shrank the scene pass
    this.bloom.setSize(innerWidth * 0.5, innerHeight * 0.5);
    this.bloom.strength = this._threatRoom?.active ? .12 : t === 2 ? 0.66 : t === 1 ? 0.55 : 0.42;
    this.bloom.enabled = t > 0;                       // potato tier: drop the whole bloom chain
    // City chase retains its cheap contact shadows. Open-sky combat now moves
    // the shadow volume with the airborne fighter, so body self-shadow remains
    // valid at every altitude. Lowest quality still drops the shadow pass.
    const chase = this.camMode === 'chase';
    if (this.sun) this.sun.castShadow = t > 0 && (!chase || this._bfpCameraActive);
    if (this.wildlife) this.wildlife.setQuality(t);   // trim the flock before anything you aim at
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

// ⚠ CODE REVIEW ITEM 8 — world.js was carrying four unrelated jobs in one 1816-line file.
// The fog of war and the road network are now their own modules, installed here as mixins so
// `this` still means the world and every existing call site (`world.updateFog(...)`,
// `world._buildRoadNet(...)`) is untouched. Assign BEFORE anything constructs a World.
Object.assign(World.prototype, FogMixin, RoadMixin);

const _proj = new THREE.Vector3();
const _gm4 = new THREE.Matrix4();
const _gcp = new THREE.Vector3(), _gcq = new THREE.Quaternion(), _gcs = new THREE.Vector3(), _gcY = new THREE.Vector3(0, 1, 0);
const _ndc = new THREE.Vector2();
const _ray = new THREE.Raycaster();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// nearest positive root of |O + R·t − C|² = r² along UNIT direction R, or -1 (aaa-05 §5.2)
function raySphere(O, R, cx, cy, cz, r, maxT) {
  const ox = O.x - cx, oy = O.y - cy, oz = O.z - cz;
  const b = ox * R.x + oy * R.y + oz * R.z;
  const c = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  const t = -b - s >= 0 ? -b - s : -b + s;
  return (t >= 0 && t <= maxT) ? t : -1;
}
