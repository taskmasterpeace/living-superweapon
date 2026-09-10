// Real slot -> Fighter -> articulated sockets. --capture writes a 4-second 30fps review sequence.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/flight-review/charge-sequence';await mkdir(out,{recursive:true});
const captureView=process.argv.find(a=>a.startsWith('--view='))?.slice(7)||'game';
if(!['game','front','rear','left','right'].includes(captureView))throw new Error('Unknown capture view');
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(async()=>{
  const {runSlot}=await import('/src/engine/abilities.js');const {game:g,THREE:T}=LSW;g.update=()=>{};
  g.startMode('powerworld',{p1:'kano',p2:'vega'});g.fov=false;g.world.setFogEnabled(false);
  const f=g.player,foe=g.entities.find(e=>e!==f&&!e.isDummy);f.pos.set(0,140,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
  g.hud?.setPlayer(f.def);g.hardLock=foe;
  foe.pos.set(0,150,50);foe.hp=foe.maxHp=50000;foe.flying=true;foe.gait='airborne';foe._vis=1;foe.obj.visible=true;
  f.hasAimWorld=true;foe.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.pos).setY(f.aimWorld.y-f.pos.y-5.2).normalize();
  for(let i=0;i<120;i++)f.update(1/120,g);
  let prev=null;
  window.chargeFrame=({frame,render})=>{
   for(let j=0;j<4;j++){
    const pressed=frame===6&&j===0,released=(frame===45||frame===78)&&j===0,held=frame>=6&&frame<45;
    f.ki=f.maxKi;g.time+=1/120;runSlot(f,'lmb',{pressed,held,released,dt:1/120},g);f.update(1/120,g);g.projectiles.update(1/120,g);g.particles.update(1/120);g.vfx.update(1/120);
    // This is a stationary pose-review partner, not simulated opponent movement.
    // Do not accumulate knockback velocity without translating the body with it.
    foe.vel.set(0,0,0);foe.hitFlash=Math.max(0,foe.hitFlash-4/120);foe._animate(1/120);
   }
   f.obj.updateMatrixWorld(true);const a=f.parts.armL.children[2].getWorldPosition(new T.Vector3()),b=f.parts.armR.children[2].getWorldPosition(new T.Vector3());
   const center=a.clone().add(b).multiplyScalar(.5),local=f.parts.body.worldToLocal(center.clone()),s=f.slots.lmb;
   const quats=[f.parts.armL,f.parts.armR,f.parts.head].map(n=>n.quaternion.clone());
   const row={frame,charging:s.charging,beam:!!s.active?.sustaining,beamRadius:s.active?.radius||0,tipRadius:s.active?.tip.scale.x||0,handsGap:a.distanceTo(b),handsZ:local.z,
    orbError:s.orb?center.distanceTo(s.orb.position):null,coreRadius:s.orb?s.orb.children[0].getWorldScale(new T.Vector3()).x:0,knees:[f.parts.legL.userData.knee.rotation.x,f.parts.legR.userData.knee.rotation.x],
    step:prev?Math.max(...quats.map((q,i)=>q.angleTo(prev[i]))):0,root:f.pos.toArray()};prev=quats;
   if(render){window.chargeView('game');}return row;
  };
  g.world.snapChase();
  const cameraPosition=new T.Vector3(),cameraRotation=new T.Quaternion();
  window.chargeView=view=>{
   const w=g.world;
   if(view==='game'){w.chase(f,foe,1/30);cameraPosition.copy(w.camera.position);cameraRotation.copy(w.camera.quaternion);}
   else if(view==='restore'){w.camera.position.copy(cameraPosition);w.camera.quaternion.copy(cameraRotation);return;}
   else {const [x,z]=view==='front'?[14,24]:view==='rear'?[12,-24]:view==='left'?[-26,0]:[26,0];w.camera.position.set(x,148,z);w.camera.lookAt(0,146,0);}
   g.hud?.update();g.hud?.updateCrosshair(g);w.render();
  };
 });
 const rows=[];for(let frame=0;frame<120;frame++){
  const render=process.argv.includes('--capture')||[0,15,30,44,46,55,78,90,119].includes(frame);
  rows.push(await page.evaluate(args=>chargeFrame(args),{frame,render}));
  if(render&&captureView!=='game')await page.evaluate(view=>chargeView(view),captureView);
  if(render)await page.screenshot({path:`${out}/frame-${String(frame).padStart(4,'0')}.png`});
  if([0,15,30,44,46,55,78,90,119].includes(frame))for(const view of ['front','left','right','rear']){
   await page.evaluate(view=>chargeView(view),view);await page.screenshot({path:`${out}/${view}-${String(frame).padStart(4,'0')}.png`});
  }
  if(render)await page.evaluate(()=>chargeView('restore'));
 }
 const charge=rows[40],fire=rows[65],failures=[];
 if(!charge.charging||!fire.beam)failures.push('fixture did not exercise production charge then beam');
 if(rows[45].charging||!rows[45].beam)failures.push('early release did not fire before automatic max charge');
 if(rows.some(r=>r.beam&&r.tipRadius>r.beamRadius*1.5))failures.push('traveling tip balloons beyond the beam sheath and hides the caster on launch');
 if(charge.handsGap>1.8)failures.push('charged martial beam does not gather between both hands');
 if(charge.orbError>.3)failures.push('gather orb is not centered between actual hands');
 if(charge.coreRadius>1.1)failures.push('opaque charge core covers the chest and hand silhouette');
 if(charge.coreRadius<=rows[15].coreRadius*1.4)failures.push('charge core no longer grows with held power');
 if(fire.handsZ-charge.handsZ<.8)failures.push('release does not thrust hands forward from gather');
 if(Math.max(...charge.knees)>1.15)failures.push('casting keeps the rigid one-leg L instead of a braced stance');
 if(rows.some(r=>r.step>.45))failures.push('one-frame arm/head snap');
 if(rows.some(r=>Math.hypot(r.root[0],r.root[1]-140,r.root[2])>.01))failures.push('pose moved physics root');
 await writeFile(`${out}/checks.json`,JSON.stringify({rows,failures,errors},null,2));console.log(JSON.stringify({charge,fire,maxStep:Math.max(...rows.map(r=>r.step)),failures,errors},null,2));
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
