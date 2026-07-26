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
import { BORDER_COUNTRIES, ringsOf, COAST_ARCS, BORDER_ARCS, arcPoints } from '../data/borders.js';
import { CITY_LATLON, CITY_FIX } from '../data/citycoords.js';
import { cityList } from '../data/cities.js';

const TAU = Math.PI * 2;

// ==============================================================================================
// THE ONE PROJECTION. Everything that has to sit at a place on this globe goes through here: the
// subsolar point, every border vertex, every city marker.
//
// ⚠ IT IS DERIVED FROM `SphereGeometry`'S OWN UV LAYOUT, not from a textbook. three builds the
// sphere as x = -r*cos(phi)*sin(theta), y = r*cos(theta), z = r*sin(phi)*sin(theta) with
// uv = (u, 1-v) — so lon 0 lands on **+X**, not +Z. The first version of `setSun` rolled its own
// spherical and put lon 0 on +Z: ninety degrees out, which produced a terminator that looked
// completely convincing and fell in the wrong place. One function, no second opinion.
export function llToVec3(lon, lat, r = 1, out) {
  const theta = Math.PI * (90 - lat) / 180;         // 0 at the north pole
  const phi = TAU * (lon + 180) / 360;
  const st = Math.sin(theta);
  const v = out || new THREE.Vector3();
  return v.set(-r * Math.cos(phi) * st, r * Math.cos(theta), r * Math.sin(phi) * st);
}

// Every land ring on Earth, from the real country polygons. Cached — it is walked by both the day
// map and the night map, and decoding 458 rings twice would be silly.
let _realRings = null;
function realRings() {
  if (_realRings) return _realRings;
  _realRings = [];
  for (const c of BORDER_COUNTRIES) for (const r of ringsOf(c)) _realRings.push(r);
  return _realRings;
}
// ⚠ WATER BODIES COME FOR FREE. The Caspian, the Great Lakes and the Aral are not inside any
// country polygon in Natural Earth, so painting land from country rings leaves them as sea without
// anybody having to cut them out — which is what the hand-authored INLAND table existed to do.
function onLand(lon, lat) {
  for (const r of realRings()) {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

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

  // ⚠ THE TEXTURE AND THE BORDERS MUST BE THE SAME WORLD. This used to rasterise the authored
  // outlines in data/earth.js — fine when they were all we had, and immediately wrong the moment
  // real Natural Earth country polygons arrived, because a border wall for Italy would have stood
  // beside a hand-drawn Italy of a different shape. The land is now painted from the SAME 178
  // countries the walls are extruded from, so a coastline and its border are one line by
  // construction. (`COASTS` survives in data/earth.js as the fallback and as the record of how
  // this started; nothing on the globe reads it any more.)
  const rings = realRings();
  // --- THE EXTRUDED COAST, part one: a hard dark shadow offset under every landmass. Drawn for
  // ALL of them first so one continent's shadow can fall on the sea beside its neighbour.
  const off = Math.max(1.5, W / 620);
  x.fillStyle = 'rgba(5,11,16,0.58)';
  for (const r of rings) { ringPath(x, r, W, H, off, off); x.fill(); }

  // --- land
  const lg = x.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0.00, '#6b7678');
  lg.addColorStop(0.20, '#4a5a3c');
  lg.addColorStop(0.30, '#586237');
  lg.addColorStop(0.42, '#8a7444');       // the desert belt
  lg.addColorStop(0.52, '#415a2c');       // the equatorial forest
  lg.addColorStop(0.66, '#87703f');
  lg.addColorStop(0.80, '#4b5a36');
  lg.addColorStop(1.00, '#7d8688');
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

  // (The INLAND cut-outs in data/earth.js are no longer applied: Natural Earth's country polygons
  // already exclude the Caspian, the Great Lakes and the Aral, so they are sea by construction.
  // Painting them again would only re-cut water out of water.)

  // --- ice. Antarctica is a continent (already filled) and gets painted over; the Arctic is sea
  // ice with no coastline at all, which is why it is a band and not a polygon.
  // ⚠ THE FIRST VERSION PAINTED CANADA AND SIBERIA WHITE. A linear wash from the pole down to 66
  // degrees covers most of the northern landmass, and at a glance the planet read as half glacier.
  // The cap has to be tight to the pole and mostly transparent by the time it reaches any coast.
  // ⚠ A HARD-EDGED LATITUDE BAND READS AS A DECAL, NOT AS ICE. Seen edge-on near the limb the cap
  // foreshortens into a crescent with a suspiciously perfect inner edge, and it looks so much like
  // a rendering artefact that I went hunting for a geometry bug twice before recognising it as the
  // ice. Sea ice has a ragged margin; a soft ramp plus a broken edge is what makes it read as
  // frozen ocean rather than as a sticker.
  const ice = (y0, y1) => {
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0.00, 'rgba(222,233,240,0.84)');
    g.addColorStop(0.30, 'rgba(222,233,240,0.52)');
    g.addColorStop(0.62, 'rgba(222,233,240,0.16)');
    g.addColorStop(1.00, 'rgba(222,233,240,0)');
    x.fillStyle = g; x.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
    // the ragged margin: floes scattered along the edge so it is never a clean line
    const edge = y1, span = Math.abs(y1 - y0);
    for (let i = 0; i < 900; i++) {
      const cx = Math.random() * W;
      const cy = edge + (Math.random() - 0.62) * span * 0.42;
      const r = (3 + Math.random() * 16) * (W / 2048);
      const g2 = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g2.addColorStop(0, 'rgba(226,236,242,0.34)'); g2.addColorStop(1, 'rgba(226,236,242,0)');
      x.fillStyle = g2; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    }
  };
  ice(0, py(ARCTIC_ICE_LAT - 2, H));
  ice(H, py(ANTARCTIC_ICE_LAT + 2, H));

  // --- the coastline itself: a thin bright lip, which is what sells "the land stands above water".
  // ⚠ COAST ARCS ONLY. Stroking every COUNTRY ring painted the political borders permanently into
  // the map, which meant they could never fade in on approach — the whole reveal was impossible
  // and I could not work out why the zoom ladder did nothing.
  x.strokeStyle = 'rgba(214,228,226,0.44)'; x.lineWidth = Math.max(1, W / 1500);
  x.beginPath();
  for (const flat of COAST_ARCS) {
    const a = arcPoints(flat);
    let started = false;
    for (let i = 0; i < a.length; i++) {
      if (i && Math.abs(a[i][0] - a[i - 1][0]) > 180) { started = false; continue; }
      const X = px(a[i][0], W), Y = py(a[i][1], H);
      if (!started) { x.moveTo(X, Y); started = true; } else x.lineTo(X, Y);
    }
  }
  x.stroke();

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
  const rings = realRings();
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

// ==============================================================================================
// THE BORDERS, STANDING PROUD OF THE WATER.
//
// Robert: *"get countries on a globe with borders and elevated... seeing the globe, and getting
// closer and seeing the borders of countries and then getting closer and seeing the cities that we
// have. don't stop until we have that and it is awe inspiring."*
//
// ⚠ ELEVATED MEANS A WALL, NOT A LINE. A border drawn as a line on a sphere is a map. What his
// reference actually shows is landmasses standing ABOVE the water with a lit top edge and a dark
// face — so every border ring is built twice, once on the surface and once at `1 + rise`, and the
// two are stitched into a ribbon. That ribbon is a real wall catching real light, and it is the
// entire difference between "a globe with lines on it" and "a world with countries on it".
//
// One merged geometry for all 178 countries. 18,576 border points become one draw call.
function buildWall(lines, rise, colTop, colBase) {
  const segs = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      // ⚠ THE ANTIMERIDIAN. A ring crossing +/-180 jumps from 179 to -179, and joining those two
      // points draws a wall THE WHOLE WAY ROUND THE PLANET — it rendered as a smooth arc over the
      // Arctic that looked like a ring system. A seam is not a segment.
      if (Math.abs(a[0] - b[0]) > 180) continue;
      segs.push([a, b]);
    }
  }
  const n = segs.length;
  const pos = new Float32Array(n * 18);          // 2 triangles = 6 verts per segment
  const col = new Float32Array(n * 18);
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  const cT = new THREE.Color(colTop), cB = new THREE.Color(colBase);
  let o = 0;
  const put = (v, c) => {
    pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
    col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
    o += 3;
  };
  const a0 = new THREE.Vector3(), a1 = new THREE.Vector3(), b0 = new THREE.Vector3(), b1 = new THREE.Vector3();
  for (const [a, b] of segs) {
    llToVec3(a[0], a[1], 1, A); llToVec3(b[0], b[1], 1, B);
    a0.copy(A); a1.copy(A).multiplyScalar(1 + rise);
    b0.copy(B); b1.copy(B).multiplyScalar(1 + rise);
    put(a0, cB); put(b0, cB); put(b1, cT);
    put(a0, cB); put(b1, cT); put(a1, cT);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { geo: g, segments: n };
}

// The crisp top edge. Cheap, and it is what stays readable when the wall itself is too small to see.
function buildLines(lines, rise) {
  const pts = [];
  const V = new THREE.Vector3();
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      if (Math.abs(a[0] - b[0]) > 180) continue;
      llToVec3(a[0], a[1], 1 + rise, V); pts.push(V.x, V.y, V.z);
      llToVec3(b[0], b[1], 1 + rise, V); pts.push(V.x, V.y, V.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  return g;
}

// ==============================================================================================
// THE CITIES WE ACTUALLY HAVE. All 1,050, at their real coordinates (data/citycoords.js).
//
// ⚠ MATCH QUALITY IS DRAWN, NOT HIDDEN. Three of the 1,050 resolved only to a country centroid
// because the row is a metro area rather than a place; they are dimmer and smaller. A surface that
// renders a guess identically to a survey is lying quietly, and this one has 1,047 real points to
// lose credibility for.
function buildCityPoints(rise) {
  const n = CITY_LATLON.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n);
  const V = new THREE.Vector3(), c = new THREE.Color();
  const list = cityList();
  for (let i = 0; i < n; i++) {
    const [lat, lon] = CITY_LATLON[i];
    llToVec3(lon, lat, 1 + rise, V);
    pos[i * 3] = V.x; pos[i * 3 + 1] = V.y; pos[i * 3 + 2] = V.z;
    const fix = CITY_FIX[i];
    const pop = (list[i] && list[i].pop) || 0;
    // size carries population, so the shape of human settlement is visible from orbit
    siz[i] = (fix === 0 ? 0.55 : 1) * (0.65 + Math.min(1.6, Math.log10(Math.max(1000, pop)) - 3.2));
    c.set(fix === 2 ? '#ffd24a' : fix === 1 ? '#ffb347' : '#7a7466');
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
  return g;
}

// ==============================================================================================
// THE HORIZON CLIP — and this one took a while to see for what it was.
//
// Everything drawn ON the globe (coast walls, border walls, border lines, city markers) sits at a
// radius slightly ABOVE 1. Near the limb, that sliver pokes outside the sphere's own silhouette —
// so the geometry on the FAR SIDE of the planet, which the depth buffer correctly hides everywhere
// else, reappears as a thin ring just outside the edge. It read as a smooth ribbon over the Arctic
// and I twice went looking for a bad polygon: I checked every segment in the dataset for excessive
// length, found exactly one (the real US-Canada 49th parallel), and concluded the data was clean.
// It was. The artefact was the far hemisphere leaking around the edge.
//
// The clip is exact rather than eyeballed. For a unit sphere seen from distance d, the horizon is
// the circle where dot(surfaceNormal, eyeDirection) = 1/d — everything below that is over the
// curve and must not be drawn. One line in each fragment shader, no extra passes.
const HORIZON_CHUNK = `
  float _hz = dot(normalize(vPos), normalize(uEye));
  if (_hz < 1.0 / max(1.0001, length(uEye))) discard;
`;
// ⚠ THE TWO SHADERS EXIST BECAUSE OF `color`. A ShaderMaterial with `vertexColors: true` HAS the
// attribute injected by three — declaring it again is a redefinition error. A material without it
// (the border LINES carry no colour attribute) must use a shader that never mentions it. One
// vertex shader for both was wrong in each direction in turn.
const WALL_VERT = `
varying vec3 vPos; varying vec3 vC;
void main(){ vPos = position; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINE_VERT = `
varying vec3 vPos;
void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const WALL_FRAG = `
uniform vec3 uEye; uniform float uOpacity;
varying vec3 vPos; varying vec3 vC;
void main(){
${HORIZON_CHUNK}
  gl_FragColor = vec4(vC, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const LINE_FRAG = `
uniform vec3 uEye; uniform float uOpacity; uniform vec3 uColor;
varying vec3 vPos;
void main(){
${HORIZON_CHUNK}
  gl_FragColor = vec4(uColor, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const CITY_VERT = `
attribute float aSize; varying vec3 vC; uniform float uScale; uniform float uFade;
varying float vFade; varying vec3 vPos;
void main(){
  vC = color; vFade = uFade; vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(1.0, -mv.z) * 300.0;
}`;
const CITY_FRAG = `
uniform vec3 uEye;
varying vec3 vC; varying float vFade; varying vec3 vPos;
void main(){
${HORIZON_CHUNK}
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float core = smoothstep(0.5, 0.06, r);
  // ⚠ ADDITIVE GOLD OVER GREEN LAND COMES OUT YELLOW-GREEN. A city has to punch a hot white core
  // through whatever is under it, with the colour only in the halo, or it reads as lichen.
  float hot = pow(core, 3.0);
  gl_FragColor = vec4(mix(vC, vec3(1.0, 0.96, 0.86), hot) * (0.85 + core * 1.7), core * vFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Build the Earth. Returns { group, setSun(date, dayT), setSunDir(v3), spin(dt), dispose() }.
 * `radius` is in whatever units the caller's scene uses — the globe is a unit sphere scaled, so a
 * space shot and a HUD thumbnail can share one builder.
 */
export function buildEarth(radius = 100, opts = {}) {
  const detail = opts.detail || 4096;   // built once; this is the hero asset of the whole game
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

  // --- THE LAND, STANDING ABOVE THE WATER, and THE POLITICAL WORLD. Two layers, because they are
  // two different facts. The coast is the shape of the planet and is always there, low and warm,
  // the extruded edge from his reference. A national border is an OPINION humans drew on top, and
  // from orbit it is a diagram — so it stays off until you are close enough for it to mean
  // something. Splitting them is only possible because TopoJSON shares arcs between neighbours:
  // an arc used once is a coast, an arc used twice is a border (see the bake note in borders.js).
  const RISE = opts.rise == null ? 0.006 : opts.rise;
  const coastLines = COAST_ARCS.map(arcPoints);
  const politicalLines = BORDER_ARCS.map(arcPoints);
  const coast = buildWall(coastLines, RISE, opts.coastTop || '#b9ad8c', opts.coastBase || '#0b0908');
  const eye = { value: new THREE.Vector3(0, 0, 3) };     // camera in LOCAL space, updated per frame
  const coastMat = new THREE.ShaderMaterial({ vertexShader: WALL_VERT, fragmentShader: WALL_FRAG,
    vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uEye: eye, uOpacity: { value: 0.9 } } });
  const coastShell = new THREE.Mesh(coast.geo, coastMat);
  // ⚠ A WALL IS DARK AT THE BOTTOM AND LIT AT THE TOP. The first pass used a pale top and a
  // brown base and read as a fat white outline drawn on the map rather than as anything standing
  // up. Deep shadow at the foot, warm light on the crest — that gradient IS the elevation.
  const shell = buildWall(politicalLines, RISE * 1.7, opts.borderTop || '#ffcf7a', opts.borderBase || '#241a10');
  const shellMat = new THREE.ShaderMaterial({ vertexShader: WALL_VERT, fragmentShader: WALL_FRAG,
    vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uEye: eye, uOpacity: { value: 0 } } });
  const borderShell = new THREE.Mesh(shell.geo, shellMat);
  const lineMat = new THREE.ShaderMaterial({ vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uEye: eye, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(opts.borderLine || '#ffd08a') } } });
  const borderLines = new THREE.LineSegments(buildLines(politicalLines, RISE * 1.7), lineMat);

  // --- THE CITIES
  const cityMat = new THREE.ShaderMaterial({
    vertexShader: CITY_VERT, fragmentShader: CITY_FRAG, vertexColors: true,
    uniforms: { uScale: { value: 1 }, uFade: { value: 0 }, uEye: eye },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const cities = new THREE.Points(buildCityPoints(RISE * 1.25), cityMat);
  cities.frustumCulled = false;

  const group = new THREE.Group();
  group.add(globe, air, coastShell, borderShell, borderLines, cities);
  group.scale.setScalar(radius);
  // the tilt is real and it is why the terminator is not a vertical line
  group.rotation.z = THREE.MathUtils.degToRad(23.44);

  const _v = new THREE.Vector3();
  const api = {
    group, globe, air, uniforms: uni,
    /** Put the sun where the date and the clock say it is. */
    setSun(date, dayT) {
      const s = subsolar(date, dayT);
      // ⚠ THROUGH `llToVec3`, NOT A HAND-ROLLED SPHERICAL. The first version wrote its own
      // conversion and it was NINETY DEGREES OF LONGITUDE OUT — it put lon 0 on +Z while the
      // SphereGeometry the texture is painted on puts it on +X. The terminator therefore fell in
      // a plausible-looking but geographically wrong place, which is exactly the kind of error a
      // beautiful screenshot hides. There is now ONE projection and the sun, the borders and the
      // city markers all go through it, so they cannot disagree.
      llToVec3(s.lon, s.lat, 1, _v);
      _v.applyEuler(group.rotation);
      uni.uSun.value.copy(_v).normalize();
      api.subsolar = s;
      return s;
    },
    setSunDir(v) { uni.uSun.value.copy(v).normalize(); },
    coastShell, borderShell, borderLines, cities,

    // ⚠ THE ZOOM LADDER IS THE WHOLE FEATURE, and it is a sequence, not a switch. From far out you
    // see a PLANET — borders at that distance would be a diagram and would destroy the illusion
    // that this is a real body. As you close, the political world fades up: first the hairline,
    // then the walls catching the light. Closer still and the cities arrive, and only then does it
    // become a map of somewhere people live. Each layer earns its place by the distance you have
    // travelled toward it, which is what makes the approach feel like an approach.
    //
    // `d` is the camera's distance in RADII (1 = touching the surface).
    setZoom(d) {
      const k = (a, b) => Math.max(0, Math.min(1, (a - d) / (a - b)));
      const line = k(4.2, 2.6);                 // the hairline comes first — cheap and legible
      const wall = k(3.0, 1.7);                 // then the elevation, once it is big enough to read
      const city = k(2.1, 1.28);                // and the cities last, when they mean something
      // the coast wall is always on, but it leans back at extreme range so the limb stays clean
      coastMat.uniforms.uOpacity.value = 0.45 + 0.45 * k(7.0, 2.4);
      lineMat.uniforms.uOpacity.value = 0.42 * line;
      shellMat.uniforms.uOpacity.value = 0.72 * wall;
      cityMat.uniforms.uFade.value = city;
      borderLines.visible = line > 0.004;
      borderShell.visible = wall > 0.004;
      cities.visible = city > 0.004;
      // the point sprite must not swell without limit as you approach or a city becomes a blob
      cityMat.uniforms.uScale.value = Math.min(2.6, 0.5 + (3.2 - Math.min(3.2, d)) * 0.9) * radius / 100;
      api.zoom = { d, line, wall, city };
      return api.zoom;
    },
    /** Convenience: drive the ladder straight off a camera. */
    setZoomFromCamera(cam) {
      const c = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      const o = new THREE.Vector3().setFromMatrixPosition(group.matrixWorld);
      // ⚠ AND THE EYE, IN LOCAL SPACE. The horizon clip is meaningless without it, and it has to be
      // the mesh's own frame or a rotated globe clips against the wrong hemisphere.
      group.updateMatrixWorld();
      eye.value.copy(c);
      group.worldToLocal(eye.value);
      return api.setZoom(c.distanceTo(o) / (radius || 1));
    },
    /** Where a city is, in world space — for pinning a label or flying to it. */
    cityPos(i, out) {
      const ll = CITY_LATLON[i]; if (!ll) return null;
      const v = llToVec3(ll[1], ll[0], 1 + RISE, out || new THREE.Vector3());
      return group.localToWorld(v);
    },
    stats: { countries: BORDER_COUNTRIES.length, coastSegments: coast.segments,
             borderSegments: shell.segments, cities: CITY_LATLON.length },
    /** Real rate is one turn a day; callers usually want it faster so a shot can show it. */
    spin(dt, rate = 1) { globe.rotation.y += dt * rate * (TAU / 86400) * 900; air.rotation.y = globe.rotation.y; },
    setRadius(r) { group.scale.setScalar(r); },
    dispose() {
      globe.geometry.dispose(); air.geometry.dispose();
      coast.geo.dispose(); shell.geo.dispose(); borderLines.geometry.dispose(); cities.geometry.dispose();
      mat.dispose(); airMat.dispose(); coastMat.dispose(); shellMat.dispose(); lineMat.dispose(); cityMat.dispose();
      day.dispose(); night.dispose();
    },
  };
  api.setSun(opts.date, opts.dayT);
  api.setZoom(opts.zoom == null ? 9 : opts.zoom);
  return api;
}
