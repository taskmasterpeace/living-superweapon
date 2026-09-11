// reproduce-lab.mjs — prove the committed package is byte-identical to a fresh rebuild.
//
//   node tools/building-delivery/reproduce-lab.mjs
//
// Regenerates every output in memory from the recipe + committed generator sources and compares
// each file's sha256 to the committed bytes on disk. This is the reproducibility contract: a clean
// checkout with Node alone (no external assets, no credentials, no paid generation) rebuilds the
// exact bytes. Exit 0 = REPRODUCIBLE.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { generatePackage, DEFAULT_OUT } from './build-lab.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const { files } = generatePackage();
let diff = 0, missing = 0;
console.log(`\n  reproduce-lab — comparing fresh build to committed ${DEFAULT_OUT}\n`);
for (const f of files) {
  const p = join(DEFAULT_OUT, f.name);
  if (!existsSync(p)) { console.log(`  MISSING  ${f.name}`); missing++; continue; }
  const on = sha(readFileSync(p)), gen = sha(f.buffer);
  const same = on === gen;
  if (!same) diff++;
  console.log(`  ${same ? 'SAME' : 'DIFF'}  ${gen.slice(0, 12)} ${same ? '==' : 'vs'} ${on.slice(0, 12)}  ${f.name}`);
}
const bad = diff + missing;
console.log(`\n  ${bad ? `NOT REPRODUCIBLE — ${diff} differ, ${missing} missing` : `REPRODUCIBLE: ${files.length} files rebuilt byte-identical`}\n`);
process.exit(bad ? 1 : 0);
