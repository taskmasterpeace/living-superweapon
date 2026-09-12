import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const profile=process.env.LSW_PROFILE==='1';
const out=profile?'artifacts/condition-stress-profile':'artifacts/condition-stress';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5182/',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#hSelect.on');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.LSW?.game?.running&&LSW.game.player&&!LSW.game._frontlinePreparing,null,{timeout:120000});
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{
  const g=LSW.game,p=g.player;
  for(const [i,id]of ['volt','rime','kivuli','gale','titan'].entries()){
   const f=g.spawnRival(id);f.pos.copy(p.pos);f.pos.x+=(i-2)*14;f.pos.z+=35;
  }
  const state=window._stress={frames:[],seen:{},shots:0,samples:0,started:performance.now()};
  state.costs={};state.restore=[];
  for(const [owner,key,label]of [[g,'update','gameInclusive'],[g.world,'render','renderSubmit'],[LSW.hud,'update','hud'],
   [g,'controlBot','botControl'],[Object.getPrototypeOf(p),'update','fighterUpdate'],[g.news,'update','news'],
   ...['_physics','_animate','_sync','_updateKO'].map(key=>[Object.getPrototypeOf(p),key,key]),
   [g.projectiles,'update','projectiles'],[g.mode,'tick','modeTick'],[g,'updateVision','vision'],[g,'resolveBodies','bodies']]){
   if(!owner||typeof owner[key]!=='function')continue;
   const original=owner[key],costs=state.costs[label]=[];
   owner[key]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{costs.push(performance.now()-start);}};
   state.restore.push(()=>owner[key]=original);
  }
  let last=performance.now(),next=0,index=0;
  const kinds=['poison','flame','acid','teargas','sleep'];
  function frame(now){
   state.frames.push(now-last);last=now;state.samples++;
   for(const f of g.entities){
    const mark=name=>state.seen[name]=(state.seen[name]||0)+1;
    if(f._bleed>0)mark('bleeding');if(f.sleepT>0)mark('sleep');if(f.blindT>0)mark('blind');
    if(f.shockT>0)mark('shock');if(f.frozenT>0)mark('freeze');if(f.stunT>0)mark('stun');
    if(f.staggerT>0)mark('stagger');if(f._corrode>0)mark('corrosion');
    for(const d of f._dots||[])if(d.t>0)mark(d.kind);
   }
   // Stress injections use real moving projectile contacts, alongside live AI.
   if(now>next){next=now+1800;
    for(const target of g.entities.filter(f=>f.alive).slice(0,8)){
     const caster=g.entities.find(f=>f.alive&&g.isFoe(f,target));if(!caster)continue;
     const pos=target.center();pos.y+=14;
     const vel=target.center().sub(pos).normalize().multiplyScalar(180);
     g.projectiles.spawnProjectile(caster,{pos,vel,damage:5,blast:0,dtype:'physical',dmgClass:'slash',payload:kinds[index%kinds.length],shockDuration:index%3===0?.7:0,color:'#ffe9b0'});state.shots++;
    }index++;
   }
   state.raf=requestAnimationFrame(frame);
 }state.raf=requestAnimationFrame(frame);
 });
 const cdp=profile?await page.context().newCDPSession(page):null;
 if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
 await page.waitForTimeout(20000);if(!profile)await page.screenshot({path:`${out}/mid-combat.png`});
 await page.waitForTimeout(25000);if(!profile)await page.screenshot({path:`${out}/late-combat.png`});
 if(cdp){
  const {profile:cpu}=await cdp.send('Profiler.stop');await cdp.detach();
  await writeFile(`${out}/cpu.cpuprofile`,JSON.stringify(cpu));
  const times=new Map();for(let i=0;i<cpu.samples.length;i++)times.set(cpu.samples[i],(times.get(cpu.samples[i])||0)+(cpu.timeDeltas[i]||0));
  const top=cpu.nodes.map(n=>({fn:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber+1,selfMs:(times.get(n.id)||0)/1000})).sort((a,b)=>b.selfMs-a.selfMs).slice(0,25);
  await writeFile(`${out}/cpu-top.json`,JSON.stringify(top,null,2));console.log('CPU',JSON.stringify(top));
 }
 const result=await page.evaluate(()=>{
  const s=_stress;cancelAnimationFrame(s.raf);const a=s.frames.slice(30).sort((a,b)=>a-b);
  for(const restore of s.restore)restore();
  const costs=Object.fromEntries(Object.entries(s.costs).map(([key,values])=>{const v=values.slice(30).sort((a,b)=>a-b);return [key,{samples:v.length,medianMs:v[Math.floor(v.length*.5)],p95Ms:v[Math.floor(v.length*.95)],maxMs:v.at(-1)}];}));
  return {elapsedSeconds:(performance.now()-s.started)/1000,frames:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],over50ms:a.filter(n=>n>50).length,costs,seen:s.seen,shots:s.shots,gameErrors:[...(LSW.game._errSeen||[])],effects:document.querySelector('.ps-effects')?.textContent};
 });
 await writeFile(`${out}/results.json`,JSON.stringify({scope:'45-second foreground battlefield; five added live AI rivals plus periodic real status-projectile contacts; no status timers or health/resistance overrides',...result,errors},null,2));
 assert.ok(result.shots>20);assert.ok(Object.keys(result.seen).length>=5,'stress must actually exercise conditions');
 assert.deepEqual(result.gameErrors,[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify(result));
 if(profile)await page.screenshot({path:`${out}/after-measurement.png`});
}finally{await browser.close();}
