import {writeFile} from 'node:fs/promises';
import {bakeHeroBody, loadHeroBodySource} from './lib/hero-body-source.mjs';

const output = new URL('../src/data/hero-body-bank.json', import.meta.url);
const kinds = ['superhero-male', 'superhero-female'];
const bodies = {};

for (const kind of kinds) {
  bodies[kind] = bakeHeroBody(await loadHeroBodySource(kind));
}

await writeFile(output, `${JSON.stringify({version: 1, bodies})}\n`);
console.log(`Wrote ${output.pathname}`);
for (const [kind, body] of Object.entries(bodies)) {
  const vertices = body.meshes.reduce((sum, mesh) => sum + mesh.position.length / 3, 0);
  const triangles = body.meshes.reduce((sum, mesh) => sum + mesh.index.length / 3, 0);
  console.log(`${kind}: ${vertices} vertices, ${triangles} triangles, ${body.joints.length} joints`);
}
