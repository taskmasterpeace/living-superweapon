import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file='assets-src/frontline-clone-kit/validation.json';
test('clearance and packaging evidence belongs to the current source kit',async()=>{
 const root='assets-src/frontline-clone-kit/',r=JSON.parse(await readFile(file)),p=JSON.parse(await readFile(root+'package-validation.json'));
 const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
 assert.equal(r.meshSha256,await hash(root+'clone-kit-meshes.json'));assert.equal(r.rawGlbSha256,await hash(root+'clone-kit.raw.glb'));assert.equal(p.sha256,await hash(root+'clone-kit.glb'));
});
test('original clone kit has bounded, named head/torso attachment meshes',async()=>{
 const r=JSON.parse(await readFile(file));assert.equal(r.runtimeAdopted,false);assert.equal(r.materials,3);assert.ok(r.triangles>1000&&r.triangles<=6000);assert.ok(r.draws<=6);
 assert.deepEqual(r.attachments,['clone_helmet_head','clone_vest_torso']);assert.ok(r.closedPieces);assert.equal(r.nonFinite,0);assert.equal(r.degenerate,0);assert.ok(r.vestMaxY<1.95,'shoulder webbing must not climb to the head to evade collision');
});
test('actual current source-body rifle phases retain attachment clearance',async()=>{
 const r=JSON.parse(await readFile(file));assert.equal(r.poses.length,25);
 for(const p of r.poses){assert.ok(p.supportGap<.045);assert.equal(p.rifleIntersections,0,`${p.mode}/${p.phase} rifle`);assert.equal(p.forearmIntersections,0,`${p.mode}/${p.phase} forearms`);assert.equal(p.bodyIntersections,0,`${p.mode}/${p.phase} body`);}
 assert.ok(r.helmetEarClearance>.04);assert.ok(r.helmetNeckClearance>.04);
});
