// Live input/attack contract; scripted sparring partner isolates camera tracking from AI tactics.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const body=process.argv.find(arg=>arg.startsWith('--body='))?.slice(7);
if(body&&!['superhero-male','superhero-female'].includes(body))throw new Error(`Unknown body fixture: ${body}`);
const out=process.env.LSW_CAPTURE_DIR||(body?`artifacts/hero-skin/camera/${body}`:'artifacts/flight-review/combat-camera');await mkdir(out,{recursive:true});
const baseUrl=process.env.LSW_BASE_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${baseUrl}/powerworld.html`);await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(body=>{
  const g=LSW.game,w=g.world;g._cameraUpdate=g.update.bind(g);g.update=()=>{};
  g.startMode('powerworld',{p1:'sol',p2:'kano'});g.controlBot=()=>{};g._cameraRender=w.render.bind(w);w.render=()=>{};
  const p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy);window.cameraFoe=f;
  if(body){p.applyForm({model:{body}});if(p.parts.skin?.id!==body)throw new Error('Source body fixture was not installed');}
  for(const e of g.entities){e.ai=null;e.vel.set(0,0,0);if(e!==p&&e!==f)e.pos.set(800,80,800);}
  p.pos.set(0,140,0);f.pos.set(0,140,40);p.flying=f.flying=true;p.gait=f.gait='airborne';p.faceDir(0,1);f.faceDir(0,-1);
  p.ki=p.maxKi;f.hp=f.maxHp=5000;g.fov=false;w.setFogEnabled(false);w._lookActive=true;w._lookYaw=0;w._lookPitch=-Math.asin(10.7/40);w.snapChase();
  // RAF remains alive to render the app; it must not consume a real mouse event before the
  // explicitly clocked simulation step gets it.
  g._cameraEndFrame=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};
  window.cameraStep=(n=1)=>{for(let i=0;i<n;i++){g._cameraUpdate(1/120);g._cameraEndFrame();}};
  window.cameraKey=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  cameraStep(90);
 },body);
 // A real canvas click must capture the pointer and fire without silently acquiring a lock.
 await page.mouse.click(640,360);await page.waitForFunction(()=>LSW.game.input.mouse.locked);
 await page.evaluate(()=>{cameraStep(1);});
 const heading=await page.evaluate(()=>LSW.game.world._lookYaw);
 await page.mouse.move(670,360);await page.mouse.move(700,360);
 const mouse=await page.evaluate(()=>{const dx=LSW.game.input.mouse.dx;cameraStep(1);return {dx,yaw:LSW.game.world._lookYaw,locked:LSW.game.input.mouse.locked,hardLock:!!LSW.game.hardLock};});
 const aim=await page.evaluate(()=>{const g=LSW.game;g.world._lookYaw=0;g.world._lookPitch=-Math.asin(10.7/40);g.world.snapChase();cameraStep(60);return {hp:cameraFoe.hp};});
 await page.mouse.down();await page.evaluate(()=>cameraStep(100));await page.mouse.up();
 await page.evaluate(()=>LSW.game._cameraRender());
 const shot=await page.evaluate(()=>{const beams=LSW.game.projectiles.list.filter(o=>o.sustaining);return {hp:cameraFoe.hp,locked:!!LSW.game.hardLock,beams:beams.length,readableLayers:beams.every(b=>b.core.material.blending===LSW.THREE.NormalBlending&&b.core.material.side===LSW.THREE.FrontSide&&(!b.detail||b.detail.material.color.getHexString()===b.color.slice(1)))};});
 await page.screenshot({path:`${out}/free-aim-firing.png`});
 const tracking=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,T=LSW.THREE,p=g.player,f=cameraFoe;
  cameraKey('KeyT',true);cameraStep();cameraKey('KeyT',false);cameraStep(60);
  const acquired=g.hardLock===f;let outside=0,occluded=0,maxStep=0;const old=w.camera.getWorldDirection(new T.Vector3());
  for(let i=0;i<720;i++){
   const t=i/120;f.pos.set(Math.sin(t*1.2)*24,140+Math.sin(t*.9)*35,40+Math.cos(t*.7)*14);f.vel.set(0,0,0);
   if(i===60)cameraKey('KeyD',true);if(i===160)cameraKey('KeyD',false);
   cameraStep();w.camera.updateMatrixWorld(true);p.obj.updateMatrixWorld(true);
   const center=f.center(new T.Vector3()),v=center.clone().project(w.camera);
   if(Math.abs(v.x)>.7||Math.abs(v.y)>.6)outside++;
   const dir=w.camera.getWorldDirection(new T.Vector3());maxStep=Math.max(maxStep,old.angleTo(dir));old.copy(dir);
   const ray=new T.Raycaster(w.camera.position,center.clone().sub(w.camera.position).normalize(),0,w.camera.position.distanceTo(center)-.1);
   if(ray.intersectObject(p.parts.body,true).some(h=>h.object.visible&&h.object.material&&!h.object.material.transparent))occluded++;
  }
  const before=w.camera.getWorldDirection(new T.Vector3()),pos=w.camera.position.clone();
  cameraKey('KeyT',true);cameraStep();cameraKey('KeyT',false);
  const releaseAngle=before.angleTo(w.camera.getWorldDirection(new T.Vector3())),releaseDistance=pos.distanceTo(w.camera.position);
  return {acquired,outside,occluded,maxStep,releaseAngle,releaseDistance,released:!g.hardLock};
 });
 const failures=[];
 const multipleRelease=await page.evaluate(()=>{
  const g=LSW.game,p=g.player,f=cameraFoe;
  const extra=g.addFighter(LSW.ROSTER.find(d=>d.id==='vega'),{team:f.team});extra.pos.copy(f.pos).add(new LSW.THREE.Vector3(8,0,2));extra._vis=1;
  g.hardLock=f;g.world.snapChase();g.world.chase(p,f,1/60);g.world.camera.updateMatrixWorld(true);
  const released=g.cycleLock(p)===null;
  g.entities.splice(g.entities.indexOf(extra),1);g.scene.remove(extra.obj);extra.dispose();g.hardLock=null;
  return released;
 });
 if(!mouse.locked||mouse.yaw>=heading||mouse.hardLock)failures.push('Pointer-lock mouse must turn right immediately; fire must not acquire lock');
 if(aim.hp-shot.hp<5||shot.locked)failures.push('Free-aim beam must damage the visible opponent without lock-on');
 if(!shot.readableLayers)failures.push('Beam layers stack white over the target instead of preserving their color');
 if(!tracking.acquired||tracking.outside||tracking.occluded>12)failures.push('Moving locked opponent leaves clear attack region');
 if(!tracking.released||tracking.releaseAngle>.035||tracking.releaseDistance>2)failures.push('Releasing lock snaps camera/aim');
 if(!multipleRelease)failures.push('Target toggle must release even with multiple opponents in view');
 if(process.argv.includes('--reel')||process.argv.includes('--diagnostic')){
  await mkdir(`${out}/reel`,{recursive:true});
  await page.evaluate(()=>{
   const g=LSW.game,w=g.world,p=g.player,f=cameraFoe;
   p.pos.set(0,140,0);p.vel.set(0,0,0);f.pos.set(0,140,40);f.vel.set(0,0,0);p.faceDir(0,1);
   p.ki=p.maxKi;g.hardLock=null;w.clearFrameClaims();w._shake=0;w._lookYaw=0;w._lookPitch=-Math.asin(10.7/40);w.snapChase();cameraStep(90);
   const label=document.createElement('div');label.id='camera-evidence-label';label.style.cssText='position:fixed;left:24px;top:88px;color:#fff3d6;background:#201c16dd;padding:10px 14px;font:600 15px system-ui;pointer-events:none';document.body.append(label);
  });
  for(let frame=0;frame<168;frame++){
   await page.evaluate(frame=>{
    const g=LSW.game,w=g.world,p=g.player,f=cameraFoe;
    if(frame===8){g.input.mouse.left=true;g.input.mouse.leftEdge=true;}
    if(frame===30){g.input.mouse.left=false;g.input.mouse.leftUp=true;}
    if(frame===40)cameraKey('KeyT',true);if(frame===41)cameraKey('KeyT',false);
    if(frame===50)cameraKey('KeyD',true);if(frame===72)cameraKey('KeyD',false);
    if(frame===75){g.input.mouse.left=true;g.input.mouse.leftEdge=true;}
    if(frame===116){g.input.mouse.left=false;g.input.mouse.leftUp=true;}
    if(frame===138)cameraKey('KeyT',true);if(frame===139)cameraKey('KeyT',false);
    for(let s=0;s<5;s++){
     if(frame>=42&&frame<130){const t=(frame-42+s/5)/24;f.pos.set(Math.sin(t*.8)*22,140+Math.sin(t*1.25)*28,40+Math.sin(t*.6)*12);f.vel.set(0,0,0);}
     cameraStep();
    }
    document.querySelector('#camera-evidence-label').textContent=frame<40?'FREE AIM · actual beam, no lock':frame<75?'TRACK · strafe with opponent in view':frame<130?'FIRE · track changing altitude':frame<138?'HOVER · hold target':'RELEASE · mouse view stays continuous';
    g._cameraRender();
   },frame);
   if(process.argv.includes('--diagnostic')&&frame!==96)continue;
   await page.screenshot({path:`${out}/reel/frame-${String(frame).padStart(4,'0')}.png`});
   if(frame===96){
    console.log('Firing visual diagnostic',await page.evaluate(()=>{const g=LSW.game,f=cameraFoe;return {foe:{visible:f.obj.visible,scale:f.obj.scale.toArray(),position:f.pos.toArray(),hp:f.hp},beams:g.projectiles.list.filter(o=>o.sustaining).map(o=>({radius:o.radius,color:o.color,color2:o.color2,build:o.build,temper:o.temper,opacity:o.core.material.opacity}))};}));
    await page.evaluate(()=>{for(const o of LSW.game.projectiles.list)if(o.sustaining)o.grp.visible=false;LSW.game._cameraRender();});
    await page.screenshot({path:`${out}/firing-without-beam-diagnostic.png`});
    await page.evaluate(()=>{for(const o of LSW.game.projectiles.list)if(o.sustaining)o.grp.visible=true;});
   }
   if(frame%48===0)console.log(`Combat motion captured ${frame}/168`);
  }
 }
 await writeFile(`${out}/live.json`,JSON.stringify({body:body??'procedural',mouse,shot,damage:aim.hp-shot.hp,tracking,multipleRelease,failures,errors},null,2));
 console.log(JSON.stringify({body:body??'procedural',mouse,shot,damage:aim.hp-shot.hp,tracking,multipleRelease,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
