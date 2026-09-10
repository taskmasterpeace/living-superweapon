// ── the vertex-colour shading stack (L1–L8) ────────────────────────────────
//
// Ported from an interactive lab where every layer here was settled against six
// real creatures and every removed control was removed because it MEASURED as
// dead, not because it looked redundant. The numbers in DEFAULTS are that lab's
// final read-out.
//
// Two things are different here, and both are improvements the lab could not
// have made:
//
//   · CLASSIFICATION IS FREE. The lab worked on a finished GLB and had to GUESS
//     which parts were flesh and which were hardware, from bone counts. That
//     guess failed completely on two shipped creatures — the owl and the
//     some creatures classify as 100% hardware, so the whole stack skipped them. The
//     engine does not guess: the spec says what every piece IS. Volumes, hands
//     and paws are flesh; spikes, curves, membranes and fins are hardware; eyes
//     are features. `"shade"` on a volume or part overrides it, which is how a
//     trunk (a curve that is flesh) says so.
//
//   · THERE IS NO ORIGINAL COLOUR TO PRESERVE. The lab's L1 spent its effort
//     recovering per-vertex colour that step 0 of that pipeline had thrown away.
//     Here the arc bands ARE the colour, first-hand. What survives from L1 is
//     the half that was never about recovery: the cross-part spatial smoothing
//     that kills seams, because a colour field that is a function of POSITION
//     gives two coincident points the same value by construction.
//
// Everything below is a pure function of position and classification. No
// randomness, no dates — the same spec compiles to the same bytes.

// ── OKLab ──────────────────────────────────────────────────────────────────
// L is lightness, hypot(a,b) is chroma, and they are INDEPENDENT. That is the
// whole reason this stack works in OKLab and not in RGB: "brighter and more
// saturated" is two numbers here and is impossible in any blend mode, because
// every mode that brightens moves toward white and white has chroma 0.
function lin2oklab(c) {
  const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
  const m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
  const s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklabToLinRaw(L) {
  const l = (L[0] + 0.3963377774 * L[1] + 0.2158037573 * L[2]) ** 3;
  const m = (L[0] - 0.1055613458 * L[1] - 0.0638541728 * L[2]) ** 3;
  const s = (L[0] - 0.0894841775 * L[1] - 1.2914855480 * L[2]) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
function oklab2lin(L) {
  return oklabToLinRaw(L).map(v => (v < 0 ? 0 : v > 1 ? 1 : v));
}
function inGamut(c) {
  const r = oklabToLinRaw(c);
  return r.every(v => v >= -1e-4 && v <= 1.0001);
}

const ss = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / ((b - a) || 1e-9)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t,
                          a[1] + (b[1] - a[1]) * t,
                          a[2] + (b[2] - a[2]) * t];
const s2l = v => Math.pow(v, 2.2);
function hex2lab(h) {
  const x = String(h).replace('#', '');
  return lin2oklab([0, 2, 4].map(i => s2l(parseInt(x.substr(i, 2), 16) / 255)));
}

// ── settled values ─────────────────────────────────────────────────────────
const DEFAULTS = {
  seam:    { radius_edges: 3, min_frac: 0.030 },
  pattern: { color: null, sharpness: 0.45, amount: 1.00, scale: 0.06 },
  ramp:    { bottom: '#001370', mid: '#cfcfcf', top: '#fffcf0',
             p0: 0.00, pm: 0.31, wm: 0.08, p1: 1.00,
             sh0: 0.0, sh1: 0.0, chroma: 1.0, amount: 1.00 },
  boost:   { y0: 0.00, y1: 0.40, gamma: 0.30, dL: 0.03, dC: 1.50, amount: 1.00,
             target: 'all' },
  bleed:   { radius: 0.025, sharpness: 0.35, amount: 0.45 },
  hardsh:  { amount: 0.54, gamma: 0.70 },
  bodysh:  { lights: 4, rot: 4, elev: 17, amount: 0.20, gamma: 1.95 },
};

// ── classification ─────────────────────────────────────────────────────────
const HARD_TYPES = new Set(['spike', 'curve', 'membrane', 'fin']);
const FX_MATERIAL = /^(eye|pupil|iris|sclera|nose|nostril|tooth|teeth|tongue)/i;

function classOf(m, declared) {
  if (declared) return declared;                       // spec wins, always
  if (m.partType === 'eye' || FX_MATERIAL.test(m.material || '')) return 'fx';
  if (m.partType && HARD_TYPES.has(m.partType)) return 'hard';
  return 'flesh';                                      // volumes, hands, paws
}

/** Read `shade` off the spec for each mesh: per-part, then per-volume. */
function declaredClasses(spec) {
  const byName = new Map();
  for (const v of spec.volumes || []) if (v.shade) byName.set(v.chain, v.shade);
  for (const p of spec.parts || []) {
    if (!p.shade) continue;
    const label = p.name || `${p.type}@${p.host || 'ribs'}`;
    byName.set(label, p.shade);
    byName.set(label + '.R', p.shade);
  }
  return byName;
}

// ── spatial grid over a subset of vertices ─────────────────────────────────
// Used twice: to smooth the flesh colour field across part boundaries (L1) and
// to find the nearest hardware vertex to each flesh vertex (L5). One
// implementation, because they are the same query.
function grid(points, cell) {
  const g = new Map();
  const key = (a, b, c) => a + ',' + b + ',' + c;
  const idx = p => [Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell)];
  points.forEach((p, i) => {
    const [a, b, c] = idx(p.v);
    const k = key(a, b, c);
    let bin = g.get(k);
    if (!bin) g.set(k, bin = []);
    bin.push(i);
  });
  return {
    near(v, r) {
      const out = [];
      const [a, b, c] = idx(v);
      const s = Math.ceil(r / cell);
      for (let x = a - s; x <= a + s; x++)
        for (let y = b - s; y <= b + s; y++)
          for (let z = c - s; z <= c + s; z++) {
            const bin = g.get(key(x, y, z));
            if (bin) out.push(...bin);
          }
      return out;
    },
  };
}

/** Median edge length across every mesh — the sampling ruler. */
function medianEdge(meshes, diag) {
  const L = [];
  for (const m of meshes)
    for (const f of m.F || [])
      for (let k = 0; k < f.length; k++) {
        const a = m.V[f[k]], b = m.V[f[(k + 1) % f.length]];
        L.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
  if (!L.length) return diag * 0.02;
  L.sort((x, y) => x - y);
  return L[Math.floor(L.length * 0.5)] || diag * 0.02;
}

// ── the stack ──────────────────────────────────────────────────────────────
function shadeStack(spec, meshes, INFO) {
  const cfg = spec.shading || {};
  const on = k => cfg[k] !== false && cfg[k] !== 0;
  const P = k => Object.assign({}, DEFAULTS[k], (cfg[k] && typeof cfg[k] === 'object') ? cfg[k] : {});

  const live = meshes.filter(m => m.V && m.V.length);
  if (!live.length) return;

  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const m of live) for (const v of m.V) for (let k = 0; k < 3; k++) {
    if (v[k] < lo[k]) lo[k] = v[k];
    if (v[k] > hi[k]) hi[k] = v[k];
  }
  const diag = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;
  const y0 = lo[1], yr = (hi[1] - lo[1]) || 1e-6;

  const declared = declaredClasses(spec);
  for (const m of live) m._cls = classOf(m, declared.get(m.part || m.chain));
  const counts = { flesh: 0, hard: 0, fx: 0 };
  const byClass = { flesh: new Set(), hard: new Set(), fx: new Set() };
  for (const m of live) {
    counts[m._cls] += m.V.length;
    byClass[m._cls].add(m.part || m.chain || m.material || '?');
  }
  // Say WHICH pieces landed in which class. The lab could only guess at this
  // and guessed wrong on two shipped creatures; the least the engine can do,
  // having the answer for free, is print it — a trunk sitting in `hard` is a
  // one-line spec fix, and invisible unless someone says so.
  for (const k of ['flesh', 'hard', 'fx'])
    if (byClass[k].size)
      INFO.push(`shade class ${k}: ${[...byClass[k]].sort().join(', ')}`);

  // every vertex, flattened, with a back-pointer
  const pts = [];
  for (const m of live)
    m.V.forEach((v, i) => pts.push({ v, m, i, cls: m._cls }));

  // colour in OKLab, per vertex, starting from the mesh's own arc/flat colour
  for (const m of live) {
    if (!m.C) m.C = m.V.map(() => null);
    for (let i = 0; i < m.V.length; i++) {
      const c = m.C[i];
      m.C[i] = c ? lin2oklab(c) : hex2lab(m.color || '#888888');
    }
  }

  // ── L1: seam-safe flesh colour ─────────────────────────────────────────
  // A colour field that is a FUNCTION OF POSITION cannot have a seam: two
  // coincident points on either side of a junction get the same value by
  // construction. So the flesh colour is averaged spatially ACROSS parts.
  // Hardware is deliberately excluded — a bolted-on plate is supposed to have
  // a hard edge, and smoothing it would be smoothing away the design.
  //
  // The radius is tied to THIS creature's own median edge length, not to a
  // fixed fraction of its diagonal. The lab measured why: at a fixed 3% of the
  // diagonal the radius-to-edge ratio ran 1.1–1.7 across six creatures, and the
  // leftover seam ranked in exact inverse order of that ratio. A field must
  // vary slowly compared to the mesh that samples it; 1.1 edges is not slow.
  if (on('seam') !== false) {
    const sp = P('seam');
    const edge = medianEdge(live, diag);
    const R = Math.max(sp.min_frac * diag, edge * sp.radius_edges);
    const fleshPts = pts.filter(p => p.cls === 'flesh');
    if (fleshPts.length) {
      const gg = grid(fleshPts, R);
      const out = new Array(fleshPts.length);
      const r2 = R * R, sig2 = (R / 2) * (R / 2);
      fleshPts.forEach((p, n) => {
        let wsum = 0, acc = [0, 0, 0];
        for (const j of gg.near(p.v, R)) {
          const q = fleshPts[j];
          const dx = q.v[0] - p.v[0], dy = q.v[1] - p.v[1], dz = q.v[2] - p.v[2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > r2) continue;
          const w = Math.exp(-d2 / (2 * sig2));
          const c = q.m.C[q.i];
          acc[0] += c[0] * w; acc[1] += c[1] * w; acc[2] += c[2] * w;
          wsum += w;
        }
        out[n] = wsum > 0 ? [acc[0] / wsum, acc[1] / wsum, acc[2] / wsum] : p.m.C[p.i];
      });
      fleshPts.forEach((p, n) => { p.m.C[p.i] = out[n]; });
      INFO.push(`shade L1: flesh colour smoothed across parts, r=${(R / diag * 100).toFixed(1)}% of diagonal `
                + `(${(R / edge).toFixed(1)}x median edge) — seams cannot survive a position function`);
    }
  }

  // ── L2: pattern ────────────────────────────────────────────────────────
  // Flesh only, and only when the spec names a colour. The mask is the same
  // deterministic value noise the engine already uses, so it is reproducible.
  const pat = P('pattern');
  if (pat.color) {
    const PC = hex2lab(pat.color);
    const w = Math.max(0.02, 0.55 * (1 - pat.sharpness));
    const cell = Math.max(1e-6, pat.scale * diag);
    for (const p of pts) {
      if (p.cls !== 'flesh') continue;
      const n = vnoise3(p.v, cell);
      const t = pat.amount * ss(0.5 - w, 0.5 + w, n);
      if (t > 0) p.m.C[p.i] = mix(p.m.C[p.i], PC, t);
    }
    INFO.push(`shade L2: pattern ${pat.color} at ${(pat.amount * 100) | 0}% on flesh`);
  }

  // ── L3: top-to-bottom ramp, multiplied over everything ─────────────────
  const rp = P('ramp');
  const A = hex2lab(rp.bottom), MM = hex2lab(rp.mid), B = hex2lab(rp.top);
  const half = Math.max(0, rp.wm) / 2;
  const e0 = Math.min(rp.p1, Math.max(rp.p0, rp.pm - half));
  const e1 = Math.min(rp.p1, Math.max(e0, rp.pm + half));
  const lo0 = rp.p0 + (e0 - rp.p0) * rp.sh0, hi0 = e0;
  const lo1 = e1, hi1 = rp.p1 - (rp.p1 - e1) * rp.sh1;
  const bandAt = y => {
    const b0 = hi0 - lo0 < 1e-6 ? (y >= e0 ? 1 : 0) : ss(lo0, hi0, y);
    const b1 = hi1 - lo1 < 1e-6 ? (y >= e1 ? 1 : 0) : ss(lo1, hi1, y);
    let c = mix(A, MM, b0); c = mix(c, B, b1);
    return [c[0], c[1] * rp.chroma, c[2] * rp.chroma];
  };
  if (rp.amount > 0) {
    for (const p of pts) {
      if (p.cls === 'fx') continue;
      const y = (p.v[1] - y0) / yr;
      const band = bandAt(y);
      const c = p.m.C[p.i];
      // multiply, in OKLab: L multiplies, chroma follows the band's own chroma
      const t = rp.amount;
      p.m.C[p.i] = [c[0] * (1 - t) + c[0] * band[0] * t,
                    c[1] * (1 - t) + (c[1] * band[0] + band[1] * c[0]) * t,
                    c[2] * (1 - t) + (c[2] * band[0] + band[2] * c[0]) * t];
    }
    INFO.push(`shade L3: ramp ${rp.bottom} -> ${rp.mid} @${rp.pm} -> ${rp.top}, multiply ${(rp.amount * 100) | 0}%`);
  }

  // ── L4: brighten AND saturate the upper region, exactly nothing below ───
  // No blend mode can do this and it is not a tuning problem: screen and add
  // only move toward white, and white has chroma 0, so every one of them LOSES
  // chroma while gaining lightness. Observed on three creatures, every mode's
  // delta-chroma was negative. In OKLab the two quantities are independent, so
  // this just moves them:
  //     L' = L + dL*w        chroma' = chroma * (1 + (dC-1)*w)
  // Below y0 the ramp is exactly 0, so w is 0, so the vertex is returned
  // unchanged — identity, not "almost unchanged". The lab measured the maximum
  // change in the lower region across six creatures as exactly 0.
  const bo = P('boost');
  if (bo.amount > 0 && (bo.dL !== 0 || bo.dC !== 1)) {
    let clipped = 0, touched = 0;
    for (const p of pts) {
      if (p.cls === 'fx') continue;
      if (bo.target === 'flesh' && p.cls !== 'flesh') continue;
      const y = (p.v[1] - y0) / yr;
      let t = ss(bo.y0, bo.y1, y);
      if (bo.gamma !== 1) t = Math.pow(t, bo.gamma);
      if (t <= 0) continue;                         // identity, by construction
      touched++;
      const c = p.m.C[p.i];
      const w = bo.amount * t;
      const L = Math.min(1, c[0] + bo.dL * w);
      let k = 1 + (bo.dC - 1) * w;
      // Pushing chroma runs out of sRGB, and clamping per channel TURNS THE HUE
      // rather than capping the chroma. So walk back to the gamut boundary
      // instead: 12 bisections, error under 0.03%.
      if (!inGamut([L, c[1] * k, c[2] * k])) {
        clipped++;
        let a = 0, b2 = k;
        for (let it = 0; it < 12; it++) {
          const mid = (a + b2) / 2;
          if (inGamut([L, c[1] * mid, c[2] * mid])) a = mid; else b2 = mid;
        }
        k = a;
      }
      p.m.C[p.i] = [L, c[1] * k, c[2] * k];
    }
    INFO.push(`shade L4: boost dL+${bo.dL} chroma x${bo.dC} above y=${bo.y0}..${bo.y1}; `
              + `${touched} vertices touched, ${clipped} walked back to the gamut edge (0 clamped)`);
  }

  // ── L5: hardware bleeds into the flesh around it ───────────────────────
  const bl = P('bleed');
  const hardPts = pts.filter(p => p.cls === 'hard');
  if (bl.amount > 0 && hardPts.length) {
    const R = bl.radius * diag;
    const gg = grid(hardPts, R);
    let hit = 0;
    for (const p of pts) {
      if (p.cls !== 'flesh') continue;
      let best = -1, bestD = Infinity;
      for (const j of gg.near(p.v, R)) {
        const q = hardPts[j];
        const d = Math.hypot(q.v[0] - p.v[0], q.v[1] - p.v[1], q.v[2] - p.v[2]);
        if (d < bestD) { bestD = d; best = j; }
      }
      if (best < 0 || bestD >= R) continue;
      const k = Math.pow(Math.max(0, 1 - bestD / R), 1 + 8 * bl.sharpness);
      const q = hardPts[best];
      p.m.C[p.i] = mix(p.m.C[p.i], q.m.C[q.i], bl.amount * k);
      hit++;
    }
    INFO.push(`shade L5: hardware bled into ${hit} flesh vertices within ${(bl.radius * 100).toFixed(1)}% of diagonal`);
  }

  // ── L6 / L7: shading, mutually exclusive by class ──────────────────────
  // Both read the AO already baked into m.AO by ao.js. L7's fourth input in the
  // lab was a union-volume SDF that this engine does not build; what is here is
  // the horizontal light ring times AO, which is the same formula with that
  // term set to 1. Called out rather than quietly approximated.
  const hs = P('hardsh'), bs = P('bodysh');
  const ring = [];
  for (let i = 0; i < Math.max(1, bs.lights | 0); i++) {
    const az = (bs.rot + i * 360 / Math.max(1, bs.lights | 0)) * Math.PI / 180;
    const el = bs.elev * Math.PI / 180;
    ring.push([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]);
  }
  let shaded = 0;
  for (const m of live) {
    if (m._cls === 'fx') continue;
    for (let i = 0; i < m.V.length; i++) {
      const ao = m.AO ? m.AO[i] : 1;
      let sh;
      if (m._cls === 'hard') {
        const a = hs.gamma === 1 ? ao : Math.pow(ao, hs.gamma);
        sh = 1 - hs.amount * (1 - a);
      } else {
        const n = m.N ? m.N[i] : [0, 1, 0];
        let sum = 0;
        for (const L of ring) sum += Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
        let v = Math.max(0, Math.min(1, (sum / ring.length) * ao));
        if (bs.gamma !== 1) v = Math.pow(v, bs.gamma);
        sh = 1 - bs.amount * (1 - v);
      }
      m.C[i] = [m.C[i][0] * sh, m.C[i][1], m.C[i][2]];
      shaded++;
    }
  }
  INFO.push(`shade L6/L7: ${ring.length}-light ring x AO — hardware ${(hs.amount * 100) | 0}%, `
            + `flesh ${(bs.amount * 100) | 0}% over ${shaded} vertices`);

  // features are returned untouched, exactly as authored
  INFO.push(`shade: ${counts.flesh} flesh / ${counts.hard} hardware / ${counts.fx} feature vertices `
            + `(features take no layer and no shadow)`);

  // back to linear RGB for COLOR_0
  for (const m of live)
    for (let i = 0; i < m.C.length; i++) m.C[i] = oklab2lin(m.C[i]);
}

// deterministic value noise — same generator the compiler already uses
function vnoise3(p, scale) {
  const s = 1 / (scale || 1e-6);
  const x = p[0] * s, y = p[1] * s, z = p[2] * s;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const fade = t => t * t * (3 - 2 * t);
  const h = (a, b, c) => {
    let n = a * 374761393 + b * 668265263 + c * 1274126177;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  };
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const lerp = (a, b, t) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
    w);
}

module.exports = { shadeStack, DEFAULTS, lin2oklab, oklab2lin, inGamut, hex2lab };
