// Catch close vertical locks eclipsed by the player's anatomy, and pole-crossing
// camera flips. Production poses/chase; no replacement camera in the fixture.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('../node_modules/playwright-core/lib/utilsBundle.js');
const out='artifacts/flight-review/vertical-camera',tag=process.argv.includes('--before')?'before':'after';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});
  const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy),w=g.world,rows=[],failures=[];
  for(const f of g.entities)f.obj.visible=f===a||f===b;
  for(const f of [a,b]){f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f._vis=1;}
  a.faceDir(0,1);b.faceDir(0,-1);g.hardLock=b;g.fov=false;w.setFogEnabled(false);
  const opaque=hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}const m=hit.object.material;return m&&!Array.isArray(m)&&(!m.transparent||m.opacity>.9);};
  const measure=()=>{
   w.camera.updateMatrixWorld(true);a.obj.updateMatrixWorld(true);b.obj.updateMatrixWorld(true);
   const center=b.center(new T.Vector3()),ray=new T.Raycaster(w.camera.position,center.clone().sub(w.camera.position).normalize(),0,w.camera.position.distanceTo(center)-.1);
   const hits=ray.intersectObject(a.parts.body,true).filter(opaque),screen=center.clone().project(w.camera);
   const heading=w.camera.getWorldDirection(new T.Vector3());
   const labels={torso:a.parts.torso,head:a.parts.head,pelvis:a.parts.pelvis,bootL:a.parts.legL.userData.boot,bootR:a.parts.legR.userData.boot,shinL:a.parts.legL.userData.shin,shinR:a.parts.legR.userData.shin};
   return {occluded:!!hits.length,hit:hits.length?Object.keys(labels).find(k=>labels[k]===hits[0].object)||hits[0].object.type:undefined,hitPoint:hits[0]?.point.toArray(),x:(1+screen.x)/2,y:(1-screen.y)/2,eye:w.camera.position.toArray(),heading:heading.toArray(),basis:w.camBasis.toArray()};
  };
  window.verticalPose=(gap,pitch)=>{
   const r=pitch*Math.PI/180;a.pos.set(0,200,0);b.pos.set(0,200+Math.sin(r)*gap,Math.cos(r)*gap);
   a.vel.set(0,0,0);b.vel.set(0,0,0);a.animT=b.animT=0;
   w._shake=0;w.clearFrameClaims();w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w._chaseYaw=0;w.snapChase();
   for(let i=0;i<180;i++){a._animate(1/120);b._animate(1/120);w.chase(a,b,1/120);}
   return measure();
  };
  for(const gap of [6,10,20,40])for(const pitch of [-90,-89,-75,-60,-45,0,45,60,75,89,90]){
   const row={gap,pitch,...verticalPose(gap,pitch)};rows.push(row);
   if(row.occluded)failures.push(`${gap}u/${pitch}deg: player eclipses target center`);
   if(row.x<.15||row.x>.85||row.y<.18||row.y>.64)failures.push(`${gap}u/${pitch}deg: target out of attack region`);
  }
  const motion=[];
  // Two continuous sweeps through the polar singularity, with no snap after setup.
  for(const hz of [30,60,120])for(const sign of [-1,1]) {
   verticalPose(10,sign*70);let previous=measure(),maxStep=0,occluded=0,worst=null;
   for(let i=1;i<=hz*2;i++){
    const r=sign*(70+40*i/(hz*2))*Math.PI/180;
    b.pos.set(0,200+Math.sin(r)*10,Math.cos(r)*10);a._animate(1/hz);b._animate(1/hz);w.chase(a,b,1/hz);
    const now=measure(),step=new T.Vector3(...previous.eye).distanceTo(new T.Vector3(...now.eye));
    if(step>maxStep){maxStep=step;worst={frame:i,pitch:sign*(70+40*i/(hz*2)),before:previous.eye,after:now.eye};}
    if(now.occluded)occluded++;previous=now;
   }
   motion.push({hz,sign,maxStep,occluded,worst});
   // 20deg/s target motion should not produce a multi-metre whip in one frame.
   if(maxStep>120/hz)failures.push(`${hz}Hz/${sign}: pole crossing whips camera ${maxStep.toFixed(2)}u/frame`);
   if(occluded)failures.push(`${hz}Hz/${sign}: target hidden for ${occluded} pole-crossing frames`);
  }
  const translation=[];
  window.verticalTranslate=(gap,pitch,speed,hz=60)=>{
   a.vel.set(0,0,0);verticalPose(gap,pitch);let occluded=0;
   for(let i=0;i<hz*2;i++){
    a.pos.x+=speed/hz;b.pos.x+=speed/hz;a.vel.x=speed;
    a._animate(1/hz);b._animate(1/hz);w.chase(a,b,1/hz);
    if(measure().occluded)occluded++;
   }
   return {hz,gap,pitch,speed,occluded,last:measure()};
  };
  for(const hz of [30,60,120])for(const gap of [6,10,20])for(const pitch of [-45,0])for(const speed of [-210,-60,60,210]){
   const row=verticalTranslate(gap,pitch,speed,hz);translation.push(row);
   if(row.occluded/hz>.1)failures.push(`${hz}Hz/${gap}u/${pitch}deg/${speed}u/s: translating fight eclipsed for ${(row.occluded/hz).toFixed(2)}s`);
  }
  a.vel.set(0,0,0);
  const rangeMotion=[];
  for(const sign of [-1,1]) {
   verticalPose(40,sign*90);let previous=measure(),maxStep=0;
   for(let i=1;i<=240;i++){
    b.pos.y=200+sign*(40+i/6);a._animate(1/120);b._animate(1/120);w.chase(a,b,1/120);
    const now=measure();maxStep=Math.max(maxStep,new T.Vector3(...previous.eye).distanceTo(new T.Vector3(...now.eye)));previous=now;
   }
   rangeMotion.push({sign,maxStep});if(maxStep>1)failures.push(`range transition ${sign}: camera steps ${maxStep.toFixed(2)}u/frame`);
  }
  verticalPose(10,-90);
  const beforeWall=w.camera.position.clone(),wall={x:beforeWall.x*.5,z:0,hx:2,hz:150,top:400};
  let collision;
  w.cover.push(wall);
  try {
   w.snapChase();w.chase(a,b,1/60);
   collision={before:beforeWall.toArray(),after:w.camera.position.toArray(),wallFace:wall.x+wall.hx};
   if(w.camera.position.x<wall.x+wall.hx||w.camera.position.x>=-1)failures.push('locked vertical camera did not stop before cover');
  }finally{w.cover.splice(w.cover.indexOf(wall),1);}
  const releases=[];
  for(const hz of [30,60,120])for(const gap of [10,40])for(const pitch of [-90,0,90]){
   verticalPose(gap,pitch);const eye=w.camera.position.clone(),heading=w.camera.getWorldDirection(new T.Vector3());
   w.chase(a,null,1/hz);
   const row={hz,gap,pitch,distance:eye.distanceTo(w.camera.position),angle:heading.angleTo(w.camera.getWorldDirection(new T.Vector3())),maxStep:eye.distanceTo(w.camera.position)};releases.push(row);
   eye.copy(w.camera.position);
   for(let i=1;i<hz;i++){w.chase(a,null,1/hz);row.maxStep=Math.max(row.maxStep,eye.distanceTo(w.camera.position));eye.copy(w.camera.position);}
   if(row.maxStep>120/hz+.01||row.angle>.02)failures.push(`release at ${gap}u/${pitch}deg/${hz}Hz snaps camera`);
  }
  // Rendered ablation measures the opponent's contribution with/without the
  // foreground player. This cannot pass just because one ray threads the boots.
  window.verticalVisibility=(player,foe)=>{
   a.parts.body.visible=player;b.parts.body.visible=foe;w.composer.render();
  };
  window.verticalRender=(gap,pitch)=>{verticalPose(gap,pitch);g.hud.update();w.render();};
  return {rows,motion,translation,rangeMotion,collision,releases,failures};
 });
 await page.evaluate(()=>{verticalTranslate(6,0,-210);LSW.game.hud.update();LSW.game.world.render();});
 await page.screenshot({path:`${out}/${tag}-strafe.png`});
 const visibility=[];
 for(const [gap,pitch,speed=0] of [[6,-90],[6,60],[6,90],[10,-90],[10,-60],[10,60],[10,90],[20,-90],[20,90],[40,-90],[40,90],[6,0,-210],[6,0,-60],[6,0,210]]) {
  await page.evaluate(([gap,pitch,speed])=>{if(speed){verticalTranslate(gap,pitch,speed);LSW.game.world.render();}else verticalRender(gap,pitch);},[gap,pitch,speed]);
  const images=[];
  for(const [player,foe] of [[false,true],[false,false],[true,true],[true,false]]){
   await page.evaluate(([player,foe])=>verticalVisibility(player,foe),[player,foe]);
   images.push(PNG.sync.read(await page.screenshot({clip:{x:520,y:240,width:240,height:240}})).data);
  }
  const [on,off,actualOn,actualOff]=images;let pixels=0,visible=0;
  for(let i=0;i<on.length;i+=4){
   const difference=(a,b)=>Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
   if(difference(on,off)>25){pixels++;if(difference(actualOn,actualOff)>25)visible++;}
  }
  const fraction=visible/Math.max(1,pixels);visibility.push({gap,pitch,speed,pixels,fraction});
  if(pixels<150||fraction<(gap<10&&!speed?.5:.7))result.failures.push(`${gap}u/${pitch}deg/${speed}u/s: only ${(fraction*100).toFixed(1)}% rendered opponent visible (${pixels} baseline pixels)`);
  await page.evaluate(()=>verticalVisibility(true,true));
 }
 for(const [gap,pitch] of [[6,-89],[10,-90],[10,90]]){
  await page.evaluate(([gap,pitch])=>verticalRender(gap,pitch),[gap,pitch]);await page.screenshot({path:`${out}/${tag}-${gap}-${pitch}.png`});
 }
 const report={...result,visibility,errors};console.log(JSON.stringify({staticCases:result.rows.length,motion:result.motion.map(({hz,sign,maxStep,occluded})=>({hz,sign,maxStep,occluded})),translationCases:result.translation.length,rangeMotion:result.rangeMotion,collision:result.collision,releases:result.releases,visibility,failures:result.failures,errors},null,2));await writeFile(`${out}/${tag}.json`,JSON.stringify(report,null,2));
 if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
