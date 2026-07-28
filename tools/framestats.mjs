// =================================================================================================
// FRAMESTATS — the five §3.4 composition quantities, measured on a PNG.
//
// `docs/powerworld/aaa-08-rubric.md` §3.4 asks for the one genuine side-by-side available to this
// project: our frame's measured COMPOSITION against theirs, read off the 21 real screenshots in
// `docs/reference/` (Bid For Power, Ultra BFP, Earth's Special Forces, Dragonball Unreal). This is
// the tool that reads them.
//
// -------------------------------------------------------------------------------------------------
// ⚠ WHAT THIS PROTOCOL CANNOT TEST — read this before quoting any number it prints.
//
//  1. IT IS NOT A FIDELITY TEST AND IT IS NOT "WHICH IS THE REAL GAME". Our renderer is HDR-
//     composited with ACES tone mapping, bloom and a mannequin skin treatment; theirs is a 1999
//     Quake III mod, a GoldSrc mod and an Unreal 4 demo, captured off YouTube through two lossy
//     codecs. Any judge names the era in under a second. The rubric says so at §3.4 in capitals and
//     this tool refuses to imply otherwise: it reports COMPOSITION — where the camera stands, how
//     much sky, how big the subject — because that is the part of a frame the era does not leak
//     into.
//  2. A STILL CANNOT SHOW MOTION. Nothing here speaks about acceleration, damping, input latency,
//     hitstop or audio. §2.7 item 6: "Anyone extending a §3 result into a motion claim has left the
//     protocol."
//  3. THE REFERENCE FRAMES ARE COMPRESSED VIDEO STILLS. Colour counts and RMS contrast on a frame
//     that has been through H.264 are not directly comparable to the same numbers off our lossless
//     PNG. Those two quantities are reported for OUR frames as a calibration/regression signal (the
//     black-sky and night-clock injections move them hard); across the ours/theirs boundary only the
//     GEOMETRIC quantities — sky fraction, horizon fraction, subject height, pair separation —
//     are argued from, and even those carry the caveats below.
//  4. THE SKY READ IS AN ALGORITHM, NOT A FACT, AND IT IS WRONG ON SOME OF THESE FRAMES. It is run
//     TWICE by two estimators that fail in opposite directions (see `SKY READ` below) and BOTH
//     numbers are printed, because choosing one would be choosing which frames to be wrong about
//     in silence. `horizonConf` is a weak automatic pointer, NOT a verdict. What decides whether a
//     frame's horizon means anything is a HAND REVIEW recorded per frame in framemarks.json, and
//     only frames reviewed `usable` enter a band.
//  5. SUBJECT HEIGHT AND PAIR SEPARATION ARE HAND-MARKED AND THIS TOOL WILL NOT INVENT THEM.
//     §3.4: "an automatic segmenter on a 640×480 JPEG-artefacted screenshot would be a made-up
//     number wearing a script." They are read out of `docs/reference/framemarks.json`, which records
//     WHO marked each frame and HOW. A frame with no mark reports `null`, never a guess.
//  6. FIVE FRAMES IS FIVE FRAMES — AND FOR BFP IT IS FEWER THAN THAT. Measured on the set we hold:
//     of the five Bid For Power frames, two are pitched straight down at terrain (no horizon
//     exists in the shot), one is a spectator view under the engine debug console, one is an
//     end-of-round scoreboard, and the fifth is a plaza the wide estimator floods across.
//     **ZERO of the five yield a usable sky/horizon number.** The rubric's §3.4 pass rule — "within
//     the min–max range spanned by the five BFP frames" — therefore CANNOT BE EVALUATED against
//     BFP on this evidence, and this tool says so by reporting an empty band rather than inventing
//     one. Subject height and pair separation ARE markable on four of the five and are recorded.
//     The usable-horizon set is ESF 3 · Ultra BFP 2 · Dragonball Unreal 4 — 9 of 21.
// -------------------------------------------------------------------------------------------------
//
// SKY READ — TWO ESTIMATORS, AND THE SPREAD IS THE ERROR BAR.
//   · TIGHT: each column is seeded from its own top pixels and walks down, keeping a slow running
//     mean so a gradient sky is not read as a horizon; it stops on four consecutive rows that
//     differ by more than `--skyT` (RGB euclidean). Holds a boundary well — and stops dead at the
//     first cumulus, which called a third-sky canyon frame 14% sky.
//   · WIDE: the same walk, plus a PALETTE sampled across the whole top band (quantised 4 bits per
//     channel, every bucket holding ≥0.4% of the sample). A sky is a SET of colours — blue, cloud,
//     sun, gradient — so this one sees clouds. Where sky and ground are close in colour it runs
//     PAST the real boundary instead, and a large agreeing majority of columns then stops somewhere
//     arbitrary: a confident wrong answer, the worst kind. One reference frame reads 0.956 wide
//     against 0.076 tight.
// `horizonFrac` is the median column of the WIDE read, `skyFrac` its area fraction, `skyFracTight`
// the second opinion, `skySpread` their disagreement. `horizonConf` = column agreement × did-it-
// terminate × wide/tight agreement. Letterbox and pillarbox bars are cropped off first — every
// reference frame is a video capture and a bar left in is counted as picture.
//
// NO NEW DEPENDENCIES. sharp and jimp are not installed and are not being installed; playwright is,
// and `shoot.mjs` already records in its own header that a dependency-free PNG read is impossible in
// Node without a decoder — so the decode happens IN A PAGE, exactly as §3.4 proposes. The launch
// flags are shoot.mjs's, for the same reason.
//
// USAGE
//   node tools/framestats.mjs <png|dir> [more...] [--marks <framemarks.json>] [--json <out.json>]
//   node tools/framestats.mjs docs/reference --emit-baseline      # writes docs/reference/framemarks.json
//   node tools/framestats.mjs shots/a1.png --compare docs/reference/framemarks.json
//   node tools/framestats.mjs docs/reference --grid shots/marking  # grid thumbnails, for hand-marking
//
// Exit 1 if a named image could not be read at all. Composition numbers never gate on their own —
// they are evidence for a critic, not a build gate.
// =================================================================================================
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, basename, extname, resolve, relative, sep } from 'node:path';

// ---- argv ---------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const BOOL = new Set(['emit-baseline', 'quiet', 'help']);   // flags that take no value
const flag = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes('--' + n);
// a bare token is a target unless it is the VALUE of a value-taking flag immediately before it
const targets = argv.filter((a, i) => !a.startsWith('--') &&
  !(i > 0 && argv[i - 1].startsWith('--') && !BOOL.has(argv[i - 1].slice(2))));

if (!targets.length || has('help')) {
  console.error('usage: node tools/framestats.mjs <png|dir> [...] [--marks f.json] [--json out.json] [--emit-baseline] [--grid dir] [--compare f.json] [--skyT 46]');
  process.exit(2);
}

const SKY_T = +(flag('skyT', 46));
const MARKS_PATH = flag('marks', 'docs/reference/framemarks.json');
const GRID_DIR = flag('grid', null);
const COMPARE = flag('compare', null);
const JSON_OUT = flag('json', null);

// ---- the reference set --------------------------------------------------------------------------
// ⚠ WHICH FILES ARE "THE 21". `docs/reference/` also holds two ChatGPT-generated concept images and
// `openjk.md`. A generated image is not a screenshot of a shipped game and must never be averaged
// into a band that is supposed to say what Bid For Power looked like — so the source of a frame is
// classified here, from its filename, and anything unrecognised is tagged `unknown` and left OUT of
// every band. Being explicit is the whole point; a silent inclusion would be the dishonest move.
function sourceOf(file) {
  const n = basename(file).toLowerCase();
  if (/ultra bid for power/.test(n)) return 'ULTRA_BFP';
  if (/bid for power/.test(n)) return 'BFP';
  if (/earth's special forces|earths special forces/.test(n)) return 'ESF';
  if (/dragonball unreal|dragon ball unreal/.test(n)) return 'DBU';
  if (/^chatgpt image/.test(n)) return 'CONCEPT_ART';       // generated — never in a band
  return 'OURS';                                             // anything we captured ourselves
}
const IN_BAND = new Set(['BFP', 'ULTRA_BFP', 'ESF', 'DBU']);

function expand(list) {
  const out = [];
  for (const t of list) {
    const p = resolve(t);
    if (!existsSync(p)) { console.error(`[framestats] ✗ not found: ${t}`); process.exitCode = 1; continue; }
    if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p).sort()) if (/\.(png|jpe?g)$/i.test(f)) out.push(join(p, f));
    } else out.push(p);
  }
  return out;
}

// ---- the in-page measurement --------------------------------------------------------------------
// Everything below runs in the browser, on an ImageData. It is one function so that the algorithm
// a reader audits is the algorithm that ran.
const MEASURE = function ({ dataUri, skyT }) {
  return new Promise((done, fail) => {
    const img = new Image();
    img.onerror = () => fail(new Error('decode failed'));
    img.onload = () => {
      const fw = img.naturalWidth, fh = img.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      const full = cx.getImageData(0, 0, fw, fh).data;

      // -- LETTERBOX CROP -------------------------------------------------------------------------
      // ⚠ EVERY REFERENCE FRAME IS A VIDEO CAPTURE and most carry black bars. Left in, a bar counts
      // as picture: it drags mean luminance down, it inflates the denominator of every fraction,
      // and — worst — the per-column sky seed is taken from INSIDE the top bar, so the flood "finds
      // a horizon" at the bar's lower edge and reports a 2% sky on a frame that is half sky. A
      // composition fraction has to be a fraction of the PICTURE, so the bars come off first.
      const lum = (a, i) => 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
      const rowFlat = (y) => { let s = 0, mx = 0; for (let x = 0; x < fw; x++) { const l = lum(full, (y * fw + x) * 4); s += l; if (l > mx) mx = l; } return s / fw < 7 && mx < 30; };
      const colFlat = (x) => { let s = 0, mx = 0; for (let y = 0; y < fh; y++) { const l = lum(full, (y * fw + x) * 4); s += l; if (l > mx) mx = l; } return s / fh < 7 && mx < 30; };
      let cT = 0, cB = 0, cL = 0, cR = 0;
      const capY = Math.floor(fh * 0.2), capX = Math.floor(fw * 0.2);
      while (cT < capY && rowFlat(cT)) cT++;
      while (cB < capY && rowFlat(fh - 1 - cB)) cB++;
      while (cL < capX && colFlat(cL)) cL++;
      while (cR < capX && colFlat(fw - 1 - cR)) cR++;
      const w = fw - cL - cR, h = fh - cT - cB;
      const d = (cT || cB || cL || cR) ? cx.getImageData(cL, cT, w, h).data : full;
      const crop = { t: cT, b: cB, l: cL, r: cR };
      const L = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

      // -- SKY READ: a top-band PALETTE, then a per-column flood ----------------------------------
      // ⚠ A SINGLE SEED COLOUR CANNOT SEE A CLOUD. The first version seeded each column from its own
      // top pixels and stopped at the first big colour change — so on the Ultra BFP canyon frame,
      // whose sky is blue with white cumulus, the flood stopped AT THE CLOUDS and reported a 14%
      // sky on a frame that is a third sky. A sky is a SET of colours, not one; so the reference is
      // sampled across the whole top band, quantised, and every bucket holding ≥0.4% of it is kept.
      // Clouds, a sun and a gradient all end up in the palette because they are all up there.
      const top = Math.max(3, Math.round(h * 0.03));
      const NB = 16, SH = 4;                              // 4 bits per channel
      const cnt = new Uint32Array(NB * NB * NB), sr = new Float64Array(NB * NB * NB), sg = new Float64Array(NB * NB * NB), sb = new Float64Array(NB * NB * NB);
      let samples = 0;
      for (let y = 1; y < top; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const k = ((d[i] >> SH) * NB + (d[i + 1] >> SH)) * NB + (d[i + 2] >> SH);
        cnt[k]++; sr[k] += d[i]; sg[k] += d[i + 1]; sb[k] += d[i + 2]; samples++;
      }
      const pal = [];
      const minN = Math.max(1, samples * 0.004);
      for (let k = 0; k < cnt.length; k++) if (cnt[k] >= minN) pal.push([sr[k] / cnt[k], sg[k] / cnt[k], sb[k] / cnt[k]]);
      if (!pal.length) pal.push([d[0], d[1], d[2]]);
      const near = (i, r, g, b) => { const a = d[i] - r, c = d[i + 1] - g, e = d[i + 2] - b; return a * a + c * c + e * e; };
      const t2 = skyT * skyT;

      // ⚠ TWO ESTIMATORS, AND THEIR DISAGREEMENT IS THE ERROR BAR. Neither read is right on every
      // frame and choosing one would be choosing which frames to be wrong about in silence:
      //   · WIDE (the palette) sees clouds — but where sky and ground are close in colour it runs
      //     PAST the real boundary, and a large agreeing majority then stops somewhere arbitrary,
      //     which is a confident wrong answer.
      //   · TIGHT (each column seeded from its own top pixels) holds the boundary — but it stops
      //     dead at the first cumulus and called a third-sky canyon frame 14% sky.
      // Running both costs one more pass and turns "I picked the one that looked right on the frame
      // I happened to open" into a published spread. Where they agree, the read is real. Where they
      // do not, `horizonConf` collapses and the frame goes to the hand review, which is the
      // authority anyway (§3.4).
      const flood = (usePal) => {
        const stop = new Float64Array(w);
        for (let x = 0; x < w; x++) {
          // a per-column running mean of what this column has already accepted, so a smooth
          // vertical gradient (every one of these frames has one) is not read as a horizon
          let mr = d[(1 * w + x) * 4], mg = d[(1 * w + x) * 4 + 1], mb = d[(1 * w + x) * 4 + 2];
          let run = 0, first = -1;
          for (let y = 1; y < h; y++) {
            const i = (y * w + x) * 4;
            let sky = near(i, mr, mg, mb) <= t2;
            if (!sky && usePal) for (const p of pal) if (near(i, p[0], p[1], p[2]) <= t2) { sky = true; break; }
            if (sky) {
              run = 0; first = -1;
              mr += (d[i] - mr) * 0.05; mg += (d[i + 1] - mg) * 0.05; mb += (d[i + 2] - mb) * 0.05;
            } else {
              if (run === 0) first = y;
              if (++run >= 4) break;                // four rows: survives a single scanline of noise
            }
          }
          stop[x] = run >= 4 ? first : h;           // never broke → the whole column read as sky
        }
        return stop;
      };
      const stop = flood(true), stopT = flood(false);
      const sorted = Array.from(stop).sort((a, b) => a - b);
      const q = (p) => sorted[Math.min(w - 1, Math.max(0, Math.round(p * (w - 1))))];
      const horizonRow = q(0.5);
      let skyPix = 0, skyPixT = 0;
      for (let x = 0; x < w; x++) { skyPix += stop[x]; skyPixT += stopT[x]; }
      const skyFrac = skyPix / (w * h), skyFracTight = skyPixT / (w * h);
      const skySpread = Math.abs(skyFrac - skyFracTight);
      const bottomed = Array.from(stop).filter((v) => v >= h - 1).length / w;
      // -- CONFIDENCE: AGREEMENT, NOT SPREAD ------------------------------------------------------
      // ⚠ THE FIRST VERSION USED THE p10–p90 SPREAD AND SCORED ALL FIVE BFP FRAMES AT 0.000 —
      // including one that plainly has a horizon, because palm trunks rise the whole height of the
      // sky and a spread statistic is dominated by exactly those outliers. What separates a real
      // horizon from no horizon is not how far the extremes reach, it is whether MOST COLUMNS
      // AGREE: trees, a fighter and an aura are a minority of columns; a rock wall filling the
      // frame gives a flood that stops at scattered texture and no majority anywhere.
      const tol = Math.max(3, h * 0.06);
      let agree = 0; for (let x = 0; x < w; x++) if (Math.abs(stop[x] - horizonRow) <= tol) agree++;

      // -- region statistics ----------------------------------------------------------------------
      let sum = 0, n = 0, skySum = 0, skyN = 0, gndSum = 0, gndN = 0;
      const allC = new Uint8Array(32768), skyC = new Uint8Array(32768);
      let purple = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4, l = L(i);
          sum += l; n++;
          const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
          allC[key] = 1;
          if (y < stop[x]) { skySum += l; skyN++; skyC[key] = 1; } else { gndSum += l; gndN++; }
          // NO PURPLE (E1): hue 270–320°, saturation > 0.25. Computed on the whole frame here; the
          // rubric's KIVULI exception is a caller's business, not this tool's.
          const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
          if (c > 0.0001 && mx > 0.0001) {
            const s = c / mx;
            if (s > 0.25) {
              let hu;
              if (mx === r) hu = ((g - b) / c) % 6; else if (mx === g) hu = (b - r) / c + 2; else hu = (r - g) / c + 4;
              hu *= 60; if (hu < 0) hu += 360;
              if (hu >= 270 && hu <= 320) purple++;
            }
          }
        }
      }
      let colors = 0, skyColors = 0;
      for (let k = 0; k < 32768; k++) { if (allC[k]) colors++; if (skyC[k]) skyColors++; }

      // -- CONFIDENCE ------------------------------------------------------------------------------
      // Three things, each of which has been observed to fail on a real frame in this set:
      //   agreement   — do most columns stop in the same place, or is the flood chasing texture
      //   bottomed    — did a large share of columns never find a boundary at all (no sky in frame)
      //   skySpread   — do the WIDE and TIGHT estimators agree (above)
      // ⚠ IT IS A WEAK SIGNAL AND MUST NOT BE TREATED AS A VERDICT. It catches "the flood never
      // terminated" and "the two reads disagree". It cannot see a boundary that is real but
      // photometrically soft. `docs/reference/framemarks.json` carries a HAND REVIEW per frame and
      // that is what the bands are built from; this number only tells a reader where to look.
      const horizonConf = +Math.max(0, (agree / w) * (1 - bottomed * 0.5) * (1 - Math.min(1, skySpread / 0.25))).toFixed(3);

      // -- CENTRE BOX: ±12% width × ±16% height (aaa-06-impact.md §1.2) -----------------------------
      const x0 = Math.round(w * 0.38), x1 = Math.round(w * 0.62);
      const y0 = Math.round(h * 0.34), y1 = Math.round(h * 0.66);
      let cs = 0, cn = 0, blow = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const l = L((y * w + x) * 4); cs += l; cn++; if (l > 235) blow++; }
      const cMean = cs / Math.max(1, cn);
      let cVar = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const dl = L((y * w + x) * 4) - cMean; cVar += dl * dl; }
      const cStd = Math.sqrt(cVar / Math.max(1, cn));

      done({
        w, h,
        meanLum: +(sum / n).toFixed(2),
        colors,
        skyFrac: +skyFrac.toFixed(4),                      // WIDE (top-band palette) — the primary
        skyFracTight: +skyFracTight.toFixed(4),            // TIGHT (per-column seed) — the second opinion
        skySpread: +skySpread.toFixed(4),                  // their disagreement = the error bar
        horizonFrac: +(horizonRow / h).toFixed(4),
        horizonConf, crop,
        skyMeanLum: skyN ? +(skySum / skyN).toFixed(2) : null,
        skyColors,
        groundMeanLum: gndN ? +(gndSum / gndN).toFixed(2) : null,
        centreMeanLum: +cMean.toFixed(2),
        centreRms: +cStd.toFixed(2),                       // RMS contrast, absolute, 0–255
        centreRmsNorm: +(cStd / Math.max(1, cMean)).toFixed(4),
        centreBlowoutFrac: +(blow / Math.max(1, cn)).toFixed(4),
        purpleFrac: +(purple / n).toFixed(5),
      });
    };
    img.src = dataUri;
  });
};

// ---- grid thumbnails, for the hand-marking pass -------------------------------------------------
// ⚠ THIS IS PART OF THE HONESTY, NOT A CONVENIENCE. §3.4 requires the fighter boxes to be hand
// marked; a hand mark made by squinting at a full-resolution screenshot with no ruler is a
// different kind of made-up number. The grid is labelled in PERCENT OF FRAME, which is the unit
// the metrics are actually in, so a mark is read off directly and rounds to ~±1%.
const GRID = function ({ dataUri, outW, crop }) {
  return new Promise((done, fail) => {
    const img = new Image();
    img.onerror = () => fail(new Error('decode failed'));
    img.onload = () => {
      // ⚠ THE GRID MUST BE DRAWN ON THE SAME PICTURE THE NUMBERS ARE MEASURED ON. Marks are read
      // off this thumbnail as fractions; if the thumbnail carries the letterbox and the measurement
      // does not, every hand mark is silently offset by the bar height.
      const c = crop || { t: 0, b: 0, l: 0, r: 0 };
      const sw = img.naturalWidth - c.l - c.r, sh = img.naturalHeight - c.t - c.b;
      const s = outW / sw;
      const w = outW, h = Math.round(sh * s);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.drawImage(img, c.l, c.t, sw, sh, 0, 0, w, h);
      cx.lineWidth = 1; cx.font = '11px monospace'; cx.textBaseline = 'top';
      for (let p = 10; p < 100; p += 10) {
        const x = Math.round(w * p / 100) + 0.5, y = Math.round(h * p / 100) + 0.5;
        cx.strokeStyle = p === 50 ? 'rgba(255,60,60,0.85)' : 'rgba(255,220,0,0.38)';
        cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke();
        cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke();
        cx.fillStyle = 'rgba(0,0,0,0.72)'; cx.fillRect(x + 1, 1, 20, 13); cx.fillRect(1, y + 1, 20, 13);
        cx.fillStyle = '#ffe08a'; cx.fillText(String(p), x + 3, 2); cx.fillText(String(p), 3, y + 2);
      }
      done(cv.toDataURL('image/jpeg', 0.74));
    };
    img.src = dataUri;
  });
};

// ---- drive -------------------------------------------------------------------------------------
const files = expand(targets);
if (!files.length) { console.error('[framestats] nothing to measure'); process.exit(1); }

const marks = existsSync(MARKS_PATH) ? JSON.parse(readFileSync(MARKS_PATH, 'utf8')) : null;
const markFor = (file) => {
  if (!marks || !marks.frames) return null;
  const key = relative(process.cwd(), file).split(sep).join('/');
  return marks.frames[key] || marks.frames[basename(file)] || null;
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=default', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
const perr = [];
page.on('pageerror', (e) => perr.push(String(e && e.message)));

if (GRID_DIR) mkdirSync(resolve(GRID_DIR), { recursive: true });

const rows = [];
for (const f of files) {
  const b64 = readFileSync(f).toString('base64');
  const mime = /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';
  const uri = `data:${mime};base64,${b64}`;
  let stat;
  try { stat = await page.evaluate(MEASURE, { dataUri: uri, skyT: SKY_T }); }
  catch (e) { console.error(`[framestats] ✗ decode failed: ${basename(f)} — ${e.message}`); process.exitCode = 1; continue; }

  const mk = markFor(f);
  let subjectHeightFrac = null, pairSepFrac = null;
  if (mk && Array.isArray(mk.fighters) && mk.fighters.length) {
    // subject height fraction = the TALLEST marked fighter's box height ÷ frame height (§3.4)
    subjectHeightFrac = +Math.max(...mk.fighters.map((b) => b.h)).toFixed(4);
    if (mk.fighters.length >= 2) {
      // pair separation = centre-to-centre distance of the two most-separated marked fighters,
      // as a fraction of frame WIDTH (§3.4). Distance, not |Δx|: a duel stacked vertically is not
      // a duel framed tight, and the horizontal-only read would call it one.
      let best = 0;
      for (let i = 0; i < mk.fighters.length; i++) for (let j = i + 1; j < mk.fighters.length; j++) {
        const a = mk.fighters[i], c = mk.fighters[j];
        const dx = (a.x + a.w / 2) - (c.x + c.w / 2);
        const dy = ((a.y + a.h / 2) - (c.y + c.h / 2)) * (stat.h / stat.w);   // to width units
        best = Math.max(best, Math.hypot(dx, dy));
      }
      pairSepFrac = +best.toFixed(4);
    }
  }

  rows.push({
    file: relative(process.cwd(), f).split(sep).join('/'),
    source: sourceOf(f),
    ...stat,
    subjectHeightFrac, pairSepFrac,
    marked: !!(mk && Array.isArray(mk.fighters) && mk.fighters.length), markMethod: mk ? (mk.method || 'unlabelled') : null, markBy: mk ? (mk.by || null) : null,
    // THE HAND REVIEW IS THE AUTHORITY on whether a frame's horizon means anything (§3.4). The
    // automatic confidence is a pointer; a human who has looked at the picture is the record.
    review: (mk && mk.review) || null,
    horizonUsable: mk && mk.review ? mk.review.horizon === 'usable' : null,
  });

  if (GRID_DIR) {
    const durl = await page.evaluate(GRID, { dataUri: uri, outW: 760, crop: stat.crop });
    const out = join(resolve(GRID_DIR), basename(f, extname(f)).replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.jpg');
    writeFileSync(out, Buffer.from(String(durl).split(',')[1], 'base64'));
  }
}
await browser.close();
if (perr.length) console.error('[framestats] ⚠ page errors: ' + perr.slice(0, 4).join(' | '));

// ---- report -------------------------------------------------------------------------------------
const f3 = (v, n = 3) => (v === null || v === undefined ? '   —  ' : (+v).toFixed(n).padStart(6));
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
if (!has('quiet')) {
  console.log('');
  console.log('  ' + pad('frame', 42) + ' ' + pad('src', 11) + '   sky  ~tight  horiz  conf  subjH  pairS  cRMS   lum  colors  review');
  console.log('  ' + '-'.repeat(126));
  for (const r of rows) {
    console.log('  ' + pad(basename(r.file), 42) + ' ' + pad(r.source, 11) + ' ' +
      f3(r.skyFrac) + ' ' + f3(r.skyFracTight) + ' ' + f3(r.horizonFrac) + ' ' + f3(r.horizonConf) + ' ' +
      f3(r.subjectHeightFrac) + ' ' + f3(r.pairSepFrac) + ' ' + f3(r.centreRms, 1) + ' ' +
      f3(r.meanLum, 1) + ' ' + String(r.colors).padStart(7) + '  ' + (r.review ? r.review.horizon : '(unreviewed)'));
  }
  console.log('');
  console.log('  sky/~tight = the WIDE (palette) and TIGHT (per-column seed) sky reads. THEIR DISAGREEMENT IS THE ERROR BAR —');
  console.log('               neither is right on every frame, so both are printed rather than one being chosen in silence.');
  console.log('  conf       = a WEAK automatic signal (column agreement × did-it-terminate × wide/tight agreement). It is not');
  console.log('               a verdict. `review` is the HAND review recorded in framemarks.json, and the bands use only that.');
  console.log('  subjH/pairS= HAND-MARKED ONLY. "—" means this frame carries no mark; the tool does not guess (§3.4).');
  console.log('  cRMS/lum/colors = centre-box RMS contrast, mean luminance, distinct colours @5bpc. Regression signal for OUR');
  console.log('               frames; NOT comparable across the ours/theirs boundary (theirs are recompressed video).');
}

// bands, per source, over the frames that carry the quantity
function band(list, key) {
  const v = list.map((r) => r[key]).filter((x) => x !== null && x !== undefined);
  if (!v.length) return null;
  return { n: v.length, min: +Math.min(...v).toFixed(4), max: +Math.max(...v).toFixed(4), med: +v.slice().sort((a, b) => a - b)[v.length >> 1].toFixed(4) };
}
const bands = {};
for (const src of [...new Set(rows.map((r) => r.source))]) {
  if (!IN_BAND.has(src)) continue;
  const sub = rows.filter((r) => r.source === src);
  // ⚠ ONLY HAND-REVIEWED-USABLE FRAMES ENTER A SKY OR HORIZON BAND. Not "confidence above a
  // threshold" — a threshold on a heuristic is still the heuristic deciding. A frame shot straight
  // down at rock has no horizon and no algorithm should be trusted to notice; a person looked at it
  // and wrote that down. Frames with no review at all are counted and named, never silently
  // included: `reviewed` vs `n` is how a reader sees how much of the set is actually speaking.
  const use = sub.filter((r) => r.horizonUsable === true);
  bands[src] = {
    n: sub.length,
    reviewed: sub.filter((r) => r.review).length,
    horizonUsable: use.length,
    skyFrac: band(use, 'skyFrac'),
    horizonFrac: band(use, 'horizonFrac'),
    subjectHeightFrac: band(sub, 'subjectHeightFrac'),
    pairSepFrac: band(sub, 'pairSepFrac'),
  };
}
if (!has('quiet') && Object.keys(bands).length) {
  console.log('\n  REFERENCE BANDS (min–max, never a mean — §3.4: "five frames is five frames")');
  for (const [k, b] of Object.entries(bands)) {
    const s = (x) => (x ? `${x.min}–${x.max} (n${x.n})` : 'none');
    console.log(`    ${pad(k, 11)} frames ${b.n} · reviewed ${b.reviewed} · horizon usable ${b.horizonUsable}`);
    console.log(`    ${' '.repeat(11)}   sky ${pad(s(b.skyFrac), 22)} horizon ${pad(s(b.horizonFrac), 22)} subjH ${pad(s(b.subjectHeightFrac), 22)} pairSep ${s(b.pairSepFrac)}`);
  }
}

// ---- --compare: our frames against a committed baseline ------------------------------------------
if (COMPARE) {
  const base = JSON.parse(readFileSync(COMPARE, 'utf8'));
  const b = (base.bands && base.bands.BFP) || null;
  console.log('\n  COMPARE vs ' + COMPARE);
  if (!b) console.log('    ⚠ baseline carries no BFP band — cannot compare');
  else for (const r of rows.filter((x) => x.source === 'OURS')) {
    const chk = (name, val, bb) => {
      if (bb === null || bb === undefined || val === null) return `${name} —`;
      const inb = val >= bb.min && val <= bb.max;
      return `${name} ${(+val).toFixed(3)} ${inb ? 'IN' : 'OUT'} [${bb.min}–${bb.max}]`;
    };
    console.log(`    ${pad(basename(r.file), 34)} ${chk('sky', r.skyFrac, b.skyFrac)} · ${chk('subjH', r.subjectHeightFrac, b.subjectHeightFrac)}`);
  }
  console.log('    ⚠ IN/OUT is evidence for a critic, not a gate. An OUT row is a DECLARED DIVERGENCE');
  console.log('      the moment someone writes down the design reason and cites it (rubric §4.4).');
}

// ---- --emit-baseline ------------------------------------------------------------------------------
if (has('emit-baseline')) {
  const prev = marks || {};
  const doc = {
    _README: [
      'FRAMEMARKS — the §3.4 composition baseline for the PowerWorld AAA critic.',
      'Generated by tools/framestats.mjs. The `stats` block is MEASURED from pixels and is',
      'reproducible by re-running the tool. The `frames[].fighters` boxes are HAND-MARKED off the',
      'grid thumbnails (tools/framestats.mjs --grid) and are NOT reproducible by a script: an',
      'automatic segmenter on a recompressed video still would be a made-up number wearing a script',
      '(aaa-08-rubric.md §3.4). Boxes are FRACTIONS OF FRAME: {x,y,w,h}, origin top-left.',
      'WHAT THIS CANNOT TEST: fidelity, motion, feel, latency, audio. It compares COMPOSITION only,',
      'and only the geometric quantities cross the ours/theirs boundary — their frames are',
      'recompressed video, so colour counts and RMS contrast are OUR regression signal alone.',
    ],
    generated: new Date().toISOString().slice(0, 10),
    skyT: SKY_T,
    centreBox: { xFrac: 0.24, yFrac: 0.32, note: '±12% width × ±16% height — aaa-06-impact.md §1.2' },
    bands,
    frames: {},
  };
  for (const r of rows) {
    const old = (prev.frames && (prev.frames[r.file] || prev.frames[basename(r.file)])) || {};
    doc.frames[r.file] = {
      source: r.source,
      fighters: old.fighters || null,
      method: old.method || (old.fighters ? 'hand' : null),
      by: old.by || null,
      note: old.note || null,
      review: old.review || null,
      stats: {
        w: r.w, h: r.h, skyFrac: r.skyFrac, skyFracTight: r.skyFracTight, skySpread: r.skySpread,
        horizonFrac: r.horizonFrac, horizonConf: r.horizonConf, crop: r.crop,
        skyMeanLum: r.skyMeanLum, skyColors: r.skyColors, groundMeanLum: r.groundMeanLum,
        centreRms: r.centreRms, centreRmsNorm: r.centreRmsNorm, centreMeanLum: r.centreMeanLum,
        centreBlowoutFrac: r.centreBlowoutFrac, meanLum: r.meanLum, colors: r.colors, purpleFrac: r.purpleFrac,
      },
      subjectHeightFrac: r.subjectHeightFrac, pairSepFrac: r.pairSepFrac,
    };
  }
  mkdirSync(dirname(resolve(MARKS_PATH)), { recursive: true });
  writeFileSync(resolve(MARKS_PATH), JSON.stringify(doc, null, 2));
  console.log(`\n[framestats] baseline written → ${MARKS_PATH}  (${rows.length} frames, ${rows.filter((r) => r.review).length} hand-reviewed, ${rows.filter((r) => r.marked).length} carrying fighter boxes)`);
}

if (JSON_OUT) { mkdirSync(dirname(resolve(JSON_OUT)), { recursive: true }); writeFileSync(resolve(JSON_OUT), JSON.stringify({ rows, bands }, null, 2)); console.log(`[framestats] json → ${JSON_OUT}`); }
if (GRID_DIR) console.log(`[framestats] grid thumbnails → ${GRID_DIR}`);
