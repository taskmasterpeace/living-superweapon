// Browser component test: real canvas snapshots, real worker, decoded frame colors.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/__encoder-test__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Encoder component test</title>'}));
 await page.goto('http://127.0.0.1:5180/__encoder-test__');
 const result=await page.evaluate(async()=>{
  const {NewsFrameEncoder,revokeFrames,newsFrameBytes}=await import('/src/engine/news-capture.js');
  let mainEncodes=0;OffscreenCanvas.prototype.convertToBlob=function(){mainEncodes++;throw Error('Encoding must not run on the game thread');};
  const encoder=new NewsFrameEncoder(),source=document.createElement('canvas');source.width=64;source.height=32;
  const ctx=source.getContext('2d'),frames=[],accepted=[];
  for(const color of ['#ff0000','#00ff00','#0000ff']){ctx.fillStyle=color;ctx.fillRect(0,0,64,32);accepted.push(encoder.capture(source,frames));}
  const fourth=encoder.capture(source,frames),queued=encoder.pending.size;
  // The source changes immediately after capture; every saved frame owns its prior pixels.
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,64,32);await encoder.flush();
  const pixels=[];for(const url of frames){if(!url){pixels.push(null);continue;}const blob=await(await fetch(url)).blob(),image=await createImageBitmap(blob);ctx.drawImage(image,0,0);image.close();pixels.push([...ctx.getImageData(20,15,1,1).data]);}
  const bytes=newsFrameBytes(frames);revokeFrames(frames);
  const retired=[];encoder.capture(source,retired);revokeFrames(retired);await encoder.flush();
  return {accepted,fourth,queued,pixels,bytes,retired,pending:encoder.pending.size,mainEncodes};
 });
 assert.equal(result.mainEncodes,0,'OffscreenCanvas encoding must execute in the worker realm');
 assert.deepEqual(result.accepted,[true,true,true]);assert.equal(result.fourth,false);assert.equal(result.queued,3);
 for(let i=0;i<3;i++){const pixel=result.pixels[i];assert.ok(pixel&&pixel[i]>230&&pixel[(i+1)%3]<20&&pixel[(i+2)%3]<20,`Frame ${i} lost its captured color: ${pixel}`);}
 assert.ok(result.bytes>0);assert.equal(result.pending,0);assert.deepEqual(result.retired,[null]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify(result,null,2));
 const failed=await browser.newPage();
 await failed.route('**/__encoder-test__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Worker failure fallback</title>'}));
 await failed.route('**/news-encode.worker.js*',route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("Intentional worker startup failure");'}));
 await failed.goto('http://127.0.0.1:5180/__encoder-test__');
 const recovery=await failed.evaluate(async()=>{
  const {NewsFrameEncoder,revokeFrames}=await import('/src/engine/news-capture.js'),encoder=new NewsFrameEncoder(),canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
  canvas.getContext('2d').fillRect(0,0,32,32);const abandoned=[];encoder.capture(canvas,abandoned);await encoder.flush();
  const frames=[];encoder.capture(canvas,frames);await encoder.flush();const restored=!!frames[0]?.startsWith('blob:');revokeFrames(frames);
  return {abandoned,restored,pending:encoder.pending.size,worker:!!encoder.worker};
 });
 assert.deepEqual(recovery,{abandoned:[null],restored:true,pending:0,worker:false});console.log('Worker failure fallback passed');
}finally{await browser.close();}
