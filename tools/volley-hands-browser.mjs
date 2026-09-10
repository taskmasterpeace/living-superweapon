import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/volley-hands';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage(),errors=[],results=[];
page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
 await page.getByLabel('Firing hands',{exact:true}).selectOption('paired');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.handPattern),'paired');
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.screenshot({path:out+'/studio-firing-hands.png'});
 for(const pattern of ['alternate','paired'])for(const motion of ['strafe','fly']){
  await page.evaluate(async({pattern,motion})=>{
   const p=STUDIO.preview,{runSlot}=await import('/src/engine/abilities.js');
   p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();
   const f=p.fighter,g=p.combat.game;f._game=g;g.entities=[f];g.attackRandom=()=>.5;f.level=10;
   f.slots.lmb.def={...f.slots.lmb.def,handPattern:pattern};f.slots.lmb.cd=0;f._rangedPose=null;f._combatAim.weight=0;
   f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.flying=motion==='fly';f.gait=f.flying?'airborne':'grounded';f._openSky=true;
   f.hasAimWorld=true;f.aimWorld.set(0,8,100);f.facing=0;f.aim.set(0,0,1);f.aim3.copy(f.aimWorld).sub(f.pos.clone().set(0,7,0)).normalize();
   p.camera.position.set(22,12,28);p.controls.target.set(0,5,0);p.camera.fov=35;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   window.volleyStep=(fire,dt)=>{
    f.vel.set(14,0,motion==='fly'?36:0);f.ki=10000;g.time+=dt;f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-dt);
    if(fire)runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);
    f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);
    const launches=g.projectiles.list.filter(s=>s.handOrigin!==null&&!s._launchResolved),expected=launches.map(s=>(s.handOrigin<0?f.parts.armL:f.parts.armR).children[2].getWorldPosition(f.pos.clone()));
    g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);p.renderer.render(p.scene,p.camera);
    return launches.map((s,i)=>({side:s.handOrigin,error:s.launchOrigin.distanceTo(expected[i]),point:s.launchOrigin.toArray()}));
   };
   for(let i=0;i<90;i++)volleyStep(false,1/60);
   document.querySelector('.view-tag').textContent=`${pattern.toUpperCase()} / ${motion.toUpperCase()} / ACTUAL HAND SOCKETS`;
   document.querySelector('.viewport-note').textContent='Production attack + animation + projectile pipeline. Fixed-position motion inspection; no player-camera claim.';
  },{pattern,motion});
  const shots=await page.evaluate(async()=>{const rows=[];for(let i=0;i<120;i++){rows.push(...volleyStep(i<80,1/30));await new Promise(requestAnimationFrame);}return rows;});
  assert.ok(shots.length>8);assert.ok(shots.every(s=>s.error<.001));assert.deepEqual([...new Set(shots.map(s=>s.side))].sort(),[-1,1]);
  await page.locator('.viewport').screenshot({path:`${out}/${pattern}-${motion}-recovery.png`});
  await page.evaluate(()=>{for(let i=0;i<20;i++)volleyStep(true,1/30);});
  await page.locator('.viewport').screenshot({path:`${out}/${pattern}-${motion}-fire.png`});
  results.push({pattern,motion,shots:shots.length,maxOriginError:Math.max(...shots.map(s=>s.error))});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await context.close();await page.video()?.saveAs(out+'/hand-patterns.webm');await browser.close();}
