// Regression: rotating only the camera quaternion before controlPlayer left the
// aim trace at yesterday's eye while the rendered boom orbited to today's eye.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/free-aim-timing';
const baseline=process.argv.includes('--baseline');
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5180/powerworld.html');
  await page.waitForFunction(()=>window.LSW?.game);
  await page.locator('#pwGo').click();
  const result=await page.evaluate(baseline=>{
    const g=LSW.game,w=g.world,T=LSW.THREE,update=g.update.bind(g);
    const render=w.render.bind(w);
    g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});
    g.controlBot=()=>{};w.render=()=>{};g.hardLock=null;g.fov=false;
    if(baseline) {
      // Runtime mutation reproduces the previous quaternion-only preparation,
      // without reverting anyone's source files or altering the normal chase.
      const chase=w.chase.bind(w);
      w.chase=(subject,target,dt)=>{
        if(dt!==0)return chase(subject,target,dt);
        const c=w.camera,cp=Math.cos(w._lookPitch);
        c.lookAt(c.position.x+Math.sin(w._lookYaw)*cp,c.position.y+Math.sin(w._lookPitch),c.position.z+Math.cos(w._lookYaw)*cp);
      };
    }
    const p=g.player,foe=g.entities.find(e=>e!==p&&!e.isDummy);
    for(const e of g.entities)if(e!==p){e.ai=null;e.pos.set(800,140,800);}
    const rows=[];let capture;
    for(const hz of [30,60,144])for(const range of [20,45,120])for(const [dx,dy] of [[80,0],[-80,0],[0,80],[0,-80],[80,60]]) {
      // Independently compose a foe on the *new* view ray. The production camera
      // itself is not advanced to find the expected target position.
      p.pos.set(0,140,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';
      p.faceDir(0,1);w._lookActive=true;w._lookYaw=0;w._lookPitch=0;
      w.clearFrameClaims();w._shake=0;w.snapChase();
      foe.pos.set(800,140,800);foe.vel.set(0,0,0);foe.flying=true;foe.gait='airborne';
      g.input.endFrame();for(let i=0;i<hz;i++){update(1/hz);g.input.endFrame();}
      const yaw=-dx*w._lookSens,pitch=-dy*w._lookSens;
      const dir=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
      const up=new T.Vector3(-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch));
      // Authoring defaults: 34u rear boom, 10.5u view-up. Range is measured
      // beyond the player's plane, not from the rear camera.
      const center=new T.Vector3(0,p.pos.y+5.4,0).addScaledVector(up,10.5).addScaledVector(dir,range);
      foe.pos.copy(center).add(new T.Vector3(0,-5,0));foe.hp=foe.maxHp=5000;foe._vis=1;
      g.input.mouse.dx=dx;g.input.mouse.dy=dy;
      update(1/hz);g.input.endFrame();w.camera.updateMatrixWorld(true);
      const projected=p.aimWorld.clone().project(w.camera);
      rows.push({hz,range,dx,dy,pixels:Math.hypot(projected.x*640,projected.y*360),hit:g._aimHit?.hit,locked:!!g.hardLock});
      if(hz===60&&range===45&&dx===80&&dy===0){
        render();capture=w.renderer.domElement.toDataURL('image/png');
      }
    }
    return {rows,capture};
  },baseline);
  const {rows,capture}=result,tag=baseline?'before':'after';
  await writeFile(`${out}/${tag}.json`,JSON.stringify({rows,errors},null,2));
  if(capture)await writeFile(`${out}/${tag}.png`,Buffer.from(capture.split(',')[1],'base64'));
  console.log(JSON.stringify({tag,cases:rows.length,maxPixels:Math.max(...rows.map(r=>r.pixels)),misses:rows.filter(r=>r.hit!=='foe').length,errors},null,2));
  assert.equal(errors.length,0,'No runtime errors');
  assert.ok(rows.every(r=>!r.locked),'Free aim must not silently acquire a lock');
  assert.ok(rows.every(r=>r.hit==='foe'),'A foe under the new crosshair must be traced on the flick frame');
  assert.ok(rows.every(r=>r.pixels<1),'The traced shot must remain within one pixel of the rendered crosshair on a stationary flick');
} finally {await browser.close();}
