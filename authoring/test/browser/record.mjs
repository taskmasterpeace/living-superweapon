// Continuous motion recordings: real-time playback of the built packages on the production rig,
// captured as one webm per scene through Playwright's recordVideo, driven through the same
// viewer API the stills use (motion/equipment/creature.check.mjs). Each scene gets its own browser
// context so each is its own video file. Usage: node authoring/test/browser/record.mjs
import assert from 'node:assert/strict';
import {mkdir,readdir,rename,stat,unlink,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.PW_AUTHORING_URL||'http://127.0.0.1:5181';
const out='authoring/artifacts/motion';await mkdir(out,{recursive:true});
const SIZE={width:960,height:600};
const MIN_BYTES=40*1024;
const SETUP_PAUSE=300;   // ms held still after setup before playback starts (the brief's pause)
const TAIL_PAUSE=400;    // ms held on the final pose so the file does not cut on the last frame
const REPEAT_HOLD=250;   // ms held at the end of a non-looping clip before it replays
const MISSING_WAIT_MS=60000; // how long to wait for a package a concurrent rebuild has swapped out

// Step kinds: {clip, loops:n} plays a looping clip for n × duration of real time;
// {clip, times:n} plays a non-looping clip from 0 to its end n times (re-seeking 0 between);
// {clip, secs:s} plays (or holds, for a clip shorter than s) for s seconds of real time.
// A `clip` may be a function of the runtime clip list so a scene can pick what is present.
const SCENES=[
 {name:'walk-male-side',pkg:'motion.hero-ual',body:'superhero-male',view:'side',steps:[{clip:'walk',loops:3}]},
 {name:'walk-lean-front',pkg:'motion.hero-ual',body:'lean',view:'front',steps:[{clip:'walk',loops:3}]},
 {name:'walk-heavy-front',pkg:'motion.hero-ual',body:'heavy',view:'front',steps:[{clip:'walk',loops:3}]},
 {name:'reload-female-side',pkg:'motion.hero-ual',body:'superhero-female',view:'side',steps:[{clip:'reload',times:2}]},
 {name:'jab-cross-male-front',pkg:'motion.hero-ual',body:'superhero-male',view:'front',steps:[{clip:'jab',times:2},{clip:'cross',times:2}]},
 {name:'grenade-throw-male-side',pkg:'motion.hero-ual2',body:'superhero-male',view:'side',steps:[{clip:'grenade-throw',times:2}]},
 {name:'hit-knockback-male-side',pkg:'motion.hero-ual2',body:'superhero-male',view:'side',steps:[{clip:'hit-knockback',times:3}]},
 {name:'get-up-male-side',pkg:'motion.hero-ual2',body:'superhero-male',view:'side',steps:[{clip:clips=>clips.some(c=>c.id==='supine-rise')?'supine-rise':'prone-rise',times:2}]},
 {name:'cmu-walk-male-side',pkg:'motion.cmu-walk-02',body:'superhero-male',view:'side',steps:[{clip:'cmu-walk',times:2}]},
 {name:'carbine-walk-male-side',pkg:'equipment.carbine',body:'superhero-male',view:'side',steps:[{clip:'walk',loops:3}]},
 {name:'carbine-reload-heavy-side',pkg:'equipment.carbine',body:'heavy',view:'side',steps:[{clip:'reload',times:2}]},
 {name:'sidearm-aim-female-side',pkg:'equipment.sidearm',body:'superhero-female',view:'side',steps:[{clip:'aim-neutral',secs:2},{clip:'aim-up',secs:2},{clip:'pistol-idle',secs:2}]},
 {name:'hound-move-side',pkg:'creature.field-hound',body:null,view:'side',steps:[{clip:'move',loops:3}]},
 {name:'hound-attack-front',pkg:'creature.field-hound',body:null,view:'front',steps:[{clip:'attack',times:2}]},
];

// The viewer is a catalog page; for a recording the stage is the whole frame. Injected at runtime
// (the stage's ResizeObserver re-fits the renderer), so no viewer file changes.
const RECORD_CSS=`#rail,#inspector{display:none!important}#app{grid-template-columns:1fr!important}#stage{grid-template-rows:1fr!important}
#overlay-controls{left:auto;right:12px;bottom:12px;padding:6px 10px;gap:8px}#overlay-controls #play,#overlay-controls #scrub,#overlay-controls label:not(:first-of-type){display:none!important}`;

// Playwright names each webm by a random hex id inside the record dir; a crashed earlier run can
// leave one behind. Clear those (never the named scene files) before recording.
for(const f of await readdir(out))if(/^[0-9a-f]{16,}\.webm$/.test(f))await unlink(`${out}/${f}`);

const browser=await chromium.launch({headless:true});
const index=[];
// The catalog can be rebuilt under a run (package dirs swap atomically, the catalog is rewritten
// last). A package missing at load time is polled for by reloading the viewer, so a rebuild in
// flight costs a wait rather than a failed scene.
async function openViewer(page,pkgId){
 const deadline=Date.now()+MISSING_WAIT_MS;
 for(;;){
  await page.goto(`${base}/authoring/viewer/index.html`);
  await page.waitForFunction(()=>window.AUTHORING?.state?.catalog?.packages?.length>0,null,{timeout:30000});
  const have=await page.evaluate(id=>AUTHORING.state.catalog.packages.some(p=>p.id===id&&p.ok!==false),pkgId);
  if(have)return;
  if(Date.now()>deadline){
   const ids=await page.evaluate(()=>AUTHORING.state.catalog.packages.map(p=>p.id));
   throw new Error(`package ${pkgId} is not in the catalog (have ${ids.join(', ')})`);
  }
  await page.waitForTimeout(5000);
 }
}
async function record(scene){
 const context=await browser.newContext({viewport:SIZE,recordVideo:{dir:out,size:SIZE}});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const t0=Date.now();let playMs=0;const played=[];let failure=null;
 try{
  await openViewer(page,scene.pkg);
  await page.addStyleTag({content:RECORD_CSS});
  await page.evaluate(id=>AUTHORING.select(AUTHORING.state.catalog.packages.find(p=>p.id===id)),scene.pkg);
  await page.waitForFunction(id=>AUTHORING.state.selected?.id===id&&AUTHORING.stage.pkg?.manifest?.id===id&&!!AUTHORING.stage.playback,scene.pkg);
  await page.evaluate(()=>{AUTHORING.stage.playing=false;});
  const clips=await page.evaluate(()=>AUTHORING.stage.playback.clips.map(c=>({id:c.id,duration:c.duration,loop:c.loop})));
  const steps=scene.steps.map(s=>({...s,clip:typeof s.clip==='function'?s.clip(clips):s.clip}));
  for(const s of steps)assert.ok(clips.some(c=>c.id===s.clip),`${scene.name}: clip ${s.clip} present in ${scene.pkg} (have ${clips.map(c=>c.id).join(', ')})`);
  await page.evaluate(({body,view,clip})=>{const s=AUTHORING.stage;if(body)s.setBody(body);s.setClip(clip);s.seek(0);s.setView(view);s.playing=false;},{body:scene.body,view:scene.view,clip:steps[0].clip});
  await page.waitForTimeout(SETUP_PAUSE);
  for(const s of steps){
   const c=clips.find(x=>x.id===s.clip);
   await page.evaluate(id=>{const s=AUTHORING.stage;s.playing=false;s.setClip(id);s.seek(0);},s.clip);
   const p0=Date.now();
   if(s.loops){
    await page.evaluate(()=>{AUTHORING.stage.playing=true;});
    await page.waitForTimeout(Math.round(s.loops*c.duration*1000));
    await page.evaluate(()=>{AUTHORING.stage.playing=false;});
   }else if(s.times){
    for(let i=0;i<s.times;i++){
     await page.evaluate(()=>{const s=AUTHORING.stage;s.seek(0);s.playing=true;});
     // A non-looping clip clamps at its duration; wait for the rAF loop to actually get there.
     await page.waitForFunction(()=>AUTHORING.stage.time>=AUTHORING.stage.clip.duration-1e-6,null,{timeout:Math.round(c.duration*1000*4+5000)});
     await page.evaluate(()=>{AUTHORING.stage.playing=false;});
     if(i<s.times-1)await page.waitForTimeout(REPEAT_HOLD);
    }
   }else if(s.secs){
    await page.evaluate(()=>{AUTHORING.stage.playing=true;});
    await page.waitForTimeout(Math.round(s.secs*1000));
    await page.evaluate(()=>{AUTHORING.stage.playing=false;});
   }
   const ms=Date.now()-p0;playMs+=ms;
   played.push({clip:s.clip,duration:+c.duration.toFixed(3),loop:c.loop,mode:s.loops?`loops×${s.loops}`:s.times?`once×${s.times}`:`hold ${s.secs}s`,ms});
  }
  await page.waitForTimeout(TAIL_PAUSE);
 }catch(e){
  failure=e.message;
 }finally{
  const video=page.video();
  await context.close();
  const wall=(Date.now()-t0)/1000;
  const file=`${scene.name}.webm`;
  const src=await video.path();
  if(failure){await unlink(src).catch(()=>{});await unlink(`${out}/${file}`).catch(()=>{});}
  else await rename(src,`${out}/${file}`);
  const bytes=failure?0:(await stat(`${out}/${file}`)).size;
  index.push({file,package:scene.pkg,body:scene.body,view:scene.view,clips:[...new Set(played.map(p=>p.clip))],steps:played,seconds:+wall.toFixed(2),playSeconds:+(playMs/1000).toFixed(2),bytes,errors,...(failure?{failure}:{})});
  console.log(failure?`  ${file.padEnd(32)} FAILED: ${failure}`:`  ${file.padEnd(32)} ${wall.toFixed(1).padStart(5)}s (${(playMs/1000).toFixed(1)}s played)  ${(bytes/1024).toFixed(0).padStart(5)} KB${errors.length?`  ERRORS ${errors.length}`:''}`);
 }
}
try{
 for(const scene of SCENES)await record(scene);
 const totalBytes=index.reduce((a,r)=>a+r.bytes,0);
 await writeFile(`${out}/index.json`,JSON.stringify({generated:new Date().toISOString(),viewer:`${base}/authoring/viewer/index.html`,size:SIZE,scenes:index,totalBytes},null,1));
 for(const r of index){
  assert.equal(r.failure,undefined,`${r.file}: ${r.failure}`);
  assert.deepEqual(r.errors,[],`${r.file}: viewer must stay free of page and console errors`);
  assert.ok(r.bytes>MIN_BYTES,`${r.file}: ${r.bytes} bytes must exceed ${MIN_BYTES} (an empty or single-frame recording)`);
 }
 assert.equal(index.length,SCENES.length);
 console.log(`PASS ${index.length} motion recordings, ${totalBytes} bytes (${(totalBytes/1048576).toFixed(2)} MB), ${index.reduce((a,r)=>a+r.seconds,0).toFixed(1)}s of video → ${out}/*.webm + index.json`);
}finally{await browser.close();}
