#!/usr/bin/env node
// ACS engine CLI. Author: Ariescar.
// usage: node cli.js <spec.json> <out.glb>
// Compiles the spec, runs all mechanical checks (any failure = exit 1, build
// blocked), then writes a skinned+animated GLB. Errors are structured and
// agent-readable: one line each, prefixed BLOCK:.
'use strict';
const fs = require('fs');
const { compile } = require('./core/compile.js');
const { buildSkeleton, inverseBindMatrices } = require('./core/skeleton.js');
const { compileAnims } = require('./core/anim.js');
const { runChecks } = require('./core/checks.js');
const { writeGLB } = require('./core/glb.js');

const [specPath, outPath] = process.argv.slice(2);
if (!specPath || !outPath) { console.error('usage: node cli.js <spec.json> <out.glb>'); process.exit(2); }

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
require('./core/relative.js').resolveJoints(spec);

// ── the shipped example is a SYNTAX REFERENCE, not a starting skeleton ──
// A thin order ("a dragon") tempts the shortest path: open example/wolf.json,
// recolour it, ship it. The customer asked for a dragon and gets a wolf that
// reads as a fox. Templates were removed from this harness for exactly this
// reason; this check stops the last template from sneaking back in as "the
// example". Building the reference specs themselves is of course fine.
{
  const path_ = require('path');
  const refs = ['../example/wolf.json', '../calibration/wolf_green.json',
                '../calibration/wolf_red.json'].map(r => path_.join(__dirname, r));
  const me = path_.resolve(specPath);
  if (!refs.some(r => path_.resolve(r) === me)) {
    const mine = spec.joints || {};
    const names = Object.keys(mine);
    for (const r of refs) {
      let ref;
      try { ref = JSON.parse(fs.readFileSync(r, 'utf8')); } catch { continue; }
      require('./core/relative.js').resolveJoints(ref);
      const rj = ref.joints || {};
      const shared = names.filter(n => Array.isArray(rj[n]));
      if (!names.length || shared.length / names.length < 0.9) continue;
      // same names AND the same places = a copy, not a coincidence
      const H = Math.max(...Object.values(rj).map(p2 => p2[1])) -
                Math.min(...Object.values(rj).map(p2 => p2[1])) || 1;
      const same = shared.filter(n => {
        const a = mine[n], b = rj[n];
        return Array.isArray(a) && Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]) < 0.02 * H;
      });
      if (same.length / shared.length >= 0.9) {
        console.error('='.repeat(68));
        console.error(`BLOCK: example_copy: this spec is ${path_.basename(r)} with the numbers barely moved `
          + `(${same.length}/${names.length} joints identical).`);
        console.error('='.repeat(68));
        console.error('the example is a SYNTAX reference, not a starting skeleton — a thin order is not');
        console.error('permission to ship the example in a new colour. Build this creature\'s own skeleton');
        console.error('from its own brief: the identity gate compares what a stranger SEES against what');
        console.error('the brief promised, and a recoloured wolf never reads as the creature that was ordered.');
        process.exit(1);
      }
    }
  }
}  // relational joints → coordinates
const sk = buildSkeleton(spec);          // also registers mirrored chains
const meshes = compile(spec);
for (const line of require('./core/compile.js').drainInfo())
  console.error('info: ' + line);        // the compiler narrates what happened
const { fails, warns } = runChecks(spec, sk, meshes, null);
for (const w of warns) console.error('warn: ' + w);   // measures, not laws — you judge

// ── the gate stamp, written by the machine that ran the checks ─────────────
// card 04 needs a gate.json listing every check and whether it passed. That
// used to be assembled by hand at the END of a run — the single most expensive
// moment in the whole build, because the conversation is at its longest and
// every token costs several times what it did at round 3 — and assembled from
// memory, which is exactly what iron law 10 says not to trust. The engine ran
// the checks; the engine writes them down. Roster matches harness/gates.json.
const ENGINE_CHECKS = ['mesh_integrity', 'root_containment', 'part_attachment',
  'touch', 'balance', 'size', 'proportion', 'limb_clearance', 'anim_integrity',
  'attack_reach', 'faceted_body', 'mirror_distortion', 'part_overlap', 'part_seat'];
try {
  const said = (name, list) => list.some(m => String(m).toLowerCase().includes(name));
  const stamp = {
    spec: require('path').basename(specPath),
    passed: fails.length === 0,
    checks: ENGINE_CHECKS.map(n => ({
      name: n,
      passed: !said(n, fails),
      ...(said(n, warns) ? { warned: true } : {}),
    })),
    blocking: fails.slice(),
    measures: warns.slice(),
  };
  fs.mkdirSync(require('path').dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath.replace(/\.glb$/i, '') + '.checks.json',
                   JSON.stringify(stamp, null, 1));
} catch (e) { console.error('warn: could not write the checks stamp: ' + e.message); }

if (fails.length) {
  console.error('='.repeat(68));
  for (const f of fails) console.error('BLOCK: ' + f);
  console.error('='.repeat(68));
  console.error(`${fails.length} blocking issue(s) — build refused.`);
  process.exit(1);
}
const anims = compileAnims(spec, sk);
// UV atlas is opt-in ("keep_uv": true): without textures TEXCOORD_0 is dead
// weight in the shipped file, and AO now bakes into vertex colours instead
const uvInfo = spec.keep_uv ? require('./core/uv.js').applyUVs(meshes) : null;
// The L1-L8 stack takes AO and the vertex normals as INPUTS — its flesh and
// hardware shading each apply AO with their own amount and gamma — so AO is
// recorded here and applied by the stack, not multiplied in on the way past.
const STACK = require('./core/compile.js').useStack(spec);
const aoCfg = STACK && spec.ao !== false
  ? Object.assign({}, (typeof spec.ao === 'object' && spec.ao) || {}, { multiply: false })
  : spec.ao;
const aoInfo = require('./core/ao.js').bakeAO(meshes, aoCfg); // vertex AO → COLOR_0 (ao:false skips)
if (STACK) {
  const { drainInfo } = require('./core/compile.js');
  const shInfo = [];
  require('./core/shade.js').shadeStack(spec, meshes, shInfo);
  for (const line of shInfo) console.log('info: ' + line);
}
// public identity: harness stamp + convention bone names (internal names stay authoring-side)
let hv = '0.0.0';
for (const vp of ['..', '.']) {
  try { hv = fs.readFileSync(require('path').join(__dirname, vp, 'VERSION'), 'utf8').trim(); break; } catch {}
}
const specName = require('path').basename(specPath).replace(/\.json$/, '');
const asset = {
  generator: `anyCreature v${hv}`,
  extras: { harness: 'anyCreature', harness_version: hv, spec: specName },
};
// The GLB carries its own birth certificate: the PRISTINE authored spec (a
// second parse of the file — the in-memory spec has been mutated by joint
// resolution and mirror registration and would not recompile cleanly) plus a
// quick parts manifest. Any agent holding the GLB can extract, edit, and
// recompile — and graft parts between creatures. "embed_spec": false opts out.
if (spec.embed_spec !== false) {
  const pristine = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  asset.extras.source_spec = pristine;
  asset.extras.parts = [
    ...(pristine.volumes || []).map(v => ({ kind: 'volume', chain: v.chain, material: v.material })),
    ...(pristine.parts || []).map(p => ({ kind: 'part', type: p.type, name: p.name || null,
      material: p.material, host: p.host || (p.ribs ? 'ribs' : null), join: p.join || null })),
  ];
}
const names = require('./core/skeleton.js').exportNames(spec, sk);
// L8: the only layer that leaves COLOR_0 and goes into the file's NORMAL, so
// the user's own lighting reacts to it. Flesh only — see the note in glb.js.
const L8 = STACK
  ? (((spec.shading || {}).normals || {}).flesh ?? 0.90)
  : 0;
const bytes = writeGLB({ meshes, skeleton: sk, ibm: inverseBindMatrices(sk), anims }, outPath,
  { asset, names, boneNormals: L8 });
if (L8) {
  const moved = require('./core/glb.js').L8_MOVED;
  const tot = moved.reduce((a, r) => a + r[1], 0), all = moved.reduce((a, r) => a + r[2], 0);
  if (tot) console.log(`info: shade L8: shipped NORMAL softened toward the bone field on `
    + `${tot}/${all} flesh vertices at ${(L8 * 100) | 0}% (${moved.map(r => r[0]).join(', ')})`);
}
// Contract self-check on the bytes we just wrote (docs/OUTPUT_CONTRACT.md).
// ~1.4 ms, and it fires on EVERY build: a file that breaks the contract must
// never reach a delivery folder, a viewer, or a submission — and if one does,
// that is a harness bug we want to hear about at the moment it is created.
const { checkGLB } = require('./core/contract.js');
const conf = checkGLB(fs.readFileSync(outPath));
if (!conf.ok) {
  console.error('='.repeat(68));
  for (const e of conf.errors) console.error(`BLOCK: contract [${e.code}] ${e.msg}`);
  console.error('='.repeat(68));
  console.error('the written GLB would break the output contract, so it was NOT kept.');
  console.error('usually a name in your spec: material / chain / joint names must be plain');
  console.error('words — no angle brackets, control characters, or filesystem paths. If every');
  console.error('name in the spec looks fine, this is a harness bug: please report it.');
  try { fs.unlinkSync(outPath); } catch {}
  process.exit(1);
}

const tv = meshes.reduce((a, m) => a + m.V.length, 0);
const tf = meshes.reduce((a, m) => a + m.F.length, 0);
const allV = meshes.flatMap(m => m.V);
const dims = [0, 1, 2].map(k => +(Math.max(...allV.map(v => v[k])) - Math.min(...allV.map(v => v[k]))).toFixed(3));
console.log(JSON.stringify({ ok: true, out: outPath, bytes,
  dims: { width: dims[0], height: dims[1], length: dims[2] },
  verts: tv, faces: tf, joints: sk.joints.length,
  anims: anims.map(a => a.name), checks: 'all green',
  uv: uvInfo ? { islands: uvInfo.islands, atlasUtil: +uvInfo.atlasUtil.toFixed(2) } : 'off',
  ao: aoInfo.baked ? { meanOcc: +aoInfo.meanOcc.toFixed(3) } : 'off',
  contract: 'ok' }));
