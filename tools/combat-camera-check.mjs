// Rendered combat framing, not just camera-vector assertions. Vite on 5180.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const label=process.argv.includes('--before')?'before':'after',out='artifacts/flight-review/combat-camera';await mkdir(out,{recursive:true});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});g.world.setFogEnabled(false);});
 const rows=[];
 for(const scenario of [{name:'free-hover',dist:40,dy:0,lock:false},{name:'free-aimed',dist:40,dy:0,lock:false,pitch:-Math.asin(10.5/40)},{name:'lock-clinch',dist:6,dy:0,lock:true},{name:'lock-near',dist:14,dy:0,lock:true},{name:'lock-approach',dist:25,dy:0,lock:true},{name:'lock-mid',dist:40,dy:0,lock:true},{name:'lock-far',dist:110,dy:0,lock:true},{name:'lock-above',dist:30,dy:40,lock:true},{name:'lock-below',dist:30,dy:-40,lock:true},{name:'lock-overhead',dist:0,dy:40,lock:true},{name:'lock-underfoot',dist:0,dy:-40,lock:true}]){
  const row=await page.evaluate(s=>{
   const {game:g,THREE:T}=LSW,w=g.world,p=g.player,foe=g.entities.find(f=>f!==p&&!f.isDummy);
   p.pos.set(0,140,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p.faceDir(0,1);p._flyPose=1;p._flightBrake=0;p.cruiseHeld=false;p.poseGuard=0;p.animT=0;
   foe.pos.set(0,140+s.dy,s.dist);foe.vel.set(0,0,0);foe.flying=true;foe.gait='airborne';foe._vis=1;foe.obj.visible=true;foe.faceDir(0,-1);foe.animT=0;
   g.hardLock=s.lock?foe:null;w._lookActive=true;w._lookYaw=0;w._lookPitch=s.pitch||0;w._shake=0;w.clearFrameClaims();w.snapChase();
   for(let i=0;i<180;i++){p._animate(1/120);foe._animate(1/120);w.chase(p,s.lock?foe:null,1/120);}
   w.camera.updateMatrixWorld(true);p.obj.updateMatrixWorld(true);foe.obj.updateMatrixWorld(true);
   const point=part=>part.getWorldPosition(new T.Vector3()),project=v=>v.clone().project(w.camera);
   const ph=project(point(p.parts.head)),pf=project(point(p.parts.legL.userData.boot)),fh=project(point(foe.parts.head)),ff=project(point(foe.parts.legL.userData.boot));
   const fc=foe.center(new T.Vector3()),ndc=project(fc);
   // Project all corners of the driven anatomy, not a head-to-foot line which shrinks to
   // zero when seen from above. Exclude aura/markers/cape: they cannot make a foe readable.
   const silhouette=[];
   for(const mesh of [foe.parts.head,foe.parts.torso,foe.parts.armL.children[0],foe.parts.armR.children[0],foe.parts.legL.userData.boot,foe.parts.legR.userData.boot]){
    mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])silhouette.push(project(new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld)));
   }
   const targetSpan=Math.max((Math.max(...silhouette.map(v=>v.x))-Math.min(...silhouette.map(v=>v.x)))*1280/720,Math.max(...silhouette.map(v=>v.y))-Math.min(...silhouette.map(v=>v.y)))/2;
   const ray=new T.Raycaster(w.camera.position,fc.clone().sub(w.camera.position).normalize(),0,w.camera.position.distanceTo(fc)-.1);
   const occluded=ray.intersectObject(p.parts.body,true).some(hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}const m=hit.object.material;return m&&!Array.isArray(m)&&(!m.transparent||m.opacity>.9);});
   w.render();g._aim3pt.copy(fc);g.hud?.updateCrosshair?.(g);
   return {...s,playerHeadY:(1-ph.y)/2,playerFootY:(1-pf.y)/2,targetY:(1-ndc.y)/2,targetX:(1+ndc.x)/2,targetHeight:Math.abs(fh.y-ff.y)/2,targetSpan,occluded,fov:w.camera.fov};
  },scenario);rows.push(row);await page.screenshot({path:`${out}/${label}-${scenario.name}.png`});
 }
 const failures=[];
 const free=rows[0];if(free.playerHeadY<.59||free.playerHeadY>.79)failures.push('Free-aim head must sit clearly below the reticle (.59–.79 viewport), not cover it');
 if(rows.some(r=>!r.lock&&r.occluded))failures.push('Free aim: own body hides opponent');
 for(const r of rows.filter(r=>r.lock)){
  if(r.occluded)failures.push(`${r.name}: own body hides target center`);
  if(r.targetX<.15||r.targetX>.85||r.targetY<.18||r.targetY>.64)failures.push(`${r.name}: opponent outside readable attack region`);
  if(r.targetSpan<.045)failures.push(`${r.name}: opponent shrunk below readable size`);
  if(['lock-overhead','lock-underfoot'].includes(r.name)&&r.targetHeight<.04)failures.push(`${r.name}: vertical view flattens the opponent's body below 4% of frame height`);
  if(['lock-overhead','lock-underfoot'].includes(r.name)&&(r.playerHeadY<.06||r.playerFootY>.94))failures.push(`${r.name}: vertical framing crops the player`);
  if(r.name==='lock-clinch'&&(r.playerFootY-r.playerHeadY<.20||r.targetHeight<.15))failures.push('Close combat: automatic shoulder opening shrinks fighters below useful contact scale');
 }
 const roster=await page.evaluate(async()=>{
  const {Fighter}=await import('/src/engine/entity.js'),{game:g,THREE:T,ROSTER}=LSW,w=g.world,foe=g.entities.find(f=>f!==g.player&&!f.isDummy),bad=[];
  for(const def of ROSTER){
   const f=new Fighter(def);f._game=g;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(0,140,0);f.faceDir(0,1);f._flyPose=1;
   for(let i=0;i<120;i++){f.animT=i/120;f._animate(1/120);}f.obj.updateMatrixWorld(true);
   for(const distance of [6,25,40,110]){
    foe.pos.set(0,140,distance);w.snapChase();w.chase(f,foe,1/60);w.camera.updateMatrixWorld(true);
    const fc=foe.center(new T.Vector3()),ray=new T.Raycaster(w.camera.position,fc.clone().sub(w.camera.position).normalize(),0,w.camera.position.distanceTo(fc)-.1);
    if(ray.intersectObject(f.parts.body,true).some(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return h.object.material&&!h.object.material.transparent;}))bad.push(`${def.id}: lock at ${distance}`);
   }
   f.dispose();
  }
  return {tested:ROSTER.length,bad};
 });
 if(roster.bad.length)failures.push(...roster.bad);
 await writeFile(`${out}/${label}.json`,JSON.stringify({rows,roster,failures,errors},null,2));console.log(JSON.stringify({rows,roster,failures,errors},null,2));
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
