// User's BFP framing contract: one raised rear boom in view space. A lock
// may steer the view, but cannot introduce a shoulder orbit or zoom lens.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2]||'artifacts/flight-review/bfp-camera';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});g.fov=false;g.world.setFogEnabled(false);});
 const rows=[];
 for(const cfg of [{name:'hover',gap:60,pitch:0,lock:false},{name:'level',gap:40,pitch:0,lock:true},{name:'far',gap:110,pitch:0,lock:true},{name:'climb',gap:80,pitch:65,lock:true},{name:'dive',gap:80,pitch:-65,lock:true},{name:'near',gap:14,pitch:0,lock:true},{name:'nadir',gap:80,pitch:-90,lock:true}]){
  rows.push(await page.evaluate(cfg=>{
   const {game:g,THREE:T}=LSW,w=g.world,p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy);
   for(const e of g.entities){e.ai=null;e.obj.visible=e===p||e===f;}
   const pitch=cfg.pitch*Math.PI/180;p.pos.set(0,220,0);f.pos.set(0,220+Math.sin(pitch)*cfg.gap,Math.cos(pitch)*cfg.gap);
   for(const e of [p,f]){e.vel.set(0,0,0);e.flying=true;e.gait='airborne';e.animT=0;e._vis=1;}
   p.faceDir(0,1);f.faceDir(0,-1);w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w._shake=0;w.clearFrameClaims();w.snapChase();g.hardLock=cfg.lock?f:null;
   for(let i=0;i<180;i++){p._animate(1/120);f._animate(1/120);w.chase(p,g.hardLock,1/120);}
   const c=w.camera;c.updateMatrixWorld(true);p.obj.updateMatrixWorld(true);f.obj.updateMatrixWorld(true);
   const forward=c.getWorldDirection(new T.Vector3()),right=new T.Vector3(1,0,0).applyQuaternion(c.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(c.quaternion);
   const offset=c.position.clone().sub(p.pos).sub(new T.Vector3(0,5.4,0)),center=f.center(new T.Vector3()).project(c);
   const head=p.parts.head.getWorldPosition(new T.Vector3()).project(c),boot=p.parts.legL.userData.boot.getWorldPosition(new T.Vector3()).project(c);
   const fc=f.center(new T.Vector3()),ray=new T.Raycaster(c.position,fc.clone().sub(c.position).normalize(),0,c.position.distanceTo(fc)-.1);
   const hidden=ray.intersectObject(p.parts.body,true).some(hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}return !hit.object.material.transparent;});
   w.render();g.hud.setPlayer(p.def);g.hud.update();
   return {...cfg,back:-offset.dot(forward),lift:offset.dot(up),side:offset.dot(right),fov:c.fov,viewPitch:Math.asin(forward.y)*180/Math.PI,target:center.toArray(),headY:(1-head.y)/2,footY:(1-boot.y)/2,hidden};
  },cfg));await page.screenshot({path:`${out}/${cfg.name}.png`});
 }
 const handoffs=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,w=g.world,p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy),rows=[];
  for(const cfg of [{gap:6,pitch:0},{gap:80,pitch:-90}]){
   const angle=cfg.pitch*Math.PI/180;p.pos.set(0,220,0);f.pos.set(0,220+Math.sin(angle)*cfg.gap,Math.cos(angle)*cfg.gap);
   w._lookYaw=0;w._lookPitch=0;w.snapChase();w.chase(p,null,1/60);
   const freeEye=w.camera.position.clone();w.chase(p,f,0);const acquire=freeEye.distanceTo(w.camera.position);
   w.snapChase();
   for(let i=0;i<180;i++)w.chase(p,f,1/120);
   const eye=w.camera.position.clone(),view=w.camera.getWorldDirection(new T.Vector3());
   w.chase(p,null,0);const unlock=eye.distanceTo(w.camera.position),unlockAngle=view.angleTo(w.camera.getWorldDirection(new T.Vector3())),pitch=w._lookPitch;
   w.mouseLook(1,0);w.chase(p,null,0);const mousePitchChange=Math.abs(w._lookPitch-pitch);
   for(let i=0;i<360;i++)w.chase(p,null,1/120);
   const up=new T.Vector3(0,1,0).applyQuaternion(w.camera.quaternion),offset=w.camera.position.clone().sub(p.pos).sub(new T.Vector3(0,5.4,0));
   rows.push({...cfg,acquire,unlock,unlockAngle,mousePitchChange,recoveredLift:offset.dot(up)});
  }return rows;
 });
 const roster=await page.evaluate(async()=>{
  const {Fighter}=await import('/src/engine/entity.js'),{game:g,THREE:T,ROSTER}=LSW,w=g.world,foe=g.entities.find(e=>e!==g.player&&!e.isDummy),bad=[];let tested=0;
  for(const def of ROSTER){
   const p=new Fighter(def);p._game=g;p._openSky=true;p.pos.set(0,220,0);p.flying=true;p.gait='airborne';p.faceDir(0,1);
   try{
    for(let i=0;i<60;i++)p._animate(1/60);p.obj.updateMatrixWorld(true);
    for(const gap of [14,40,110]){
     foe.pos.set(0,220,gap);w._lookYaw=0;w._lookPitch=0;w.snapChase();w.chase(p,foe,1/60);w.camera.updateMatrixWorld(true);
     const center=foe.center(new T.Vector3()),ray=new T.Raycaster(w.camera.position,center.clone().sub(w.camera.position).normalize(),0,w.camera.position.distanceTo(center)-.1);
     const hidden=ray.intersectObject(p.parts.body,true).some(hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}return !hit.object.material.transparent;});
     if(hidden)bad.push(`${def.id}/${gap}`);tested++;
    }
   }finally{p.dispose();}
  }return {tested,bad};
 });
 const walls=await page.evaluate(()=>{
  const {game:g}=LSW,w=g.world,p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy),cover=w.cover,rows=[];
  p.pos.set(0,220,0);p.vel.set(0,0,0);f.pos.set(0,220,40);w.cover=[{x:0,z:-28,hx:100,hz:2,top:300}];
  try{for(const hz of [30,60,144]){w.snapChase();for(let i=0;i<hz*2;i++)w.chase(p,f,1/hz);rows.push({hz,z:w.camera.position.z,fov:w.camera.fov});}}
  finally{w.cover=cover;}return rows;
 });
 const failures=[];
 for(const r of rows){
  if(Math.abs(r.back-rows[0].back)>.05||Math.abs(r.lift-rows[0].lift)>.05||Math.abs(r.side)>.01)failures.push(`${r.name}: camera is not the fixed raised, centered rear boom`);
  if(Math.abs(r.fov-rows[0].fov)>.01)failures.push(`${r.name}: target range changes the lens`);
  // The view cannot pitch through the nadir without rolling upside-down. At
  // that pole the fixed raised boom leaves a small projected reticle offset.
  const targetLimit=r.name==='nadir'?.3:.1;
  if(r.lock&&(Math.abs(r.target[0])>targetLimit||Math.abs(r.target[1])>targetLimit||r.hidden))failures.push(`${r.name}: attack target is not clear`);
 }
 for(const r of handoffs)if(r.acquire>.001||r.unlock>.001||r.unlockAngle>.001||r.mousePitchChange>.001||Math.abs(r.recoveredLift-rows[0].lift)>.001)failures.push(`Handoff ${r.gap}/${r.pitch}: lock acquisition/release or horizontal mouse input changes the view unexpectedly`);
 if(roster.bad.length)failures.push(`Roster target occlusion: ${roster.bad.join(', ')}`);
 if(walls.some(r=>r.z< -26||Math.abs(r.fov-rows[0].fov)>.01))failures.push('Collision passes through the wall or changes the lens');
 if(rows.find(r=>r.name==='dive').viewPitch>-60)failures.push('Dive view is flattened instead of following the viewing angle');
 await writeFile(`${out}/results.json`,JSON.stringify({rows,handoffs,roster,walls,failures,errors},null,2));console.log({rows,handoffs,roster,walls,failures,errors});if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
