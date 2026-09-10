// Supplemental authored pose inspection, NOT native-input gameplay or performance.
// Actual encounter clone definition + Fighter/_animate/runSlot/source skinned body.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(process.env.LSW_RIFLE_OUT||'artifacts/rifle-contact-inspection');await mkdir(out,{recursive:true});
const result={kind:'SUPPLEMENTAL STUDIO POSE INSPECTION — staged camera and actor; not AI gameplay',errors:[],frames:[],shots:[]};
const browser=await chromium.launch({channel:'chromium',headless:false}),context=await browser.newContext({viewport:{width:1600,height:1000},recordVideo:{dir:out,size:{width:1600,height:1000}}}),page=await context.newPage();
page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sarge');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,T=await import('/node_modules/three/build/three.module.js'),{Fighter}=await import('/src/engine/entity.js'),{FrontlineEncounter}=await import('/src/engine/frontline-encounter.js');
  const {runSlot}=await import('/src/engine/abilities.js'),{prepareHeroSurfaces}=await import('/src/engine/hero-materials.js');
  p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();p.scene.remove(p.fighter.obj);p.fighter.dispose();
  const g=p.combat.game;g.player={pos:new T.Vector3(-40,0,-40)};g.addFighter=(def,opts)=>{const f=new Fighter(def,opts);g.entities.push(f);p.scene.add(f.obj);return f;};
  const encounter=new FrontlineEncounter(g),f=encounter.soldiers[0];for(const other of encounter.soldiers.slice(1)){p.scene.remove(other.obj);other.dispose();}p.scene.remove(encounter.markers);encounter.hud?.remove();
  p.fighter=f;f._game=g;f.ai=null;g.entities=[f];f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.facing=0;f.gait='grounded';f.grounded=true;f.flying=false;f.hasAimWorld=true;f.aimWorld.set(0,7,40);f.aim3.set(0,0,1);f.aim.set(0,0,1);
  await prepareHeroSurfaces([f.obj]);
  window.rifleView=side=>{const offset={front:[7,9,24],right:[24,9,1],back:[-7,9,-24],left:[-24,9,1]}[side];p.camera.position.fromArray(offset);p.camera.fov=36;p.controls.target.set(0,5.2,0);p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent=`CLONE RIFLE / ${side.toUpperCase()} / STAGED INSPECTION`;
   document.querySelector('.viewport-note').textContent='Supplemental source-body contact fixture. Procedural native pose and paid trigger; staged actor/camera, not gameplay.';};
  window.rifleStep=(mode,i)=>{const dt=1/60;g.time+=dt;f.animT+=dt;f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-dt);f.ki=Math.min(f.maxKi,f.ki+dt*8);f.guarding=mode==='guard';f.poseGuard=f.guarding?1:0;f.vel.set(mode==='idle'?0:8,0,mode==='retreat'?-8:mode==='idle'?0:8);
   const before=new Set(g.projectiles.list);if(mode==='fire')runSlot(f,'lmb',{pressed:false,held:true,released:false,dt},g);f.advanceActionPose(dt);f._animate(dt);f.obj.updateMatrixWorld(true);
   const gun=f.obj.getObjectByName('weapon-rifle'),at=o=>o.getWorldPosition(new T.Vector3()),muzzle=at(gun.getObjectByName('weapon-muzzle')),shots=[];
   for(const projectile of g.projectiles.list)if(!before.has(projectile)){projectile.resolveLaunch(g);shots.push({gap:projectile.pos.distanceTo(muzzle),dot:projectile.vel.clone().normalize().dot(f.aimWorld.clone().sub(muzzle).normalize())});}
   g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);p.renderer.render(p.scene,p.camera);
   return {mode,i,active:!!f._riflePose?.active,supportGap:at(gun.getObjectByName('weapon-support-grip')).distanceTo(at(f.parts.armL.children[2])),stockGap:at(gun.getObjectByName('weapon-stock-contact')).distanceTo(at(f.parts.armR)),shots};};
  rifleView('front');
 });
 for(const mode of ['idle','move','fire','guard','retreat'])for(const side of ['front','right','back','left']){
  await page.evaluate(side=>rifleView(side),side);
  result.frames.push(...await page.evaluate(async mode=>{const rows=[];for(let i=0;i<30;i++){rows.push(rifleStep(mode,i));await new Promise(requestAnimationFrame);}return rows;},mode));
  const path=resolve(out,`${mode}-${side}.png`);await page.locator('.viewport').screenshot({path});result.shots.push({mode,side,path});
 }
 assert.ok(result.frames.every(f=>f.active&&f.supportGap<.045));const shots=result.frames.flatMap(f=>f.shots);assert.ok(shots.length>=5);assert.ok(shots.every(s=>s.gap<1e-5&&s.dot>.99));assert.deepEqual(result.errors,[]);result.success=true;
}catch(e){result.success=false;result.failure=String(e);process.exitCode=1;await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});}
finally{await context.close();result.video=await page.video()?.path();await browser.close();await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({success:result.success,failure:result.failure,out}));}
