// Actual production projection; a target marker cannot count as readable anatomy.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const label=process.argv.includes('--before')?'before':'after';
const out='artifacts/flight-review/lock-readability';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(before=>{
  const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});g.world.setFogEnabled(false);
  const p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy);window.readabilityFoe=f;
  for(const e of g.entities){e.ai=null;if(e!==p&&e!==f)e.pos.set(800,140,800);}
  for(const e of [p,f]){e.vel.set(0,0,0);e.flying=true;e.gait='airborne';e._vis=1;e.obj.visible=true;e._flyPose=1;e.animT=0;}
  if(before)Object.defineProperty(g.world,'_combatLensGain',{get:()=>1,set(){},configurable:true});
  p.pos.set(0,140,0);p.faceDir(0,1);f.faceDir(0,-1);
  window.readabilityMeasure=()=>{
   const {game:g,THREE:T}=LSW,p=g.player,f=readabilityFoe,w=g.world,c=w.camera;
   c.updateMatrixWorld(true);p.obj.updateMatrixWorld(true);f.obj.updateMatrixWorld(true);
   const y=part=>part.getWorldPosition(new T.Vector3()).project(c).y;
   const center=f.center(new T.Vector3()),ray=new T.Raycaster(c.position,center.clone().sub(c.position).normalize(),0,c.position.distanceTo(center)-.1);
   const blocked=ray.intersectObject(p.parts.body,true).some(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return h.object.material&&!h.object.material.transparent;});
   return {targetHeight:Math.abs(y(f.parts.head)-y(f.parts.legL.userData.boot))/2,playerHeight:Math.abs(y(p.parts.head)-y(p.parts.legL.userData.boot))/2,blocked,fov:c.fov,eye:c.position.toArray()};
  };
 },label==='before');
 const rows=[];
 for(const hz of [30,60,144])for(const gap of [14,40,70,110]){
  const row=await page.evaluate(({hz,gap})=>{
   const g=LSW.game,w=g.world,p=g.player,f=readabilityFoe;f.pos.set(0,140,gap);g.hardLock=f;w.clearFrameClaims();w._shake=0;w.snapChase();
   for(let i=0;i<hz*2;i++){p._animate(1/hz);f._animate(1/hz);w.chase(p,f,1/hz);}
   w.render();return {hz,gap,...readabilityMeasure()};
  },{hz,gap});rows.push(row);
  if(hz===60)await page.screenshot({path:`${out}/${label}-${gap}.png`});
 }
 const transition=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,p=g.player,w=g.world,f=readabilityFoe,rows=[];
  f.pos.set(0,140,110);w.snapChase();w.chase(p,f,1/60);
  let old=readabilityMeasure(),maxHeightStep=0,maxAngleStep=0;const dir=w.camera.getWorldDirection(new T.Vector3());
  for(let i=0;i<600;i++){
   // Smooth approach and retreat, not a teleport. Fixed poses isolate framing.
   f.pos.z=60+50*Math.cos(i/600*Math.PI*2);w.chase(p,f,1/60);
   const now=readabilityMeasure(),next=w.camera.getWorldDirection(new T.Vector3());
   maxHeightStep=Math.max(maxHeightStep,Math.abs(now.playerHeight-old.playerHeight));maxAngleStep=Math.max(maxAngleStep,dir.angleTo(next));
   rows.push(now);old=now;dir.copy(next);
  }
  return {maxHeightStep,maxAngleStep,blocked:rows.filter(r=>r.blocked).length};
 });
 const wall=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,p=g.player,f=readabilityFoe,cover=w.cover,rows=[];
  // Actual collision slab, just behind the authored boom. No world/map edits.
  w.cover=[{x:0,z:-34,hx:100,hz:2,top:300}];f.pos.set(0,140,110);
  try{
   for(const hz of [30,60,144]){
    w.snapChase();let minFov=100,maxHeight=0;
    for(let i=0;i<hz*2;i++){w.chase(p,f,1/hz);const r=readabilityMeasure();minFov=Math.min(minFov,r.fov);maxHeight=Math.max(maxHeight,r.playerHeight);}
    rows.push({hz,minFov,maxHeight,eye:w.camera.position.toArray()});
   }
  }finally{w.cover=cover;}
  return rows;
 });
 const releases=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,w=g.world,p=g.player,f=readabilityFoe,rows=[];
  for(const hz of [30,60,144])for(const gap of [40,110,200])for(const pitch of [-90,0,90]){
   const rad=pitch*Math.PI/180;f.pos.set(0,140+Math.sin(rad)*gap,Math.cos(rad)*gap);w.snapChase();w.chase(p,f,1/hz);
   let old=readabilityMeasure(),speed=0,fovStep=0;const direction=w.camera.getWorldDirection(new T.Vector3());let angle=0;
   w.chase(p,null,0);const zero=readabilityMeasure(),zeroFov=Math.abs(zero.fov-old.fov);old=zero;
   for(let i=0;i<hz*6;i++){
    w.chase(p,null,1/hz);const next=readabilityMeasure();
    speed=Math.max(speed,new T.Vector3(...old.eye).distanceTo(new T.Vector3(...next.eye))*hz);
    fovStep=Math.max(fovStep,Math.abs(next.fov-old.fov));angle=Math.max(angle,direction.angleTo(w.camera.getWorldDirection(new T.Vector3())));old=next;
   }
   rows.push({hz,gap,pitch,speed,fovStep,zeroFov,angle,fov:old.fov});
  }
  return rows;
 });
 const free=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,p=g.player;g.hardLock=null;w._lookActive=true;w._lookYaw=0;w._lookPitch=0;
  for(let i=0;i<360;i++)w.chase(p,null,1/60);
  return {fov:w.camera.fov,gain:w._combatLensGain};
 });
 const failures=[];
 for(const r of rows){
  if(r.gap===110&&r.targetHeight<.07)failures.push(`${r.hz} Hz: distant opponent only ${(r.targetHeight*100).toFixed(2)}% tall`);
  if(r.playerHeight<.18||r.playerHeight>.27)failures.push(`${r.hz}/${r.gap}: foreground scale ${r.playerHeight}`);
  if(r.blocked)failures.push(`${r.hz}/${r.gap}: player eclipses target`);
 }
 if(transition.maxHeightStep>.015||transition.maxAngleStep>.04||transition.blocked)failures.push('Approach/retreat continuity or clearance failed');
 if(wall.some(r=>r.minFov<58.7)||Math.max(...wall.map(r=>r.minFov))-Math.min(...wall.map(r=>r.minFov))>.001)failures.push('Sustained wall clipping restores zoom or depends on refresh rate');
 if(releases.some(r=>r.speed>120.3||r.angle>.02||Math.abs(r.fov-58.72)>.01))failures.push('Lock release exceeds translation budget, rotates aim, or retains zoom');
 if(releases.some(r=>r.zeroFov>1e-8))failures.push('Zero-time unlock changes the visible lens');
 if(Math.abs(free.fov-58.72)>.001||Math.abs(free.gain-1)>.001)failures.push('Free look does not recover its authored lens');
 await writeFile(`${out}/${label}.json`,JSON.stringify({rows,transition,wall,releases,free,failures,errors},null,2));console.log({rows,transition,wall,releases,free,failures,errors});
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
