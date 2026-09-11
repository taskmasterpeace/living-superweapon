import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrateClipFrames,retireOpeningClips} from '../src/engine/broadcast-frames.js';
test('pending encoder frame becomes playable without reopening the report',()=>{
 const clip={frames:['#enc1',null,'blob:ready']},make=()=>({src:'',complete:false,naturalWidth:0});
 hydrateClipFrames(clip,make);assert.equal(clip._imgs[0].src,'');assert.equal(clip._imgs[2].src,'blob:ready');
 clip.frames[0]='blob:late';hydrateClipFrames(clip,make);assert.equal(clip._imgs[0].src,'blob:late');
 clip.frames.push('blob:closing');hydrateClipFrames(clip,make);assert.equal(clip._imgs[3].src,'blob:closing');
});
test('revoked and retired frame references are not retained by the player',()=>{
 const clip={frames:['blob:a']},make=()=>({src:''});hydrateClipFrames(clip,make);
 clip.frames[0]=null;hydrateClipFrames(clip,make);assert.equal(clip._imgs[0].src,'');
 clip._dead=true;hydrateClipFrames(clip,make);assert.deepEqual(clip._imgs,[]);
});
test('unused opening footage is revoked instead of leaking across arena rematches',async()=>{
 const url=URL.createObjectURL(new Blob(['frame'])),clip={frames:[url,'#enc1']},g={_openingClips:[clip]};
 assert.equal((await fetch(url)).ok,true);retireOpeningClips(g);assert.equal(g._openingClips,null);assert.equal(clip._dead,true);assert.deepEqual(clip.frames,[null,null]);
 await assert.rejects(fetch(url));retireOpeningClips(g);
});
