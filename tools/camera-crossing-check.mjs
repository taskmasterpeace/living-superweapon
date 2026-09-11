// Fast fly-bys must not swing the boom through the player or lose their body.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/flight-review/camera-crossing';await mkdir(out,{recursive:true});
const label=process.argv.includes('--before')?'before':'after';
const hero=process.argv.find(a=>a.startsWith('--hero='))?.slice(7)||'kano';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(hero=>{LSW.game.update=()=>{};LSW.game.startMode('powerworld',{p1:hero,p2:'vega'});},hero);
 const rows=[];
 for(const hz of [30,60,120])for(const scenario of ['cross-70','cross-210','circle-20','circle-25','circle-40','cross-70-mirror','cross-210-mirror','circle-20-mirror','circle-25-mirror','circle-40-mirror']){
  const result=await page.evaluate(({hz,scenario})=>{
   const {game:g,THREE:T}=LSW,w=g.world,p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy);
   const radius=scenario.startsWith('circle')?Number(scenario.split('-')[1]):0,side=scenario.endsWith('-mirror')?-1:1,speed=Number(scenario.split('-')[1]);
   p.pos.set(0,160,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p.faceDir(0,1);f.pos.set(radius?0:3*side,160,radius||45);
   w._shake=0;w.clearFrameClaims();w.snapChase();w.chase(p,f,1/hz);
   const rows=[];let prev=w.camera.position.clone(),direction=w.camera.getWorldDirection(new T.Vector3());
   for(let i=0;i<hz*2;i++){
    const t=i/hz;if(radius)f.pos.set(side*Math.sin(t*210/radius)*radius,160,Math.cos(t*210/radius)*radius);else f.pos.set(3*side,160,45-speed*t);p.faceDir(f.pos.x-p.pos.x,f.pos.z-p.pos.z);p._animate(1/hz);f._animate(1/hz);w.chase(p,f,1/hz);w.camera.updateMatrixWorld(true);p.obj.updateMatrixWorld(true);
    const center=p.center(new T.Vector3()),eye=w.camera.position,head=p.parts.head.getWorldPosition(new T.Vector3()).project(w.camera),foot=p.parts.legL.userData.boot.getWorldPosition(new T.Vector3()).project(w.camera);
    const dir=w.camera.getWorldDirection(new T.Vector3());
    const aim=f.center(new T.Vector3()),ray=new T.Raycaster(eye,aim.clone().sub(eye).normalize(),0,eye.distanceTo(aim)-.1);
    const occluded=ray.intersectObject(p.parts.body,true).some(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return h.object.material&&!h.object.material.transparent;});
    rows.push({t,distance:eye.distanceTo(center),speed:eye.distanceTo(prev)*hz,turn:direction.angleTo(dir)*hz,occluded,eye:eye.toArray(),target:f.pos.toArray(),orbit:w._combatOrbitYaw,lane:w._combatLaneSide,head:head.toArray(),foot:foot.toArray()});prev.copy(eye);direction.copy(dir);
   }
   return {hz,scenario,minDistance:Math.min(...rows.map(r=>r.distance)),maxSpeed:Math.max(...rows.map(r=>r.speed)),maxTurn:Math.max(...rows.map(r=>r.turn)),occluded:rows.filter(r=>r.occluded).length,cropped:rows.filter(r=>Math.abs(r.head[0])>.94||Math.abs(r.head[1])>.94||Math.abs(r.foot[0])>.94||Math.abs(r.foot[1])>.94).length,rows};
  },{hz,scenario});rows.push(result);
 }
 const failures=[];
 for(const r of rows){const name=`${r.scenario}/${r.hz} Hz`;if(r.minDistance<25)failures.push(`${name}: boom cuts through its orbit (${r.minDistance.toFixed(1)}u)`);if(r.cropped>r.hz*.1)failures.push(`${name}: player cropped during fly-by (${r.cropped} frames)`);if(r.occluded>r.hz*.1)failures.push(`${name}: own body hides the attack target`);if(r.scenario.startsWith('cross-70')&&r.maxTurn>6)failures.push(`${name}: fly-by whips the view faster than 344 degrees/sec`);}
 for(const r of rows.filter(r=>r.scenario.startsWith('cross-70')))if(r.occluded)failures.push(`${r.scenario}/${r.hz} Hz: ordinary pass eclipses the target center for ${r.occluded} frames`);
 await writeFile(`${out}/${label}.json`,JSON.stringify({hero,rows,failures,errors},null,2));console.log(JSON.stringify({hero,cases:rows.length,passes:rows.filter(r=>r.scenario.startsWith('cross-70')).map(({rows,...r})=>r),failures,errors},null,2));
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
