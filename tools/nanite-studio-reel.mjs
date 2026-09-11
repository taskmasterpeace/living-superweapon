import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,appendFile} from 'node:fs/promises';

// Parent-owned native Studio action/audio capture. The separate UI acceptance
// harness owns control coverage; this one uses documented preview fixture APIs.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const out=process.env.LSW_NANITE_STUDIO_REEL_OUT||'artifacts/nanite-studio-reel';
const traceOnly=process.env.LSW_NANITE_RESOURCE_TRACE==='1';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],result={};
let phase='boot',persist=Promise.resolve();
const trace=(kind,data)=>{
 const row=JSON.stringify({time:new Date().toISOString(),phase,kind,...data})+'\n';
 persist=persist.then(()=>appendFile(`${out}/resource-events.jsonl`,row));
};
result.base=base;result.traceOnly=traceOnly;
page.setDefaultTimeout(60000);
page.on('pageerror',e=>{errors.push(e.message);trace('pageerror',{message:e.message});});
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());
 if(m.type()==='error'||m.type()==='warning')trace('console',{level:m.type(),message:m.text(),location:m.location()});});
page.on('response',r=>{if(r.status()>=400){errors.push(`HTTP ${r.status()} ${r.url()}`);
 trace('http-error',{status:r.status(),url:r.url(),type:r.request().resourceType()});}});
page.on('requestfailed',r=>trace('request-failed',{url:r.url(),type:r.resourceType(),failure:r.failure()}));
page.on('crash',()=>{errors.push('Chromium page crash');trace('crash',{});});
const cdp=await page.context().newCDPSession(page);
await cdp.send('Log.enable');await cdp.send('Network.enable');
cdp.on('Log.entryAdded',({entry})=>trace('cdp-log',{level:entry.level,source:entry.source,text:entry.text,url:entry.url,requestId:entry.networkRequestId}));
cdp.on('Network.requestWillBeSent',e=>trace('cdp-request',{requestId:e.requestId,url:e.request.url,type:e.type,
 initiator:{type:e.initiator.type,url:e.initiator.url,frames:e.initiator.stack?.callFrames?.slice(0,3)}}));
cdp.on('Network.responseReceived',e=>trace('cdp-response',{requestId:e.requestId,url:e.response.url,status:e.response.status,type:e.type}));
// Keep recording and diagnostic runs unfiltered: a missing resource must fail
// acceptance rather than being answered by the capture harness.
result.resourceInterceptions=[];
try{
 await page.goto(base+'/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 if(await page.evaluate(()=>STUDIO.preview.playing))await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const pack=await page.evaluate(async()=>{
  const {freshPicks,buildDef}=await import('/src/data/creator.js');
  const {profileFromDef}=await import('/src/tool/studio-profile.js');
  const {exportCharacter}=await import('/src/tool/character-package.js');
  const picks={...freshPicks(),name:'FERRO',cape:false,budget:'unbound',flightTier:3,
   slots:{lmb:'kibolt',rmb:'heatray',q:'nanite-cannon',e:'nanite-shield',f:null,r:null}};
  const def=buildDef(picks,'cx_nanite_studio_reel'),profile=profileFromDef(def);
  profile.model.body='superhero-male';profile.model.costume='fitted';
  return exportCharacter({picks,def},profile);
 });
 phase='import';await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 await page.getByLabel('Profile JSON',{exact:true}).fill(JSON.stringify(pack));
 await page.getByRole('button',{name:'Import profile',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.preview.fighter.def.isCustom&&!document.querySelector('dialog')?.open);
 phase='sound-enable';await page.getByRole('button',{name:'Sound off',exact:true}).click();
 await page.getByRole('button',{name:'Sound on',exact:true}).waitFor();
 result.failedSamples=await page.evaluate(()=>[...(STUDIO.preview.sound.backend._bank?.buf||[])].filter(([,value])=>value===null).map(([file])=>file));
 trace('sample-bank',{failed:result.failedSamples});phase='playback';
 await page.evaluate(traceOnly=>{
  const p=STUDIO.preview;p.playing=false;p.setLevel(10);p.setState('attack');
  if(!p.setCombat({slot:'q',secondarySlot:'e',pattern:'nanite',naniteSample:'shield',shooterMotion:'ground-left',motion:'orbit-left',targetSpeed:10,distance:32,elevation:0}))throw Error('Native nanite rehearsal configuration rejected');
  p.setView('orbit');p.setIsolated(false);p.setPlaybackRate(1);p.seek(0);
  // Short diagnostic uses the untouched native Studio RAF and no media stream.
  if(traceOnly){p.playing=true;return;}
  // Retire only the preview's automatic RAF while the exact public playback
  // method is driven below. This capture RAF supplies measured wall time; it
  // does not replace the native pose, damage or playback implementation.
  cancelAnimationFrame(p.raf);
  window.recordNaniteStudio=async capture=>{
   p.playing=false;p.seek(0);const a=p.sound.backend;
   if(!a.ctx||a.ctx.state!=='running')throw Error('Studio audio must be enabled by the real user-gesture control');
   const output=a.ctx.createMediaStreamDestination(),analyser=a.ctx.createAnalyser();
   a.master.connect(output);a.master.connect(analyser);const wave=new Float32Array(analyser.fftSize);
   const stream=p.renderer.domElement.captureStream(30);for(const track of output.stream.getAudioTracks())stream.addTrack(track);
   const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm';
   const recorder=capture?new MediaRecorder(stream,{mimeType:mime}):null,chunks=[];
   const done=recorder?new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer())));}):null;
   const gl=p.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const evidence={scope:'Actual native Studio eight-second looping rehearsal; API-configured moving shooter/target, not player gameplay or full UI acceptance.',
    renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),browser:navigator.userAgent,
    visibility:document.visibilityState,canvas:[p.renderer.domElement.width,p.renderer.domElement.height],pixelRatio:p.renderer.getPixelRatio(),
    rows:[],timing:[],droppedWallTime:0,audioPeak:0};
   let simulated=0,previous=performance.now(),begin=previous,frames=0,beforeWrap=null;
   try{
    if(recorder)recorder.start(100);p.playing=true;
    await new Promise((resolve,reject)=>{
     const tick=now=>{try{
      const elapsed=(now-previous)/1000;previous=now;const before=p.time,stats=p.combat.naniteStats(),start=performance.now();
      // Match the normal outer Studio RAF's native mixer maintenance exactly.
      p.sound.audio.listen(p.fighter.pos.x,p.fighter.pos.z,p.fighter.pos.y);p.sound.audio.sweep();
      p.advancePlayback(elapsed);const submissionMs=performance.now()-start,after=p.time;
      const wrapped=after<before;simulated+=wrapped?p.duration-before+after:after-before;frames++;
      evidence.droppedWallTime+=Math.max(0,elapsed-.05); // unchanged native playback cap
      if(submissionMs>8||elapsed>.05)evidence.timing.push({frame:frames,elapsed,submissionMs,before,after,programs:p.renderer.info.programs.length});
      analyser.getFloatTimeDomainData(wave);for(const sample of wave)evidence.audioPeak=Math.max(evidence.audioPeak,Math.abs(sample));
      if(frames%6===0||wrapped)evidence.rows.push({time:before,...stats});
      if(wrapped){beforeWrap={time:before,...stats};resolve();}else if(now-begin>45000)throw Error('Native rehearsal did not complete within45s');else requestAnimationFrame(tick);
     }catch(error){reject(error);}};requestAnimationFrame(tick);
    });
    p.playing=false;if(recorder)recorder.stop();const bytes=done?await done:undefined;
    return {...evidence,bytes,wallSeconds:(performance.now()-begin)/1000,simulationSeconds:simulated,renderFrames:frames,beforeWrap,
     audioState:a.ctx.state,liveAudioHandles:a._sus.size};
   }finally{
    p.playing=false;if(recorder&&recorder.state!=='inactive')recorder.stop();
    for(const track of stream.getTracks())track.stop();a.master.disconnect(output);a.master.disconnect(analyser);analyser.disconnect();
   }
  };
 },traceOnly);
 await page.screenshot({path:`${out}/native-studio-ready.png`});
 if(traceOnly){
  await page.waitForFunction(()=>STUDIO.preview.time>7&&STUDIO.preview.combat.naniteStats().launches>=2,null,{timeout:45000});
  result.nativeTrace=await page.evaluate(()=>{
   const p=STUDIO.preview,stats=p.combat.naniteStats();p.playing=false;
   return {time:p.time,...stats,failedSamples:[...(p.sound.backend._bank?.buf||[])].filter(([,value])=>value===null).map(([file])=>file),liveAudioHandles:p.sound.backend._sus.size};
  });
  await page.screenshot({path:`${out}/native-trace-end.png`});
 }else{
 result.warmup=await page.evaluate(()=>recordNaniteStudio(false));
 phase='recording';
 const capture=await page.evaluate(()=>recordNaniteStudio(true));
 const bytes=capture.bytes;delete capture.bytes;result.capture=capture;
 await writeFile(`${out}/native-nanite-studio.webm`,Buffer.from(bytes));
 assert.ok(capture.simulationSeconds>=8&&capture.simulationSeconds<8.1);
 assert.ok(capture.audioPeak>.001,'Captured mixer must contain actual native sound');
 assert.equal(capture.liveAudioHandles,0,'Pausing after the loop must retire sustained audio');
 assert.ok(capture.beforeWrap.contacts>0,'Actual incoming native contact is required');
 assert.ok(capture.beforeWrap.launches>=2,'Fresh paid cannon launches must exist before and after repair');
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({base,traceOnly,output:out,errors,failedSamples:result.failedSamples,
  nativeTime:result.nativeTrace?.time,
  capture:result.capture&&{wallSeconds:result.capture.wallSeconds,simulationSeconds:result.capture.simulationSeconds,
   audioPeak:result.capture.audioPeak,launches:result.capture.beforeWrap.launches,
   contacts:result.capture.beforeWrap.contacts,liveAudioHandles:result.capture.liveAudioHandles}}));
}catch(error){result.failure=error.message;trace('failure',{message:error.message});await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await browser.close();await persist;await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));}
