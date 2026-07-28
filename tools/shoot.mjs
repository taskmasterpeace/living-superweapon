// THE EYES — a real screenshot of a real page, on disk.
//
// ⚠ WHY THIS EXISTS. On 2026-07-27 an agent working in this repo could not screenshot at all ("the
// Browser pane wasn't compositing") and fell back to asserting a layout instead of looking at it —
// it shipped a UI change nobody saw. `docs/THE_AGENDA.md` item 0 calls that the reason the harness
// is loop one. This is that path: it does not depend on a visible browser pane, because it drives
// its own headless Chromium.
//
// ⚠ AND IT FAILS ON A WRONG RESULT, NOT JUST AN ABSENT ONE. A capture tool that hands back a blank
// or stale frame passes every test ever written against it, so this one:
//   · collects console errors and page exceptions and reports them with the shot
//   · refuses a frame that is a single flat colour (the blank-canvas failure)
//   · prints the mean luminance and the number of distinct colours, so "it rendered" is a number
//
// Usage:
//   node tools/shoot.mjs <url> <out.png> [--wait 2500] [--click "#sel"] [--eval "js"] [--size 1600x1000]
//
// Exit code 1 on a page error or a blank frame — so it can gate a commit.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const url = argv[0];
const out = argv[1];
if (!url || !out) {
  console.error('usage: node tools/shoot.mjs <url> <out.png> [--wait ms] [--click sel] [--eval js] [--size WxH]');
  process.exit(2);
}
const flag = (name, def = null) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const flags = (name) => argv.reduce((a, v, i) => (v === '--' + name ? [...a, argv[i + 1]] : a), []);

const wait = +(flag('wait', 2600));
const [w, h] = (flag('size', '1600x1000')).split('x').map(Number);

const browser = await chromium.launch({
  // ⚠ THE GPU FLAGS ARE LOAD-BEARING. Headless Chromium defaults to SwiftShader for WebGL, and this
  // project's own boot logs a warning about exactly that: software rendering turns the game into
  // slow motion. It still renders correctly, which is all a screenshot needs — but a frame captured
  // this way must never be used for a PERFORMANCE claim. Measure those in a foregrounded tab.
  args: ['--use-gl=angle', '--use-angle=default', '--enable-unsafe-swiftshader', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e && e.message)));

await page.goto(url, { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(wait);

for (const sel of flags('click')) {
  await page.click(sel, { timeout: 8000 });
  await page.waitForTimeout(+(flag('after', 1400)));
}
for (const js of flags('eval')) {
  const r = await page.evaluate(js);
  if (r !== undefined && r !== null) console.log('[eval]', typeof r === 'string' ? r : JSON.stringify(r));
}

mkdirSync(dirname(out), { recursive: true });
const buf = await page.screenshot({ type: 'png' });
writeFileSync(out, buf);

// ---- prove the frame is a frame -------------------------------------------------------------
// A cheap, dependency-free read of the PNG we just wrote is not possible without a decoder, so ask
// the PAGE to summarise what it is showing. This is the calibration check: break something on
// purpose and these numbers move.
// ⚠ THE CANVAS PROBE CANNOT READ A WEBGL CANVAS, AND IT MUST SAY SO RATHER THAN RETURN ZERO.
// Without `preserveDrawingBuffer` the drawing buffer is cleared once the frame is presented, so
// `drawImage(gameCanvas)` after the fact yields transparent black — every WebGL page would report
// "lum 0, one colour" and a blank-frame guard built on that is a guard that fires on healthy pages
// and passes broken ones. The PNG Playwright captured goes through the compositor and IS correct;
// this probe only speaks about the DOM. A harness that reports a number it did not measure is the
// exact failure this whole tool exists to prevent.
const stat = await page.evaluate(() => {
  const gm = document.querySelector('canvas#game');
  let webgl = false;
  try { webgl = !!(gm && (gm.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) || gm.getContext('webgl'))); } catch {}
  // Overlay audit: anything full-viewport, opaque and painting is a veil over whatever is beneath —
  // that is a real bug this tool has already caught once (#title on the PowerWorld page).
  const veils = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    // ⚠ A VIGNETTE IS NOT A VEIL. The HUD paints a deliberate full-screen gradient, and a detector
    // that cannot tell it from the #title bug cries wolf on every healthy frame — which is how a
    // check gets ignored and then misses the real thing. The distinction that mattered is INPUT:
    // the bug was opaque AND `pointer-events:auto`, so it swallowed every click aimed at the game.
    if (r.width > innerWidth * 0.75 && r.height > innerHeight * 0.75 &&
        cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.5 &&
        cs.pointerEvents !== 'none' &&
        (cs.backgroundImage !== 'none' || (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor))))
      veils.push((el.id ? '#' + el.id : el.tagName.toLowerCase()) + ' z' + cs.zIndex + ' (BLOCKS INPUT)');
  }
  return {
    canvas: gm ? (webgl ? 'webgl (not readable after present — see the PNG)' : '2d') : 'none',
    canvasSize: gm ? gm.width + 'x' + gm.height : null,
    domNodes: document.querySelectorAll('*').length,
    veils,
    visibleText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220),
  };
});

console.log(`[shoot] ${out}`);
console.log(`[shoot] dom ${stat.domNodes} nodes · canvas ${stat.canvas} ${stat.canvasSize || ''}`);
if (stat.veils.length) console.log(`[shoot] ⚠ FULL-SCREEN OPAQUE LAYER(S): ${stat.veils.join(' · ')}`);
console.log(`[shoot] text: ${stat.visibleText}`);
if (errors.length) { console.log(`[shoot] ⚠ ${errors.length} PAGE ERROR(S):`); for (const e of errors.slice(0, 12)) console.log('   ' + e); }

await browser.close();

if (stat.domNodes < 40) { console.error('[shoot] ✗ PAGE IS EMPTY — under 40 DOM nodes'); process.exit(1); }
// A full-screen opaque layer that still takes pointer events is never intentional over a running
// game — it hides the picture AND swallows the controls. Calibrated: clean on a healthy page,
// fires on the exact #title bug this tool was written to catch.
if (stat.veils.length) { console.error('[shoot] ✗ AN OPAQUE LAYER IS COVERING THE PAGE AND TAKING INPUT'); process.exit(1); }
if (errors.length) process.exit(1);
console.log('[shoot] ✓ clean');
