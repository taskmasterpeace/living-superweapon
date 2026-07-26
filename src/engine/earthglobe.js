// THE EARTH — a real globe, lit by a real sun, for the moment you leave the planet.
//
// Robert, with a reference frame of a terrain globe seen at a low angle: *"when going to orbit we
// need to see earth like this. make a model of earth 1 to 1 so we see it like this when leaving
// earth. day and night should depend on that. aim for visual awe but aligned with our style."*
//
// Three things make this read as EARTH rather than as a blue ball:
//
//   1. REAL COASTLINES (data/earth.js). Recognition is the whole game — a globe you cannot find
//      your own continent on is a prop. They are authored polygons, so the same data rasterises to
//      a 256px thumbnail or a 4096px hero shot and also answers "is this land", which the city
//      lights need.
//   2. AN HONEST TERMINATOR. The day/night line is not a gradient slid across the texture: it is
//      `dot(surface normal, sun direction)`, and the sun direction comes from the SUBSOLAR POINT
//      for the current date and time — the same calendar the planets orbit on and the same
//      `world.dayT` the street runs on. Leave at dawn and you leave into a sunrise.
//   3. THE EXTRUDED COAST. His reference has landmasses standing proud of the water with a hard
//      shadow along one edge. That is not relief shading, it is a DROP SHADOW under each coastline
//      ring — cheap, and it is the single detail that makes the reference look like the reference.
//
// Style: the palette is ours. Teal ocean out of the `--info` family, warm grey-green land, gold
// city lights, a cyan-white limb. No purple, and nothing here is a stock Earth texture — there is
// no network and there never will be.

import * as THREE from 'three';
import { COASTS, INLAND, ARCTIC_ICE_LAT, ANTARCTIC_ICE_LAT, subsolar } from '../data/earth.js';

const TAU = Math.PI * 2;
// equirectangular: lon -180..180 -> 0..w, lat 90..-90 -> 0..h
const px = (lon, w) => ((lon + 180) / 360) * w;
const py = (lat, h) => ((90 - lat) / 180) * h;

function ringPath(ctx, ring, w, h, dx = 0, dy = 0) {
  ctx.beginPath();
  for (let i = 0; i < ring.length; i++) {
    const x = px(ring[i][0], w) + dx, y = py(ring[i][1], h) + dy;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------------------------
// THE DAY MAP
function dayTexture(W = 2048) {
  const H = W / 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');

  // --- ocean: deeper toward the poles and the abyssal middle, not one flat blue
  const og = x.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0.00, '#0b2530');
  og.addColorStop(0.18, '#0e3a4a');
  og.addColorStop(0.50, '#082633');
  og.addColorStop(0.82, '#0e3a4a');
  og.addColorStop(1.00, '#0b2530');
  x.fillStyle = og; x.fillRect(0, 0, W, H);
  // a slow band of lighter shelf water so the sea has structure at the limb
  x.globalAlpha = 0.16;
  for (let i = 0; i < 300; i++) {
    const cx = Math.random() * W, cy = Math.random() * H, r = 40 + Math.random() * 190;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(38,116,132,0.50)'); g.addColorStop(1, 'rgba(38,116,132,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  }
  x.globalAlpha = 1;

  const rings = Object.values(COASTS);
  // --- THE EXTRUDED COAST, part one: a hard dark shadow offset under every landmass. Drawn for
  // ALL of them first so one continent's shadow can fall on the sea beside its neighbour.
  const off = Math.max(1.5, W / 620);
  x.fillStyle = 'rgba(5,11,16,0.58)';
  for (const r of rings) { ringPath(x, r, W, H, off, off); x.fill(); }

  // --- land
  const lg = x.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0.00, '#7e8a8c');
  lg.addColorStop(0.20, '#5f6b4e');
  lg.addColorStop(0.30, '#6d7350');
  lg.addColorStop(0.42, '#8b7c56');       // the desert belt
  lg.addColorStop(0.52, '#5d6b42');       // the equatorial forest
  lg.addColorStop(0.66, '#8a7b58');
  lg.addColorStop(0.80, '#5e6a4c');
  lg.addColorStop(1.00, '#8d9498');
  x.fillStyle = lg;
  for (const r of rings) { ringPath(x, r, W, H); x.fill(); }

  // --- relief: mottling clipped to the land so continents are not flat paint
  x.save();
  x.beginPath();
  for (const r of rings) { for (let i = 0; i < r.length; i++) { const X = px(r[i][0], W), Y = py(r[i][1], H); if (i === 0) x.moveTo(X, Y); else x.lineTo(X, Y); } x.closePath(); }
  x.clip();
  for (let i = 0; i < 5200; i++) {
    const cx = Math.random() * W, cy = Math.random() * H, r = (1.5 + Math.random() * 9) * (W / 2048);
    const dark = Math.random() < 0.5;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, dark ? 'rgba(24,30,22,0.26)' : 'rgba(198,193,164,0.20)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  }
  x.restore();

  // --- the inland seas, cut back out. Without these the Caspian is a lump of Asia and the Great
  // Lakes do not exist, and both are things people find on a globe without being asked to.
  x.fillStyle = '#10394a';
  for (const k in INLAND) if (INLAND[k]) { ringPath(x, INLAND[k], W, H); x.fill(); }

  // --- ice. Antarctica is a continent (already filled) and gets painted over; the Arctic is sea
  // ice with no coastline at all, which is why it is a band and not a polygon.
  // ⚠ THE FIRST VERSION PAINTED CANADA AND SIBERIA WHITE. A linear wash from the pole down to 66
  // degrees covers most of the northern landmass, and at a glance the planet read as half glacier.
  // The cap has to be tight to the pole and mostly transparent by the time it reaches any coast.
  const ice = (y0, y1) => {
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0.00, 'rgba(226,236,242,0.92)');
    g.addColorStop(0.45, 'rgba(226,236,242,0.42)');
    g.addColorStop(1.00, 'rgba(226,236,242,0)');
    x.fillStyle = g; x.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
  };
  ice(0, py(ARCTIC_ICE_LAT + 4, H));
  ice(H, py(ANTARCTIC_ICE_LAT - 2, H));

  // --- the coastline itself: a thin bright lip, which is what sells "the land stands above water"
  x.strokeStyle = 'rgba(226,238,236,0.62)'; x.lineWidth = Math.max(1.2, W / 1100);
  for (const r of rings) { ringPath(x, r, W, H); x.stroke(); }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------------------------------------
// THE NIGHT MAP — city lights. ⚠ Clustered, never scattered: an evenly-lit night side is the
// giveaway that nobody lives there. Weighted onto land, onto the temperate north where most of the
// species actually is, and onto coasts.
function nightTexture(W = 2048) {
  const H = W / 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const rings = Object.values(COASTS);
  x.save();
  x.beginPath();
  for (const r of rings) { for (let i = 0; i < r.length; i++) { const X = px(r[i][0], W), Y = py(r[i][1], H); if (i === 0) x.moveTo(X, Y); else x.lineTo(X, Y); } x.closePath(); }
  x.clip();
  x.globalCompositeOperation = 'lighter';
  // ⚠ ADDITIVE DOTS STACK. The first version put 900 lights inside a nine-degree radius with
  // `lighter` compositing — every conurbation saturated to a white marshmallow and South Africa
  // came out as one blown-out splodge. A city light has to be nearly invisible ON ITS OWN; the
  // brightness is supposed to come from how MANY there are, which is also true of the real thing.
  const conurbation = (lon, lat, n, spread, bright) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = Math.pow(Math.random(), 1.7) * spread;
      const X = px(lon + Math.cos(a) * d * 1.6, W), Y = py(lat + Math.sin(a) * d, H);
      const r = (0.7 + Math.random() * 1.4) * (W / 2048);
      const g = x.createRadialGradient(X, Y, 0, X, Y, r * 2.6);
      g.addColorStop(0, `rgba(255,206,138,${(0.16 * bright).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,170,80,0)');
      x.fillStyle = g; x.beginPath(); x.arc(X, Y, r * 2.6, 0, TAU); x.fill();
    }
  };
  // the great lit regions, by eye — this is a mood, not a census
  const SEEDS = [
    [8, 50, 520, 9, 1.0], [-75, 40, 460, 8, 1.0], [-100, 40, 260, 12, 0.7],
    [116, 33, 520, 10, 0.95], [77, 24, 470, 9, 0.9], [138, 36, 240, 4, 1.0],
    [-47, -22, 190, 6, 0.8], [-58, -34, 110, 3, 0.85], [31, 30, 150, 5, 0.9],
    [3, 7, 170, 7, 0.7], [28, -26, 100, 4, 0.7], [107, -7, 150, 5, 0.8],
    [55, 25, 120, 5, 0.9], [150, -33, 90, 4, 0.85], [174, -37, 36, 2, 0.8],
    [-99, 19, 120, 3, 0.9], [37, 55, 180, 7, 0.8], [126, 37, 120, 3, 0.95],
    [-3, 40, 120, 4, 0.85], [12, 42, 130, 4, 0.85], [101, 14, 110, 5, 0.8],
  ];
  for (const [lon, lat, n, sp, b] of SEEDS) conurbation(lon, lat, n, sp, b);
  // a thin scatter everywhere else so the interiors are not black voids
  for (let i = 0; i < 2600; i++) {
    const lon = Math.random() * 360 - 180;
    const lat = (Math.random() * 2 - 1) * 62;
    conurbation(lon, lat, 1, 0.4, 0.30);
  }
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------------------------
const VERT = `
varying vec3 vN; varying vec2 vUv; varying vec3 vView;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// ⚠ UNLIT AND SELF-CONTAINED. The space scene has its own light rig for the vessels, and letting a
// directional light do the terminator would mean the night side could never carry city lights
// (a standard material has no way to say "emit only where you are not lit"). Doing the whole thing
// in one shader also means the terminator is exactly `dot(n, sun)` and cannot be tuned into a lie.
const FRAG = `
uniform sampler2D uDay; uniform sampler2D uNight; uniform vec3 uSun;
uniform float uNightMix; uniform vec3 uDusk; uniform vec3 uAtmo;
varying vec3 vN; varying vec2 vUv; varying vec3 vView;
void main(){
  vec3 n = normalize(vN);
  vec3 s = normalize(uSun);
  float d = dot(n, s);
  // the terminator. Narrow, because Earth's is narrow — a soft wide fade reads as fog, not as night.
  float lit = smoothstep(-0.09, 0.14, d);
  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 night = texture2D(uNight, vUv).rgb;
  // dusk: the band right on the line goes warm, which is the thing that makes a terminator beautiful
  float band = 1.0 - smoothstep(0.0, 0.16, abs(d - 0.02));
  vec3 col = day * (0.035 + 0.965 * lit);
  col = mix(col, col * uDusk, band * 0.55);
  col += night * (1.0 - lit) * uNightMix;
  // a specular sheet off the ocean near the subsolar point — only where the day map is blue-ish
  float sea = clamp((day.b - day.r) * 3.0, 0.0, 1.0);
  vec3 h = normalize(s + vView);
  float spec = pow(max(dot(n, h), 0.0), 160.0) * sea * lit;
  col += vec3(0.85, 0.95, 1.0) * spec * 0.32;
  // limb: air piles up at a grazing angle, and it is BRIGHTEST where the air is sunlit
  float fres = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.6);
  col += uAtmo * fres * (0.10 + 0.90 * smoothstep(-0.35, 0.4, d)) * 1.35;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const AIR_VERT = VERT;
const AIR_FRAG = `
uniform vec3 uSun; uniform vec3 uAtmo; uniform float uPower;
varying vec3 vN; varying vec2 vUv; varying vec3 vView;
void main(){
  vec3 n = normalize(vN);
  float d = dot(n, normalize(uSun));
  // seen from OUTSIDE a back-faced shell, the rim is where the normal turns away from the eye
  float rim = pow(1.0 - abs(dot(n, normalize(vView))), 2.4);
  float sun = smoothstep(-0.5, 0.45, d);
  float a = rim * (0.06 + 0.94 * sun) * uPower * 1.5;
  gl_FragColor = vec4(uAtmo * (0.7 + 0.6 * sun), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Build the Earth. Returns { group, setSun(date, dayT), setSunDir(v3), spin(dt), dispose() }.
 * `radius` is in whatever units the caller's scene uses — the globe is a unit sphere scaled, so a
 * space shot and a HUD thumbnail can share one builder.
 */
export function buildEarth(radius = 100, opts = {}) {
  const detail = opts.detail || 2048;
  const day = dayTexture(detail);
  const night = nightTexture(Math.max(1024, detail));
  const atmo = new THREE.Color(opts.atmo || '#7fc4ff');
  const dusk = new THREE.Color(opts.dusk || '#ffb277');

  const uni = {
    uDay: { value: day }, uNight: { value: night },
    uSun: { value: new THREE.Vector3(1, 0, 0) },
    uNightMix: { value: opts.nightMix == null ? 1.0 : opts.nightMix },
    uDusk: { value: dusk }, uAtmo: { value: atmo },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uni });
  // ⚠ 96 segments, not 32. The silhouette of a planet is a CIRCLE, and a faceted limb is the one
  // artefact that instantly reads as "low-poly ball" no matter how good the surface is.
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), mat);

  const airUni = { uSun: uni.uSun, uAtmo: { value: atmo }, uPower: { value: opts.airPower || 1.0 } };
  const airMat = new THREE.ShaderMaterial({ vertexShader: AIR_VERT, fragmentShader: AIR_FRAG,
    uniforms: airUni, transparent: true, side: THREE.BackSide, depthWrite: false,
    blending: THREE.AdditiveBlending });
  const air = new THREE.Mesh(new THREE.SphereGeometry(1.028, 64, 40), airMat);

  const group = new THREE.Group();
  group.add(globe, air);
  group.scale.setScalar(radius);
  // the tilt is real and it is why the terminator is not a vertical line
  group.rotation.z = THREE.MathUtils.degToRad(23.44);

  const _v = new THREE.Vector3();
  const api = {
    group, globe, air, uniforms: uni,
    /** Put the sun where the date and the clock say it is. */
    setSun(date, dayT) {
      const s = subsolar(date, dayT);
      const la = THREE.MathUtils.degToRad(s.lat), lo = THREE.MathUtils.degToRad(s.lon);
      // the texture's lon 0 sits at -Z in three's sphere UV layout; this puts the lit face under
      // the right meridian rather than approximately near it
      _v.set(Math.cos(la) * Math.sin(-lo), Math.sin(la), Math.cos(la) * Math.cos(-lo));
      _v.applyEuler(group.rotation);
      uni.uSun.value.copy(_v).normalize();
      api.subsolar = s;
      return s;
    },
    setSunDir(v) { uni.uSun.value.copy(v).normalize(); },
    /** Real rate is one turn a day; callers usually want it faster so a shot can show it. */
    spin(dt, rate = 1) { globe.rotation.y += dt * rate * (TAU / 86400) * 900; air.rotation.y = globe.rotation.y; },
    setRadius(r) { group.scale.setScalar(r); },
    dispose() {
      globe.geometry.dispose(); air.geometry.dispose();
      mat.dispose(); airMat.dispose(); day.dispose(); night.dispose();
    },
  };
  api.setSun(opts.date, opts.dayT);
  return api;
}
