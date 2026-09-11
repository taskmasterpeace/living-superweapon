// Removing the damage-to-pose seam must fail: flash/velocity alone are not a body reaction.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/hit-reaction';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,rows=[],failures=[];
  for(const hero of ['kano','sol','sarge'])for(const [x,z] of [[0,1],[0,-1],[1,0],[-1,0]]){
   g.startMode('powerworld',{p1:hero,p2:'vega'});const f=g.player,src=g.entities.find(e=>e!==f&&!e.isDummy);
   f.pos.set(0,0,0);f.vel.set(0,0,0);f.invuln=0;f.faceDir(0,1);f.animT=0;src.pos.set(x*10,0,z*10);
   for(let i=0;i<100;i++)f._animate(1/120);
   const head=()=>f.parts.head.getWorldPosition(new T.Vector3());
   const boots=()=>[f.parts.legL.userData.boot,f.parts.legR.userData.boot].map(m=>m.getWorldPosition(new T.Vector3()));
   const baseline=head(),feet=boots(),root=f.pos.clone(),q=f.parts.torso.quaternion.clone();
   f.takeDamage(24,{src,hitstop:0});
   const path=[];let maxStep=0,handSpeed=0,prev=q.clone();
   for(let i=0;i<120;i++){
    f._animate(1/120);path.push(head().sub(baseline).toArray());
    maxStep=Math.max(maxStep,prev.angleTo(f.parts.torso.quaternion));prev.copy(f.parts.torso.quaternion);
    handSpeed=Math.max(handSpeed,f._handSpd);
   }
   const peak=Math.max(...path.map(v=>-x*v[0]-z*v[2]));
   const footMove=Math.max(...boots().map((v,i)=>v.distanceTo(feet[i])));
   const recovery=head().distanceTo(baseline),physicsMove=root.distanceTo(f.pos),step=maxStep;
   f.takeDamage(24,{src,hitstop:0});for(let i=0;i<6;i++)f._animate(1/120);
   const held=head();for(let i=0;i<20;i++)f._animate(0);const accumulated=head().distanceTo(held);
   rows.push({hero,x,z,peak,recovery,footMove,physicsMove,step,handSpeed,accumulated,path});
   if(peak<.35)failures.push(`${hero}/${x},${z}: body does not recoil away from impact`);
   if(recovery>.04||footMove>.001||physicsMove>.001||accumulated>.001||step>.16)failures.push(`${hero}/${x},${z}: reaction drifts, snaps or moves planted feet/root`);
   if(handSpeed>.001)failures.push(`${hero}: taking damage adds offensive fist speed`);
  }
  const setup=()=>{
   g.startMode('powerworld',{p1:'kano',p2:'vega'});const f=g.player,src=g.entities.find(e=>e!==f&&!e.isDummy);
   f.pos.set(0,140,0);f.vel.set(0,0,0);f.invuln=0;f.flying=true;f.gait='airborne';f.faceDir(0,1);f.animT=0;src.pos.set(0,140,10);
   for(let i=0;i<100;i++)f._animate(1/120);
   return {f,src,head:f.parts.head.getWorldPosition(new T.Vector3())};
  };
  const cadence=[];
  for(const hz of [30,60,120,240]){
   const {f,src,head}=setup();f.takeDamage(24,{src,hitstop:0});
   for(let i=0;i<hz/10;i++)f._animate(1/hz);
   cadence.push({hz,offset:f.parts.head.getWorldPosition(new T.Vector3()).sub(head).toArray()});
  }
  if(cadence.some(r=>r.offset.some((v,i)=>Math.abs(v-cadence[0].offset[i])>.002)))failures.push('Hit reaction varies with frame rate');
  const suppressed=[];
  for(const kind of ['dot','blocked','invulnerable','city','zero']){
   const {f,src,head}=setup();
   if(kind==='blocked')f.guarding=true;
   if(kind==='invulnerable')f.invuln=1;
   if(kind==='city')f._openSky=false;
   f.takeDamage(kind==='zero'?0:24,{src,hitstop:0,dot:kind==='dot'});
   // Guard already has a physical shove; this check isolates the new pose carrier.
   f.vel.set(0,0,0);
   for(let i=0;i<12;i++)f._animate(1/120);
   const distance=f.parts.head.getWorldPosition(new T.Vector3()).distanceTo(head);
   suppressed.push({kind,distance});if(distance>.01)failures.push(`${kind}: inappropriate hit flinch`);
  }
  const vertical=[];
  for(const y of [-1,1]){
   const {f,src,head}=setup();src.pos.set(0,140-y*10,0);
   f.takeDamage(24,{src,hitstop:0,kb:{x:0,y:y*10,z:0}});f.vel.set(0,0,0);
   let peak=0;for(let i=0;i<60;i++){f._animate(1/120);peak=Math.max(peak,f.parts.head.getWorldPosition(new T.Vector3()).distanceTo(head));}
   vertical.push({y,peak});if(peak<.3)failures.push('Vertical hit has no upper-body reaction');
  }
  const {f,src,head}=setup();f.takeDamage(24,{src,hitstop:0});for(let i=0;i<6;i++)f._animate(1/120);
  f._ko();f._updateKO(4,g);f.pos.set(0,140,0);f.flying=true;f.gait='airborne';
  for(let i=0;i<100;i++)f._animate(1/120);
  const respawn=f.parts.head.getWorldPosition(new T.Vector3()).distanceTo(head);
  if(respawn>.02||f.ragdoll||f._hitReaction)failures.push('Hit reaction survives KO/respawn');
  return {rows,cadence,suppressed,vertical,respawn,failures};
 });
 await writeFile(`${out}/checks.json`,JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({...result,rows:result.rows.map(({path,...r})=>r),errors},null,2));
 if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
