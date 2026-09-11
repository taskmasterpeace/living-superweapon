import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotNewsClip} from '../src/engine/news-archive-adapter.js';
import {persistNewsClip} from '../src/engine/news-archive-adapter.js';
import {createNewsArchive} from '../src/core/news-archive.js';
import {NewsFrameEncoder,revokeFrames} from '../src/engine/news-capture.js';
import {archiveFieldFootage} from '../src/engine/field-footage.js';

test('archive snapshot owns fetched blobs when live URLs are revoked and blanked',async()=>{
 const source=new Blob(['owned-frame'],{type:'image/png'}),url=URL.createObjectURL(source);
 const clip={id:'clip-a',matchId:'match-a',createdAt:1,title:'Impact',tag:'ko',heroIds:['sol'],fps:12,
  priority:3,width:1,height:1,slow:true,slowFrom:2,slowTo:4,frames:[url]};
 const pending=snapshotNewsClip(clip);
 URL.revokeObjectURL(url);clip.frames[0]=null;
 const copy=await pending;
 assert.notEqual(copy.frames[0],source);
 assert.equal(await copy.frames[0].text(),'owned-frame');
 assert.deepEqual(copy.heroIds,['sol']);
});

test('archive snapshot rejects unresolved frame handles instead of persisting corruption',async()=>{
 await assert.rejects(()=>snapshotNewsClip({id:'x',frames:['#enc1']}),/frame 0/i);
});

test('encoder transfers a pending Blob to archive ownership through actual field reel replacement',async()=>{
 let finish;const frames=[],encoder=new NewsFrameEncoder({makeCanvas:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),convertToBlob:()=>new Promise(resolve=>{finish=resolve;})})});
 encoder.capture({width:1,height:1},frames);const ownership=encoder.ownFrames(frames);
 archiveFieldFootage({_fieldClips:[{frames}],news:{takeClips:()=>[{frames:[]}]}});
 assert.equal(frames[0],null,'actual field-footage replacement revoked the live token');
 finish(new Blob(['encoder-owned'],{type:'image/webp'}));
 const blobs=await ownership;assert.equal(await blobs[0].text(),'encoder-owned');
});

test('encoder archive ownership survives onReady trimming the newly resolved live URL',async()=>{
 let finish;const frames=[],encoder=new NewsFrameEncoder({onReady:()=>revokeFrames(frames),makeCanvas:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),convertToBlob:()=>new Promise(resolve=>{finish=resolve;})})});
 encoder.capture({width:1,height:1},frames);const ownership=encoder.ownFrames(frames);
 finish(new Blob(['trim-owned'],{type:'image/webp'}));
 const blobs=await ownership;assert.equal(frames[0],null);assert.equal(await blobs[0].text(),'trim-owned');
});

test('a synchronous IndexedDB open failure is not cached across calls',async()=>{
 let attempts=0;const archive=createNewsArchive({indexedDB:{open(){attempts++;throw Error('open exploded');}},dbName:'sync-open-failure'});
 await assert.rejects(()=>archive.list(),/open exploded/);
 await assert.rejects(()=>archive.list(),/open exploded/);
 assert.equal(attempts,2,'the second call retries IndexedDB.open');
});

test('persist observes a rejected ownership claim while encoder flush is pending',async()=>{
 let finish;const encoder={ownFrames:()=>Promise.reject(Error('null encoded frame')),flush:()=>new Promise(resolve=>{finish=resolve;})};
 const saving=persistNewsClip({frames:[null]},encoder);
 await new Promise(resolve=>setImmediate(resolve));
 finish();
 await assert.rejects(saving,/null encoded frame/);
});
