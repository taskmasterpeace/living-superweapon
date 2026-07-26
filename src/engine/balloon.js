// BALLOON SHAPES — generated to fit the words, not the other way round.
//
// Robert: "fix the speech bubbles, text shouldn't come out of the bubble, and the bubble has to
// work dynamically… we need talk, yell, whisper, robot, alien, and we also need thought bubbles."
//
// ⚠ WHY THE CSS VERSION COULD NEVER WORK. The first pass drew these shapes with `clip-path` and
// `border-radius`. Both of those CUT THE BOX THE TEXT LIVES IN — the element is still a rectangle,
// the text is still laid out to the rectangle's padding edge, and the shape is then subtracted from
// it. So a spike or a curve eats into the words, and the only outcomes available are "clipped" or
// "overflowing". No amount of padding fixes it, because the shape does not know how big the text is.
//
// The fix is the other order, and it is the way lettering has always been done: MEASURE THE WORDS,
// then BUILD A SHAPE AROUND THEM. Each generator takes the text box and returns an SVG path sized
// to contain it, plus the inflation it needed. The text is then positioned dead centre and is
// mathematically incapable of touching the outline.
//
// THE INFLATION IS THE WHOLE JOB, and it is different for every shape:
//   · an ELLIPSE that circumscribes a w×h rectangle has semi-axes w/√2 and h/√2 — so an oval
//     balloon must be 41% wider and taller than its text. That single number is why real comic
//     balloons look so much bigger than the words inside them, and why mine looked cramped.
//   · a BURST must fit the text inside its INNER radius; the spikes stick out beyond that, so it
//     inflates by the spike depth on top of the ellipse margin.
//   · a CLOUD's bumps bulge outward from a core ellipse, so the core has to clear the text and the
//     bumps are free.
// Reference for the approach (dynamic paths from Bézier segments):
//   https://codepen.io/dudleystorey/pen/wMLBLK  ·  https://www.joyk.com/dig/detail/1611785103760851

const TAU = Math.PI * 2;
const R2 = Math.SQRT2;

// A cubic-Bézier ellipse. k is the classic circle-to-Bézier constant.
const K = 0.5522847498;
function ellipsePath(cx, cy, rx, ry) {
  const ox = rx * K, oy = ry * K;
  return `M${cx - rx},${cy}`
    + `C${cx - rx},${cy - oy} ${cx - ox},${cy - ry} ${cx},${cy - ry}`
    + `C${cx + ox},${cy - ry} ${cx + rx},${cy - oy} ${cx + rx},${cy}`
    + `C${cx + rx},${cy + oy} ${cx + ox},${cy + ry} ${cx},${cy + ry}`
    + `C${cx - ox},${cy + ry} ${cx - rx},${cy + oy} ${cx - rx},${cy}Z`;
}

// deterministic wobble so a given balloon always looks the same while it is on screen
function rng(seed) { let a = seed >>> 0 || 1; return () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296; }

// ⚠ NO PANCAKES. Two lines of text give a text box around 200x40, and the circumscribed-ellipse
// identity then produces radii of 153x38 — a 4:1 oval that reads as a bar, not a balloon. Real
// lettering keeps balloons near 2:1, and every decoration in this file (spikes, scallops, bumps,
// wobble) is unreadable stretched along a pancake. Growing the SHORT axis is the only correction
// that cannot push text outside the shape.
const MAX_ASPECT = 2.15;
function round(rx, ry) {
  if (rx > ry * MAX_ASPECT) ry = rx / MAX_ASPECT;
  else if (ry > rx * MAX_ASPECT) rx = ry / MAX_ASPECT;
  return [rx, ry];
}

// ---------------------------------------------------------------------------------------------
// Every generator returns { path, w, h, pad } where w/h is the SVG box and `pad` is where the text
// must sit inside it. The caller never guesses.
export const SHAPES = {
  // TALK — the classic oval. 41% inflation, from the circumscribed-ellipse identity.
  talk(tw, th) {
    let [rx, ry] = round(Math.max(26, (tw / R2) + 12), Math.max(18, (th / R2) + 10));
    const w = rx * 2, h = ry * 2;
    return { path: ellipsePath(rx, ry, rx - 2, ry - 2), w, h };
  },

  // WHISPER — the same oval; the DASHED outline is what says it, not the shape.
  whisper(tw, th) { return SHAPES.talk(tw, th); },

  // YELL — a burst. ⚠ the text must clear the INNER radius, so the spikes are pure inflation on
  // top of the ellipse margin, and the shape ends up considerably bigger than a talk balloon.
  // That is correct: a shout takes up more room on the page.
  yell(tw, th, seed = 7) {
    let [inx, iny] = round((tw / R2) + 10, (th / R2) + 8);   // inner radius must contain the text
    const spike = Math.max(13, Math.min(26, (inx + iny) * 0.17));
    const rx = inx + spike, ry = iny + spike;
    const w = rx * 2, h = ry * 2, cx = rx, cy = ry;
    // ⚠ POINT COUNT IS A LOOK, NOT A RESOLUTION. Scaling it with the perimeter gave a wide balloon
    // fifty tiny teeth, which reads as fuzz. A shout has a dozen big spikes, at any size.
    const n = 11;
    const r = rng(seed);
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const out = i % 2 === 0;
      const a = (i / (n * 2)) * TAU - Math.PI / 2;
      const jitter = 0.86 + r() * 0.28;
      const ax = (out ? rx - 2 : inx) * (out ? jitter : 1);
      const ay = (out ? ry - 2 : iny) * (out ? jitter : 1);
      const x = cx + Math.cos(a) * ax, y = cy + Math.sin(a) * ay;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    return { path: d + 'Z', w, h };
  },

  // THINK — a cloud: a core ellipse the text clears, ringed by bumps that bulge outward.
  think(tw, th, seed = 11) {
    let [rx, ry] = round((tw / R2) + 8, (th / R2) + 6);
    const bump = Math.max(11, Math.min(20, (rx + ry) * 0.13));
    const w = (rx + bump) * 2, h = (ry + bump) * 2, cx = w / 2, cy = h / 2;
    const n = Math.max(8, Math.min(13, Math.round((rx + ry) * 0.07)));
    const r = rng(seed);
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU - Math.PI / 2;
      const k = 0.9 + r() * 0.3, rr = bump * k;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (!i) d += `M${(x + Math.cos(a - 0.6) * rr).toFixed(1)},${(y + Math.sin(a - 0.6) * rr).toFixed(1)}`;
      // each bump is a near-circular arc, which is what gives a cloud its scalloped edge
      d += `A${rr.toFixed(1)},${rr.toFixed(1)} 0 1 1 ${(x + Math.cos(a + 0.6) * rr).toFixed(1)},${(y + Math.sin(a + 0.6) * rr).toFixed(1)}`;
    }
    return { path: d + 'Z', w, h };
  },

  // ROBOT — no curves at all. A machine speaks in a box with its corners cut off, and the notched
  // step down one side reads as a signal rather than a voice.
  robot(tw, th) {
    const px = 16, py = 11, c = 12;
    const w = tw + px * 2, h = th + py * 2;
    const s = Math.min(9, h * 0.16);
    return { path:
      `M${c},2 L${w - c},2 L${w - 2},${c} L${w - 2},${h - c} L${w - c},${h - 2} L${c},${h - 2} ` +
      `L2,${h - c} L2,${h * 0.62 + s} L${s * 0.7},${h * 0.62} L2,${h * 0.62 - s} L2,${c} Z`,
      w, h, rect: true };
  },

  // ALIEN — an organic wobble. Not a burst (that is anger) and not a cloud (that is thought):
  // a smooth outline that is subtly WRONG, which is the only way a shape says "not from here".
  alien(tw, th, seed = 23) {
    let [rx, ry] = round((tw / R2) + 13, (th / R2) + 11);
    const w = rx * 2, h = ry * 2, cx = rx, cy = ry;
    const n = 12, r = rng(seed);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2;
      // ⚠ subtle. At 0.82-1.18 the outline folded into itself and read as a spill, not a voice —
      // "wrong" has to stay legible as a balloon or it is just a broken shape.
      const k = 0.93 + r() * 0.14;
      pts.push([cx + Math.cos(a) * (rx - 2) * k, cy + Math.sin(a) * (ry - 2) * k]);
    }
    // closed Catmull-Rom through the wobbled points, emitted as cubics — smooth but irregular
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return { path: d + 'Z', w, h };
  },
  // ANNOUNCE — the many-pointed star. A burst is one person shouting; an announcement is a PA, a
  // broadcast, a god. More points, shallower, and regular rather than jagged.
  announce(tw, th) {
    let [inx, iny] = round((tw / R2) + 12, (th / R2) + 10);
    const spike = Math.max(16, Math.min(34, (inx + iny) * 0.22));
    const rx = inx + spike, ry = iny + spike;
    const w = rx * 2, h = ry * 2, cx = rx, cy = ry;
    const n = 16;                    // regular and deep — a broadcast, not a hairy ellipse
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const out = i % 2 === 0;
      const a2 = (i / (n * 2)) * TAU - Math.PI / 2;
      const ax = out ? rx - 2 : inx, ay = out ? ry - 2 : iny;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a2) * ax).toFixed(1) + ',' + (cy + Math.sin(a2) * ay).toFixed(1);
    }
    return { path: d + 'Z', w, h };
  },

  // WEAK — fading, hurt, barely audible. A soft scalloped wobble, drawn thin.
  weak(tw, th, seed = 5) {
    let [rx, ry] = round((tw / R2) + 11, (th / R2) + 10);
    const w = rx * 2, h = ry * 2, cx = rx, cy = ry;
    const n = 18, r = rng(seed);
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a2 = (i / n) * TAU - Math.PI / 2;
      // ⚠ a visible wobble. At 0.9-1.06 the scallop was inside the stroke width and the balloon
      // just looked like a slightly wonky oval — which is indistinguishable from a mistake.
      const k = (i % 2 ? 0.84 : 1.0) + r() * 0.08;
      const x = cx + Math.cos(a2) * (rx - 2) * k, y = cy + Math.sin(a2) * (ry - 2) * k;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    return { path: d + 'Z', w, h };
  },

  // NARRATION — a plain rounded box. Not a voice: the story talking.
  narrate(tw, th) {
    const px = 15, py = 10, c = 10;
    const w = tw + px * 2, h = th + py * 2;
    return { path:
      `M${c + 2},2 H${w - c - 2} Q${w - 2},2 ${w - 2},${c + 2} V${h - c - 2} Q${w - 2},${h - 2} ${w - c - 2},${h - 2} ` +
      `H${c + 2} Q2,${h - 2} 2,${h - c - 2} V${c + 2} Q2,2 ${c + 2},2 Z`, w, h, rect: true };
  },
};

// INVERTED is a MODIFIER, not a shape — any balloon can be filled black for a voice you dread
// (the reference sheet calls it "negative emotions"). It rides on the class, not the geometry.
export const TONES = ['talk', 'yell', 'whisper', 'think', 'robot', 'alien', 'announce', 'weak', 'narrate'];

// ⚠ EVERY SHAPE MUST SURVIVE NONSENSE. A generator handed a zero, a NaN or a five-thousand-pixel
// text box has to return something drawable, because the alternative is an SVG path of "NaN,NaN"
// that renders as nothing at all and looks exactly like a bug that isn't there. One guard, at the
// one place every shape is built.
export function buildShape(tone, tw, th, seed) {
  const fn = SHAPES[tone] || SHAPES.talk;
  const w0 = Math.max(20, Math.min(1200, Number(tw) || 20));
  const h0 = Math.max(14, Math.min(900, Number(th) || 14));
  let out;
  try { out = fn(w0, h0, seed); } catch (e) { out = null; }
  if (!out || !out.path || !isFinite(out.w) || !isFinite(out.h) || out.path.includes('NaN')) {
    out = SHAPES.talk(w0, h0);
  }
  out.w = Math.max(24, out.w); out.h = Math.max(18, out.h);
  return out;
}

// ---------------------------------------------------------------------------------------------
// THE TAIL, as its own path so it can point anywhere without deforming the balloon. `tx`/`ty` is
// where it must reach (the speaker's mouth, in the SVG's own coordinates).
export function tailPath(kind, w, h, tx, ty) {
  const cx = w / 2, cy = h / 2;
  const dx = tx - cx, dy = ty - cy, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  // where the tail leaves the balloon body — a little inside the outline so the join is invisible
  const bx = cx + ux * (w / 2) * 0.82, by = cy + uy * (h / 2) * 0.82;
  if (kind === 'think') {
    // a thought tail is a trail of shrinking circles, not a spike
    let d = '';
    for (let i = 1; i <= 3; i++) {
      const t = i / 3.1, r = 7 - i * 1.7;
      const x = bx + ux * (len * 0.42) * t, y = by + uy * (len * 0.42) * t;
      d += `M${(x + r).toFixed(1)},${y.toFixed(1)} a${r},${r} 0 1 0 ${(-r * 2).toFixed(1)},0 a${r},${r} 0 1 0 ${(r * 2).toFixed(1)},0 `;
    }
    return d;
  }
  // a spike: wide where it leaves the balloon, a point at the mouth. The perpendicular gives the
  // two shoulders, so the tail always leaves the body along the line to the speaker.
  const wide = kind === 'yell' ? 13 : 11;
  const px = -uy * wide, py = ux * wide;
  return `M${(bx + px).toFixed(1)},${(by + py).toFixed(1)} L${tx.toFixed(1)},${ty.toFixed(1)} L${(bx - px).toFixed(1)},${(by - py).toFixed(1)} Z`;
}


