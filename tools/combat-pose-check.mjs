// Actual production beam slots + rig, sampled through entry, hold, aim changes and recovery.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/combat-poses';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});
 const rows=[];
 for(const hero of ['sol','kano'])for(const elevation of [-Math.PI/2,-.7,0,.7,Math.PI/2]){
  const row=await page.evaluate(async({hero,elevation})=>{
   const {runSlot}=await import('/src/engine/abilities.js'),{game:g,THREE:T}=LSW;
   g.startMode('powerworld',{p1:hero,p2:'vega'});g.fov=false;g.world.setFogEnabled(false);
   const f=g.player,foe=g.entities.find(e=>e!==f&&!e.isDummy);f.pos.set(0,140,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
   foe.pos.set(0,140+Math.sin(elevation)*60,Math.cos(elevation)*60);foe.vel.set(0,0,0);foe.flying=true;foe.gait='airborne';foe._vis=1;foe.obj.visible=true;
   f.hasAimWorld=true;foe.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.pos).setY(f.aimWorld.y-f.pos.y-5.2).normalize();
   const sample=()=>{
    f.obj.updateMatrixWorld(true);const q=new T.Quaternion(),v=new T.Vector3();
    const head=f.parts.head.getWorldPosition(new T.Vector3()),hand=f.parts.rig.sockets.rightHand.getWorldPosition(new T.Vector3());
    const eyes=new T.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(q));
    const palm=new T.Vector3(0,-1,0).applyQuaternion(f.parts.rig.sockets.rightHand.getWorldQuaternion(q));
    return {eyes:eyes.dot(v.copy(f.aimWorld).sub(head).normalize()),palm:palm.dot(v.copy(f.aimWorld).sub(hand).normalize()),
     weight:f._combatAim?.weight||0, wrists:[f.parts.armL.children[2],f.parts.armR.children[2]].map(s=>s.quaternion.toArray()), rotations:[f.parts.head,f.parts.armL,f.parts.armR].map(s=>s.quaternion.toArray()),
     bodyForward:new T.Vector3(0,0,1).applyQuaternion(f.parts.body.getWorldQuaternion(q)).toArray(),
     neckAngle:f.parts.head.quaternion.angleTo(new T.Quaternion()),
     bodyRotation:f.parts.body.quaternion.toArray(),
     handsInBody:[f.parts.rig.sockets.leftHand,f.parts.rig.sockets.rightHand].map(s=>f.parts.body.worldToLocal(s.getWorldPosition(new T.Vector3())).y),
     hip:f.parts.body.localToWorld(new T.Vector3(0,f.parts.rig.pivotHeight,0)).sub(f.pos).toArray(),
     hands:[f.parts.rig.sockets.leftHand,f.parts.rig.sockets.rightHand].map(s=>s.getWorldPosition(new T.Vector3()).y-f.pos.y),root:f.pos.toArray(),head:head.toArray(),hand:hand.toArray()};
   };
   const step=(pressed,held,released)=>{
    f.ki=f.maxKi;g.time+=1/120;runSlot(f,'lmb',{pressed,held,released,dt:1/120},g);
    f.update(1/120,g);g.projectiles.update(1/120,g);g.particles.update(1/120);g.vfx.update(1/120);foe._animate(1/120);
   };
   for(let i=0;i<90;i++){f.update(1/120,g);foe._animate(1/120);}const start=sample();
   const phases=[];for(let i=0;i<360;i++){step(i===0,true,false);if([0,30,60,180,359].includes(i))phases.push(sample());}
   const held=sample();g.world.snapChase();g.world.chase(f,foe,1/60);g.world.render();
   const capture={hero,elevation,start,phases,held};window.poseView=view=>{
    g.world.camera.position.set(view==='side'?25:14,148,view==='side'?0:22);g.world.camera.lookAt(0,146,0);g.world.render();
   };window.poseSweep=()=>{
    let minAlignment=1,maxStep=0,previous=new T.Quaternion().copy(f.parts.head.quaternion);
    for(let i=0;i<240;i++){
     const angle=elevation+Math.sin(i/60)*.3;
     f.aimWorld.set(Math.sin(i/80)*10,145.2+Math.sin(angle)*60,Math.cos(angle)*60);
     step(false,true,false);const s=sample();
     if(i>30)minAlignment=Math.min(minAlignment,hero==='sol'?s.eyes:s.palm);
     maxStep=Math.max(maxStep,previous.angleTo(f.parts.head.quaternion));previous.copy(f.parts.head.quaternion);
    }
    f.staggerT=.2;f._animate(1/120);const staggerWeight=f._combatAim.weight;f.staggerT=0;
    return {minAlignment,maxStep,staggerWeight};
   };window.poseKO=()=>{
    for(let i=0;i<360;i++)step(i===0,true,false);
    f._ko();for(let i=0;i<205;i++)f.update(1/60,g);
    return {state:f.state,weight:f._combatAim?.weight||0,hasRagdoll:!!f.ragdoll};
   };window.poseRecovery=()=>{
    step(false,false,true);for(let i=0;i<180;i++)step(false,false,false);return sample();
   };return capture;
  },{hero,elevation});
  await page.screenshot({path:`${out}/${process.argv.includes('--before')?'before':'after'}-${hero}-${elevation}.png`});
  if(!process.argv.includes('--before'))for(const view of ['side','front']){
   await page.evaluate(view=>poseView(view),view);await page.screenshot({path:`${out}/${hero}-${elevation}-${view}.png`});
  }
  row.sweep=await page.evaluate(()=>poseSweep());row.recovered=await page.evaluate(()=>poseRecovery());row.respawn=await page.evaluate(()=>poseKO());rows.push(row);
 }
 const failures=[];
 for(const r of rows){
  if(r.hero==='sol'&&r.held.eyes<.97)failures.push(`Optic eyes do not aim through elevation ${r.elevation}`);
  if(Math.abs(r.elevation)>1.5){
   if(r.held.bodyForward[1]*Math.sign(r.elevation)<.55)failures.push(`${r.hero}: vertical attack has no supporting body lean`);
   if(r.hero==='sol'&&r.held.neckAngle>.85)failures.push(`${r.hero}: vertical attack is carried by an overextended neck`);
  }
  if(r.phases.some(s=>Math.hypot(...s.hip.map((v,i)=>v-r.start.hip[i]))>.01))failures.push(`${r.hero}: attack lean displaced the flight hip anchor`);
  // Bracing is anatomical: a pitched body can put its fists above their old world Y.
  if(r.hero==='sol'&&Math.max(...r.held.handsInBody)>6.2)failures.push('Optic casting incorrectly raises both hands into a hand-beam pose');
  if(r.hero==='kano'&&r.held.palm<.95)failures.push(`Hand beam palm points away from attack at elevation ${r.elevation}`);
  if(Math.hypot(...r.recovered.root.map((x,i)=>x-r.start.root[i]))>.01)failures.push(`${r.hero}: presentation moved physics root`);
  if(r.phases.some(s=>!Number.isFinite(s.eyes+s.palm)))failures.push(`${r.hero}: nonfinite rig`);
  if(r.recovered.weight>.001)failures.push(`${r.hero}: beam overlay did not recover`);
  if(Math.abs(r.recovered.bodyRotation.reduce((dot,v,i)=>dot+v*r.start.bodyRotation[i],0))<.9999)failures.push(`${r.hero}: body lean did not recover`);
  if(Math.max(...r.recovered.hands.map((y,i)=>Math.abs(y-r.start.hands[i])))>.05)failures.push(`${r.hero}: arms did not return to hover`);
  if(r.recovered.wrists.some((q,i)=>Math.abs(q.reduce((dot,v,k)=>dot+v*r.start.wrists[i][k],0))<.999))failures.push(`${r.hero}: wrist did not recover its original grip`);
  if(r.sweep.minAlignment<.97)failures.push(`${r.hero}: moving aim diverges from beam`);
  if(r.sweep.maxStep>.12)failures.push(`${r.hero}: head snaps during moving aim`);
  if(r.sweep.staggerWeight!==0)failures.push(`${r.hero}: beam pose overrides stagger`);
  if(r.respawn.state!=='idle'||r.respawn.hasRagdoll||r.respawn.weight>.001)failures.push(`${r.hero}: stale beam pose survives respawn`);
 }
 console.log(JSON.stringify({samples:rows.length,failures,errors},null,2));await writeFile(`${out}/checks.json`,JSON.stringify({rows,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
