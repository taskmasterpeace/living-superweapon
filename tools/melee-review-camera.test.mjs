import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicReviewShot} from '../src/engine/melee-review-camera.js';
test('contact edits are deterministic when scrubbing and rapid hits do not flicker',()=>{
 const events=[{time:1,kind:'phase'},{time:1.1,kind:'contact'},{time:1.15,kind:'contact'},{time:1.7,kind:'contact'}];
 assert.equal(cinematicReviewShot(events,1).index,0);
 assert.equal(cinematicReviewShot(events,1.2).index,1);
 assert.equal(cinematicReviewShot(events,2).index,2);
 assert.equal(cinematicReviewShot(events,1.2).index,1);
 assert.equal(cinematicReviewShot(events,2,1.5).index,1);
});
test('every edit keeps the same side of the fight and leaves events unchanged',()=>{
 const events=Array.from({length:10},(_,i)=>({time:i,kind:'contact'})),before=JSON.stringify(events);
 for(let time=0;time<10;time++)assert.ok(cinematicReviewShot(events,time).offset[0]>0);
 assert.equal(JSON.stringify(events),before);
});
