import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseURL=process.env.LSW_BASE_URL||'http://127.0.0.1:5182';
const out='artifacts/power-pilot/activation';
await mkdir(out,{recursive:true});

const cases=[
  {id:'rime',slot:'shift',kind:'key',key:'ShiftLeft',dist:26,tailFrames:14},
  {id:'volt',slot:'shift',kind:'key',key:'ShiftLeft',dist:26,tailFrames:14},
  {id:'warden',slot:'shift',kind:'key',key:'ShiftLeft',dist:26,tailFrames:14},
  {id:'torch',slot:'shift',kind:'key',key:'ShiftLeft',dist:26,tailFrames:14},
  {id:'volt',slot:'lmb',kind:'mouse',dist:34,tailFrames:60},
];

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:1280,height:720},
  recordVideo:{dir:`${out}/video`,size:{width:1280,height:720}},
});
const report={
  baseURL,
  scope:'Native Playwright key/mouse input on powerworld.html. Actor/target placement is staged and labelled; runtime source is unchanged.',
  generatedAt:new Date().toISOString(),
  errors:[],
  runs:[],
};

function summarise(trace){
  const a=trace[0],b=trace.at(-1),target0=a?.targetHp??null,target1=b?.targetHp??null;
  if(!a||!b)return {};
  return {
    start:[a.x,a.y,a.z],end:[b.x,b.y,b.z],
    displacement:+Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z).toFixed(3),
    horizontalDisplacement:+Math.hypot(b.x-a.x,b.z-a.z).toFixed(3),
    peakSpeed:+Math.max(...trace.map(s=>s.speed)).toFixed(3),
    kiSpent:+(a.ki-b.ki).toFixed(3),
    cooldownPeak:+Math.max(...trace.map(s=>s.cd)).toFixed(3),
    targetDamage:target0==null||target1==null?null:+(target0-target1).toFixed(3),
    comboPeak:Math.max(...trace.map(s=>s.combo||0)),
  };
}

async function openCase(spec,{clock='stepped',fire=true,stage='bench'}={}){
  console.log('running',spec.id,spec.slot,clock,stage,fire?'native':'none');
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${baseURL}/powerworld.html`);
  await page.waitForFunction(()=>window.LSW?.game&&window.LSW?.enter);
  await page.evaluate(id=>LSW.enter({mode:'training',p1:id}),spec.id);
  await page.waitForFunction(id=>LSW.game.running&&!LSW.hud.titleOpen&&LSW.game.player?.def?.id===id,spec.id);
  // Vite can perform one documented dependency-optimisation reload. Do not
  // mistake that page replacement for a combat result.
  await page.waitForTimeout(900);
  if(!await page.evaluate(id=>LSW.game.player?.def?.id===id,spec.id)){
    await page.evaluate(id=>LSW.enter({mode:'training',p1:id}),spec.id);
    await page.waitForFunction(id=>LSW.game.running&&!LSW.hud.titleOpen&&LSW.game.player?.def?.id===id,spec.id);
    await page.waitForTimeout(250);
  }

  const setup=await page.evaluate(({spec,clock,stage})=>{
    const g=LSW.game,p=g.player,w=g.world;
    if(clock==='stepped'){
      window.__pilotRealUpdate=g.update.bind(g);
      g.update=()=>{};
    }
    if(g.news)g.news.enabled=false;
    g.hardLock=null;g.lockTarget=null;
    for(let i=g.entities.length-1;i>=0;i--){
      const e=g.entities[i];
      if(e!==p){try{e.dispose?.();}catch{}g.scene.remove(e.obj);g.entities.splice(i,1);}
    }
    const clearAt=(x,z,r=5)=>!(w.cover||[]).some(c=>!c.destroyed&&Math.abs(x-c.x)<(c.hx??c.r)+r&&Math.abs(z-c.z)<(c.hz??c.r)+r);
    const levelLine=(x,z,len)=>{
      const hs=[];for(let i=0;i<=12;i++)hs.push(w.heightAt(x+len*i/12,z));
      return Math.max(...hs)-Math.min(...hs)<.02;
    };
    let px=-spec.dist/2,pz=0;
    if(stage==='neutral'){
      outer:for(let z=-120;z<=120;z+=12)for(let x=-120;x<=80;x+=12){
        if(!levelLine(x,z,spec.dist+20))continue;
        let ok=true;for(let t=-8;t<=spec.dist+20;t+=4)if(!clearAt(x+t,z,7)){ok=false;break;}
        if(ok){px=x;pz=z;break outer;}
      }
    }
    const ground=w.heightAt(px,pz),tx=px+spec.dist,tg=w.heightAt(tx,pz);
    p.pos.set(px,ground,pz);p.spawn.copy(p.pos);p.vel.set(0,0,0);p.groundY=ground;
    p.facing=0;p.aim.set(1,0,0);p.aim3.set(1,0,0);p.moveDir={x:0,z:0};
    p.hitstop=0;p.staggerT=0;p.stunT=0;p.frozenT=0;p.downedT=0;p.invuln=0;p.ki=p.maxKi;
    const st=p.slots[spec.slot];if(st){st.cd=0;st.combo=0;st.timer=0;st.foe=null;}
    const target=g.spawnDummy(tx,pz);target.pos.y=tg;target.spawn.copy(target.pos);target.vel.set(0,0,0);
    target.hp=target.maxHp;target.invuln=0;target._vis=1;target.ai=null;
    g.aimPoint.copy(target.pos);target.center(p.aimWorld);p.hasAimWorld=true;
    // Chase centre points along +X. Native controlPlayer remains installed and owns aim/input.
    w._lookYaw=Math.PI/2;w._lookPitch=0;w.snapChase?.();
    const cover=(w.cover||[]).filter(c=>!c.destroyed&&Math.abs(c.z-pz)<(c.hz??c.r)+8&&c.x>px-10&&c.x<tx+20)
      .map(c=>({x:+c.x.toFixed(2),z:+c.z.toFixed(2),hx:c.hx??c.r,hz:c.hz??c.r,top:c.top}));
    const terrain=[];for(let i=0;i<=16;i++){const x=px-8+(spec.dist+28)*i/16;terrain.push({x:+x.toFixed(2),y:+w.heightAt(x,pz).toFixed(3)});}
    return {stage,clock,player:[px,ground,pz],target:[tx,tg,pz],cover,terrain,
      actor:{onFoot:p.onFoot,grounded:p.grounded,gait:p.gait,openSky:p._openSky,aim:[p.aim.x,p.aim.y,p.aim.z]},
      slot:{type:st?.def?.type,name:st?.def?.name,cost:st?.def?.cost,power:st?.def?.power,range:st?.def?.range}};
  },{spec,clock,stage});

  const sample=()=>page.evaluate(({slot})=>{
    const g=LSW.game,p=g.player,st=p.slots[slot],t=g.entities.find(e=>e!==p&&e.isDummy);
    return {t:performance.now(),x:p.pos.x,y:p.pos.y,z:p.pos.z,vx:p.vel.x,vy:p.vel.y,vz:p.vel.z,
      speed:Math.hypot(p.vel.x,p.vel.y,p.vel.z),ki:p.ki,cd:st?.cd||0,combo:st?.combo||0,
      targetHp:t?.hp??null,targetInvuln:t?.invuln??null,targetVis:t?._vis??null,
      aim:[p.aim.x,p.aim.y,p.aim.z],move:[p.moveDir?.x||0,p.moveDir?.z||0],
      grounded:p.grounded,onFoot:p.onFoot,gait:p.gait,burstT:p.burstT||0,
    };
  },{slot:spec.slot});
  const trace=[await sample()];
  const canvas=page.locator('canvas').first();const box=await canvas.boundingBox();
  if(box)await page.mouse.move(box.x+box.width/2,box.y+box.height/2);

  if(clock==='stepped'){
    const step=async()=>{
      await page.evaluate(()=>{window.__pilotRealUpdate(1/60,1/60);LSW.input.endFrame();});
      trace.push(await sample());
    };
    if(fire){
      if(spec.kind==='key')await page.keyboard.down(spec.key);else await page.mouse.down({button:'left'});
      await step();
      if(spec.kind==='key')await page.keyboard.up(spec.key);else await page.mouse.up({button:'left'});
    }else await step();
    for(let i=0;i<spec.tailFrames;i++)await step();
  }else{
    await page.evaluate(()=>{
      window.__pilotTrace=[];window.__pilotTraceOn=true;
      const tick=()=>{if(!window.__pilotTraceOn)return;const g=LSW.game,p=g.player;if(!p){window.__pilotTraceOn=false;return;}const st=p.slots[window.__pilotSlot],t=g.entities.find(e=>e!==p&&e.isDummy);
        window.__pilotTrace.push({t:performance.now(),x:p.pos.x,y:p.pos.y,z:p.pos.z,vx:p.vel.x,vy:p.vel.y,vz:p.vel.z,speed:Math.hypot(p.vel.x,p.vel.y,p.vel.z),ki:p.ki,cd:st?.cd||0,combo:st?.combo||0,targetHp:t?.hp??null,targetInvuln:t?.invuln??null,targetVis:t?._vis??null,aim:[p.aim.x,p.aim.y,p.aim.z],move:[p.moveDir?.x||0,p.moveDir?.z||0],grounded:p.grounded,onFoot:p.onFoot,gait:p.gait,burstT:p.burstT||0});requestAnimationFrame(tick);};requestAnimationFrame(tick);
    });
    await page.evaluate(slot=>window.__pilotSlot=slot,spec.slot);
    if(fire){
      if(spec.kind==='key'){await page.keyboard.down(spec.key);await page.waitForTimeout(60);await page.keyboard.up(spec.key);}
      else {await page.mouse.down({button:'left'});await page.waitForTimeout(60);await page.mouse.up({button:'left'});}
    }
    await page.waitForTimeout(spec.kind==='mouse'?1250:700);
    const native=await page.evaluate(()=>{window.__pilotTraceOn=false;return window.__pilotTrace;});
    trace.push(...native);
  }
  const final=await page.evaluate(({slot})=>{
    const g=LSW.game,p=g.player;if(!p)return {player:null,reloaded:true,errors:[...(g._errSeen||[])]};const st=p.slots[slot],t=g.entities.find(e=>e!==p&&e.isDummy);
    const blockers=(g.world.cover||[]).filter(c=>!c.destroyed).map(c=>({x:c.x,z:c.z,hx:c.hx??c.r,hz:c.hz??c.r,top:c.top}));
    return {player:{pos:[p.pos.x,p.pos.y,p.pos.z],aim:[p.aim.x,p.aim.y,p.aim.z],ki:p.ki},target:{pos:t?[t.pos.x,t.pos.y,t.pos.z]:null,hp:t?.hp,invuln:t?.invuln,vis:t?._vis},slot:{cd:st?.cd,combo:st?.combo,hasFoe:!!st?.foe},blockers,errors:[...(g._errSeen||[])]};
  },{slot:spec.slot});
  const run={case:`${spec.id}.${spec.slot}`,input:fire?'native':'none',clock,stage,setup,trace,summary:summarise(trace),final,errors};
  if(fire&&clock==='native')await page.screenshot({path:`${out}/${spec.id}-${spec.slot}-${stage}-native.png`});
  report.runs.push(run);report.errors.push(...errors);
  const video=page.video();await page.close();
  if(video)run.video=await video.path();
  return run;
}

async function harnessProbe(){
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${baseURL}/powerworld.html`);
  await page.waitForFunction(()=>window.LSW?.abilitySuite);
  // Load the lazy ability bench before creating the measured match. Vite may
  // replace the first page while optimising that module.
  try{await page.evaluate(()=>LSW.abilityList());}catch{}
  await page.waitForFunction(()=>window.LSW?.abilitySuite);
  await page.evaluate(()=>LSW.enter({mode:'training',p1:'sol'}));
  await page.waitForFunction(()=>LSW.game.running&&!LSW.hud.titleOpen);
  await page.evaluate(()=>{LSW.game.world.render=()=>{};});
  const ids=await page.evaluate(()=>LSW.ROSTER.map(d=>d.id));
  const through=ids.slice(0,ids.indexOf('torch')+1),sequence=[];
  const terrain=()=>page.evaluate(()=>{
    const w=LSW.game.world,points=[[-17,0],[-13,0],[13,0],[17,0],[-11,6],[-11,-6],[11,6],[11,-6]];
    return {points:points.map(([x,z])=>({x,z,y:+w.heightAt(x,z).toFixed(3)})),
      min:+Math.min(...(w._gh||[0])).toFixed(3),max:+Math.max(...(w._gh||[0])).toFixed(3),
      activeCover:(w.cover||[]).length,allCover:(w.coverAll||[]).length};
  });
  for(const id of through){
    const before=await terrain(),suite=await page.evaluate(id=>LSW.abilitySuite({only:id}),id),after=await terrain();
    sequence.push({id,before,after,failures:suite.rows.filter(r=>!r.ok).map(r=>({slot:r.slot,name:r.name,raw:r.raw,dmg:r.dmg,ki:r.ki,why:r.why}))});
  }
  const resetChecks=[];
  for(const spec of cases){
    await page.evaluate(()=>LSW.game.world.resetTerrain());
    const before=await terrain();
    const row=await page.evaluate(({id,slot})=>LSW.stageAbility(id,slot,{resume:true}),spec);
    resetChecks.push({case:`${spec.id}.${spec.slot}`,before,row});
  }
  const result={baseURL,scope:'Production abilitySuite sequence through TORCH, then the same five rows after world.resetTerrain before each row.',errors,sequence,resetChecks};
  await writeFile(`${out}/harness-probe.json`,JSON.stringify(result,null,2));
  await page.close();await context.close();await browser.close();
  console.log('Evidence:',`${out}/harness-probe.json`);
}

if(process.argv.includes('--harness-probe')){
  await harnessProbe();
  process.exit(0);
}

try{
  // Normal rAF runs prove the production input path without clock substitution.
  if(!process.argv.includes('--stepped-only')){
    for(const spec of cases){
      await openCase(spec,{clock:'native',fire:false,stage:'bench'});
      await openCase(spec,{clock:'native',fire:true,stage:'bench'});
    }
  }
  // Deterministic native-event comparisons isolate bench placement from a clear, level lane.
  if(!process.argv.includes('--native-only')){
    for(const spec of cases)for(const stage of ['bench','neutral']){
      await openCase(spec,{clock:'stepped',fire:false,stage});
      await openCase(spec,{clock:'stepped',fire:true,stage});
    }
  }
}finally{
  await context.close();await browser.close();
  const suffix=process.argv.includes('--native-only')?'-native':process.argv.includes('--stepped-only')?'-stepped':'';
  await writeFile(`${out}/diagnosis${suffix}.json`,JSON.stringify(report,null,2));
}

for(const spec of cases){
  const rows=report.runs.filter(r=>r.case===`${spec.id}.${spec.slot}`);
  console.log(`\n${spec.id}.${spec.slot}`);
  for(const r of rows)console.log(`${r.clock}/${r.stage}/${r.input}:`,r.summary);
}
const suffix=process.argv.includes('--native-only')?'-native':process.argv.includes('--stepped-only')?'-stepped':'';
console.log(`\nEvidence: ${out}/diagnosis${suffix}.json`);
