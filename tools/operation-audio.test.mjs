// tools/operation-audio.test.mjs
//
// Validates the operation-v1 delivery: the registry shape, that every declared asset exists as both
// a WAV master and an MP3 derivative, that measurements are in-bounds (no clipping, short reports,
// nothing silent), that the manifest and registry cannot drift, that pursuit reports are observer-safe
// radio (never positional), and that the build is reproducible from source. Dependency-free
// (node builtins + this branch's own modules), so it runs without node_modules.
//
//   node --test tools/operation-audio.test.mjs      (or:  node tools/operation-audio.test.mjs)
//
// Run tools/operation-audio-build.mjs first so the assets + manifest exist.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { OPERATION_AUDIO_CUES, OPERATION_AUDIO_POLICY, operationAudioPackage, audioCuePackage } from '../src/data/audio-cues.js';
import { RECIPES, render, stem } from '../authoring/audio/operation-v1/recipes.mjs';
import { toWav16 } from '../authoring/audio/operation-v1/synth.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = join(ROOT, 'public', 'audio', 'operation-v1');           // .mp3 + manifest
const MASTERS = join(ROOT, 'authoring', 'audio', 'operation-v1', 'masters'); // .wav
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const manifest = existsSync(join(RUNTIME, 'manifest.json'))
  ? JSON.parse(readFileSync(join(RUNTIME, 'manifest.json'), 'utf8')) : null;

const REQUIRED = ['op.hit.confirm', 'op.block.confirm', 'op.guard.break', 'op.shield.deploy', 'op.shield.hit',
  'op.shield.collapse', 'op.scanner.acquire', 'op.scanner.lost', 'op.portal.ready', 'op.portal.cross',
  'op.squad.ready', 'op.squad.regroup', 'op.pursuit.spotted', 'op.pursuit.airborne', 'op.pursuit.lost',
  'op.pursuit.search', 'op.pursuit.reacquired', 'op.zombie.idle', 'op.zombie.alert', 'op.zombie.attack',
  'op.zombie.hurt', 'op.zombie.death'];

// ---- self-proof first (wwa-verify law: an empty list passes .every vacuously) --------------------
test('self-proof: the registry and assets are actually present', () => {
  assert.ok(OPERATION_AUDIO_CUES.length >= 22, `expected >=22 cues, got ${OPERATION_AUDIO_CUES.length}`);
  assert.ok(manifest, 'manifest.json missing — run tools/operation-audio-build.mjs first');
  assert.ok(manifest.files.length >= OPERATION_AUDIO_CUES.length, 'no built files');
  assert.ok(existsSync(join(RUNTIME, 'op_hit_confirm_a.mp3')), 'a known mp3 must exist on disk');
});

test('every required brief cue is present exactly once', () => {
  const ids = OPERATION_AUDIO_CUES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate cue id');
  for (const id of REQUIRED) assert.ok(ids.includes(id), `missing required cue ${id}`);
});

test('every cue has the full contract and valid enums', () => {
  for (const c of OPERATION_AUDIO_CUES) {
    for (const k of ['id', 'label', 'family', 'sample', 'playback', 'bus', 'event', 'transition', 'dedupe', 'direction', 'reuse'])
      assert.ok(typeof c[k] === 'string' && c[k].trim(), `${c.id} lacks ${k}`);
    assert.ok(['one-shot', 'loop'].includes(c.playback), `${c.id} playback`);
    assert.ok(['sfx', 'ui', 'voice', 'music', 'ambient'].includes(c.bus), `${c.id} bus`);
    assert.equal(c.wired, false, `${c.id} must be wired:false (asset, not gameplay)`);
    assert.equal(c.status, 'asset', `${c.id} status`);
    assert.ok(Array.isArray(c.payload) && c.payload.length > 0, `${c.id} payload`);
    assert.equal(c.sample, c.id, `${c.id} sample name should equal id`);
    assert.ok(Array.isArray(c.files) && c.files.length > 0, `${c.id} files`);
    assert.ok(Number.isFinite(c.cooldownMs) && c.cooldownMs >= 0, `${c.id} cooldownMs`);
    assert.ok(c.spatial === true ? Number.isFinite(c.reach) : true, `${c.id} spatial cue needs reach`);
  }
});

test('every declared asset exists as BOTH wav master and mp3 derivative', () => {
  for (const c of OPERATION_AUDIO_CUES) for (const f of c.files) {
    const base = f.replace(/^operation-v1\//, '');
    assert.ok(existsSync(join(MASTERS, base + '.wav')), `missing WAV master ${base}`);
    assert.ok(existsSync(join(RUNTIME, base + '.mp3')), `missing MP3 ${base}`);
  }
});

test('registry and manifest cannot drift (same ids, same stems, files all referenced)', () => {
  const manIds = new Set(manifest.cues.map((c) => c.id));
  for (const c of OPERATION_AUDIO_CUES) {
    assert.ok(manIds.has(c.id), `registry cue ${c.id} not in manifest`);
    const man = manifest.cues.find((m) => m.id === c.id);
    assert.deepEqual([...c.files].sort(), [...man.variantStems].sort(), `${c.id} stems differ`);
  }
  const referenced = new Set(OPERATION_AUDIO_CUES.flatMap((c) => c.files));
  for (const f of manifest.files) assert.ok(referenced.has(f.sample), `built file ${f.sample} is not referenced by any cue`);
});

test('measurements are in bounds: no clipping, nothing silent, reports are short', () => {
  const cueOf = (sample) => OPERATION_AUDIO_CUES.find((c) => c.files.includes(sample));
  for (const f of manifest.files) {
    assert.ok(f.peakDbfs < 0, `${f.stem} clips (peak ${f.peakDbfs} dBFS)`);
    assert.ok(f.peakDbfs > -12, `${f.stem} suspiciously quiet peak ${f.peakDbfs}`);
    assert.ok(f.rmsDbfs > -40, `${f.stem} effectively silent (rms ${f.rmsDbfs})`);
    assert.ok(f.durationSec > 0.02 && f.durationSec <= 1.0, `${f.stem} duration ${f.durationSec}s out of one-shot range`);
    const c = cueOf(f.sample);
    if (c && (c.family === 'pursuit' || c.family === 'squad'))
      assert.ok(f.durationSec <= 0.45, `${f.stem} radio report too long (${f.durationSec}s) — must stay short over combat`);
  }
});

test('declared durationMs matches the rendered asset within tolerance', () => {
  for (const c of OPERATION_AUDIO_CUES) {
    const man = manifest.cues.find((m) => m.id === c.id);
    const measMs = man.durationSec * 1000;
    assert.ok(Math.abs(measMs - c.durationMs) <= Math.max(60, c.durationMs * 0.2),
      `${c.id} declared ${c.durationMs}ms vs measured ${measMs.toFixed(0)}ms`);
  }
});

test('pursuit reports are OBSERVER-SAFE radio (non-positional, never reveal an unseen enemy)', () => {
  for (const c of OPERATION_AUDIO_CUES.filter((c) => c.family === 'pursuit')) {
    assert.equal(c.spatial, false, `${c.id} must be non-positional (friendly radio, not positioned on the enemy)`);
    assert.equal(c.bus, 'voice', `${c.id} routes on the friendly-radio/voice bus`);
    assert.ok(typeof c.observerRule === 'string' && c.observerRule.trim(), `${c.id} lacks observerRule`);
    assert.ok(c.duckSpeech === true, `${c.id} must yield to speech`);
    assert.ok(c.cooldownMs >= 2000, `${c.id} needs an LOS-flicker debounce (cooldownMs>=2000)`);
    assert.ok(c.payload.some((p) => /observerId/.test(p)) && c.payload.some((p) => /knowledgeSource|teamId/.test(p)),
      `${c.id} payload must carry observer + knowledge source`);
  }
});

test('zombie vocals are spatial local enemy sound (not radio)', () => {
  for (const c of OPERATION_AUDIO_CUES.filter((c) => c.family === 'zombie')) {
    assert.equal(c.spatial, true, `${c.id} zombie vocals are heard through spatial sound`);
    assert.ok(Number.isFinite(c.reach), `${c.id} needs reach`);
  }
});

test('the anti-spam policy is present and coherent', () => {
  const p = OPERATION_AUDIO_POLICY;
  assert.ok(p.radioChannel.single === true && p.radioChannel.minGapMs >= 1000, 'radio channel single + min gap');
  assert.ok(/intelligible|dialogue|speech/i.test(p.speechCoexistence), 'speech coexistence documented');
  assert.ok(/observer/i.test(p.observerKnowledge), 'observer-knowledge rule documented');
  assert.equal(p.voiceBudget.radioMaxConcurrent, 1, 'one radio report at a time');
});

test('the build is reproducible from source (re-render matches the committed WAV checksum)', () => {
  for (const id of Object.keys(RECIPES)) {
    const r = RECIPES[id];
    for (let v = 0; v < r.variants; v++) {
      const wav = toWav16(render(id, v));
      const sample = `operation-v1/${stem(id, v)}`;
      const f = manifest.files.find((x) => x.sample === sample);
      assert.ok(f, `manifest missing ${sample}`);
      assert.equal(sha(wav), f.wavSha, `${sample} WAV not reproducible from recipe`);
    }
  }
});

test('the operation package is honest: unwired and separate from the legacy brief', () => {
  const op = operationAudioPackage(), legacy = audioCuePackage();
  assert.equal(op.wired, false);
  assert.match(op.provenance, /no AI audio model/i);
  assert.match(op.provenance, /no recorded or cloned/i);
  // must not have leaked into the legacy package the shared test guards
  const legacyIds = new Set(legacy.cues.map((c) => c.id));
  for (const c of OPERATION_AUDIO_CUES) assert.ok(!legacyIds.has(c.id), `${c.id} leaked into the legacy AUDIO_CUES`);
});
