// Fresh native startup + same-page second match. Diagnostic CPU sampling only;
// no renderer/encoder wrappers, disabled AI/news, or game-state writes.
// Requires an exclusive GPU slot. node tools/frontline-startup-profile.mjs
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const out=resolve(process.env.LSW_PROFILE_OUT||'artifacts/frontline-startup-profile');
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const start=Date.now(),budgetMs=150000,result={budgetMs,kind:'diagnostic CPU profile, not performance acceptance',
  constraints:{runtimeWrites:false,aiDisabled:false,newsDisabled:false,runtimeMethodsWrapped:false},calls:[],samples:[],runs:[],errors:[]};
let browser,context,page,cdp,phase='launch',activeProfile=false,activeLabel='cold';
const held=new Set(),wall=()=>Date.now()-start;
await mkdir(out,{recursive:true});
const watchdog=setTimeout(()=>{result.deadlineExceeded=true;page?.close().catch(()=>{});},budgetMs);
async function call(name,fn){
 assert.ok(wall()<budgetMs,'Global profiling deadline exceeded');
 const row={name,phase,startWall:wall()};result.calls.push(row);
 try{return await fn();}catch(error){row.error=String(error);throw error;}finally{row.endWall=wall();row.duration=row.endWall-row.startWall;}
}
async function key(code,on){
 if(held.has(code)===on)return;
 await call(`key ${code} ${on?'down':'up'}`,()=>on?page.keyboard.down(code):page.keyboard.up(code));
 if(on)held.add(code);else held.delete(code);
}
async function sample(){
 const row=await call('read state',()=>page.evaluate(()=>{
  const g=window.PW?.game,p=g?.player,w=g?.world;
  return {performanceNow:performance.now(),dateNow:Date.now(),timeOrigin:performance.timeOrigin,time:g?.time,
   running:g?.running,graphicsReady:!!g?.pwStage?.frontlineReady,assetsReady:!!g?.pwStage?.frontlineAssetsReady,
   alive:p?.alive,hp:p?.hp,pos:p?.pos.toArray(),vel:p?.vel.toArray(),flying:p?.flying,
   ground:p?w.heightAt(p.pos.x,p.pos.z):null,look:{yaw:w?._lookYaw,pitch:w?._lookPitch,sens:w?._lookSens},
   news:{enabled:g?.news?.enabled,tag:g?.news?.rec?.tag,frames:g?.news?.rec?.frames.length,pending:g?.news?._encoder?.pending.size,
    clips:g?.news?.clips.map(c=>({tag:c.tag,frames:c.frames.length}))},
   clones:(g?.ms.frontline?.soldiers||[]).map(f=>({ai:!!f.ai,alive:f.alive})),
   convoy:g?.pwStage?.convoy?.vehicles.map(v=>({x:v.cover.x,z:v.cover.z,hp:v.cover.hp})),
   quality:w?._qTier,ema:w?._ema,calls:w?.renderer?.info?.render?.calls,triangles:w?.renderer?.info?.render?.triangles,
   visible:document.visibilityState,focused:document.hasFocus()};
 }));
 row.wallMs=wall();row.phase=phase;result.samples.push(row);return row;
}
async function until(predicate,ms,label){
 const deadline=Date.now()+ms;
 do{await page.waitForTimeout(90);const s=await sample();if(predicate(s))return s;}while(Date.now()<deadline);
 throw Error(`${label}: ${ms}ms wall deadline reached`);
}

// Attribute each sampled interval to its V8 leaf and ancestors. Inclusive time
// can overlap across functions; self time does not. Native/idle samples remain
// explicit instead of incorrectly being labelled JavaScript CPU work.
function summarize(profile,offsetMs,windows=null){
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
 for(const n of profile.nodes)for(const child of n.children||[])parents.set(child,n.id);
 const byName=new Map(),tableFor=id=>{
  const f=nodes.get(id)?.callFrame||{},key=[f.functionName,f.url,f.lineNumber,f.columnNumber].join('|');
  if(!byName.has(key))byName.set(key,{function:f.functionName||'(anonymous)',url:f.url||'(V8/native)',line:(f.lineNumber??-1)+1,column:(f.columnNumber??-1)+1,selfMs:0,inclusiveMs:0,samples:0});
  return byName.get(key);
 };
 let clock=profile.startTime/1000,totalMs=0;
 for(let i=0;i<(profile.samples||[]).length;i++){
  const dt=profile.timeDeltas[i]/1000,from=clock-offsetMs;clock+=dt;
  const weight=windows?windows.reduce((sum,w)=>sum+Math.max(0,Math.min(clock-offsetMs,w.end)-Math.max(from,w.start)),0):dt;
  if(weight<=0)continue;
  totalMs+=weight;const id=profile.samples[i],leaf=tableFor(id);leaf.selfMs+=weight;leaf.samples++;
  const visited=new Set();for(let node=id;node!==undefined;node=parents.get(node)){
   const row=tableFor(node);if(!visited.has(row)){row.inclusiveMs+=weight;visited.add(row);}
  }
 }
 const values=[...byName.values()];
 return {totalSampledMs:totalMs,topSelf:values.sort((a,b)=>b.selfMs-a.selfMs).slice(0,35),
  topInclusive:[...values].sort((a,b)=>b.inclusiveMs-a.inclusiveMs).slice(0,35)};
}
async function beginProfile(label){
 activeLabel=label;await call('Profiler.start',()=>cdp.send('Profiler.start'));activeProfile=true;
}
async function finishProfile(){
 if(!activeProfile)return;
 const {profile}=await call('Profiler.stop',()=>cdp.send('Profiler.stop'));activeProfile=false;
 const metricStart=Date.now(),metrics=await cdp.send('Performance.getMetrics');
 const clocks=await page.evaluate(()=>({performanceNow:performance.now(),dateNow:Date.now(),timeOrigin:performance.timeOrigin,timing:window.__startupProfile}));
 const timestamp=metrics.metrics.find(m=>m.name==='Timestamp')?.value;
 const offsetMs=timestamp*1000-clocks.performanceNow;
 const path=resolve(out,activeLabel+'.cpuprofile');await writeFile(path,JSON.stringify(profile));
 const startPerf=profile.startTime/1000-offsetMs,endPerf=profile.endTime/1000-offsetMs;
 const longTasks=clocks.timing.longTasks.filter(e=>e.start>=startPerf&&e.start<=endPerf);
 const entry=result.samples.find(s=>s.phase===activeLabel+' enter'),end=result.samples.findLast(s=>s.phase.startsWith(activeLabel));
 const ready=result.samples.find(s=>s.phase===activeLabel+' graphics ready');
 // Host polling can return only AFTER a blocked first playable frame. Use the
 // independent RAF's false->true transition, not that delayed host observation.
 const edges=clocks.timing.readinessTransitions||[];
 const loadingEdge=edges.find(edge=>edge.performanceNow>=(entry?.performanceNow??startPerf)&&!edge.ready);
 const readyEdge=edges.find(edge=>edge.performanceNow>=(loadingEdge?.performanceNow??entry?.performanceNow??startPerf)&&edge.ready);
 const readyTime=readyEdge?.performanceNow??ready?.performanceNow;
 const deltas=profile.timeDeltas.map(d=>d/1000).sort((a,b)=>a-b);
 const run={label:activeLabel,path,alignment:{offsetMs,uncertaintyMs:Date.now()-metricStart,startPerf,endPerf,timeOrigin:clocks.timeOrigin},
  sampling:{requestedIntervalMs:1,medianDeltaMs:deltas[Math.floor(deltas.length*.5)],p95DeltaMs:deltas[Math.floor(deltas.length*.95)],
   largestDeltasMs:deltas.slice(-12).reverse(),note:'V8 sampled stack time can include native waits. It identifies the active caller, not necessarily CPU computation; long gaps weaken attribution.'},
  all:summarize(profile,offsetMs),matchedGameplay:entry&&end?summarize(profile,offsetMs,[{start:entry.performanceNow,end:end.performanceNow}]):null,
  graphicsReady:ready?{performanceNow:readyTime,time:readyEdge?.gameTime??ready.time,source:readyEdge?'independent RAF transition':'host poll fallback',hostObservedPerformanceNow:ready.performanceNow}:null,
  afterGraphicsReady:ready?summarize(profile,offsetMs,[{start:readyTime,end:endPerf}]):null,
  afterGraphicsReadyLongTasks:ready?longTasks.filter(task=>task.start+task.duration>readyTime).map(task=>({...task,postReadyOverlapMs:Math.min(task.duration,task.start+task.duration-readyTime)})):null,
  longTasks:longTasks.map(task=>({...task,profile:summarize(profile,offsetMs,[{start:task.start,end:task.start+task.duration}])})),
  timing:clocks.timing};
 result.runs.push(run);
 await writeFile(resolve(out,activeLabel+'-summary.json'),JSON.stringify(run,null,2));
}
async function enterAndFly(label){
 phase=label+' enter';const entryTime=(await sample()).time||0;
 await call('click Enter Dimension',()=>page.locator('#pwGo').click({timeout:25000}));
 await call('wait native graphics-ready match',()=>page.waitForFunction(()=>window.PW?.game?.running&&PW.game.player?.def.id==='vega'&&PW.game.pwStage?.frontlineReady,null,{polling:100,timeout:60000}));
 phase=label+' graphics ready';await sample();
 await call('native pointer lock',()=>page.mouse.click(800,450,{button:'middle'}));
 phase=label+' takeoff';await key('Space',true);
 let s=await until(s=>s.flying&&s.pos[1]-s.ground>35,22000,'Native takeoff');
 assert.ok(s.news.enabled&&s.clones.length===4&&s.clones.every(c=>c.ai),'News and native clone AI must remain enabled');
 phase=label+' approach';
 // Same real approach verb in both matches. Orient with trusted pointer deltas,
 // then W+Space; terrain/actors stay wherever the live stage put them.
 const target=s.convoy?.[0];assert.ok(target,'Native convoy missing');
 const yaw=Math.atan2(target.x-s.pos[0],target.z-s.pos[2]);
 let mouseX=800,mouseY=450;
 for(let i=0;i<12;i++){
  s=await sample();const dyaw=Math.atan2(Math.sin(yaw-s.look.yaw),Math.cos(yaw-s.look.yaw));
  if(Math.abs(dyaw)<.018&&Math.abs(s.look.pitch)<.018)break;
  mouseX+=Math.round(Math.max(-150,Math.min(150,-dyaw/s.look.sens)));
  mouseY+=Math.round(Math.max(-110,Math.min(110,s.look.pitch/s.look.sens)));
  await call('native mouse orientation',()=>page.mouse.move(mouseX,mouseY));await page.waitForTimeout(60);
 }
 await key('w',true);const from=(await sample()).time;
 await until(s=>s.time-from>=2.8,18000,'Native approach progress');
 await key('w',false);await key('Space',false);
 phase=label+' standup settle';
 await until(s=>s.time-entryTime>=8&&!s.news.tag&&s.news.pending===0,20000,'Natural standup finalization');
 const final=await sample();assert.ok(final.alive,'Native hero died during profiling');
 // Screenshot is AFTER the profile stop so capture cost cannot be mistaken for
 // gameplay renderer/recorder work. Its own call duration is recorded separately.
 await finishProfile();
 await call('screenshot after profile',()=>page.screenshot({path:resolve(out,label+'-flight.png'),timeout:10000}));
}
try{
 browser=await chromium.launch({channel:'chromium',headless:process.env.LSW_PROFILE_HEADED!=='1',timeout:15000});
 context=await browser.newContext({viewport:{width:1600,height:900}});page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',e=>result.errors.push({phase,kind:'pageerror',message:e.message}));
 page.on('console',m=>{if(m.type()==='error')result.errors.push({phase,kind:'console',message:m.text()});});
 await page.addInitScript(()=>{
  localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:1.25,cameraPreset:'frontline'}));
  const trace=window.__startupProfile={longTasks:[],frameGaps:[],inputs:[],readinessTransitions:[]},add=(list,row)=>{if(list.length<512)list.push(row);};
  new PerformanceObserver(list=>{for(const e of list.getEntries())add(trace.longTasks,{start:e.startTime,duration:e.duration,
   observedGame:window.PW?.game?.time??null,name:e.name});}).observe({type:'longtask',buffered:true});
  for(const type of ['keydown','keyup','mousedown','mouseup','mousemove'])addEventListener(type,event=>add(trace.inputs,{
   type,code:event.code,button:event.button,movementX:event.movementX,movementY:event.movementY,trusted:event.isTrusted,
   eventTime:event.timeStamp,performanceNow:performance.now(),dateNow:Date.now(),gameTime:window.PW?.game?.time??null}),true);
  let previous=null,previousGroup=null,previousReady=false;
  const tick=()=>{
   const g=window.PW?.game,now={performanceNow:performance.now(),dateNow:Date.now(),gameTime:g?.time??null,
    tag:g?.news?.rec?.tag??null,pending:g?.news?._encoder?.pending.size??0,
    graphicsReady:!!g?.pwStage?.frontlineReady,assetsReady:!!g?.pwStage?.frontlineAssetsReady,
    visible:document.visibilityState,focused:document.hasFocus()};
   const group=g?.pwStage?.group;
   if(group!==previousGroup||now.graphicsReady!==previousReady)add(trace.readinessTransitions,{performanceNow:now.performanceNow,dateNow:now.dateNow,
    gameTime:now.gameTime,ready:now.graphicsReady,group:group?.uuid??null});
   previousGroup=group;previousReady=now.graphicsReady;
   if(previous&&now.performanceNow-previous.performanceNow>100)add(trace.frameGaps,{from:previous,to:now});
   previous=now;requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
 });
 cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Performance.enable');
 await cdp.send('Profiler.setSamplingInterval',{interval:1000});
 await beginProfile('cold');phase='cold menu';
 await call('navigate fresh page',()=>page.goto(base+'/powerworld.html',{timeout:25000}));
 await call('select native encounter',()=>page.locator('#pwEncounter [data-encounter="frontline"]').click());
 await call('select native camera',()=>page.locator('#pwCamera [data-camera="frontline"]').click());
 await enterAndFly('cold');
 phase='native menu transition';
 await call('native Escape',()=>page.keyboard.press('Escape'));
 await call('native Main Menu',()=>page.locator('#hPaused [data-p="menu"]').click());
 await call('wait menu',()=>page.locator('#pwGo').waitFor({state:'visible'}));
 await beginProfile('warm');await enterAndFly('warm');
 assert.deepEqual(result.errors,[],'Native browser errors');result.success=true;
}catch(error){result.success=false;result.failure={phase,message:error.message,stack:error.stack};process.exitCode=1;
}finally{
 for(const code of [...held])await key(code,false).catch(()=>{});
 if(activeProfile&&page&&!page.isClosed())await finishProfile().catch(error=>{result.profileRecoveryError=String(error);});
 await browser?.close().catch(()=>{});clearTimeout(watchdog);result.wallMs=wall();
 await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({success:result.success,failure:result.failure,runs:result.runs.map(r=>({label:r.label,path:r.path,
  longTasks:r.longTasks.filter(t=>t.duration>500).map(t=>({start:t.start,duration:t.duration,top:t.profile.topSelf.slice(0,5)}))})),out,wallMs:result.wallMs}));
}
