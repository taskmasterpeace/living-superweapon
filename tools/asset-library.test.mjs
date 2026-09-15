import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const all=read('public/asset-library/catalog.json').models,fleet=read('public/reference-fleet/catalog.json').models,characters=read('public/character-assets/catalog.json').models,source=read('tools/fixtures/fleet-catalog-source.json').models;
test('every original authored model is restored without adding character constructs to fleet',()=>{
 assert.equal(new Set(all.map(m=>m.id)).size,all.length);
 for(const row of source)assert.ok(all.some(m=>m.id===row.id),row.id);
 assert.ok(fleet.every(m=>m.collection==='fleet'&&!m.id.startsWith('nanite-')));
 for(const id of ['nanite-hound','nanite-rat','nanite-mech','nanite-cloud'])assert.ok(characters.some(m=>m.id===id));
 for(const id of ['missile-cell','nuclear-bomb','nuclear-missile','missile-small','missile-large']){const m=all.find(m=>m.id===id);assert.equal(m.collection,'equipment');assert.equal(m.group,'Ordnance');}
});
test('every listed model resolves to a real GLB with a valid header and exact declared byte length',()=>{
 const root=path.resolve('public');
 for(const m of all){const file=path.resolve(root,m.url.replace(/^\.\//,''));assert.ok(file.startsWith(root+path.sep));const fd=fs.openSync(file,'r'),header=Buffer.alloc(12);try{fs.readSync(fd,header,0,12,0);}finally{fs.closeSync(fd);}assert.equal(header.toString('ascii',0,4),'glTF',m.id);assert.equal(header.readUInt32LE(4),2,m.id);assert.equal(header.readUInt32LE(8),fs.statSync(file).size,m.id);}
});
test('the existing five integrated vehicles retain their model URLs and runtime identity',()=>{
 for(const [id,version]of [['motorcycle',6],['tank',7],['mech-light',6],['helicopter',8],['jet-a',15]]){const m=fleet.find(m=>m.id===id);assert.ok(m);assert.equal(m.runtime,'integrated-controller');assert.equal(m.url,`./authored-assets/prop.reference-${id}/v${version}/model.glb`);assert.ok(fs.existsSync('public/'+m.url.replace(/^\.\//,'')));}
});
