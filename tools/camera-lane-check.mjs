// A side choice made before a pass must not become a shoulder flip inside a fight.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const out='artifacts/flight-review/camera-shoulder';await mkdir(out,{recursive:true});
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const w=g.world,p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy),rows=[];
  for(const hz of [30,60,120])for(const kind of ['close6','close10','vertical'])for(const sign of [-1,1]) {
   const gap=kind==='close6'?6:10,dt=1/hz;
   for(const actor of [p,f]){actor.vel.set(0,0,0);actor.flying=true;actor.gait='airborne';}
   p.pos.set(0,160,0);p.faceDir(0,1);f.pos.set(0,kind==='vertical'?218:160,kind==='vertical'?15:gap);
   w._shake=0;w.clearFrameClaims();w.snapChase();
   for(let i=0;i<hz*1.5;i++){p._animate(dt);f._animate(dt);w.chase(p,f,dt);}
   const previous=w.camera.position.clone(),direction=w.camera.getWorldDirection(new T.Vector3());
   let maxSpeed=0,maxTurn=0,flips=0,occluded=0,side=w._combatLaneSide;
   for(let i=1;i<=(kind==='vertical'?3:1)*hz;i++) {
    const t=i/hz;
    if(kind==='vertical')f.pos.set(sign*.3*Math.sin(8*t),218-5*t,15);else f.pos.x=sign*10*t;
    p.faceDir(f.pos.x,f.pos.z);p._animate(dt);f._animate(dt);w.chase(p,f,dt);w.camera.updateMatrixWorld(true);p.obj.updateMatrixWorld(true);
    const next=w.camera.getWorldDirection(new T.Vector3());
    maxSpeed=Math.max(maxSpeed,previous.distanceTo(w.camera.position)*hz);maxTurn=Math.max(maxTurn,direction.angleTo(next)*hz);
    previous.copy(w.camera.position);direction.copy(next);
    if(side!==w._combatLaneSide){flips++;side=w._combatLaneSide;}
    const aim=f.center(new T.Vector3()),eye=w.camera.position;
    const ray=new T.Raycaster(eye,aim.clone().sub(eye).normalize(),0,eye.distanceTo(aim)-.1);
    if(ray.intersectObject(p.parts.body,true).some(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return h.object.material&&!h.object.material.transparent;}))occluded++;
   }
   rows.push({hz,kind,sign,maxSpeed,maxTurn,flips,occluded});
  }
  return rows;
 });
 const failures=rows.filter(r=>r.flips||r.maxSpeed>75||r.maxTurn>2.5||r.occluded);
 await writeFile(`${out}/lane-stability.json`,JSON.stringify({rows,failures,errors},null,2));
 console.log(JSON.stringify({cases:rows.length,maxSpeed:Math.max(...rows.map(r=>r.maxSpeed)),maxTurn:Math.max(...rows.map(r=>r.maxTurn)),failures,errors},null,2));
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
