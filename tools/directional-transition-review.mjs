// Production rig/aim/source-gait inspection; the neutral camera is NOT BFP camera evidence.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/directional-transition';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const hero of ['kano','sarge']){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.evaluate(async()=>{
   const p=STUDIO.preview,f=p.fighter,{runSlot}=await import('/src/engine/abilities.js');
   p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();
   f._game=p.combat.game;f._game.audio={...f._game.audio,gunshot(){}};f.pos.set(0,0,0);f.flying=false;f.gait='grounded';f._openSky=true;f.hasAimWorld=true;f.level=10;
   const key=Object.entries(f.slots).find(([,s])=>s.def.type==='beam')?.[0]||'lmb';
   p.camera.position.set(23,12,26);p.controls.target.set(0,5,0);p.camera.fov=34;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   window.stepReview=(degrees,dt)=>{
    const rad=degrees*Math.PI/180;f.facing=rad;f.aim.set(Math.sin(rad),0,Math.cos(rad));f.aim3.copy(f.aim);f.aimWorld.copy(f.aim).multiplyScalar(100);f.aimWorld.y=7;
    f.vel.set(0,0,14);f.ki=f.maxKi;f.slots[key].cd=Math.max(0,(f.slots[key].cd||0)-dt);f._game.time+=dt;
    runSlot(f,key,{pressed:!f.slots[key].active&&!f.slots[key].charging,held:true,released:false,dt},f._game);
    // Fixture fixes travel after real weapon recoil to isolate the presentation.
    f.vel.set(0,0,14);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);
    f._game.projectiles.update(dt,f._game);f._game.vfx.update(dt);p.renderer.render(p.scene,p.camera);
    return {yaw:f.obj.rotation.y,take:f._groundMotion.take,weight:f._groundMotion.weight,source:f._combatAim.source};
   };
   for(let i=0;i<90;i++)stepReview(119,1/60);
   document.querySelector('.view-tag').textContent='MOVING FIRE / AIM-BOUNDARY REVIEW';
   document.querySelector('.viewport-note').textContent='Production gait + aim. Fixed travel; target shifts 119°–123°. Inspection camera.';
  });
  const samples=await page.evaluate(async()=>{
   const rows=[];for(let i=0;i<90;i++){rows.push(stepReview(i%2?119:123,1/30));await new Promise(requestAnimationFrame);}return rows;
  });
  assert.ok(samples.every(s=>s.take&&s.weight>.9));
  assert.ok(Math.max(...samples.map(s=>s.yaw))-Math.min(...samples.map(s=>s.yaw))<.16);
  await page.locator('.viewport').screenshot({path:`${out}/${hero}-oblique-fire.png`});
  rows.push({hero,samples});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({heroes:rows.map(r=>r.hero),errors}));
}finally{await context.close();await page.video()?.saveAs(`${out}/moving-fire.webm`);await browser.close();}
