// Honest live-input witness, not a deterministic damage fixture or FPS benchmark.
// Run only when the shared GPU is available: node tools/frontline-action-showcase.mjs
// Optional: LSW_TEST_URL, LSW_SHOWCASE_OUT, LSW_SHOWCASE_HEADED=1.
// Page evaluation only READS runtime state; all game actions use native menu/input.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const out=resolve(process.env.LSW_SHOWCASE_OUT||'artifacts/frontline-action-showcase');
const width=1600,height=900,totalMs=90000;
const started=Date.now(),frames=[],errors=[],inputs=[],shots=[];
const result={kind:'native-input showcase',notAPerformanceBenchmark:true,totalBudgetMs:totalMs,
  constraints:{runtimeWrites:false,aiDisabled:false,simulationFrozen:false,newsMethodsWrapped:false},frames,inputs,shots};
let browser,context,page,phase='launch',targetIndex=-1,mouseX=width/2,mouseY=height/2;
const held=new Set();let rightHeld=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const launchedBeam=f=>!!f.beam&&!f.beam.dead&&!f.beam.pendingLaunch&&f.beam.pn>=2;
const wall=()=>Date.now()-started;
function budget(){if(wall()>totalMs)throw Error(`Total ${totalMs}ms budget exceeded during ${phase}`);}
await mkdir(out,{recursive:true});
// A stalled renderer must not leave held input or an unbounded browser behind.
const watchdog=setTimeout(()=>{result.deadlineExceeded=true;page?.close().catch(()=>{});},totalMs);
async function key(k,on){
  if(held.has(k)===on)return;
  if(on){await page.keyboard.down(k);held.add(k);}else{await page.keyboard.up(k);held.delete(k);}
  inputs.push({wallMs:wall(),phase,key:k,on});
}
async function right(on){
  if(rightHeld===on)return;
  if(on)await page.mouse.down({button:'right'});else await page.mouse.up({button:'right'});
  rightHeld=on;inputs.push({wallMs:wall(),phase,button:'right',on});
}
async function moveMouse(dx,dy){
  // Playwright emits trusted native mouse moves, including locked-pointer deltas.
  // Keep a continuous virtual cursor; recentering would itself turn the camera.
  dx=Math.round(clamp(dx,-150,150));dy=Math.round(clamp(dy,-110,110));
  if(!dx&&!dy)return;
  mouseX+=dx;mouseY+=dy;await page.mouse.move(mouseX,mouseY);
  inputs.push({wallMs:wall(),phase,mouseDelta:[dx,dy]});
}
async function sample(){
  budget();
  const requestWallMs=wall();
  const s=await page.evaluate(index=>{
    const g=window.PW?.game,p=g?.player,w=g?.world,T=window.LSW?.THREE;
    if(!p||!T)return {running:!!g?.running};
    const camera=w.camera,convoy=g.pwStage?.convoy,aircraft=g.pwStage?.aircraft,rec=document.querySelector('#hFieldRec');
    const projection=xyz=>{
      const point=new T.Vector3(...xyz),local=point.clone().applyMatrix4(camera.matrixWorldInverse),ndc=point.project(camera);
      return {local:local.toArray(),ndc:ndc.toArray(),inFrustum:local.z<0&&Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1&&ndc.z>=-1&&ndc.z<=1};
    };
    const vehicles=(convoy?.vehicles||[]).map((v,i)=>{
      const c=v.cover,aim=[c.x,c.bottom+(c.top-c.bottom)*.64,c.z];
      return {index:i,hp:c.hp,maxHp:c.maxHp,destroyed:v.destroyed,aim,bottom:c.bottom,top:c.top,
        distance:Math.hypot(aim[0]-p.pos.x,aim[1]-p.pos.y,aim[2]-p.pos.z),projection:projection(aim),breakerIsPlayer:c._breaker===p};
    });
    const slot=p.slots.rmb,beam=slot.active;
    // Diagnostic geometry only. Minimize segment-to-AABB squared distance on
    // each interval between box-plane crossings (piecewise quadratic), so a
    // segment crossing the scout cannot be missed by vertex-only sampling.
    const coverSummary=c=>c?{vehicle:convoy?.vehicles.findIndex(v=>v.cover===c)??-1,
      coverIndex:w.cover?.indexOf(c)??-1,name:c.mesh?.name||c.name||null,
      x:c.x,z:c.z,hx:c.hx,hz:c.hz,bottom:c.bottom,top:c.top,hp:c.hp}:null;
    const targetCover=convoy?.vehicles[index]?.cover;
    const path=beam?.path?Array.from(beam.path.subarray(0,beam.pn*3)):[];
    let nearest=null;
    if(targetCover&&path.length>=6){
      const c=targetCover,lo=[c.x-c.hx,c.bottom,c.z-c.hz],hi=[c.x+c.hx,c.top,c.z+c.hz];
      for(let i=3;i<path.length;i+=3){
        const a=path.slice(i-3,i),d=path.slice(i,i+3).map((v,k)=>v-a[k]),cuts=[0,1];
        for(let k=0;k<3;k++)if(Math.abs(d[k])>1e-12)for(const edge of [lo[k],hi[k]]){
          const t=(edge-a[k])/d[k];if(t>0&&t<1)cuts.push(t);
        }
        cuts.sort((a,b)=>a-b);
        for(let j=1;j<cuts.length;j++){
          const left=cuts[j-1],right=cuts[j],mid=(left+right)*.5;let qa=0,qb=0;
          for(let k=0;k<3;k++){
            const v=a[k]+d[k]*mid,edge=v<lo[k]?lo[k]:v>hi[k]?hi[k]:null;
            if(edge!==null){qa+=d[k]*d[k];qb+=(a[k]-edge)*d[k];}
          }
          const t=qa?Math.max(left,Math.min(right,-qb/qa)):left,point=a.map((v,k)=>v+d[k]*t),
            boxPoint=point.map((v,k)=>Math.max(lo[k],Math.min(hi[k],v))),distance=Math.hypot(...point.map((v,k)=>v-boxPoint[k]));
          if(!nearest||distance<nearest.distance)nearest={distance,segment:i/3,t,point,boxPoint};
        }
      }
    }
    const beamTelemetry=beam?{dead:!!beam.dead,maxLen:beam.maxLen,sustaining:beam.sustaining,
      pendingLaunch:beam.pendingLaunch,pn:beam.pn,radius:beam.radius,dir:beam.dir?.toArray(),muzzle:beam.muzzle?.toArray(),
      path,tip:path.length>=3?path.slice(-3):null,blocked:beam.blocked,
      // This scratch cache is reused by later fighter/LOS tests. It is NOT an
      // authoritative statement that the final beam tip hit this obstacle.
      cachedObstacle:beam._obstacleContact?{kind:beam._obstacleContact.kind,ground:beam._obstacleContact.ground,
        t:beam._obstacleContact.t,cover:coverSummary(beam._obstacleContact.target),note:'reused runtime scratch contact'}:null,
      targetPath:nearest?{...nearest,centerlineContact:nearest.distance<1e-6,
        withinBeamRadius:nearest.distance<=(beam.radius||0),cover:coverSummary(targetCover)}:null}:null;
    // DOM lettering is invisible to the Three body ray. Independently test
    // visible dialogue against the projected finite hose and aim corridor.
    const dialogue=(g.comic?.items||[]).filter(it=>it.kind==='field'||it.kind==='bub').map(it=>{
      const rect=it.node.getBoundingClientRect(),style=getComputedStyle(it.node);
      return {kind:it.kind,text:it.node.textContent,visible:rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&style.opacity!=='0',
        rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom}};
    });
    const projected=[];for(let i=0;i<path.length;i+=3){const q=projection(path.slice(i,i+3));projected.push(q.local[2]<-camera.near?[(q.ndc[0]+1)*innerWidth/2,(1-q.ndc[1])*innerHeight/2]:null);}
    const crosses=(a,b,rect)=>{
      let enter=0,leave=1;
      for(let axis=0;axis<2;axis++){
        const lo=(axis?rect.top:rect.left)-8,hi=(axis?rect.bottom:rect.right)+8,d=b[axis]-a[axis];
        if(Math.abs(d)<1e-9){if(a[axis]<lo||a[axis]>hi)return false;}
        else{const p=(lo-a[axis])/d,q=(hi-a[axis])/d;enter=Math.max(enter,Math.min(p,q));leave=Math.min(leave,Math.max(p,q));}
      }return enter<=leave;
    };
    const target=vehicles[index]?.projection,targetPx=target?.inFrustum?[(target.ndc[0]+1)*innerWidth/2,(1-target.ndc[1])*innerHeight/2]:null;
    const dialogueBlocked=dialogue.some(item=>item.visible&&(crosses([innerWidth/2,innerHeight/2],[innerWidth/2,innerHeight/2],item.rect)
      ||targetPx&&crosses(targetPx,targetPx,item.rect)||projected.some((q,i)=>i>0&&q&&projected[i-1]&&crosses(projected[i-1],q,item.rect))));
    // Pure geometric witness: do not assume a foreground shader faded the
    // hero. Use the rendered matrices without changing pose/camera/animation.
    const visible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const ray=new T.Raycaster(camera.position,new T.Vector3(0,0,-1).transformDirection(camera.matrixWorld),camera.near,30);
    const bodyHits=ray.intersectObject(p.parts.body,true).filter(hit=>visible(hit.object)&&[].concat(hit.object.material).some(m=>m.visible!==false&&!m.transparent));
    const head=projection(new T.Vector3().setFromMatrixPosition(p.parts.head.matrixWorld).toArray());
    return {time:g.time,matchT:g.matchT,running:g.running,matchOver:g.matchOver,mode:g.modeId,
      clock:{dateNow:Date.now(),performanceNow:performance.now(),timeOrigin:performance.timeOrigin,
        visibility:document.visibilityState,focused:document.hasFocus(),ema:w._ema,quality:w._qTier},
      encounter:!!g.ms.frontline,cameraPreset:p._cameraPreset,player:{id:p.def.id,alive:p.alive,hp:p.hp,ki:p.ki,
        pos:p.pos.toArray(),vel:p.vel.toArray(),flying:p.flying,gait:p.gait,ground:w.heightAt(p.pos.x,p.pos.z),
        projection:projection([p.pos.x,p.pos.y+5.4,p.pos.z])},
      look:{yaw:w._lookYaw,pitch:w._lookPitch,sens:w._lookSens},pointerLocked:!!document.pointerLockElement,
      camera:{position:camera.position.toArray(),fov:camera.fov},
      attackView:{opaqueBodyHits:bodyHits.map(hit=>({name:hit.object.name,geometry:hit.object.geometry.type,distance:hit.distance})),
        reticleClear:bodyHits.length===0,headVisible:visible(p.parts.head)&&head.inFrustum,head,dialogue,dialogueClear:!dialogueBlocked},
      aim:{hit:g._aimHit?.hit||null,targetVehicle:convoy?.vehicles.findIndex(v=>v.cover===g._aimHit?.ent)??-1,
        point:p.aimWorld?.toArray()},
      charging:!!slot.charging,chargeT:slot.chargeT||0,beam:beamTelemetry,
      control:{mouseRight:!!g.input.mouse.right,stagger:p.staggerT,stun:p.stunT,hitstop:p.hitstop,downed:p.downedT,
        frozen:p.frozenT,grabbed:!!p.grabbedBy,slotCd:slot.cd,launch:p.launchT,slamCd:p._slamCd,state:p.state,
        lastHitAge:p.lastHitT,lastHitKind:p._lastHitKind||null,burst:p._burst,burstResetIn:p._burstT,stunImmune:p._stunImmune,
        lastHitBy:p.lastHitBy?{name:p.lastHitBy.name,id:p.lastHitBy.def?.id,clone:!!p.lastHitBy._frontlineClone,pos:p.lastHitBy.pos?.toArray()}:null,
        lastAggressor:p._lastAggressor?.name||null,hitReaction:p._hitReaction?{offset:p._hitReaction.offset.toArray(),velocity:p._hitReaction.velocity.toArray()}:null,
        busy:!!(p.guarding||p.strikeActive>0||p.grabState||p.grabbing||p.meleeCharge>0||p.staggerT>0||p.stunT>0||p.hitstop>0)},
      convoy:{ready:!!convoy?.ready,error:convoy?.error?String(convoy.error):null,vehicles,target:vehicles[index]||null},
      dust:{active:convoy?.dust?.active||0,visible:!!convoy?.dust?.mesh.visible},
      aircraft:{ready:!!aircraft?.ready,error:aircraft?.error?String(aircraft.error):null,
        actors:(aircraft?.actors||[]).map(a=>({kind:a.kind,pos:a.wrapper.position.toArray(),projection:projection(a.wrapper.position.toArray())}))},
      clones:(g.ms.frontline?.soldiers||[]).map(f=>({name:f.name,hp:f.hp,alive:f.alive,aiEnabled:!!f.ai,pos:f.pos.toArray(),
        damageDealt:f.stats?.dmg||0,biggestHit:f.stats?.big||0,biggestHitKind:f.stats?.bigKind||null,rifleShot:f.slots.lmb?.handShots||null})),
      news:{enabled:!!g.news?.enabled,tag:g.news?.rec?.tag||null,title:g.news?.rec?.title||null,
        frames:g.news?.rec?.frames.filter(f=>typeof f==='string'&&f.startsWith('blob:')).length||0,
        pending:g.news?._encoder?.pending.size||0,
        clips:(g.news?.clips||[]).map(c=>({tag:c.tag,title:c.title,frames:c.frames.filter(f=>typeof f==='string'&&f.startsWith('blob:')).length})),
        indicator:rec?.dataset.state,text:rec?.querySelector('span')?.textContent,
        visible:!!rec&&!rec.hidden&&rec.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})}};
  },targetIndex);
  s.wallMs=wall();s.sampleRoundTripMs=s.wallMs-requestWallMs;s.phase=phase;frames.push(s);return s;
}
function alive(s){
  assert.ok(s.running&&!s.matchOver&&s.player?.alive&&s.player.hp>0,`Native player interrupted during ${phase}`);
  assert.ok(s.pointerLocked,`Pointer lock lost during ${phase}`);
  assert.ok(s.clones.every(c=>c.aiEnabled),'Clone AI must remain enabled');
}
async function tick(ms=85){await page.waitForTimeout(ms);const s=await sample();alive(s);return s;}
async function until(test,ms,label){
  const end=Date.now()+ms;
  do{const s=await tick();if(test(s))return s;}while(Date.now()<end);
  throw Error(`${label} timed out after ${ms}ms`);
}
async function shot(name){
  const before=await sample();await page.screenshot({path:resolve(out,name+'.png'),timeout:5000});
  shots.push({name,path:resolve(out,name+'.png'),beforeFrame:frames.length-1,time:before.time,phase});
}
async function orient(yaw,pitch){
  for(let i=0;i<24;i++){
    const s=await tick(55),dyaw=angle(yaw-s.look.yaw),dpitch=pitch-s.look.pitch;
    if(Math.abs(dyaw)<.018&&Math.abs(dpitch)<.018)return;
    await moveMouse(-dyaw/s.look.sens,-dpitch/s.look.sens);
  }
  throw Error('Native mouse look did not converge');
}
async function aimAtTarget(ms=5000){
  const end=Date.now()+ms;
  do{
    const s=await tick(),t=s.convoy.target;
    assert.ok(t&&!t.destroyed,'Selected scout disappeared before the beam');
    const [x,y,z]=t.projection.local;
    if(z<0&&Math.abs(Math.atan2(x,-z))<.008&&Math.abs(Math.atan2(y,Math.hypot(x,z)))<.008&&s.aim.hit==='cover'&&s.aim.targetVehicle===targetIndex)return s;
    await moveMouse(Math.atan2(x,-z)/s.look.sens,-Math.atan2(y,Math.hypot(x,z))/s.look.sens);
  }while(Date.now()<end);
  throw Error('Camera ray did not acquire the actual scout cover (terrain/foe obstruction or aim failure)');
}
try{
  browser=await chromium.launch({channel:'chromium',headless:process.env.LSW_SHOWCASE_HEADED!=='1',timeout:15000});
  context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});
  page=await context.newPage();page.setDefaultTimeout(6000);page.setDefaultNavigationTimeout(20000);
  page.on('pageerror',e=>errors.push({phase,kind:'pageerror',message:e.message}));
  page.on('console',m=>{if(m.type()==='error')errors.push({phase,kind:'console',message:m.text()});});
  phase='menu';
  await page.addInitScript(()=>{
    // Harness-owned observers only. No wrapping render/encoder/input methods,
    // stepping simulation, or writing into game state. Bound diagnostic memory.
    const trace=window.__showcaseTiming={longTasks:[],frameGaps:[],observerSupported:false};
    const add=(list,value)=>{if(list.length<256)list.push(value);};
    try{
      new PerformanceObserver(list=>{for(const entry of list.getEntries())add(trace.longTasks,{
        start:entry.startTime,duration:entry.duration,name:entry.name,observedPerformanceNow:performance.now(),observedDateNow:Date.now(),
        observedGameTime:window.PW?.game?.time??null,
        attribution:(entry.attribution||[]).map(a=>({name:a.name,containerType:a.containerType,containerName:a.containerName}))});}).observe({type:'longtask',buffered:true});
      trace.observerSupported=true;
    }catch(error){trace.observerError=String(error);}
    let previous=null;
    const frame=()=>{
      const g=window.PW?.game,current={performanceNow:performance.now(),dateNow:Date.now(),gameTime:g?.time??null,
        visibility:document.visibilityState,focused:document.hasFocus(),newsTag:g?.news?.rec?.tag??null,encoderPending:g?.news?._encoder?.pending.size??0};
      if(previous&&current.performanceNow-previous.performanceNow>100)add(trace.frameGaps,{from:previous,to:current,
        performanceDelta:current.performanceNow-previous.performanceNow,dateDelta:current.dateNow-previous.dateNow,
        gameDelta:current.gameTime===null||previous.gameTime===null?null:current.gameTime-previous.gameTime});
      previous=current;requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:1.25,cameraPreset:'frontline'})));
  await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.PW?.game);
  await page.locator('#pwEncounter [data-encounter="frontline"]').click();
  await page.locator('#pwCamera [data-camera="frontline"]').click();
  await page.screenshot({path:resolve(out,'00-native-menu.png')});
  await page.locator('#pwGo').click({timeout:20000});await page.waitForFunction(()=>PW.game.running&&PW.game.player?.def.id==='vega'&&PW.game.pwStage?.frontlineReady,null,{polling:100,timeout:60000});
  await page.mouse.click(mouseX,mouseY,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement,null,{polling:100,timeout:10000});
  phase='takeoff';await key('Space',true);
  await until(s=>s.player.flying&&s.player.pos[1]-s.player.ground>35,15000,'Native takeoff');
  phase='assets';
  let s=await until(s=>{if(s.convoy.error||s.aircraft.error)throw Error(s.convoy.error||s.aircraft.error);return s.convoy.ready&&s.convoy.vehicles.length===3&&s.aircraft.ready;},15000,'Authored assets');
  assert.equal(s.mode,'powerworld');assert.equal(s.encounter,true);assert.equal(s.cameraPreset,'frontline');assert.equal(s.clones.length,4);
  targetIndex=s.convoy.vehicles.filter(v=>!v.destroyed).sort((a,b)=>a.distance-b.distance)[0]?.index??-1;
  assert.ok(targetIndex>=0,'No live scout remains');s=await sample();result.setup=s;
  // Read terrain and native cover heights along the straight input route. No
  // teleport, fixture placement, re-grounding or camera setters are used.
  const route=await page.evaluate(index=>{
    const g=PW.game,p=g.player.pos,c=g.pwStage.convoy.vehicles[index].cover;
    const dx=c.x-p.x,dz=c.z-p.z,d=Math.hypot(dx,dz),travel=Math.max(0,d-92),ex=p.x+dx/d*travel,ez=p.z+dz/d*travel;
    let ceiling=g.world.heightAt(p.x,p.z);
    for(let i=0;i<=30;i++){
      const x=p.x+(ex-p.x)*i/30,z=p.z+(ez-p.z)*i/30;
      ceiling=Math.max(ceiling,g.world.heightAt(x,z));
      for(const block of g.world.cover)if(block.hp>0&&Math.abs(x-block.x)<(block.hx??block.r??0)+12&&Math.abs(z-block.z)<(block.hz??block.r??0)+12)ceiling=Math.max(ceiling,block.top??block.h??0);
    }
    return {yaw:Math.atan2(dx,dz),ceiling:ceiling+38,end:[ex,ez],attackHeight:Math.max(g.world.heightAt(ex,ez)+30,c.top+40)};
  },targetIndex);result.route=route;
  phase='clearance';await orient(route.yaw,0);
  if(s.player.pos[1]<route.ceiling){await key('Space',true);await until(s=>s.player.pos[1]>=route.ceiling,7500,'Route clearance');await key('Space',false);}
  // Escape while climbing. A still-image readback before W previously left the
  // player hovering in live rifle fire for several seconds; the video captures
  // this approach without inserting that extra stationary exposure.
  phase='approach';await key('w',true);await key('Space',true);await key('Shift',true);
  const approachEnd=Date.now()+10000;
  do{
    s=await tick();
    if(s.player.pos[1]>=Math.max(route.ceiling,route.attackHeight))await key('Space',false);
    if(Math.hypot(s.player.pos[0]-s.convoy.target.aim[0],s.player.pos[2]-s.convoy.target.aim[2])<100)break;
    if(Date.now()>approachEnd)throw Error('Native W convoy approach timed out');
  }while(true);
  await key('w',false);await key('Space',false);await key('Shift',false);
  const brakeTime=(await sample()).time;
  await until(s=>s.time-brakeTime>=1.2&&Math.hypot(s.player.vel[0],s.player.vel[2])<3,12000,'Flight braking (1.2s simulation / 12s wall cap)');
  phase='attack-altitude';s=await sample();
  if(s.player.pos[1]>route.attackHeight+4){await key('z',true);await until(s=>s.player.pos[1]<=route.attackHeight,6500,'Native descent');await key('z',false);}
  if(s.player.pos[1]<route.attackHeight-4){await key('Space',true);await until(s=>s.player.pos[1]>=route.attackHeight,6500,'Native attack ascent');await key('Space',false);}
  await until(s=>Math.abs(s.player.vel[1])<2,3000,'Hover settle');
  // Recover through normal controls BEFORE shooting if the approach was
  // interrupted. A grounded shot followed by takeoff is not an air-combat proof.
  s=await until(s=>!s.control.busy,3000,'Native action recovery');
  if(!s.player.flying){
    await key('f',true);await key('f',false);await key('Space',true);
    await until(s=>s.player.flying&&s.player.pos[1]-s.player.ground>28,3000,'Native pre-attack flight recovery');
    await key('Space',false);
  }
  phase='aim';s=await aimAtTarget();assert.ok(s.convoy.target.distance<140,'Scout is outside the finite beam envelope');
  result.aimWitness=s; // the video carries approach/aim; do not idle in rifle fire for a PNG
  // Strafe under real fire while charging; stationary hovering gives all four
  // live riflemen a clean burst. Camera-space feedback continues to aim the hose.
  phase='charged-beam';result.beforeBeam=await sample();await key('d',true);await right(true);let lastPress=Date.now();
  const firingEnd=Date.now()+8000;let chargeShot=false,beamShot=false,destroyed=false;
  do{
    s=await tick(65);
    // Alternate using observed game time, never an actor velocity/position
    // write. This preserves independent moving aim without orbiting behind
    // the convoy during the held beam or deliberately posing an aftermath.
    const strafe=Math.floor((s.time-result.beforeBeam.time)/.65)%2===0?'d':'a';
    await key(strafe==='d'?'a':'d',false);await key(strafe,true);
    if(s.charging&&s.chargeT>.45&&!chargeShot){chargeShot=true;await shot('03-native-charge');}
    if(launchedBeam(s)&&!beamShot){beamShot=true;await shot('04-native-beam');}
    if(s.convoy.target.destroyed){destroyed=true;result.destruction=s;break;}
    // A press during native hitstop/stagger is correctly rejected, not buffered.
    // Retry a real up/down edge only after recovery, never clear those gates.
    if(!s.charging&&!s.beam&&!s.control.busy&&s.control.slotCd<=0&&Date.now()-lastPress>450){
      await right(false);await tick(90);await right(true);lastPress=Date.now();
    }
    const [x,y,z]=s.convoy.target.projection.local;
    await moveMouse(Math.atan2(x,-z)/s.look.sens,-Math.atan2(y,Math.hypot(x,z))/s.look.sens);
  }while(Date.now()<firingEnd);
  await right(false);await key('d',false);await key('a',false);assert.ok(destroyed,'Finite native RMB charge/beam did not destroy the scout');
  assert.ok(chargeShot&&beamShot,'Both the native charge and traveling beam must have been observed');
  assert.ok(frames.some(f=>f.phase==='charged-beam'&&f.convoy.target.hp<result.beforeBeam.convoy.target.hp),'No scout damage observed during the real beam');
  result.airCombatPassed=!!result.destruction.player.flying&&frames.some(f=>f.phase==='charged-beam'&&f.player.flying&&launchedBeam(f)&&f.convoy.target.hp<result.beforeBeam.convoy.target.hp);
  assert.ok(result.airCombatPassed,'Scout damage and destruction must occur during native flight, not a grounded beam');
  const attackFrames=frames.filter(f=>f.phase==='charged-beam'&&(f.charging||launchedBeam(f)));
  let blockedSince=null,blockedSamples=0,maxBlockedDuration=0;
  for(const f of attackFrames){
    if(!f.attackView.reticleClear){blockedSince??=f.time;blockedSamples++;if(blockedSamples>1)maxBlockedDuration=Math.max(maxBlockedDuration,f.time-blockedSince);}
    else{blockedSince=null;blockedSamples=0;}
  }
  result.attackPresentation={samples:attackFrames.length,blockedSamples:attackFrames.filter(f=>!f.attackView.reticleClear).length,
    dialogueBlockedSamples:attackFrames.filter(f=>!f.attackView.dialogueClear).length,
    visibleDialogueSamples:attackFrames.filter(f=>f.attackView.dialogue.some(item=>item.visible)).length,
    headOutsideSamples:attackFrames.filter(f=>!f.attackView.headVisible).length,maxBlockedDuration,
    chargeClear:attackFrames.some(f=>f.charging&&f.attackView.reticleClear&&f.attackView.headVisible),
    beamClear:attackFrames.some(f=>launchedBeam(f)&&f.attackView.reticleClear&&f.attackView.headVisible),
    note:'Sampled geometric centre ray through visible opaque body meshes; no foreground-shader exemption. Not full-frame visibility proof.'};
  assert.ok(maxBlockedDuration<.15,'Sustained opaque hero obstruction hid the native attack despite scout damage');
  assert.ok(result.attackPresentation.chargeClear&&result.attackPresentation.beamClear,'Missing geometrically clear charge/beam with the native head in frame');
  assert.equal(result.attackPresentation.dialogueBlockedSamples,0,'Visible dialogue intersects the sampled finite beam or aim/target corridor');
  for(const capture of shots.filter(shot=>/^0[34]-/.test(shot.name))){
    const view=frames[capture.beforeFrame].attackView;
    assert.ok(view.reticleClear&&view.headVisible,`${capture.name} captured an obstructed attack view or offscreen head`);
  }
  phase='aftermath';
  // Being shot can end flight. Re-enter it through the actual toggle and ascend
  // input, not a flying/velocity write; native stun may still reject the attempt.
  s=await sample();
  if(!s.player.flying){await key('f',true);await key('f',false);}
  await key('Space',true);
  await until(s=>s.dust.active>0&&s.news.tag&&s.news.indicator==='recording'&&s.news.visible&&s.news.text==='REC',1500,'Real destruction dust and REC');
  await shot('05-native-destruction-rec');await key('Space',false);
  // Turn toward the angular midpoint of the real dust plume and the nearest
  // aircraft direction. This only steers the mouse; neither actor moves for the
  // shot. They may not fit: report projections without asserting visibility.
  s=await sample();
  const direction=point=>{const v=point.map((n,i)=>n-s.camera.position[i]),d=Math.hypot(...v);return v.map(n=>n/d);};
  const plume=direction([s.convoy.target.aim[0],s.convoy.target.top+24,s.convoy.target.aim[2]]);
  const candidates=s.aircraft.actors.map(a=>({kind:a.kind,dir:direction(a.pos)}));
  candidates.sort((a,b)=>b.dir.reduce((sum,n,i)=>sum+n*plume[i],0)-a.dir.reduce((sum,n,i)=>sum+n*plume[i],0));
  if(candidates.length){
    const view=plume.map((n,i)=>n+candidates[0].dir[i]);
    result.aftermathAircraft=candidates[0].kind;
    await orient(Math.atan2(view[0],view[2]),Math.atan2(view[1],Math.hypot(view[0],view[2])));
  }
  await key('d',true);await tick(250);await shot('06-native-flight-aftermath');await key('d',false);
  phase='footage-settle';await until(s=>!s.news.tag&&s.news.pending===0,10000,'Natural news finalization');
  result.final=await sample();await shot('07-native-live-recovery');
  result.evidence={charge:chargeShot,travelingBeam:beamShot,destroyedScout:targetIndex,
    airborneBeamAndDestruction:result.airCombatPassed,
    dustAndRec:frames.some(f=>f.phase==='aftermath'&&f.dust.active>0&&f.news.tag&&f.news.visible&&f.news.text==='REC'),
    aftermathAircraftInFrustum:frames.some(f=>f.phase==='aftermath'&&f.dust.active>0&&f.aircraft.actors.some(a=>a.projection.inFrustum)),
    aftermathFlyingHeroInFrustum:frames.some(f=>f.phase==='aftermath'&&f.player.flying&&f.player.projection.inFrustum),
    note:'In-frustum checks are geometric, not proof of visibility; inspect PNG/video. Page/console errors only; news renderer is not monkey-patched.'};
  result.evidence.combinedAftermathCandidate=frames.some(f=>f.phase==='aftermath'&&f.dust.active>0&&f.news.tag&&f.news.visible&&f.news.text==='REC'&&f.player.flying&&f.player.projection.inFrustum&&f.aircraft.actors.some(a=>a.projection.inFrustum));
  assert.ok(result.final.news.clips.some(c=>c.frames>=6&&/SCOUT/i.test(c.title)),'Destruction footage did not naturally finalize into a playable clip');
  assert.deepEqual(errors,[],'Native page/console error');
  result.gameplayPassed=true;
  assert.ok(result.evidence.combinedAftermathCandidate,'Gameplay passed, but live airborne hero + aircraft + dust + REC did not share the aftermath view');
  result.success=true;
}catch(error){
  result.success=false;result.failure={phase,message:error.message,stack:error.stack};process.exitCode=1;
  if(page&&!page.isClosed()){await sample().catch(()=>{});await page.screenshot({path:resolve(out,'failure.png'),timeout:5000}).catch(()=>{});}
}finally{
  for(const k of [...held])await key(k,false).catch(()=>{});
  await right(false).catch(()=>{});
  if(page&&!page.isClosed())result.browserTiming=await page.evaluate(()=>window.__showcaseTiming).catch(error=>({error:String(error)}));
  clearTimeout(watchdog);
  result.clockIntervals=frames.slice(1).map((f,i)=>({phase:f.phase,fromFrame:i,toFrame:i+1,wallDelta:f.wallMs-frames[i].wallMs,
    gameDelta:f.time-frames[i].time,performanceDelta:f.clock?.performanceNow-frames[i].clock?.performanceNow,
    dateDelta:f.clock?.dateNow-frames[i].clock?.dateNow,sampleRoundTripMs:f.sampleRoundTripMs}));
  const video=page?.video();await context?.close().catch(()=>{});
  if(video)result.video=await video.path().catch(()=>null);
  await browser?.close().catch(()=>{});result.wallMs=wall();result.errors=errors;
  await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({success:result.success,failure:result.failure,evidence:result.evidence,out,wallMs:result.wallMs,video:result.video}));
}
