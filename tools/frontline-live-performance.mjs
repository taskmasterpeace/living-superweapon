// Diagnostic only. Real foreground window; no simulation/camera/AI changes.
// Exclusive GPU and stable sources required. Explicitly records visibility.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/frontline-live-performance';await mkdir(out,{recursive:true});
const result={errors:[],samples:[],headed:true};
const tracePrograms=process.argv.includes('--trace-programs');
const airSequence=process.argv.includes('--air-sequence');
const guarded=process.argv.includes('--guarded-takeoff');
const profiling=!process.argv.includes('--no-profile');
const practice=process.argv.includes('--practice'),record=process.argv.includes('--record');
const browser=await chromium.launch({channel:'chromium',headless:false});
let page;
try{
 const context=await browser.newContext({viewport:{width:1600,height:900},...(record?{recordVideo:{dir:out+'/video',size:{width:1600,height:900}}}:{})});
 page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
 await page.addInitScript(()=>{
  localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',cameraPreset:'frontline',ai:1.25}));
  const d=window.__livePerf={frames:[],longTasks:[],sections:{},phase:'boot'};let last=0;
  new PerformanceObserver(list=>{for(const e of list.getEntries())d.longTasks.push({start:e.startTime,duration:e.duration,phase:d.phase});}).observe({type:'longtask',buffered:true});
  function sample(now){if(last)d.frames.push({at:now,dt:now-last,phase:d.phase,hidden:document.hidden,focused:document.hasFocus()});last=now;requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 await page.goto('http://127.0.0.1:5180/powerworld.html');
 await page.locator(`#pwEncounter [data-encounter="${practice?'practice':'frontline'}"]`).click();await page.locator('#pwGo').click();
 result.scene=practice?'practice (no hostile-workload claim)':'four-clone recovery';result.recorded=record;
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.bringToFront();
 const cdp=profiling?await context.newCDPSession(page):null;if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
 await page.evaluate(({tracePrograms,profiling})=>{
  const d=window.__livePerf,g=PW.game,w=g.world;d.phase='idle';d.readyAt=performance.now();
  function wrap(object,key,label){if(!profiling||!object?.[key])return;const fn=object[key];object[key]=function(...args){const t=performance.now();try{return fn.apply(this,args);}finally{const s=d.sections[label]||=([]);s.push(performance.now()-t);}};}
  wrap(g,'update','game');wrap(w,'render','render');wrap(PW.hud,'update','hud');
  d.events={beams:0,projectiles:0,areaImpacts:0};d.workload=[];
  for(const [object,key,event]of [[g,'spawnBeamFor','beams'],[g.projectiles,'spawnProjectile','projectiles'],[g,'areaDamage','areaImpacts']]){
   const old=object[key];object[key]=function(...args){d.events[event]++;return old.apply(this,args);};
  }
  const update=g.update;g.update=function(...args){const value=update.apply(this,args),now=performance.now();if(!d.sampleAt||now-d.sampleAt>=250){
   d.sampleAt=now;d.workload.push({at:now,phase:d.phase,alive:g.player.alive,hp:g.player.hp,
    pos:g.player.pos.toArray(),state:g.player.state,ki:g.player.ki,flying:g.player.flying,charging:g.player.slots.r?.charging,stagger:g.player.staggerT,
    clones:g.ms.frontline?.soldiers.filter(f=>f.alive).length||0,aircraft:g.pwStage.aircraft?.actors.filter(a=>!a.destroyed&&!a.combat?.dead).length||0,
    projectiles:g.projectiles.list.length,lastPassDrawCalls:w.renderer.info.render.calls,lastPassTriangles:w.renderer.info.render.triangles,
    quality:w._qTier,pixelRatio:w.renderer.getPixelRatio(),visible:!document.hidden,focused:document.hasFocus()});}return value;};
  wrap(g.news,'update','news');for(const [i,f] of g.entities.entries()){wrap(f,'_animate','animate'+i);wrap(f,'update','fighter'+i);}
  d.runtimeErrors=[];const report=g.reportError;g.reportError=function(error,...args){d.runtimeErrors.push({error:String(error),args});return report?.call(this,error,...args);};
  if(tracePrograms){
   for(const key of ['_renderPOV','_captureFrame','_overlay'])wrap(g.news,key,'news.'+key);
   wrap(g.news._encoder,'capture','news.encodeCapture');
   if(globalThis.OffscreenCanvas)wrap(OffscreenCanvas.prototype,'convertToBlob','canvas.convertToBlob');
   if(globalThis.OffscreenCanvas)wrap(OffscreenCanvasRenderingContext2D.prototype,'drawImage','canvas.offscreenDraw');
   wrap(CanvasRenderingContext2D.prototype,'drawImage','canvas.htmlDraw');
   d.drawDiagnostics=[];const render=w.renderer.renderBufferDirect;
   w.renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
    const before=this.info.programs.length,start=performance.now();
    try{return render.call(this,camera,scene,geometry,material,object,group);}finally{
     const elapsed=performance.now()-start,after=this.info.programs.length;
     if(elapsed>12||after>before){const path=[];for(let o=object;o;o=o.parent)path.push(o.name||o.type);
      d.drawDiagnostics.push({at:start,phase:d.phase,ms:elapsed,before,after,path,camera:camera===g.news?.cam?'news':'main',
       material:{type:material.type,name:material.name,id:material.id,version:material.version,map:!!material.map,side:material.side,transparent:material.transparent},
       added:this.info.programs.slice(before).map(p=>({id:p.id,key:p.cacheKey})),sunShadow:w.sun.castShadow});
     }
    }
   };
  }
  const gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');d.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 },{tracePrograms,profiling});result.profiling=profiling;
 async function snapshot(){result.samples.push(await page.evaluate(()=>{const g=PW.game,w=g.world;return {time:g.time,alive:g.player.alive,entities:g.entities.length,clones:g.ms.frontline?.soldiers.length,preparing:g._frontlinePreparing,ema:w._ema,quality:w._qTier,override:w.qualityOverride,pixelRatio:w.renderer.getPixelRatio(),canvas:[w.renderer.domElement.width,w.renderer.domElement.height],programs:w.renderer.info.programs.length,memory:w.renderer.info.memory,news:{pending:g.news?._encoder?.pending.size,frames:g.news?.rec?.frames.length},visibility:document.visibilityState,focus:document.hasFocus()};}));}
 if(airSequence){
 await snapshot();await page.evaluate(()=>__livePerf.phase='flight');
 if(process.argv.includes('--opening-beam')){
  await page.evaluate(()=>__livePerf.phase='attack');await page.mouse.move(800,450);await page.mouse.down({button:'right'});await page.waitForTimeout(450);await page.mouse.up({button:'right'});await page.waitForTimeout(500);
 }
 await page.evaluate(()=>__livePerf.phase='flight');
 if(guarded)await page.keyboard.down('c');
 await page.keyboard.down('Space');await page.keyboard.down('w');await page.waitForTimeout(guarded?2400:1200);
 await page.keyboard.up('Space');await page.keyboard.up('w');
 if(guarded)await page.keyboard.up('c');
 await page.evaluate(()=>__livePerf.phase='attack');await page.keyboard.down('r');await page.waitForTimeout(1400);if(record)await page.screenshot({path:out+'/01-charge.png'});await page.keyboard.up('r');await page.waitForTimeout(400);if(record)await page.screenshot({path:out+'/02-beam.png'});await page.waitForTimeout(1000);await snapshot();
 await page.evaluate(()=>__livePerf.phase='blast');await page.keyboard.down('q');await page.waitForTimeout(1100);await page.keyboard.up('q');await page.waitForTimeout(2500);await snapshot();
 await page.evaluate(()=>__livePerf.phase='idle');await page.keyboard.down('c');await page.keyboard.down('a');await page.waitForTimeout(1800);await page.keyboard.up('a');await page.waitForTimeout(2500);await page.keyboard.up('c');await snapshot();
 }else{
 await snapshot();await page.keyboard.down('KeyC');await page.waitForTimeout(5000);await page.keyboard.up('KeyC');
 await page.evaluate(()=>__livePerf.phase='blast');await page.keyboard.down('KeyQ');await page.waitForTimeout(1100);await page.keyboard.up('KeyQ');
 await page.waitForTimeout(3000);await snapshot();
 await page.evaluate(()=>__livePerf.phase='flight');await page.keyboard.down('Space');await page.keyboard.down('w');
 await page.waitForTimeout(4000);await page.keyboard.up('Space');await page.keyboard.up('w');await snapshot();
 await page.evaluate(()=>__livePerf.phase='attack');await page.keyboard.down('r');await page.waitForTimeout(1200);await page.keyboard.up('r');
 await page.waitForTimeout(3800);await snapshot();
 }
 if(cdp){const {profile}=await cdp.send('Profiler.stop');await writeFile(out+'/foreground.cpuprofile',JSON.stringify(profile));}
 result.diagnostic=await page.evaluate(()=>window.__livePerf);await page.screenshot({path:out+'/foreground.png'});
 result.reporter=await page.evaluate(()=>{const n=PW.game.news,frames=[...(n.rec?.frames||[]),...(n._preroll||[]),...n.clips.flatMap(c=>c.frames)];return {worker:!!n._encoder.worker,pending:n._encoder.pending.size,playableFrames:frames.filter(f=>f?.startsWith('blob:')).length};});
 for(const phase of ['idle','blast','flight','attack']){const rows=result.diagnostic.frames.filter(f=>f.phase===phase),values=rows.map(f=>f.dt).sort((a,b)=>a-b);result[phase]={frames:rows.length,fps:1000*rows.length/values.reduce((a,b)=>a+b,0),p95:values[Math.floor(values.length*.95)],max:values.at(-1),visible:rows.every(f=>!f.hidden),focused:rows.every(f=>f.focused)};}
 const events=result.diagnostic.events,workload=result.diagnostic.workload;
 result.workloadCoverage={fourClones:workload.some(s=>s.clones>=4),aircraft:workload.some(s=>s.aircraft>=2),beam:events.beams>0,projectiles:events.projectiles>0,explosion:events.areaImpacts>0,playerSurvived:workload.every(s=>s.alive)};
 result.workloadCoverage.complete=Object.values(result.workloadCoverage).every(Boolean);
 result.sectionSummary=Object.fromEntries(Object.entries(result.diagnostic.sections).map(([k,v])=>{v.sort((a,b)=>a-b);return[k,{calls:v.length,mean:v.reduce((a,b)=>a+b,0)/v.length,p95:v[Math.floor(v.length*.95)],max:v.at(-1)}];}));
 if(process.argv.includes('--assert-prepared')){
  assert.ok(tracePrograms);assert.ok(events.beams>0,'Native beam input must actually emit');
  const cold=result.diagnostic.drawDiagnostics.flatMap(d=>d.added).filter(p=>/beam-surface|beam-sheath|lsw-shield/.test(p.key));
  assert.deepEqual(cold,[],'Native first-use beam/shield must reuse prepared programs');assert.deepEqual(result.diagnostic.runtimeErrors,[]);assert.deepEqual(result.errors,[]);
  result.preparedEffectsPassed=true;
 }
 console.log(JSON.stringify({...result,diagnostic:{gpu:result.diagnostic.gpu,longTasks:result.diagnostic.longTasks}},null,2));
}catch(error){result.failure=String(error);console.error(error);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));await browser.close();}
