// =================================================================================================
// THE EAR — an ANALYSER gauge for the attack layer. Wave 0, lane G-FEEL.
// Spec: `docs/powerworld/aaa-07-audio.md` §7.
//
//     await window.LSW.audioSuite()
//     await window.LSW.audioSuite({ full: true })   // + every firearm AND every sustain kind
//
// ⚠ AUDIO IS DEPRIORITISED BY THE OWNER ("dont worry about sound for now"). So this is the GAUGE
// and nothing else: it measures, it does not chase what it finds, and it does not change a byte of
// the audio engine. Gaps it reports are FINDINGS for a later wave.
//
// ⚠ IT CHANGES NOTHING. The only thing it touches is an AnalyserNode hung off `audio.master`, and
// that is disconnected in the `finally`.
//
// ---- WHY AN ANALYSER AND NOT A CALL COUNT ------------------------------------------------------
// "The sound fired" is a boolean and it has never been the question. The armory pass proved 13
// firearms DISTINCT by measuring crack / body / tail per weapon (CLAUDE.md, THE ARMORY) — and that
// harness was thrown away, which is why the claim cannot be reproduced today. This one is committed.
//
// ---- THE TRAP THAT COST THE LAST ONE 10 OF 13 --------------------------------------------------
// ⚠ MEASURE WITH `requestAnimationFrame`, NEVER `setTimeout`. An attack transient is 30–60 ms; a
// nested `setTimeout` is clamped to ≥4 ms foregrounded and ≥1000 ms in a background tab, so the
// sampler misses the part of the sound that carries the identity and reads the tail instead. Both
// failure directions come out of that one wrong timer: two identical weapons measure different, and
// two different ones measure the same.
// ⚠ AND IT REFUSES TO RUN WHEN `document.hidden`. A backgrounded tab throttles rAF to ~10 Hz, i.e.
// 100 ms per sample — worse than the transient. Refusing is the honest verdict; reporting zeros is
// not. (The `world._ema` reads-98ms artefact is the same failure wearing a different sense.)
// ⚠ `sampleLoop(name, OPTIONS)` takes an options OBJECT — passing `null` defeats the `= {}` default
// and the destructure THROWS, which breaks "audio must never throw into the frame loop" in the very
// act of testing it. Nothing here passes null to it.
// =================================================================================================

import { FIREARMS, VOICES } from '../data/armory.js';

const FRAMES = 14;              // ≈230 ms at 60 Hz — long enough for transient AND early tail
const GAP = 6;                  // rAF frames of silence between subjects, so tails do not overlap

// =================================================================================================
// THE ITEM / GADGET SOUNDS — identified per Robert (2026-07-28, "identify all sounds we need for the
// items and such, add to audio harness"). `fire` REPLAYS the sound the gadget makes TODAY (the exact
// `audio.*` calls inside `game.useItem`), so the gauge measures the shipped state without needing a
// fighter. `need` is the FINDING: the distinct, recognisable sound each gadget SHOULD have, the way
// the armory (§38) gave 13 firearms 13 voices. ⚠ TODAY NEARLY EVERY GADGET IS `zap()` AT A DIFFERENT
// PITCH — a medkit, a shield and a jammer all read as "a beep", the pre-armory guns problem in the
// item layer. This table is the spec a later audio wave meets; the gauge proves they are at least
// AUDIBLE now and reports how many collapse into one voice.
export const GADGET_SOUNDS = [
  { kind: 'medkit',    label: 'MEDKIT',     fire: (a) => a.zap(820),                   need: 'a pneumatic injector hiss + a rising confirm chime (heal, not a beep)' },
  { kind: 'shieldpack',label: 'SHIELD CELL',fire: (a) => a.zap(700),                   need: 'an energy shield WHOOMP that swells and settles into a faint hum' },
  { kind: 'jetcell',   label: 'JUMP JETS',  fire: (a) => { a.zap(560); a.power(true); },need: 'a thruster IGNITION crack into the sustained roar (the fire loop)' },
  { kind: 'flashbang', label: 'FLASHBANG',  fire: (a) => { a.zap(1200); a.impact(0.7); },need: 'the CRACK is right; add the ringing after-whine that sells the blind' },
  { kind: 'beacon',    label: 'BEACON PLANT',fire: (a) => { a.zap(520); a.zap(760); },  need: 'a mechanical tripod CLUNK + a servo whir + a lock beep' },
  { kind: 'recall',    label: 'BEACON RECALL',fire: (a) => a.teleport(),               need: 'DISTINCT already — the teleport swoosh. Keep it.' },
  { kind: 'vision',    label: 'GOGGLES',    fire: (a) => a.zap(560),                   need: 'a soft electronic power-on whir (night-vision), not the shield beep' },
  { kind: 'gas',       label: 'GAS CANISTER',fire: (a) => a.zap(300),                  need: 'a canister POP into the sustained gas HISS (the sustain(\'gas\') loop)' },
  { kind: 'jammer',    label: 'RADIO JAMMER',fire: (a) => a.zap(180),                  need: 'a descending electronic WARBLE into static — the sound of comms dying' },
  { kind: 'armor',     label: 'ARMOR PLATE',fire: (a) => a.land(0.6, 'metal'),         need: 'DISTINCT already — the metal plate clang. Keep it.' },
];

/**
 * The only correct sampler shape in this repo. Returns one RMS per rAF frame, plus the frequency
 * magnitudes SUMMED over every frame — the transient is where identity lives and rAF cannot be
 * relied on to land inside it, so the whole window is integrated instead of one sample of it.
 */
function grab(analyser, frames = FRAMES, fire = null) {
  return new Promise((res) => {
    const rms = [];
    const t = new Float32Array(analyser.fftSize);
    const f = new Float32Array(analyser.frequencyBinCount);
    const acc = new Float32Array(analyser.frequencyBinCount);
    let fired = false;
    const stepOne = () => {
      // ⚠ FIRE INSIDE THE SAMPLER, NEVER BEFORE IT. Calling the sound and then starting an rAF
      // sampler lets the shot begin at an arbitrary point inside the first 16 ms window, so the
      // window integrates a different slice of a 40 ms transient every run. Measured with the fire
      // outside: the SAME M24 came back 2625 Hz then 4968 Hz — a repeat jitter of 2342 Hz against
      // an armoury spread of 779, i.e. one weapon fired twice measured further apart than two
      // different weapons. The suite reported that honestly and it is why this line exists.
      // Firing here pins the sound to a frame boundary; the first sample is the pre-roll floor.
      if (!fired && fire) { fired = true; try { fire(); } catch (e) { /* the caller's row records it */ } }
      analyser.getFloatTimeDomainData(t);
      let s = 0; for (let i = 0; i < t.length; i++) s += t[i] * t[i];
      rms.push(Math.sqrt(s / t.length));
      // ⚠ ACCUMULATE THE SPECTRUM OVER EVERY FRAME — DO NOT TAKE IT AT THE PEAK FRAME.
      // The first version read `getFloatFrequencyData` on the loudest rAF frame, and rAF lands at a
      // RANDOM point inside a 40 ms transient: the same M24 measured a centroid of 3367, then 2755,
      // then 4207 Hz across three runs of an unchanged game. A metric that is not reproducible
      // cannot support a distinctness claim in either direction — it manufactures differences
      // between identical weapons and hides them between different ones, which is the same pair of
      // failures the setTimeout trap produces. Summing every frame averages the sampling phase out.
      analyser.getFloatFrequencyData(f);           // dB
      for (let i = 0; i < f.length; i++) acc[i] += Math.pow(10, f[i] / 20);
      if (rms.length < frames) requestAnimationFrame(stepOne); else res({ rms, mag: acc });
    };
    requestAnimationFrame(stepOne);
  });
}

const idle = (n) => new Promise((res) => { let i = 0; const s = () => (++i >= n ? res() : requestAnimationFrame(s)); requestAnimationFrame(s); });

/**
 * The 4-vector distinctness is computed on: [spectral centroid, low-band ratio, decay τ, peak].
 * ⚠ CENTROID IS THE ONE THAT SEPARATED THE 13 FIREARMS. Peak alone says only "it made a noise".
 * The centroid here is taken over the ACCUMULATED spectrum (see `grab`), not a single frame.
 */
function signature(sample, sampleRate, binCount) {
  const { rms, mag } = sample;
  const peak = Math.max(...rms);
  const peakAt = rms.indexOf(peak);
  let num = 0, den = 0, low = 0, all = 0;
  const hz = sampleRate / 2 / binCount;
  for (let i = 0; i < binCount; i++) {
    const m = mag[i], f = i * hz;
    num += f * m; den += m; all += m;
    if (f < 200) low += m;
  }
  const centroid = den > 0 ? num / den : 0;
  const lowRatio = all > 0 ? low / all : 0;
  // decay τ = frames from the peak down to 10% of it (the TAIL, measured)
  let tau = rms.length - peakAt;
  for (let i = peakAt; i < rms.length; i++) if (rms[i] <= peak * 0.1) { tau = i - peakAt; break; }
  return { peak, peakAt, centroid, lowRatio, tau };
}

/**
 * Two signatures are the SAME voice when they agree inside the harness's own measured repeat noise.
 * ⚠ THE TOLERANCE IS CALIBRATED, NOT PICKED. Firing one weapon twice and measuring how far apart
 * the two readings land is the only honest scale for "these two are the same sound" — a hand-picked
 * ±60 Hz either clusters everything (and reports a healthy armoury as one gun) or clusters nothing
 * (and reports thirteen distinct voices that are thirteen noise readings). Same law as deriving a
 * ladder from the distribution instead of from constants.
 */
const sameWithin = (tol) => (a, b) => Math.abs(a.centroid - b.centroid) < tol
  && Math.abs(a.lowRatio - b.lowRatio) < 0.05
  && Math.abs(a.peak - b.peak) < Math.max(a.peak, b.peak) * 0.20;
const stdev = (xs) => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length); };

// =================================================================================================
// THE KNOWN-BAD — rubric §5.2. A gauge that cannot go red proves nothing.
// =================================================================================================
/**
 * Strip every firearm of its voice: `gunshot(power, pos, voice)` is called with `voice = null`, so
 * all thirteen fall back to one profile. Distinctness MUST collapse under this.
 * ⚠ This is the audio twin of "twelve weapons are twelve weapons" — the whole reason the per-weapon
 * voice system exists is that a shared bang across twelve guns is worse than the synth it replaced.
 */
export function injectOneVoice(game) {
  const a = game.audio;
  const prev = a.gunshot.bind(a);
  a.gunshot = (power = 1, pos = null) => prev(power, pos, null);
  return () => { a.gunshot = prev; };
}

/** Mute the bus entirely — every peak must fall to the floor. Proves the analyser is really tapped. */
export function injectSilence(game) {
  const a = game.audio;
  if (!a.master) return () => {};
  const prev = a.master.gain.value;
  a.master.gain.value = 0;
  return () => { a.master.gain.value = prev; };
}

// =================================================================================================
// THE SUITE
// =================================================================================================
export async function audioSuite(game, hud, opts = {}) {
  const R = [];
  const errs = [];
  const oldErr = console.error;
  console.error = (...a) => { errs.push(String(a[0]).slice(0, 160)); oldErr(...a); };
  const ok = (name, pass, got, want) => { R.push({ name, pass: !!pass, got, want }); return !!pass; };
  const note = (name, got) => { R.push({ name, pass: true, got, want: 'reported, not graded' }); };

  const a = game.audio;
  let analyser = null, tapGain = null;
  const prevMuted = a.muted;
  const busSaved = {};

  // ⚠ THE MEASUREMENT NEEDS A SILENT ROOM, AND THE FIRST VERSION DID NOT HAVE ONE. Run against a
  // live match and the noise floor comes back at 2.8e-2 instead of ~0 — the fight itself, the
  // soundscape bed and the ambience director are all playing — and `peak > 3× floor` then fails
  // SEVEN of the thirteen firearms. A gauge that reports "half the armoury is silent" because the
  // city was loud is worse than no gauge.
  //   · `game.update` is stubbed, so the page's rAF loop advances no combat and emits no SFX.
  //   · `game.running = false`, which is what gates `soundscape.update` in boot.js's loop.
  // ⚠ AND THAT SILENCES THE WATCHDOG TOO. `audio.sweep()` is called from `game.update`, so with the
  // clock owned nothing reaps — and the D1 assertion below would pass for the wrong reason. The
  // sustain section therefore calls `a.sweep()` by hand, which is the identical function the frame
  // loop calls. Drive the gate; do not remove it.
  const realUpdate = game.update.bind(game);
  const prevRunning = game.running;
  game.update = () => {};
  game.running = false;

  try {
    // ==========================================================================================
    // 0 · THE SUITE REFUSES RATHER THAN LYING
    // ==========================================================================================
    if (document.hidden) {
      ok('the tab is foregrounded (rAF throttles to ~10 Hz hidden — worse than the transient)', false, 'document.hidden', 'visible');
      throw new Error('REFUSED — a hidden tab cannot measure a 40 ms transient');
    }
    try { a.init(); a.resume(); } catch (e) { errs.push('audio.init: ' + ((e && e.message) || e)); }
    if (!a.ctx) { ok('an AudioContext exists', false, 'none', 'a context'); throw new Error('REFUSED — no AudioContext'); }
    // ⚠ A SUSPENDED CONTEXT MEASURES SILENCE AND LOOKS EXACTLY LIKE A BROKEN GAME. Autoplay policy
    // requires a user gesture; a headless driver must click something before calling this.
    if (a.ctx.state !== 'running') {
      ok('the AudioContext is running (a gesture is required first — click into the page)', false, a.ctx.state, 'running');
      throw new Error('REFUSED — AudioContext is ' + a.ctx.state);
    }
    ok('the AudioContext is running', true, a.ctx.state, 'running');

    analyser = a.ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;          // ⚠ smoothing averages the transient away
    // ⚠ A DANGLING ANALYSER IS NOT GUARANTEED TO BE PULLED. Give it a zero-gain path to the
    // destination so the graph definitely renders it, and it definitely cannot be heard.
    tapGain = a.ctx.createGain(); tapGain.gain.value = 0;
    a.master.connect(analyser); analyser.connect(tapGain); tapGain.connect(a.ctx.destination);
    a.muted = false;

    // ⚠ STOPPING THE SIM IS NOT ENOUGH — THE BEDS ARE LOOPS AND THEY KEEP PLAYING. With the clock
    // owned and `game.running` false the noise floor STILL measured 3.2e-2, because the soundscape's
    // drone/traffic/crowd layers and the music bed are sustained oscillators on their own buses that
    // nothing in `game.update` was holding up. RMS adds in power, so a 3.2e-2 bed swallows every
    // quiet transient in the game and the suite reports "11 of 13 firearms are silent" about a
    // perfectly healthy armoury.
    // The attack layer lives on `sfx` and `voice`; `music` and `ambient` are ducked to zero for the
    // duration and restored in the `finally`. This measures the layer under test and nothing else.
    for (const b of ['music', 'ambient']) if (a.bus && a.bus[b]) { busSaved[b] = a.bus[b].gain.value; a.bus[b].gain.value = 0; }

    // the NOISE FLOOR, measured rather than assumed
    await idle(GAP);
    const floorS = await grab(analyser, 10);
    const floor = Math.max(1e-7, Math.max(...floorS.rms));
    note('measured noise floor (peak RMS with nothing playing)', floor.toExponential(2));

    // ---- CHECK 0 · THE HARNESS WORKS ---------------------------------------------------------
    // ⚠ *"a point-blank `punch.med` measures a peak RMS above the noise floor."* If it does not,
    // nothing after this means anything. Three earlier harnesses in this repo went green while
    // measuring their own arithmetic, and one shipped a `[].every()` over an empty list.
    const probe = signature(await grab(analyser, FRAMES, () => a.impact(1.0, null)), a.ctx.sampleRate, analyser.frequencyBinCount);
    ok('CHECK 0 · the analyser hears a known recorded impact', probe.peak > floor * 10,
      `peak RMS ${probe.peak.toExponential(2)} vs floor ${floor.toExponential(2)}`, '> 10× floor');
    await idle(GAP);

    // ---- CHECK 0-RED · and it goes DEAF when the bus is muted --------------------------------
    const undoSilence = injectSilence(game);
    const mutedS = signature(await grab(analyser, FRAMES, () => a.impact(1.0, null)), a.ctx.sampleRate, analyser.frequencyBinCount);
    undoSilence();
    // ⚠ RELATIVE, NOT ABSOLUTE. The measured floor in a headless context clamps to 1e-7, so an
    // absolute "under 3× floor" gate demands digital zero and a −65 dB residual reads as a failure.
    // "Collapsed" is a ratio; 40 dB down is silence by any standard the ear uses.
    const dbDown = 20 * Math.log10(Math.max(1e-12, mutedS.peak) / Math.max(1e-12, probe.peak));
    ok('CHECK 0-RED · KNOWN-BAD `master.gain = 0` — the same impact collapses to silence',
      dbDown < -40 && probe.peak > floor * 10,
      `${dbDown.toFixed(1)} dB (${mutedS.peak.toExponential(2)} muted vs ${probe.peak.toExponential(2)} live)`, '< -40 dB');
    await idle(GAP);

    // ==========================================================================================
    // 1 · EVERY ATTACK PRIMITIVE MAKES A SOUND, AND THEY ARE NOT THE SAME SOUND
    // ==========================================================================================
    // ⚠ THESE ARE THE PRIMITIVES EVERY ONE OF THE 364 SLOTS BOTTOMS OUT IN. Firing all 364 through
    // `runSlot` is a 145-second run and belongs behind `opts.full`; the primitives are the thing an
    // ability can actually be distinct BY, and they are 12 rows instead of 364.
    const PRIMS = [
      ['impact (fist)', () => a.impact(1.0, null)],
      ['meleeHit heavy', () => a.meleeHit(1.8, null, true)],
      ['swing fist', () => a.swing('fist', null)],
      ['swing blade', () => a.swing('blade', null)],
      ['swing blunt', () => a.swing('blunt', null)],
      // ⚠ `blast(freq, dur, type, pos)` — the signature is NOT (power, pos) like its neighbours, and
      // calling it that way puts `null` into `dur`. It survives only because every public sound
      // coerces through `fin()` first; the harness must still call it correctly or it is measuring
      // a different sound than the game makes.
      ['ki blast', () => a.blast(420, 0.16, 'sawtooth', null)],
      ['ki zap', () => a.zap(520, null)],
      ['soft hit', () => a.hit(240, null)],
      ['boom', () => a.boom(1.0, null)],
      ['land flesh', () => a.land(1.0, 'flesh', null)],
      ['land metal', () => a.land(1.0, 'metal', null)],
      ['land energy', () => a.land(1.0, 'energy', null)],
      ['bow loose', () => (a.bowLoose ? a.bowLoose(1.0, null) : a.swing('fist', null))],
    ];
    const prims = [];
    for (const [name, fire] of PRIMS) {
      let threw = null;
      const s = signature(await grab(analyser, FRAMES, () => { try { fire(); } catch (e) { threw = String((e && e.message) || e); } }), a.ctx.sampleRate, analyser.frequencyBinCount);
      prims.push({ name, threw, ...s });
      await idle(GAP);
    }
    const silent = prims.filter((p) => p.peak <= floor * 3);
    ok('every attack primitive makes a sound', silent.length === 0,
      silent.length ? silent.map((p) => p.name).join(', ') : `${prims.length}/${prims.length} audible`, '0 silent');
    ok('nothing in the attack layer THROWS (audio must never throw into the frame loop)',
      prims.every((p) => !p.threw), prims.filter((p) => p.threw).map((p) => `${p.name}: ${p.threw}`).join(' · ') || 'none', 'no throws');
    note('primitive signatures — centroid Hz / low-band / τ frames',
      prims.map((p) => `${p.name} ${Math.round(p.centroid)}/${p.lowRatio.toFixed(2)}/${p.tau}`).join(' · '));

    // ==========================================================================================
    // 2 · THE THIRTEEN FIREARMS — the committed version of the armory's thrown-away proof
    // ==========================================================================================
    const guns = [];
    for (const w of FIREARMS) {
      const v = VOICES[w.voice] || null;
      let threw = null;
      const s = signature(await grab(analyser, FRAMES, () => { try { a.gunshot(1, null, v); } catch (e) { threw = String((e && e.message) || e); } }), a.ctx.sampleRate, analyser.frequencyBinCount);
      guns.push({ id: w.id, voice: w.voice, threw, ...s });
      await idle(GAP);
    }
    ok('all 13 firearms are audible', guns.every((g) => g.peak > floor * 3),
      `${guns.filter((g) => g.peak > floor * 3).length}/${guns.length}`, `${guns.length}/${guns.length}`);

    // ---- CALIBRATION · what does an UNCHANGED sound measure like twice? ----------------------
    // ⚠ ASSERTION 5 AND THE TOLERANCE ARE THE SAME MEASUREMENT. `aaa-07` §7.3 asks that identical
    // inputs give identical voices; the answer is also the only defensible scale for "different".
    const repeat = [];
    for (let i = 0; i < 2; i++) {
      repeat.push(signature(await grab(analyser, FRAMES, () => a.gunshot(1, null, VOICES[FIREARMS[3].voice] || null)), a.ctx.sampleRate, analyser.frequencyBinCount));
      await idle(GAP);
    }
    const jitter = Math.abs(repeat[0].centroid - repeat[1].centroid);
    const spread = stdev(guns.map((g) => g.centroid));
    note('CALIBRATION · the same weapon fired twice', `centroid ${repeat[0].centroid.toFixed(0)} then ${repeat[1].centroid.toFixed(0)} Hz — repeat jitter ${jitter.toFixed(0)} Hz`);
    ok('identical inputs give the SAME voice (the harness is repeatable enough to claim anything)',
      jitter < spread, `jitter ${jitter.toFixed(0)} Hz vs armoury spread ${spread.toFixed(0)} Hz`, 'jitter < spread');

    const TOL = Math.max(40, jitter * 2);
    const same = sameWithin(TOL);
    const clusterCount = (rows) => {
      const groups = [];
      for (const r of rows) {
        const g = groups.find((gr) => same(gr[0], r));
        if (g) g.push(r); else groups.push([r]);
      }
      return groups;
    };
    const gunGroups = clusterCount(guns);
    note('the "same voice" tolerance, derived from that jitter', `${TOL.toFixed(0)} Hz`);
    // ⚠ THE BAR IS NOT 13/13 AND SAYING SO IS THE HONEST MOVE. `armory.js` declares 13 weapons over
    // fewer than 13 PROFILES — two shotguns share `shotgun12` by design — so a suite demanding 13
    // distinct signatures would be demanding a defect. The bar is: more voices than profiles-minus-
    // one, and no profile swallowing the rest.
    const profiles = new Set(FIREARMS.map((w) => w.voice)).size;
    note('declared firearm VOICE profiles vs weapons', `${profiles} profiles / ${FIREARMS.length} weapons`);
    ok('the firearms resolve into as many voices as they declare profiles',
      gunGroups.length >= profiles - 1, `${gunGroups.length} measured voices`, `>= ${profiles - 1}`);
    ok('no single voice swallows the armoury', Math.max(...gunGroups.map((g) => g.length)) <= 3,
      `largest cluster ${Math.max(...gunGroups.map((g) => g.length))}`, '<= 3');
    note('firearm signatures — centroid Hz', guns.map((g) => `${g.id} ${Math.round(g.centroid)}`).join(' · '));

    // ---- KNOWN-BAD · strip the voices ---------------------------------------------------------
    const undoVoice = injectOneVoice(game);
    const flat = [];
    for (const w of FIREARMS.slice(0, 6)) {
      // the voice arg is discarded by the injection; it is passed anyway so the call is identical
      flat.push({ id: w.id, ...signature(await grab(analyser, FRAMES, () => a.gunshot(1, null, VOICES[w.voice] || null)), a.ctx.sampleRate, analyser.frequencyBinCount) });
      await idle(GAP);
    }
    undoVoice();
    // ⚠ COMPARE THE SPREAD, NOT A CLUSTER COUNT. Six weapons forced onto one profile still measure
    // six slightly different numbers, because the profile itself contains noise bursts — so a
    // cluster count with any tolerance can report "6 vs 6" while the voices have genuinely
    // collapsed. What actually changes is the VARIANCE across the group, and that is the quantity
    // the whole per-weapon voice system exists to create.
    const flatSpread = stdev(flat.map((g) => g.centroid));
    const liveSpread = stdev(guns.slice(0, 6).map((g) => g.centroid));
    ok('KNOWN-BAD · with the voice argument discarded the firearms collapse toward one voice',
      flatSpread < liveSpread * 0.6,
      `centroid spread ${flatSpread.toFixed(0)} Hz stripped vs ${liveSpread.toFixed(0)} Hz live (same 6 weapons)`,
      `< ${(liveSpread * 0.6).toFixed(0)} Hz`);

    // ==========================================================================================
    // 3 · SUSTAINED SOURCES FADE, NEVER CUT — and leave nothing behind
    // ==========================================================================================
    // The loop-vs-one-shot rule made testable: a sustained voice is created already fading IN,
    // driven by `set(I, pos)` every live frame, and `stop()` FADES OUT. A hard cut is a click.
    // ⚠ `fire` IS THE ONE THAT MATTERS AND IT IS DELIBERATELY FIRST. It is the only kind that
    // resolves to a RECORDED loop (`sustain('fire')` → `sampleLoop('fire.roar')`); every other kind
    // is built by the synth path. Testing only the synth kinds would report a healthy layer while
    // the recorded half of it is being killed.
    const KINDS = opts.full ? ['fire', 'gas', 'ice', 'acid', 'drain', 'phase', 'bow'] : ['fire', 'ice', 'drain'];
    const susRows = [], susEarly = [];
    for (const kind of KINDS) {
      let h = null, threw = null;
      try { h = a.sustain(kind, null); } catch (e) { threw = String((e && e.message) || e); }
      if (!h) { susRows.push({ kind, threw, made: false }); continue; }
      // ⚠ MEASURE IT TWICE, EARLY AND LATE, OR THE REPORT LOSES THE HALF THAT EXPLAINS IT. A single
      // late reading of the recorded loop says "fire is silent", which reads as a broken sample. Two
      // readings say "fire started correctly and was then killed while being driven", which is the
      // actual defect and points at the actual line.
      for (let i = 0; i < 5; i++) { try { h.set(0.8, null); } catch (e) { threw = threw || String(e.message || e); } await idle(1); }
      const early = signature(await grab(analyser, 6), a.ctx.sampleRate, analyser.frequencyBinCount);
      // ⚠ DRIVEN FOR 40 MORE FRAMES, NOT 12. The watchdog reaps on `performance.now() - h.last > 450`,
      // so anything shorter than ~half a second cannot see a reaping happen at all.
      for (let i = 0; i < 40; i++) {
        try { h.set(0.8, null); } catch (e) { threw = threw || String(e.message || e); }
        a.sweep();                              // the watchdog, driven exactly as game.update drives it
        await idle(1);
      }
      const live = signature(await grab(analyser, 8), a.ctx.sampleRate, analyser.frequencyBinCount);
      const inSus = a._sus.has(h);
      susEarly.push({ kind, peak: early.peak });
      h.stop();
      const after = await grab(analyser, 14);
      const first = after.rms[0], tail = Math.max(...after.rms.slice(-4));
      susRows.push({ kind, threw, made: true, live: live.peak, first, tail, inSus });
      await idle(GAP);
    }
    const made = susRows.filter((s) => s.made);
    ok('every sustained voice STARTS sounding when created and driven',
      susEarly.length > 0 && susEarly.every((s) => s.peak > floor * 3),
      susEarly.map((s) => `${s.kind} ${s.peak.toExponential(1)}`).join(' · '), 'all above floor');
    ok('...and is STILL sounding half a second later, still being driven',
      made.every((s) => s.live > floor * 3),
      susRows.map((s) => `${s.kind} ${s.made ? s.live.toExponential(1) : 'NOT CREATED'}`).join(' · '), 'all above floor');
    // ⚠ THE ASSERTION SPELLS OUT THE SUSPECT, because a bare "not registered" reads as a harness
    // problem. `samples.js:194` stamps `h.last = a.ctx.currentTime` (SECONDS) and `audio.js:52`
    // reaps on `performance.now() - h.last > 450` (MILLISECONDS) — so a recorded loop is reaped on
    // the first sweep after it is created, however hard it is being driven. That is defect D1 in
    // `aaa-07-audio.md`, and this row is what makes it a number instead of a reading.
    const reaped = made.filter((s) => !s.inSus);
    ok('a driven sustained voice SURVIVES the watchdog (aaa-07 D1 — the seconds/ms unit mismatch)',
      reaped.length === 0,
      reaped.length ? `REAPED WHILE DRIVEN: ${reaped.map((s) => s.kind).join(', ')} — the recorded-loop half of the layer` : 'all survived',
      'all still in audio._sus after 40 driven frames (the reap threshold is 450 ms)');
    // ⚠ RELATIVE, NOT ABSOLUTE. The measured noise floor in a headless context is exactly 0, so an
    // absolute "below 4× floor" threshold is unsatisfiable by anything still fading. "Fades rather
    // than cuts" is a SHAPE: still substantial on the first frame after stop, near nothing by the
    // fourteenth. An absolute number here would grade the browser, not the fade.
    ok('...and FADES on stop() rather than hard-cutting',
      made.filter((s) => s.inSus).every((s) => s.tail <= Math.max(s.first, s.live) * 0.06),
      made.map((s) => `${s.kind} live ${s.live.toExponential(1)} → +1f ${s.first.toExponential(1)} → +14f ${s.tail.toExponential(1)}`).join(' · '),
      'tail <= 6% of the live level (survivors only — a reaped loop has already gone)');
    ok('no sustained voice is left orphaned', a._sus.size === 0, a._sus.size, 0);

    // ==========================================================================================
    // 4 · THE ITEMS / GADGETS (Robert, 2026-07-28) — every gadget's sound is AUDIBLE, and how many
    //     collapse into one voice today (the finding a later audio wave meets — see GADGET_SOUNDS).
    // ==========================================================================================
    const gadgets = [];
    for (const g of GADGET_SOUNDS) {
      let threw = null;
      const s = signature(await grab(analyser, FRAMES, () => { try { g.fire(a); } catch (e) { threw = String((e && e.message) || e); } }), a.ctx.sampleRate, analyser.frequencyBinCount);
      gadgets.push({ kind: g.kind, label: g.label, need: g.need, threw, ...s });
      await idle(GAP);
    }
    const audibleN = gadgets.filter((x) => x.peak > floor * 3).length;
    ok('every gadget makes an AUDIBLE sound', audibleN === gadgets.length,
      `${audibleN}/${gadgets.length}`, `${gadgets.length}/${gadgets.length}`);
    ok('no gadget sound THROWS into the frame loop', gadgets.every((x) => !x.threw),
      gadgets.filter((x) => x.threw).map((x) => `${x.kind}: ${x.threw}`).join(', ') || 'none', 'none');
    // DISTINCTNESS — the same centroid-cluster the firearms use, with the same jitter-derived tolerance.
    const gTol = Math.max(80, (typeof TOL === 'number' ? TOL : 120));
    const gsame = sameWithin(gTol);
    const gGroups = [];
    for (const r of gadgets) { const grp = gGroups.find((q) => gsame(q[0], r)); if (grp) grp.push(r); else gGroups.push([r]); }
    note('gadget signatures — centroid Hz', gadgets.map((x) => `${x.label} ${Math.round(x.centroid)}`).join(' · '));
    note('gadgets resolve into DISTINCT voices', `${gGroups.length} of ${gadgets.length} (the rest are zap() beeps sharing a voice — see GADGET_SOUNDS.need)`);
    // ⚠ THE BAR IS "AT LEAST THE TWO ALREADY-DISTINCT ONES + AUDIBLE", NOT full separation — the owner
    // deprioritised the audio ENGINE, so authoring 10 gadget voices is a later wave. This gauge exists
    // so that wave has a target and a red/green it can watch move. recall (teleport) + armor (clang)
    // are already their own voices; everything else is the zap cluster the `need` column describes.
    ok('the already-distinct gadget voices (recall, armor) do not collapse into the beep cluster',
      gGroups.length >= 3, `${gGroups.length} voices`, '>= 3 (beep cluster + teleport + clang)');
    note('THE SOUND SHOPPING LIST (what each gadget needs)', gadgets.map((x) => `${x.label}: ${x.need}`).join('  |  '));

    // ==========================================================================================
    // 5 · NO MISSING SAMPLES
    // ==========================================================================================
    // ⚠ `samples.js` logs `console.warn('[samples] missing', file)` on a 404 and returns null, so a
    // missing recording is SILENT at the call site and the synth fallback covers for it. The warning
    // is the only evidence, and it is counted here rather than trusted to be noticed.
    const warns = [];
    const oldWarn = console.warn;
    console.warn = (...w) => { if (String(w[0]).includes('[samples]')) warns.push(String(w[1] || '')); oldWarn(...w); };
    await idle(20);
    console.warn = oldWarn;
    ok('no sample 404s were logged during this run', warns.length === 0, warns.slice(0, 4).join(', ') || 'none', '0');
  } catch (e) {
    R.push({ name: 'SUITE STOPPED', pass: false, got: String((e && e.message) || e).slice(0, 300), want: 'a complete run' });
  } finally {
    try { if (analyser && a.master) a.master.disconnect(analyser); } catch (e) { /* graph already torn down */ }
    try { if (analyser) analyser.disconnect(); if (tapGain) tapGain.disconnect(); } catch (e) { /* idem */ }
    for (const b of Object.keys(busSaved)) if (a.bus && a.bus[b]) a.bus[b].gain.value = busSaved[b];
    a.muted = prevMuted;
    game.update = realUpdate;                   // ⚠ ALWAYS — a stubbed update bricks the page
    game.running = prevRunning;
    console.error = oldErr;
  }

  const fails = R.filter((r) => !r.pass);
  const out = {
    checks: R.length,
    failures: fails.map((r) => `${r.name} — got ${r.got}, want ${r.want}`),
    consoleErrors: errs.length,
    errorSample: errs.slice(0, 5),
    rows: R.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — got ${r.got}, want ${r.want}`),
  };
  if (!opts.quiet) {
    console.log(`%cAUDIO SUITE — ${R.length} checks, ${fails.length} failures, ${errs.length} console errors`, 'font-weight:bold');
    console.table(R);
  }
  return out;
}
