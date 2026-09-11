// A clear straight pass must not come at the cost of broken stops, vertical
// flight, broadside tracking or camera switches as an opponent changes course.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const w=g.world,p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy),rows=[];
  for(const hz of [30,60,120])for(const kind of ['stop-before','stop-after','vertical','broadside','reverse','threshold','close-start'])for(const sign of [-1,1]){
   const dt=1/hz;
   p.pos.set(0,160,0);p.vel.set(0,0,0);p.faceDir(0,1);p.flying=true;p.gait='airborne';
   f.pos.set(kind==='vertical'||kind==='broadside'?0:3*sign,kind==='vertical'?140:160,kind==='broadside'?80:kind==='close-start'?6:45);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';
   w.clearFrameClaims();w._shake=0;w.snapChase();
   for(let i=0;i<hz;i++){p._animate(dt);f._animate(dt);w.chase(p,f,dt);}
   const eye=w.camera.position.clone(),direction=w.camera.getWorldDirection(new T.Vector3());
   let invalid=0,cropped=0,occluded=0,maxSpeed=0,maxTurn=0;
   for(let i=1;i<=hz*2;i++){
    const t=i/hz;
    if(kind==='vertical')f.pos.y=140+70*Math.min(t,1);
    else if(kind==='broadside')f.pos.x=sign*70*t;
    else if(kind==='threshold')f.pos.z=45-30*t-2/(4*Math.PI)*(1-Math.cos(4*Math.PI*t));
    else if(kind==='close-start')f.pos.z=6-31*Math.min(t,1);
    else if(kind==='reverse')f.pos.z=t<.5?45-70*t:10+70*Math.min(t-.5,.5);
    else f.pos.z=Math.max(kind==='stop-before'?8:-8,45-70*t);
    p.faceDir(f.pos.x,f.pos.z);p._animate(dt);f._animate(dt);w.chase(p,f,dt);
    w.camera.updateMatrixWorld(true);p.obj.updateMatrixWorld(true);
    const next=w.camera.getWorldDirection(new T.Vector3());
    const head=p.parts.head.getWorldPosition(new T.Vector3()).project(w.camera),foot=p.parts.legL.userData.boot.getWorldPosition(new T.Vector3()).project(w.camera);
    if(![...w.camera.position,...next,...head,...foot].every(Number.isFinite)){invalid++;continue;}
    maxSpeed=Math.max(maxSpeed,eye.distanceTo(w.camera.position)*hz);maxTurn=Math.max(maxTurn,direction.angleTo(next)*hz);
    eye.copy(w.camera.position);direction.copy(next);
    if(Math.abs(head.x)>.94||Math.abs(head.y)>.94||Math.abs(foot.x)>.94||Math.abs(foot.y)>.94)cropped++;
    const aim=f.center(new T.Vector3()),ray=new T.Raycaster(eye,aim.clone().sub(eye).normalize(),0,eye.distanceTo(aim)-.1);
    if(ray.intersectObject(p.parts.body,true).some(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return h.object.material&&!h.object.material.transparent;}))occluded++;
   }
   rows.push({hz,kind,sign,invalid,cropped,occluded,maxSpeed,maxTurn});
  }
  return rows;
 });
 const failures=[];
 for(const r of rows){const label=`${r.kind}/${r.sign}/${r.hz}`;if(r.invalid)failures.push(`${label}: non-finite camera in ${r.invalid} frames`);if(r.cropped>r.hz*.1)failures.push(`${label}: player cropped for ${r.cropped} frames`);if(r.maxTurn>6)failures.push(`${label}: view whips at ${r.maxTurn.toFixed(2)} rad/s`);if(r.occluded>r.hz*.1)failures.push(`${label}: target eclipsed for ${r.occluded} frames`);}
 const out='artifacts/flight-review/camera-pass-clearance';await mkdir(out,{recursive:true});
 await writeFile(`${out}/transitions${process.argv.includes('--before')?'-before':''}.json`,JSON.stringify({rows,failures,errors},null,2));
 console.log(JSON.stringify({cases:rows.length,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
