// Real slot and production animation: cancelling an elevated attack must not teleport
// the displayed body, and its residual recovery must not reclaim guard/stagger ownership.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(async()=>{
  const {runSlot}=await import('/src/engine/abilities.js'),{game:g,THREE:T}=LSW;g.update=()=>{};
  const rows=[];
  for(const hero of ['sol','kano'])for(const sign of [-1,1])for(const hz of [30,60,120])for(const reason of ['staggerT','poseGuard','frozenT']){
   g.startMode('powerworld',{p1:hero,p2:'vega'});const f=g.player,p=f.parts;
   f.pos.set(0,140,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
   f.hasAimWorld=true;f.aimWorld.set(0,145.2+sign*60,0);f.aim3.set(0,sign,0);
   // The new defensive carrier has its own authored brace. Interruption must
   // converge to ordinary held guard, not erase that stance to identity.
   f.poseGuard=1;for(let i=0;i<60;i++)f._animate(1/60);
   const guardBase=p.body.quaternion.clone();f.poseGuard=0;
   for(let i=0;i<60;i++)f._animate(1/60);
   for(let i=0;i<360;i++){
    f.ki=f.maxKi;runSlot(f,'lmb',{pressed:i===0,held:true,released:false,dt:1/120},g);f.update(1/120,g);g.projectiles.update(1/120,g);
   }
   const before=p.body.quaternion.clone(),previous=before.clone();let maxStep=0,maxHipDrift=0,maxWeight=0;
   const hip=()=>{p.g.updateMatrixWorld(true);return p.body.localToWorld(new T.Vector3(0,p.rig.pivotHeight,0));},startHip=hip();
   for(let i=0;i<hz;i++){
    f[reason]=1;f._animate(1/hz);
    maxStep=Math.max(maxStep,previous.angleTo(p.body.quaternion));previous.copy(p.body.quaternion);
    maxHipDrift=Math.max(maxHipDrift,hip().distanceTo(startHip));maxWeight=Math.max(maxWeight,f._combatAim.weight);
   }
   rows.push({hero,sign,hz,reason,entryAngle:before.angleTo(new T.Quaternion()),maxStep,maxHipDrift,maxWeight,remaining:p.body.quaternion.angleTo(reason==='poseGuard'?guardBase:new T.Quaternion())});
  }
  return rows;
 });
 const failures=[];for(const r of rows){
  if(r.entryAngle<.6)failures.push(`${r.hero}: fixture did not enter a steep attack`);
  if(r.maxStep>12/r.hz+.001)failures.push(`${r.hero}/${r.reason}/${r.hz}: interruption snaps body (${r.maxStep})`);
  if(r.maxWeight!==0)failures.push(`${r.hero}: interrupted beam retained pose ownership`);
  if(r.maxHipDrift>.01||r.remaining>.001)failures.push(`${r.hero}: interrupted carrier failed to recover around its hip`);
 }
 const result={rows,failures,errors};await mkdir('artifacts/flight-review/attack-interruption',{recursive:true});
 await writeFile('artifacts/flight-review/attack-interruption/checks.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
