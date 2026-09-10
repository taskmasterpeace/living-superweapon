// Catch a frozen carrier during a real held beam, recoil missing on release,
// or presentation that drags physics/hip anchors or breaks the final emitter aim.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/cast-bracing',tag=process.argv.includes('--before')?'before':'after';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});
 const rows=[];
 for(const hz of [30,60,120]){
  rows.push(await page.evaluate(async hz=>{
   const {runSlot}=await import('/src/engine/abilities.js'),{game:g,THREE:T}=LSW,dt=1/hz;
   g.startMode('powerworld',{p1:'kano',p2:'vega'});const f=g.player,foe=g.entities.find(e=>e!==f&&!e.isDummy);
   g.fov=false;g.world.setFogEnabled(false);f.pos.set(0,140,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
   foe.pos.set(0,140,70);foe.hp=foe.maxHp=50000;foe.invuln=0;foe.flying=true;foe.gait='airborne';
   f.hasAimWorld=true;foe.center(f.aimWorld);f.aim3.set(0,0,1);
   let previous=null,hipStart=null,maxStep=0,maxHipDrift=0,minAim=1,clock=0;
   const samples=[];
   const step=(pressed=false,held=false,released=false)=>{
    f.ki=f.maxKi;g.time+=dt;clock+=dt;runSlot(f,'lmb',{pressed,held,released,dt},g);f.update(dt,g);g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);
    f.obj.updateMatrixWorld(true);const p=f.parts,q=p.body.quaternion.clone(),hip=p.body.localToWorld(new T.Vector3(0,p.rig.pivotHeight,0));
    if(previous)maxStep=Math.max(maxStep,q.angleTo(previous));previous=q;
    if(hipStart)maxHipDrift=Math.max(maxHipDrift,hip.distanceTo(hipStart));else hipStart=hip;
    const beam=f.slots.lmb.active;
    if(beam?.sustaining&&clock>2){const palm=new T.Vector3(0,-1,0).applyQuaternion(p.armR.children[2].getWorldQuaternion(new T.Quaternion()));minAim=Math.min(minAim,palm.dot(beam.dir));}
    const sample={t:clock,body:p.body.rotation.x,knee:p.legL.userData.knee.rotation.x,beam:!!beam?.sustaining,root:f.pos.toArray()};samples.push(sample);return sample;
   };
   for(let i=0;i<hz;i++)step();
   const rest=f.parts.body.quaternion.clone();
   for(let i=0;i<hz*.6;i++)step(i===0,true);
   step(false,false,true);const launchTime=clock;
   for(let i=0;i<hz*2.5;i++)step();
   step(false,false,true);for(let i=0;i<hz*2;i++)step();
   const range=xs=>Math.max(...xs)-Math.min(...xs);
   const early=samples.filter(s=>s.beam&&s.t-launchTime<.5),hold=samples.filter(s=>s.beam&&s.t-launchTime>1);
   const result={hz,launchTime,earlyRange:range(early.map(s=>s.body)),holdRange:range(hold.map(s=>s.body)),kneeRange:range(hold.map(s=>s.knee)),maxStep,maxHipDrift,minAim,
    rootDrift:Math.max(...samples.map(s=>Math.hypot(s.root[0],s.root[1]-140,s.root[2]))),recovery:rest.angleTo(f.parts.body.quaternion),samples};
   // A live beam must yield immediately to a guard/stagger; no retained recoil owner.
   for(let i=0;i<hz*2;i++)step(i===0,true);
   result.liveAtInterruption=!!f.slots.lmb.active?.sustaining;
   f.staggerT=.3;f._animate(dt);result.interruptedWeight=f._combatAim.weight;
   return result;
  },hz));
 }
 const failures=[];
 for(const r of rows){
  if(Object.values(r).some(v=>typeof v==='number'&&!Number.isFinite(v))||r.samples.some(s=>[s.t,s.body,s.knee,...s.root].some(v=>!Number.isFinite(v))))failures.push(`${r.hz}: non-finite pose metrics`);
  if(r.samples.filter(s=>s.beam).length<r.hz*2)failures.push(`${r.hz}: no sustained production beam`);
  if(r.earlyRange<.09)failures.push(`${r.hz}: release has no body kick and settle`);
  if(r.holdRange<.035||r.kneeRange<.025)failures.push(`${r.hz}: held cast carrier/legs are frozen`);
  if(r.rootDrift>.01||r.maxHipDrift>.01)failures.push(`${r.hz}: recoil moved authoritative root/hip anchor`);
  if(r.maxStep>12.1/r.hz||r.minAim<.97)failures.push(`${r.hz}: recoil snapped the carrier or lost emitter contact`);
  if(r.recovery>.005||r.interruptedWeight!==0||!r.liveAtInterruption)failures.push(`${r.hz}: recoil failed recovery/interruption`);
 }
 await writeFile(`${out}/${tag}.json`,JSON.stringify({rows,failures,errors},null,2));console.log({rows:rows.map(({samples,...r})=>r),failures,errors});if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
