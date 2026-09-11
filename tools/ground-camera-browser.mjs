import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const label=process.argv[2]||'inspection';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const prior=process.argv.includes('--prior-response'),out=`artifacts/ground-camera/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(prior=>{
  const {game:g,THREE:T}=LSW,w=g.world,update=g.update.bind(g),render=w.render.bind(w);g.update=()=>{};w.render=()=>{};
  g.controlBot=()=>{};g.fov=false;w.setFogEnabled(false);g.hardLock=null;
  const f=g.player;for(const other of g.entities)if(other!==f){other.ai=null;other.pos.set(800,140,800);}
  f.energyInfinite=true;f.level=10;f.invuln=100;f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.animT=0;
  w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w._shake=0;w.snapChase();
  const end=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};g.input.keys.clear();end();
  // Independent rendered-geometry witness: stage rocks are convex. Checking
  // actual face half-spaces catches a camera inside rock even when the old
  // undersized physics proxy (or a player-only reticle ray) says it is clear.
  const rocks=w.cover.filter(c=>c.mesh).map(c=>{
   const m=c.mesh;m.updateWorldMatrix(true,true);const geo=m.geometry,a=geo.attributes.position,index=geo.index,planes=[];
   const center=new T.Box3().setFromObject(m,true).getCenter(new T.Vector3());
   for(let i=0;i<(index?index.count:a.count);i+=3){
    const p=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,index?index.getX(i+j):i+j).applyMatrix4(m.matrixWorld));
    const plane=new T.Plane().setFromCoplanarPoints(...p);if(plane.normal.lengthSq()<.5)continue;
    if(plane.distanceToPoint(center)>0)plane.negate();planes.push(plane);
   }
   return {c,planes};
  });
  if(prior){
   // Reconstructed previous collision response, not footage captured from a
   // historical checkout. All combat, pose and FX remain the current engine.
   const chase=w.chase.bind(w),anchor=new T.Vector3(),dir=new T.Vector3(),up=new T.Vector3();
   w.chase=(subject,target,dt)=>{
    chase(subject,target,dt);const c=w.camera,profile=subject.def.model?.camera;
    anchor.copy(subject.pos).y+=5.4;c.getWorldDirection(dir);up.set(0,1,0).applyQuaternion(c.quaternion);
    w.camPos.copy(anchor).addScaledVector(dir,-(profile?.range??25.5)).addScaledVector(up,profile?.height??9);
    const pad=c.near*Math.sqrt(1+Math.tan(c.fov*Math.PI/360)**2*(1+c.aspect**2))*1.35;
    const t=w._camNearestT(...anchor.toArray(),...w.camPos.toArray(),pad);w.camPos.lerp(anchor,1-t);
    w.camPos.y=Math.max(w.camPos.y,w.heightAt(w.camPos.x,w.camPos.z)+pad);
    c.position.copy(w.camPos);c.lookAt(w.camPos.clone().add(dir));c.updateMatrixWorld(true);
   };
  }
  window.cameraLiveStep=frame=>{
   const u=frame<60?0:frame<180?(frame-60)/120:frame<240?1:frame<360?1-(frame-240)/120:0;
   const pitch=79*Math.PI/180*u*u*(3-2*u),canvas=w.renderer.domElement;
   if(document.pointerLockElement===canvas)canvas.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:-(pitch-w._lookPitch)/w._lookSens,bubbles:true}));
   update(1/60);end();g.hud.setPlayer(f.def);g.hud.update();
   const c=w.camera;c.updateMatrixWorld(true);f.obj.updateMatrixWorld(true);
   const projected={};for(const name of ['head','torso'])projected[name]=f.parts[name].getWorldPosition(new T.Vector3()).project(c).toArray();
   const ray=new T.Raycaster(c.position,c.getWorldDirection(new T.Vector3()),c.near,30);
   const reticleBlocked=ray.intersectObject(f.parts.body,true).filter(hit=>{
    for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;
    return [].concat(hit.object.material).some(m=>!m.transparent);
   }).length;
   const samples=[c.position];for(const nx of [-1,1])for(const ny of [-1,1])samples.push(new T.Vector3(nx,ny,-1).unproject(c));
   const cameraRockPenetration=rocks.filter(r=>!r.c.destroyed&&r.planes.length&&samples.some(p=>r.planes.every(plane=>plane.distanceToPoint(p)<-1e-5))).length;
   const rockHit=ray.intersectObjects(rocks.filter(r=>!r.c.destroyed).map(r=>r.c.mesh),true)[0];
   const beam=f.slots.lmb.active;return {frame,projected,reticleBlocked,cameraRockPenetration,reticleRockDistance:rockHit?.distance??null,pitch:w._lookPitch,position:f.pos.toArray(),camera:c.position.toArray(),beamAge:beam?.emissionAge||0,source:f._groundMotion?.take,grounded:!f.flying};
  };
  window.cameraLiveRender=()=>{render();return w.renderer.domElement.toDataURL('image/jpeg',.92);};
 },prior);
 for(let frame=0;frame<480;frame++){
  if(frame===60){await page.mouse.move(640,400);await page.mouse.down();await page.keyboard.down('d');assert.ok(await page.evaluate(()=>!!document.pointerLockElement),'No pointer lock');}
  if(frame===300){await page.mouse.up();await page.keyboard.up('d');}
  rows.push(await page.evaluate(frame=>cameraLiveStep(frame),frame));
  if(frame%3===0){const data=await page.evaluate(()=>cameraLiveRender());await writeFile(`${out}/frames/${String(frame/3).padStart(4,'0')}.jpg`,Buffer.from(data.split(',')[1],'base64'));}
  if([0,120,180,240,270,285,300,315,360,479].includes(frame)){await page.evaluate(()=>cameraLiveRender());await page.screenshot({path:`${out}/frame-${frame}.png`});}
 }
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors,prior,scope:'Native game input/controller/physics/pose/optic beam and camera. Real browser D/LMB; relative mouse events dispatched under pointer lock. Batched rendered inspection, not FPS proof. Prior mode reconstructs only the preceding collision formula.'},null,2));
 // Keep an inspectable full clip even when an acceptance assertion below fails.
 // The exit code and JSON remain authoritative; an MP4 is not a passing result.
 await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/ground-camera.mp4`]);
 assert.deepEqual(errors,[]);assert.ok(rows.every(r=>r.grounded));assert.ok(rows.filter(r=>r.beamAge>0).length>180);
 assert.ok(rows[299].position[0]<rows[0].position[0]-30,'No native lateral movement');
 assert.ok(rows.every(r=>r.cameraRockPenetration===0),'The camera or near-plane corner enters actual rendered rock');
 if(!prior)for(const row of rows.filter(r=>r.frame>=180&&r.frame<240)){
  const visible=Object.values(row.projected).some(p=>Math.abs(p[0])<.95&&Math.abs(p[1])<.95&&p[2]<1);
  assert.ok(visible,`No upper-body cue during upward attack at frame ${row.frame}`);
  assert.equal(row.reticleBlocked,0,`The moving body covers the reticle at frame ${row.frame}`);
 }
 if(process.argv.includes('--whole-sequence'))for(const row of rows){
  assert.equal(row.reticleBlocked,0,`The moving/recovering body covers the reticle at frame ${row.frame}`);
  assert.ok(Object.values(row.projected).some(p=>Math.abs(p[0])<1&&Math.abs(p[1])<1&&p[2]<1),`No upper-body cue at frame ${row.frame}`);
 }
 console.log(JSON.stringify({label,rows:rows.length,errors,prior}));
}finally{await browser.close();}
