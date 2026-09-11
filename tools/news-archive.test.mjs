import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotNewsClip} from '../src/engine/news-archive-adapter.js';

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
