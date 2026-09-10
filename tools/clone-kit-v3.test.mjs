import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='assets-src/frontline-clone-kit/v3/';
test('v3 geometry, packaging and final source previews refer to the same candidate',async()=>{
 const hash=async path=>createHash('sha256').update(await readFile(root+path)).digest('hex');
 const validation=JSON.parse(await readFile(root+'validation.json')),pack=JSON.parse(await readFile(root+'package-validation.json')),preview=JSON.parse(await readFile(root+'source-preview-validation.json'));
 assert.equal(validation.meshSha256,await hash('clone-kit-meshes.json'));assert.equal(validation.rawGlbSha256,await hash('clone-kit.raw.glb'));assert.equal(pack.sha256,await hash('clone-kit.glb'));
 assert.equal(preview.meshSha256,validation.meshSha256);assert.equal(preview.assetSha256,pack.sha256);assert.equal(preview.images.length,3);
 for(const image of preview.images)assert.equal(image.sha256,await hash(image.file));
});
test('v3 source candidate clears actual extended live aim and reaction poses',async()=>{
 const rows=JSON.parse(await readFile(root+'extended-triangle-audit.json'));
 const live=rows.filter(p=>!p.name.startsWith('ragdoll'));
 assert.equal(live.length,9);
 for(const p of live)for(const part of ['body','forearm','rifle'])assert.equal(p[part],0,`${p.name}: ${part}`);
});
test('v3 actual loader/hulls/disposal and settled seeded KO retain clear support',async()=>{
 const report=JSON.parse(await readFile(root+'integration-review/integration.json'));
 const rows=JSON.parse(await readFile(root+'integration-review/triangle-audit.json'));
 const hash=createHash('sha256').update(await readFile(root+'clone-kit.glb')).digest('hex');
 assert.equal(report.assetSha256,hash);assert.equal(report.candidate,true);assert.equal(report.lifecycle.resources,9);assert.equal(report.lifecycle.disposed,9);assert.ok(report.lifecycle.perFighterResources);
 assert.ok(report.maxHullSupportError<1e-5);assert.ok(report.support.every(r=>r.hullVertices>4&&r.hullVertices<500));
 for(const name of ['ragdoll-59','ragdoll-119','ragdoll-239']){
  assert.ok(report.poses.find(p=>p.name===name).kitFloorMin>=0,'Actual gear remains above native floor');
  const row=rows.find(p=>p.name===name);for(const part of ['body','forearm','rifle'])assert.equal(row[part],0,`${name}: ${part}`);
 }
 for(const row of rows.filter(r=>!r.name.startsWith('ragdoll')))for(const part of ['body','forearm','rifle'])assert.equal(row[part],0,`${row.name}: ${part}`);
});
test('v3 remains bounded and clears the original 25-pose source gate',async()=>{
 const r=JSON.parse(await readFile(root+'validation.json'));
 assert.equal(r.poses.length,25);assert.equal(r.nonFinite,0);assert.equal(r.degenerate,0);assert.ok(r.closedPieces);
 assert.ok(r.triangles<=6000&&r.draws<=6);assert.ok(r.vestMaxY<1.95,'No shoulder strap climbing to the head');
 for(const p of r.poses)for(const part of ['body','forearm','rifle'])assert.equal(p[part+'Intersections'],0,`${p.mode}/${p.phase}: ${part}`);
});
