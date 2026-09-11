import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// A bounded native eight-Fighter/render/resource fixture. Its wide inspection
// camera and scripted movement are not a player-input or AI-fight assessment.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const out=process.env.LSW_NANITE_STRESS_OUT||'artifacts/nanite-stress';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],results={};
page.setDefaultTimeout(60000);
page.on('pageerror',e=>errors.push(e.message));
page.on('crash',()=>{errors.push('Chromium page crash');console.error('Chromium page crash during native nanite stress');});
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 results.hardware=await page.evaluate(()=>{
  const gl=LSW.game.world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {userAgent:navigator.userAgent,logicalProcessors:navigator.hardwareConcurrency,dpr:devicePixelRatio,
   visibility:document.visibilityState,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
 });
 await page.evaluate(async()=>{
  const {game:g,THREE:T,ROSTER}=LSW;
  const {buildDef,freshPicks,POWERS}=await import('/src/data/creator.js');
  const {profileFromDef,applyProfile}=await import('/src/tool/studio-profile.js');
  const {attackIdentity,attackSource}=await import('/src/data/attack-tuning.js');
  if(!POWERS.some(p=>p.id==='nanite-shield'))throw Error('Public protecting shield required before stress acceptance');
  const nativeUpdate=g.update.bind(g),nativeRender=g.world.render.bind(g.world);
  g.update=()=>{};g.world.render=()=>{};
  let actors=[],sim=0,owned=new Map(),pressure=false,nextBurst=0,launched=0,contacts=[];
  const nativeHit=g.onHit.bind(g);
  g.onHit=(target,amount,opts,blocked)=>{
   if(pressure&&actors.includes(target))contacts.push({time:sim,bodyDamage:amount,absorbed:opts?.naniteResult?.absorbed||0,integrity:opts?.naniteResult?.integrity||0,blocked});
   return nativeHit(target,amount,opts,blocked);
  };
  const info=g.world.renderer.info;info.autoReset=false;
  g.world.qualityOverride=2;g.world._qTier=2;g.world._applyQuality();
  const banner=document.createElement('div');
  banner.style.cssText='position:fixed;top:80px;left:20px;right:20px;color:#fff3d9;background:#171c18ed;padding:10px;font:13px system-ui;z-index:10000';
  document.body.append(banner);
  const control=(f,dt)=>{
   if(!actors.includes(f)||!f.alive)return;
   const index=actors.indexOf(f),direction=f._stressDirection;
   direction.set(Math.sin(sim*1.7+index*.2)*.35,0,0);
   f.move(direction,dt);f.aim.set(0,0,1);f.aim3.set(0,0,1);
   g.melee.guard(f,index%2===0);f.flyHeld=false;f.descendHeld=false;
  };
  g.controlPlayer=dt=>control(g.player,dt);g.controlBot=control;
  const watch=f=>f.obj.traverse(o=>{
   if(!o.userData.naniteOwned)return;
   for(const resource of [o,o.geometry,...[].concat(o.material)])if(resource&&!owned.has(resource)){
    const record={type:resource===o?'instance':resource.isMaterial?'material':'geometry',count:0};
    owned.set(resource,record);resource.addEventListener('dispose',()=>record.count++);
   }
  });
  const counts=()=>{
   let modules=0,fragments=0,capacity=0,matrices=0,ready=0,structural=0;
   for(const f of actors){
    modules+=f._nanites?.modules.size||0;
    for(const m of f._nanites?.modules.values()||[]){ready+=m.ready?1:0;structural+=m.cells.filter(c=>!c.broken).length;}
    f.obj.traverse(o=>{if(o.isInstancedMesh&&o.userData.naniteOwned){matrices+=o.count;
     if(o.name.includes('fragment')){fragments+=o.count;capacity+=o.instanceMatrix.count;}}});
   }
   return {actors:actors.length,modules,ready,structural,fragments,fragmentCapacity:capacity,activeInstanceMatrices:matrices,
    geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs.length,
    borrowedLights:g.vfx._lights.length-g.vfx.lightPool.length,ordnance:g.projectiles.list.length,
    canvas:[g.world.renderer.domElement.width,g.world.renderer.domElement.height]};
  };
  const render=(reset=true)=>{
   // Fit all eight current bodies without editing the production follow camera.
   const center=new T.Vector3();for(const f of actors)center.add(f.pos);center.multiplyScalar(1/Math.max(1,actors.length));center.y+=5;
   g.world.camera.position.copy(center).add(new T.Vector3(56,29,104));g.world.camera.lookAt(center);
   if(reset)info.reset();const start=performance.now();nativeRender();
   return {renderSubmissionMs:performance.now()-start,drawCalls:info.render.calls,triangles:info.render.triangles};
  };
  const firePressure=()=>{
   if(!pressure||sim<nextBurst)return;nextBurst=sim+.15;
   for(let i=0;i<actors.length;i+=2){
    const receiver=actors[i],caster=actors[i+1],view=receiver.parts.nanites?.get('e');
    if(!receiver.alive||!caster?.alive||!view)continue;
    receiver.obj.updateMatrixWorld(true);
    const cell=view.layout.find(c=>c.cell===4),matrix=view.root.matrixWorld.clone().multiply(cell.matrix);
    const center=new T.Vector3().setFromMatrixPosition(matrix),direction=receiver.parts.torso.getWorldPosition(new T.Vector3()).sub(center).normalize();
    // Precision launch fixture for contact/pool pressure, not an authored rifle
    // or AI muzzle. Actual native projectile travel and admission still run.
    g.projectiles.spawnProjectile(caster,{pos:center.clone().addScaledVector(direction,-2),vel:direction.multiplyScalar(120),
     radius:.06,damage:2,ballistic:true,weapon:'rifle',ground:false,life:1,color:'#ffd97a'});launched++;
   }
  };
  const state=()=>({sim,...counts(),pressure:{enabled:pressure,launched,contacts},fighters:actors.map(f=>({id:f.def.id,position:f.pos.toArray(),guarding:f.guarding,alive:f.alive})),nanites:actors.map(f=>[...(f._nanites?.modules.values()||[])].map(m=>({slot:m.slot,epoch:m.epoch,assembly:m.assemblyT,
   cells:m.cells.map(c=>({hp:c.hp,broken:c.broken,quiet:c.quietT,reform:c.reformT}))})))});
  window.naniteStress={
   setup(tagged){
    sim=0;owned=new Map();pressure=false;nextBurst=0;launched=0;contacts=[];g.input.keys.clear();g.input.endFrame();
    const definitions=Array.from({length:8},(_,i)=>{
     const basis=buildDef({...freshPicks(),name:tagged?'NANITE STRESS':'BASELINE STRESS',cape:false,budget:'unbound',flightTier:3,
      slots:{lmb:'kibolt',rmb:'heatray',q:tagged?'nanite-cannon':null,e:tagged?'nanite-shield':null,f:null,r:null}},`cx_nanite_stress_${i}`);
     const profile=profileFromDef(basis);profile.model.body=['procedural','superhero-male','superhero-female'][i%3];profile.model.costume='fitted';
     if(tagged&&i%2)for(const [slot,naniteAttachment]of [['q','left-forearm'],['e','right-forearm']]){
      const source=attackSource(basis,slot);profile.attacks[slot]={identity:attackIdentity(source),source,values:{naniteAttachment}};
     }
     const def=applyProfile(basis,profile),index=ROSTER.findIndex(d=>d.id===def.id);if(index>=0)ROSTER[index]=def;else ROSTER.push(def);return def;
    });
    g.startMode('powerworld',{p1:definitions[0].id,p2:definitions[1].id});
    LSW.hud.setPlayer(g.player.def);
    actors=[...g.entities];while(actors.length<8)actors.push(g.addFighter(definitions[actors.length],{team:0,x:0,z:0}));
    actors.forEach((f,i)=>{
     f.level=10;f.team=0;f.ai=null;f.invuln=0;f.flying=true;f.gait='airborne';f._openSky=true;
     f.pos.set((i%4)*24-36,150,Math.floor(i/4)*24);f.vel.set(0,0,0);f._stressDirection=new T.Vector3();watch(f);
    });
    banner.textContent=`${tagged?'16 NANITE MODULES':'NO NANITE MODULES'} · eight native Fighters · scripted strafe / Guard · wide inspection camera`;
    render();return state();
   },
   step(dt){sim+=dt;info.reset();const start=performance.now();if(dt>0)firePressure();nativeUpdate(dt);const simulationMs=performance.now()-start;g.input.endFrame();
    return {simulationMs,...render(false),...counts()};},
   startPressure(){pressure=true;nextBurst=sim;actors.forEach((f,i)=>{f.team=i%2;});
    banner.textContent='16 NANITE MODULES · four precision projectile lanes · native contact / local repair · not AI firing';return state();},
   state,
   retireOne(){
    const victim=actors.pop(),survivors=state();g.scene.remove(victim.obj);victim.dispose();victim.dispose();
    const index=g.entities.indexOf(victim);if(index>=0)g.entities.splice(index,1);
    render();return {survivors,after:state(),disposals:[...owned.values()].filter(r=>r.count>0)};
   },
   clear(){
    const retired=[...owned.values()];pressure=false;g.startMode('powerworld',{p1:'sol',p2:'sol'});LSW.hud.setPlayer(g.player.def);actors=[];render();
    return {resources:retired.map(r=>({...r})),after:counts()};
   },
  };
 });
 const batch=async(count,dt)=>page.evaluate(async({count,dt})=>{
  const rows=[];for(let i=0;i<count;i++){await new Promise(requestAnimationFrame);rows.push(naniteStress.step(dt));}return rows;
 },{count,dt});
 results.baselineStart=await page.evaluate(()=>naniteStress.setup(false));
 results.baselineWarm=await batch(60,1/60);results.baseline=await batch(120,1/60);
 results.baselineClear=await page.evaluate(()=>naniteStress.clear());
 results.modulesStart=await page.evaluate(()=>naniteStress.setup(true));
 assert.equal(results.modulesStart.modules,16);assert.equal(results.modulesStart.ready,0);
 assert.equal(results.modulesStart.actors,8);assert.equal(results.modulesStart.fragmentCapacity,1280);
 const paused=await page.evaluate(()=>{const before=naniteStress.state();for(let i=0;i<10;i++)naniteStress.step(0);return {before,after:naniteStress.state()};});
 assert.deepEqual(paused.before.nanites,paused.after.nanites);results.paused=paused;
 results.quarter=await batch(60,.25/60);results.quarterEnd=await page.evaluate(()=>naniteStress.state());
 for(const pair of results.quarterEnd.nanites)for(const module of pair)assert.ok(Math.abs(module.assembly-.25)<1e-8);
 await page.screenshot({path:`${out}/eight-assembling-quarter-speed.png`});
 results.assembly=await batch(24,1/60);await page.screenshot({path:`${out}/eight-assembled.png`});
 results.warm=await batch(60,1/60);results.modules=await batch(120,1/60);
 assert.equal(results.modules.at(-1).ready,16);assert.equal(results.modules.at(-1).fragments,0);
 results.modulesEnd=await page.evaluate(()=>naniteStress.state());
 assert.equal(results.modulesEnd.structural,120);
 for(const [i,f]of results.modulesEnd.fighters.entries()){
  assert.equal(f.alive,true);assert.equal(f.guarding,i%2===0);
  assert.notDeepEqual(f.position,results.modulesStart.fighters[i].position,'Every measured Fighter must actually move');
 }
 results.pressureStart=await page.evaluate(()=>naniteStress.startPressure());results.pressure=[];
 const pressureBatch=process.env.LSW_NANITE_STRESS_BATCH==='180'?180:12;results.pressureBatch=pressureBatch;
 for(let i=0;i<180/pressureBatch;i++){
  results.pressure.push(...await batch(pressureBatch,1/60));
  console.log(JSON.stringify({pressureFrames:results.pressure.length,last:results.pressure.at(-1)}));
  await writeFile(`${out}/pressure-checkpoint.json`,JSON.stringify({hardware:results.hardware,pressure:results.pressure,errors},null,2));
 }
 results.pressureEnd=await page.evaluate(()=>naniteStress.state());await page.screenshot({path:`${out}/eight-projectile-pressure.png`});
 assert.ok(results.pressureEnd.pressure.launched>0);assert.ok(results.pressureEnd.pressure.contacts.some(c=>c.integrity>0),'Pressure fixture must reach literal native cells');
 assert.ok(results.pressure.every(r=>r.fragmentCapacity===1280&&r.fragments<=1280));
 assert.ok(results.pressure.every(r=>r.ordnance<=32),'Four finite precision lanes must remain bounded');
 results.retireOne=await page.evaluate(()=>naniteStress.retireOne());
 assert.deepEqual(results.retireOne.survivors.nanites,results.retireOne.after.nanites);
 assert.ok(results.retireOne.disposals.length>0);assert.ok(results.retireOne.disposals.every(r=>r.count===1));
 results.clear=await page.evaluate(()=>naniteStress.clear());
 assert.ok(results.clear.resources.every(r=>r.count===1),'Each tracked module resource must dispose exactly once');
 assert.deepEqual(errors,[]);
 const summarize=rows=>{
  const stats=key=>{const a=rows.map(r=>r[key]).sort((a,b)=>a-b);return {mean:a.reduce((n,x)=>n+x,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
  return {simulationMs:stats('simulationMs'),renderSubmissionMs:stats('renderSubmissionMs'),drawCalls:stats('drawCalls'),end:rows.at(-1)};
 };
 results.summary={baseline:summarize(results.baseline),modules:summarize(results.modules),pressure:summarize(results.pressure),resources:results.clear.resources.length};
 console.log(JSON.stringify({hardware:results.hardware,summary:results.summary,errors}));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Native eight-Fighter simulation with scripted intent and inspection camera. CPU submission timings, not GPU timer queries or player feel.',...results,errors},null,2));await browser.close();}
