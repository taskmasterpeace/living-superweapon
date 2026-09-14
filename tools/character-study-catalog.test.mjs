import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {characterStudyCatalog} from '../src/engine/character-study-catalog.js';
import {ACTION_DRAFTS} from '../src/engine/character-action-drafts.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
test('shared catalog exports every study as a playable candidate with an editor link',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const rows=characterStudyCatalog(g.scene);assert.equal(rows.length,Object.keys(ACTION_DRAFTS).length);
 for(const {entry,clip}of rows){assert.ok(clip.validate(),entry.label);assert.equal(clip.name,entry.take);assert.equal(clip.userData.status,'candidate');assert.deepEqual(clip.userData.markers,entry.markers);assert.equal(new URL(entry.editorUrl,'http://localhost').searchParams.get('study'),entry.label);}
});
