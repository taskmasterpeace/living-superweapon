import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechPolicy,speechView} from '../src/engine/speech-policy.js';
const speaker=()=>({alive:true,pos:{x:20,y:0,z:0},obj:{visible:true},_vis:1});
test('near talk, wider yell, hidden enemy and behind-camera admission',()=>{
 const p=speaker(),s=speaker(),g={running:true,player:p,isFoe:()=>true,canSee:()=>true},point={x:200,y:200};p.pos.x=0;
 assert.equal(speechView(g,s,'talk',{},point,800,600).mode,'balloon');
 s.pos.x=120;assert.equal(speechView(g,s,'talk',{},point,800,600),null);assert.ok(speechView(g,s,'yell',{},point,800,600));
 s._vis=0;assert.equal(speechView(g,s,'yell',{tone:'radio'},point,800,600),null);
 s._vis=1;s.pos.x=20;g.canSee=()=>false;assert.equal(speechView(g,s,'talk',{},point,800,600),null);
 g.canSee=()=>true;assert.equal(speechView(g,s,'talk',{}, {...point,behind:true},800,600),null);
 g.isFoe=()=>false;assert.equal(speechView(g,s,'robot',{tone:'radio'}, {...point,behind:true},800,600).direction,'BEHIND');
});
test('one concurrent line, warnings preempt chatter, repeats and stale events drop',()=>{
 const q=new SpeechPolicy(),a={},b={};
 assert.ok(q.admit(a,'Ready','talk',{},0,3));
 assert.equal(q.admit(b,'Hello','talk',{},1,3),false);
 assert.ok(q.admit(b,'Incoming','yell',{category:'warning'},1,3));
 assert.equal(q.admit(b,'Incoming','yell',{category:'warning'},8,3),false);
 assert.equal(q.admit(a,'Old','talk',{at:0},8,3),false);
 assert.ok(q.admit(a,'Ready','talk',{},20,3));q.clear();assert.ok(q.admit(a,'Ready','talk',{},21,3));
});
