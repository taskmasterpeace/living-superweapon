import test from 'node:test';
import assert from 'node:assert/strict';
import {StudioAudio} from '../src/tool/studio-audio.js';
import * as THREE from 'three';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(){
 const calls=[],routes=[];
 const backend={ok:false,ctx:null,_sus:new Set(),init(){this.ok=true;this.ctx={state:'running',currentTime:0,resume:async()=>{},close:async()=>{this.ctx.state='closed';},createGain:()=>({gain:{value:1},connect(){},disconnect(){routes.push('disconnect');}})};this.master={};this.bus={sfx:this.ctx.createGain()};},
 impact(...args){calls.push(['impact',...args]);},listen(...args){calls.push(['listen',...args]);},sweep(){},
 charge(){calls.push(['charge']);const h={set(...args){calls.push(['set',...args]);},stop(){calls.push(['stop']);backend._sus.delete(h);}};backend._sus.add(h);return h;}};
 return {a:new StudioAudio({backend,prepare:async()=>{}}),backend,calls,routes};
}
test('audio is opt-in, live-playback only; seeking cannot emit historical cues',async()=>{
 const {a,calls}=fixture();a.setPlaying(true);a.audio.impact(1);assert.equal(calls.length,0);
 assert.equal(await a.enable(),true);a.audio.impact(2);assert.deepEqual(calls,[['impact',2]]);
 a.setScrubbing(true);a.audio.impact(3);a.audio.charge().set(.5);assert.equal(calls.length,1);
 a.setScrubbing(false);assert.equal(calls.length,1,'Do not replay previous one-shots on resume');
 a.setPlaying(false);a.audio.impact(4);assert.equal(calls.length,1);
 await a.dispose();
});
test('reload library cues obey Studio live-only playback and stop on pause',async()=>{
 const {a,backend}=fixture(),events=[];let stopped=0;backend.soundLibrary={play:(id)=>events.push(id),stop:()=>stopped++};
 a.setPlaying(true);a.audio.soundLibrary?.play('reload');assert.deepEqual(events,[]);
 await a.enable();a.audio.soundLibrary?.play('reload-eject');assert.deepEqual(events,['reload-eject']);
 a.setScrubbing(true);a.audio.soundLibrary.play('reload-insert');assert.deepEqual(events,['reload-eject']);assert.ok(stopped>0);await a.dispose();
});
test('held ability resumes its live voice after pause, never leaves an orphan loop',async()=>{
 const {a,backend,calls,routes}=fixture();await a.enable();a.setPlaying(true);
 const h=a.audio.charge();h.set(.3);assert.equal(backend._sus.size,1);
 a.setPlaying(false);assert.equal(backend._sus.size,0);assert.ok(routes.length,'Disconnect old one-shot buses as well');
 h.set(.6);assert.equal(backend._sus.size,0);
 a.setPlaying(true);h.set(.8);assert.equal(backend._sus.size,1);assert.equal(calls.filter(x=>x[0]==='charge').length,2);
 h.stop();h.stop();assert.equal(backend._sus.size,0);assert.equal(a.handles.size,0);
 await a.dispose();await a.dispose();assert.equal(backend.ctx.state,'closed');
});
test('a loop begun during silent reconstruction becomes audible only on its next live update',async()=>{
 const {a,backend,calls}=fixture();await a.enable();a.setPlaying(true);a.setScrubbing(true);
 const h=a.audio.charge();h.set(.7);assert.equal(calls.length,0);
 a.setScrubbing(false);assert.equal(calls.length,0);h.ramp(.8);assert.equal(backend._sus.size,1);
 a.disable();assert.equal(backend._sus.size,0);h.ramp(1);assert.equal(backend._sus.size,0);
 await a.dispose();
});
test('audio initialization failure leaves authoring usable and silent',async()=>{
 const a=new StudioAudio({backend:{init(){throw Error('unavailable');}},prepare:async()=>{}});
 assert.equal(await a.enable(),false);assert.equal(a.enabled,false);a.setPlaying(true);a.audio.impact(1);await a.dispose();
});
test('disposal during async enable never resurrects audio',async()=>{
 const {a}=fixture();let release;a.prepare=()=>new Promise(r=>release=r);
 const pending=a.enable();await Promise.resolve();await a.dispose();release();
 assert.equal(await pending,false);assert.equal(a.active,false);
});
for(const [ki,kind,frequencies] of [[0,'denied',[120]],[9,'drained',[140,90]]])test(`native Studio ${kind} gets production warning audio`,async()=>{
 const {a,backend,calls}=fixture();backend.zap=f=>calls.push(['zap',f]);await a.enable();a.setPlaying(true);
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world,a.audio),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 try{
  stage.reset(f,true,'beam');f.ki=ki;
  for(let i=1;i<=120;i++)stage.step(i/60,1/60);
  assert.ok(stage[kind]);assert.deepEqual(calls.filter(x=>x[0]==='zap').flatMap(x=>x.slice(1)),frequencies);
 }finally{stage.dispose();f.dispose();await a.dispose();}
});
