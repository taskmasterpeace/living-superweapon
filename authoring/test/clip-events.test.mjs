import test from 'node:test';
import assert from 'node:assert/strict';
import {ClipEventTracker} from '../lib/clip-events.js';

const clip={duration:1.2,loop:false,events:[{t:0,type:'contact'},{t:.31,type:'mag-out'},{t:.9,type:'mag-in'},{t:1.2,type:'recovery'}]};
const loopClip={duration:4/3,loop:true,events:[{t:.05,type:'footstep',side:'L'},{t:.72,type:'footstep',side:'R'}]};
const run=(c,hz,seconds)=>{const tr=new ClipEventTracker(c);const fired=[];for(let i=0;i<Math.round(seconds*hz);i++)fired.push(...tr.advance(1/hz));return fired;};
const names=list=>list.map(e=>`${e.type}${e.side||''}@${e.cycle}`);

test('a one-shot clip fires every event exactly once at 30, 60 and 120 Hz, including t=0 and t=duration',()=>{
 for(const hz of [30,60,120]){
  const fired=names(run(clip,hz,2));
  assert.deepEqual(fired,['contact@0','mag-out@0','mag-in@0','recovery@0'],`${hz} Hz`);
 }
});
test('a looping clip fires each footstep once per cycle at every rate, with no duplicate at the wrap',()=>{
 for(const hz of [30,60,120]){
  const fired=run(loopClip,hz,4);
  const cycles=Math.floor(4/loopClip.duration);
  const perCycle=new Map();for(const e of fired)perCycle.set(e.cycle,(perCycle.get(e.cycle)||0)+1);
  for(let c=0;c<cycles;c++)assert.equal(perCycle.get(c),2,`${hz} Hz cycle ${c}`);
  assert.equal(fired.filter(e=>e.side==='L').length,fired.filter(e=>e.side==='R').length);
 }
});
test('a large step that crosses the loop seam still fires both sides of the seam once',()=>{
 const tr=new ClipEventTracker(loopClip);
 tr.advance(.7);                     // L fired
 const crossed=tr.advance(.75);      // crosses R@.72, wraps, crosses L@.05 in cycle 1
 assert.deepEqual(names(crossed),['footstepR@0','footstepL@1']);
});
test('interruption stops events; reset replays them; a form replacement transfers state without refiring',()=>{
 const tr=new ClipEventTracker(clip);
 assert.deepEqual(names(tr.advance(.4)),['contact@0','mag-out@0']);
 tr.interrupt();assert.deepEqual(tr.advance(1),[]);
 tr.reset();assert.deepEqual(names(tr.advance(2)),['contact@0','mag-out@0','mag-in@0','recovery@0']);
 const first=new ClipEventTracker(clip);first.advance(.5);
 const replacement=first.transferTo(new ClipEventTracker(clip));
 assert.deepEqual(names(replacement.advance(1)),['mag-in@0','recovery@0'],'the replaced form must not refire mag-out');
});
