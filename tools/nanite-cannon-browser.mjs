import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// Task 2 acceptance: genuine published ORIGIN source, actual Game.update and
// controlPlayer through browser-dispatched key edges. The target/positions are
// controlled fixtures, not AI combat or a user judgment of input feel.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180',reel=process.env.LSW_NANITE_REEL==='1',longCharge=reel||process.env.LSW_NANITE_LONG==='1',out=process.env.LSW_NANITE_OUT||(reel?'artifacts/nanite-cannon-reel':longCharge?'artifacts/nanite-cannon-stages':'artifacts/nanite-cannon');
await mkdir(out,{recursive:true});
// Full Chromium's headless mode uses the native GPU here; the default headless
// shell reported SwiftShader and stretched an action capture over fourfold.
const browser=await chromium.launch({channel:'chromium'}),context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out,size:{width:1280,height:800}}});
const page=await context.newPage(),errors=[],cases=[];page.setDefaultTimeout(45000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(async()=>{
  const {game:g,THREE:T,ROSTER,hud}=LSW;
  const {freshPicks,buildDef,POWERS}=await import('/src/data/creator.js');
  const {setAttackOverride}=await import('/src/data/attack-tuning.js');
  const {applyProfile,profileFromDef}=await import('/src/tool/studio-profile.js');
  const {naniteEmitter}=await import('/src/engine/nanite-forearms.js');
  if(!POWERS.some(p=>p.id==='nanite-cannon'))throw Error('Run only after the working cannon publication gate');
  // Task 2 originally asserted the shield was still private. Its later,
  // separately verified publication must not invalidate cannon regressions.
  const update=g.update.bind(g),render=g.world.render.bind(g.world),spawn=g.projectiles.spawnProjectile;
  g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};
  let f,target,observed=[],sampled=[],spec;
  const note=document.createElement('div');note.style.cssText='position:fixed;left:20px;right:20px;top:80px;color:#fff3d9;background:#171c18ed;padding:8px;z-index:10000;font:13px system-ui';document.body.append(note);
  const key=(code,on)=>{if(on&&g._tapT)g._tapT[code]=-9;dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));};
  g.projectiles.spawnProjectile=function(caster,options){
   const shot=spawn.call(this,caster,options);if(caster!==f)return shot;
   const record={shot,options,launch:null};observed.push(record);
   const resolve=shot.resolveLaunch.bind(shot);
   shot.resolveLaunch=function(game){
    const pending=!shot._launchResolved&&!shot.dead,result=resolve(game);
    if(pending&&shot._launchResolved&&!shot.dead&&shot.launchOrigin){
     const module=f._nanites.modules.get('q'),emitter=naniteEmitter(f,'q',module.epoch);
     const aperture=emitter?.socket.getWorldPosition(new T.Vector3()),direction=shot.vel.clone().normalize();
     record.launch={origin:shot.launchOrigin.toArray(),aperture:aperture?.toArray(),radius:shot.radius,
      axisErrorDeg:emitter?T.MathUtils.radToDeg(direction.angleTo(emitter.axis)):null,
      centerError:aperture?shot.launchOrigin.distanceTo(aperture.clone().addScaledVector(direction,shot.radius)):null,
      damage:shot.damage,side:module.config.naniteAttachment};
    }return result;
   };return shot;
  };
  const snapshot=()=>{
   const module=f._nanites.modules.get('q'),slot=f.slots.q;
   return {position:f.pos.toArray(),velocity:f.vel.toArray(),gait:f.gait,ki:f.ki,charging:slot.charging,charge:slot.charge,
    cooldown:slot.cd,orb:!!slot.orb,assembly:module.assemblyT,ready:module.ready,damage:1000-target.hp,
    shots:observed.map(({shot,launch})=>({dead:!!shot.dead,resolved:!!shot._launchResolved,launch})),
    groundTake:f._groundMotion?.take,forearm:f.parts.nanites.get('q').arm.name};
  };
  window.naniteCannonProof={
   setup(next){
    spec=next;observed=[];sampled=[];g.input.keys.clear();g.input.endFrame();
    const picks={...freshPicks(),name:'CANNON TEST',cape:false,budget:'unbound',flightTier:3,slots:{lmb:'kibolt',rmb:'heatray',q:'nanite-cannon',e:null,f:null,r:null}};
    const basis=buildDef(picks,'cx_nanite_cannon_browser'),profile=profileFromDef(basis);
    profile.model.body=spec.body;profile.model.costume='fitted';profile.frame.scale=spec.scale;profile.frame.bulk=spec.bulk;
    profile.attacks=setAttackOverride(profile.attacks,basis,'q',{naniteAttachment:spec.side});
    const def=applyProfile(basis,profile),old=ROSTER.findIndex(d=>d.id===def.id);if(old>=0)ROSTER[old]=def;else ROSTER.push(def);
    g.startMode('powerworld',{p1:def.id,p2:'sol'});f=g.player;hud.setPlayer(f.def);
    for(const actor of g.entities)if(actor!==f){actor.ai=null;actor.pos.set(900,900,900);}
    const ground=spec.motion==='ground-strafe',origin=new T.Vector3(-70,ground?0:150,-70);
    // Select a clear actual native ground lane without moving/removing cover.
    if(ground){
     let found=false;
     for(const x of [-100,-70,-40,0,40,70,100]){if(found)break;for(const z of [-100,-70,-40]){
      const blocked=g.world.cover.some(c=>Math.abs(c.x-x)<(c.hx??c.r??0)+35&&c.z+(c.hz??c.r??0)>z-12&&c.z-(c.hz??c.r??0)<z+85);
      if(!blocked){origin.set(x,g.world.heightAt?.(x,z)||0,z);found=true;break;}
     }}if(!found)throw Error('No clear native ground firing lane for this controlled fixture');
    }
    f.pos.copy(origin);f.vel.set(0,0,0);f.level=10;f.invuln=20;f.flying=!ground;f.gait=ground?'grounded':'airborne';f.ki=f.maxKi;
    target=g.spawnDummy(origin.x,origin.z+(spec.motion==='forward-flight'?(spec.releaseFrame>104?160:100):60));target.pos.y=origin.y;target.flying=!ground;target.gait=ground?'grounded':'airborne';
    target._openSky=true;target.invuln=0;target.hp=target.maxHp=1000;target._vis=1;target.vel.set(0,0,0);
    g.hardLock=target;g.world._lookYaw=0;g.world._lookPitch=0;g.world._lookActive=true;g.world.snapChase();
    f.faceDir(0,1);target.faceDir(0,-1);f._animate(0);target._animate(0);f.obj.updateMatrixWorld(true);target.obj.updateMatrixWorld(true);
    note.textContent=`NATIVE INPUT FIXTURE · ${spec.body} / ${spec.motion} / ${spec.side} · Q charge · seeded target · production camera`;
    return snapshot();
   },
   step(frame,present=true){
    if(frame===0)key('KeyQ',true);
    if(frame===44)key('KeyQ',false);
    if(frame===50){key('KeyQ',true);if(spec.motion==='ground-strafe')key('KeyD',true);if(spec.motion==='forward-flight')key('KeyW',true);}
    if(frame===(spec.releaseFrame||104))key('KeyQ',false);
    if(frame===(spec.releaseFrame||104)+36){key('KeyD',false);key('KeyW',false);}
    update(1/60);g.input.endFrame();if(present)render();const row={frame,...snapshot()};sampled.push(row);return row;
   },
   inspect(){
    const view=f.parts.nanites.get('q'),focus=view.arm.children[1].getWorldPosition(new T.Vector3()).lerp(f.parts.head.getWorldPosition(new T.Vector3()),.35);
    const side=spec.side==='right-forearm'?1:-1;
    g.world.camera.position.copy(focus).add(new T.Vector3(side*7,3,9).multiplyScalar(spec.scale));g.world.camera.lookAt(focus);
    note.textContent='NATIVE CHARGE · extra forearm inspection angle (not gameplay framing)';render();
   },
   gameView(){g.world.snapChase();note.textContent=`NATIVE INPUT FIXTURE · ${spec.body} / ${spec.motion} · production camera`;},
   async record(){
    const a=g.audio;if(!a.ctx||a.ctx.state!=='running')throw Error('Native audio must be gesture-unlocked before capture');
    render();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    const output=a.ctx.createMediaStreamDestination(),analyser=a.ctx.createAnalyser();a.master.connect(output);a.master.connect(analyser);
    const stream=g.world.renderer.domElement.captureStream(30);for(const track of output.stream.getAudioTracks())stream.addTrack(track);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[],wave=new Float32Array(analyser.fftSize);
    const done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer())));});
    let frame=0,previous=performance.now(),accumulator=0,peak=0,renderFrames=0,droppedWallTime=0;const begin=previous,timing=[];
    recorder.start(100);
    try{
     await new Promise((resolve,reject)=>{
      const tick=now=>{try{
       const elapsed=(now-previous)/1000;previous=now;droppedWallTime+=Math.max(0,elapsed-.1);accumulator+=Math.min(.1,elapsed);
       const startFrame=frame,start=performance.now(),programsBefore=g.world.renderer.info.programs.length;
       let steps=0;while(accumulator>=1/60&&steps<6&&frame<=spec.releaseFrame+106){window.naniteCannonProof.step(frame++,false);accumulator-=1/60;steps++;}
       const simMs=performance.now()-start,renderStart=performance.now();render();const renderMs=performance.now()-renderStart;
       const programsAfter=g.world.renderer.info.programs.length;
       if(simMs>8||renderMs>8||elapsed>.05||programsAfter!==programsBefore)timing.push({startFrame,endFrame:frame,elapsed,steps,simulationMs:simMs,renderSubmissionMs:renderMs,programsBefore,programsAfter});
       renderFrames++;analyser.getFloatTimeDomainData(wave);for(const sample of wave)peak=Math.max(peak,Math.abs(sample));
       if(frame>spec.releaseFrame+106)resolve();else requestAnimationFrame(tick);
      }catch(error){reject(error);}};requestAnimationFrame(tick);
     });
     recorder.stop();const bytes=await done;
     const gl=g.world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
     return {bytes,rows:sampled,mediaWallSeconds:(performance.now()-begin)/1000,simulationSeconds:frame/60,renderFrames,droppedWallTime,timing,audioPeak:peak,audioState:a.ctx.state,
      renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),browser:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,visibility:document.visibilityState,
      canvas:[g.world.renderer.domElement.width,g.world.renderer.domElement.height],pixelRatio:g.world.renderer.getPixelRatio()};
    }finally{if(recorder.state!=='inactive')recorder.stop();for(const track of stream.getTracks())track.stop();a.master.disconnect(output);a.master.disconnect(analyser);analyser.disconnect();}
   },
  };
 });
 if(reel)console.log('Native cannon fixture modules loaded; recording actual canvas and AudioContext.');
 for(const spec of [
  {body:'superhero-female',scale:.65,bulk:.65,side:'left-forearm',motion:'ground-strafe'},
  {body:'superhero-male',scale:1,bulk:1,side:'right-forearm',motion:'hover'},
  {body:'procedural',scale:1.5,bulk:1.65,side:'right-forearm',motion:'forward-flight'},
 ].map(spec=>({...spec,releaseFrame:longCharge?158:104})).filter(spec=>!reel||spec.motion==='forward-flight')){
  const id=spec.body+'-'+spec.motion,dir=`${out}/${id}`;await mkdir(dir,{recursive:true});
  const start=await page.evaluate(spec=>naniteCannonProof.setup(spec),spec),rows=[];
  cases.push({spec,start,rows});
  assert.equal(start.ready,false);assert.equal(start.orb,false);
  if(reel){
   // Exercise the exact same native sequence once to populate first-use GPU
   // shader/sample caches. Preserve its timing separately; never hide the cold
   // start cost in a performance claim about the recorded repeat.
   const profiler=process.env.LSW_NANITE_PROFILE==='1'?await context.newCDPSession(page):null;
   if(profiler){await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
   const warmup=await page.evaluate(()=>naniteCannonProof.record());
   if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile(`${out}/cold-native.cpuprofile`,JSON.stringify(profile));await profiler.detach();}
   const {bytes:warmBytes,rows:warmRows,...warmStats}=warmup;cases.at(-1).warmup=warmStats;
   await page.evaluate(spec=>naniteCannonProof.setup(spec),spec);
   const recording=await page.evaluate(()=>naniteCannonProof.record());rows.push(...recording.rows);await writeFile(`${out}/native-cannon-audio.webm`,Buffer.from(recording.bytes));
   const {bytes,rows:_,...stats}=recording;cases.at(-1).recording=stats;assert.ok(stats.audioPeak>1e-6,'Capture must contain actual native audio');
   await page.screenshot({path:`${dir}/native-reel-end.png`});
  }else for(let frame=0;frame<=spec.releaseFrame+106;frame++){
   rows.push(await page.evaluate(async frame=>{const row=naniteCannonProof.step(frame);await new Promise(requestAnimationFrame);return row;},frame));
   if([0,39,70,103,105,140,210].includes(frame))await page.screenshot({path:`${dir}/game-${String(frame).padStart(3,'0')}.png`});
   if((longCharge?[70,100,145,157]:[70]).includes(frame)){await page.evaluate(()=>naniteCannonProof.inspect());await page.screenshot({path:`${dir}/charge-inspection-${frame}.png`});await page.evaluate(()=>naniteCannonProof.gameView());}
  }
  const end=rows.at(-1);assert.ok(rows.slice(0,44).every(r=>!r.charging&&!r.orb&&r.shots.length===0&&r.cooldown===0&&r.ki>=start.ki-1e-9));
  assert.ok(rows.slice(50,104).some(r=>r.charging&&r.orb),'A fresh press must create native charging');
  assert.equal(end.shots.length,1);assert.ok(end.shots[0].launch,'Expected a validated native launch');
  assert.ok(Array.isArray(end.shots[0].launch.aperture)&&end.shots[0].launch.aperture.length===3);
  assert.ok(Number.isFinite(end.shots[0].launch.axisErrorDeg)&&end.shots[0].launch.axisErrorDeg<=3.00001);
  assert.ok(Number.isFinite(end.shots[0].launch.centerError)&&end.shots[0].launch.centerError<1e-4);
  assert.ok(end.damage>0,'The native projectile must reach the target');if(spec.motion!=='hover')assert.notDeepEqual(end.position,start.position);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({cases:cases.map(c=>({spec:c.spec,damage:c.rows.at(-1).damage,launch:c.rows.at(-1).shots[0].launch})),errors}));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Genuine ORIGIN cannon; native Game/controlPlayer with browser-dispatched keys. Seeded stationary target, no AI or subjective feel claim.',cases,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/native-cannon-input.webm`);await browser.close();}
