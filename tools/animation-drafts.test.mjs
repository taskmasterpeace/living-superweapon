import test from 'node:test';import assert from 'node:assert/strict';
import {markerDraft,validateMarkerDraft,clipWithMarkers,readMarkerDrafts,saveMarkerDraft,revertMarkerDraft} from '../src/tool/animation-drafts.js';
import {resolveAnimationClip} from '../src/data/animation-catalog.js';
test('marker drafts preserve source and survive save/revert without affecting other clips',()=>{
 let value=null;const store={getItem:()=>value,setItem:(k,v)=>value=v};
 const source=resolveAnimationClip('strike/jab'),original=source.contactStart,d=markerDraft('strike/jab',.1,.4);
 assert.equal(clipWithMarkers(d).contactStart,.1);assert.equal(source.contactStart,original);
 assert.equal(clipWithMarkers(d).frames,source.frames);
 saveMarkerDraft(store,d);saveMarkerDraft(store,markerDraft('strike/cross',.2,.5));
 assert.equal(readMarkerDrafts(store)['strike/jab'].contactEnd,.4);
 revertMarkerDraft(store,'strike/jab');assert.equal(readMarkerDrafts(store)['strike/jab'],undefined);assert.ok(readMarkerDrafts(store)['strike/cross']);
});
test('bad, stale and non-strike drafts are rejected before persistence',()=>{
 for(const [a,b] of [[.4,.1],[-1,.2],[0,99],[NaN,.2],[.2,.2]])assert.throws(()=>markerDraft('strike/jab',a,b));
 assert.throws(()=>markerDraft('jump/fall',0,.3));
 const d=markerDraft('strike/jab',.1,.3);assert.throws(()=>validateMarkerDraft({...d,take:'changed'}),/Source/);
 assert.throws(()=>readMarkerDrafts({getItem:()=>'{broken'}));
});
