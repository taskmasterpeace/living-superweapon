import test from 'node:test';import assert from 'node:assert/strict';
import {createCanvasClipRecorder} from '../src/engine/canvas-clip-recorder.js';
test('canvas capture exports video and metadata, releases tracks, and cancels discarded takes',()=>{
 let stopped=0,fps=0;const outputs=[];
 class Recorder{
  static isTypeSupported(t){return t==='video/webm';}
  constructor(stream,opts){this.state='inactive';this.mimeType=opts.mimeType;}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable({data:new Blob(['frame'])});this.onstop();}
 }
 const c=createCanvasClipRecorder({captureStream:n=>{fps=n;return {getTracks:()=>[{stop:()=>stopped++}]};}},{Recorder,onComplete:(...args)=>outputs.push(args)});
 const metadata={camera:'throw',actors:['sol','kano']};c.start(metadata);metadata.camera='other';assert.equal(c.active,true);assert.equal(fps,30);
 c.stop();assert.equal(c.active,false);assert.equal(stopped,1);assert.equal(outputs[0][0].type,'video/webm');assert.equal(outputs[0][1].camera,'throw');
 c.start({});c.stop(false);assert.equal(stopped,2);assert.equal(outputs.length,1);
});

test('closing during asynchronous finalization cancels the take without releasing its recorder early',()=>{
 let instance,stopped=0,exports=0;
 class Recorder{
  static isTypeSupported(){return true;}
  constructor(){instance=this;this.state='inactive';this.mimeType='video/webm';}
  start(){this.state='recording';}
  stop(){this.state='inactive';}
 }
 const c=createCanvasClipRecorder({captureStream:()=>({getTracks:()=>[{stop:()=>stopped++}]})},{Recorder,onComplete:()=>exports++});
 c.start({});c.stop();c.stop(false);
 instance.ondataavailable({data:new Blob(['frame'])});instance.onstop();
 assert.equal(stopped,1);assert.equal(exports,0);
});
