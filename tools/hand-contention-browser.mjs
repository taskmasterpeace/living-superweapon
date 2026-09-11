import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const out='artifacts/hand-contention';await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(30000);
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const {game:g,SETTINGS,hud}=LSW;SETTINGS.scheme='classic';
  const update=g.update.bind(g),endFrame=g.input.endFrame.bind(g.input);g.update=()=>{};g.input.endFrame=()=>{};
  g.startMode('powerworld',{p1:'kano',p2:'sol'});g.controlBot=()=>{};g.fov=false;
  for(const f of g.entities){f.ai=null;if(f!==g.player)f.pos.set(800,140,800);}
  const f=g.player;f.pos.set(0,140,0);f.flying=true;f.gait='airborne';f.level=10;f.invuln=999;f.energyInfinite=true;
  f._selSlot='lmb';f._selSecondary='q';hud.setPlayer(f.def);
  g.world._lookYaw=0;g.world._lookPitch=0;g.world._lookActive=true;g.world.snapChase();g.hardLock=null;
  window.contentionTick=(n=1)=>{for(let i=0;i<n;i++){update(1/60);endFrame();}hud.update();return {owner:!!f.slots.lmb.active?.sustaining,charging:!!f.slots.lmb.charging,denied:!!f.slots.q._handsBusy,retry:!!f.slots.q._handsRetry,secondaryCd:f.slots.q.cd,hud:document.querySelector('.trigger-pair').innerText};};
 });
 await page.mouse.move(700,450);await page.mouse.down();await page.evaluate(()=>contentionTick(50));
 await page.mouse.down({button:'right'});const denied=await page.evaluate(()=>contentionTick(12)); // RMB reserves a 150ms wheel-selection gesture.
 assert.ok(denied.charging&&denied.denied&&denied.secondaryCd===0,JSON.stringify(denied));assert.match(denied.hud,/HANDS OCCUPIED/);
 await page.screenshot({path:`${out}/gameplay-hands-occupied.png`});
 await page.mouse.up();await page.evaluate(()=>contentionTick(35)); // Releases the gathered Wave Cannon.
 await page.mouse.down();await page.evaluate(()=>contentionTick());await page.mouse.up();await page.evaluate(()=>contentionTick(30)); // Ends the sustaining hose.
 const retry=await page.evaluate(()=>contentionTick());assert.ok(!retry.owner&&retry.retry&&retry.secondaryCd===0);assert.match(retry.hud,/RELEASE TO RETRY/);
 await page.screenshot({path:`${out}/gameplay-release-to-retry.png`});
 await page.mouse.up({button:'right'});await page.evaluate(()=>contentionTick());await page.mouse.down({button:'right'});
 const fired=await page.evaluate(()=>contentionTick(12));assert.ok(fired.secondaryCd>0&&!fired.retry);
 await page.mouse.up({button:'right'});await page.evaluate(()=>contentionTick());
 console.log('Gameplay denial, retry and fresh press verified.');

 // Real authoring controls choose two stock hand beams. The shared native gate
 // must report their conflict, without modifying either saved attack definition.
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Preview level',{exact:true}).selectOption('10');await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.locator('#combat-slot').selectOption('rmb');await page.getByLabel('Co-fire attack',{exact:true}).selectOption('r');
 const studio=await page.evaluate(()=>{
  const p=STUDIO.preview;p.seek(0);p.fighter.energyInfinite=true;
  const before=JSON.stringify(p.fighter.def.abilities);
  for(let i=1;i<=180;i++)p.combat.step(i/60,1/60);
  p.time=3;p.renderer.render(p.scene,p.camera);
  return {phase:p.combat.phase,ownerAge:p.fighter.slots.rmb.active?.emissionAge,conflictActive:!!p.fighter.slots.r.active,unchanged:before===JSON.stringify(p.fighter.def.abilities)};
 });
 assert.match(studio.phase,/r-hands-occupied/);assert.ok(studio.ownerAge>0&&!studio.conflictActive&&studio.unchanged);
 console.log('Stock Studio co-fire conflict verified.');
 await page.screenshot({path:`${out}/studio-hands-occupied.png`});
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('air-right');
 await page.evaluate(()=>{
  const p=STUDIO.preview;p.seek(0);p.fighter.energyInfinite=true;p.controls.enabled=false;
  for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0';p.resize();
  p.camera.position.set(35,94,60);p.camera.lookAt(0,84,12);p.camera.fov=38;p.camera.updateProjectionMatrix();
 });
 const sequence=[];
 for(let frame=0;frame<360;frame++){
  sequence.push(await page.evaluate(frame=>{
   const p=STUDIO.preview;p.combat.step((frame+1)/60,1/60);p.time=(frame+1)/60;
   document.querySelector('.view-tag').textContent='VEGA / MOVING BEAM · HAND OWNERSHIP';
   document.querySelector('.measurements').textContent=`${p.combat.phase} · ${p.time.toFixed(2)}s`;
   document.querySelector('.viewport-note').textContent='Native powers + scripted Studio travel · procedural flight/combat overlay · not a live AI match';
   p.renderer.render(p.scene,p.camera);
   return {frame,phase:p.combat.phase,damage:p.combat.damage,position:p.fighter.pos.toArray(),ownerAge:p.fighter.slots.rmb.active?.emissionAge,secondaryActive:!!p.fighter.slots.r.active};
  },frame));
  if(frame%3===0)await page.screenshot({path:`${out}/frames/${String(frame/3).padStart(4,'0')}.jpg`,type:'jpeg',quality:90});
  if([0,89,179,269,359].includes(frame))await page.screenshot({path:`${out}/phase-${frame}.png`});
 }
 assert.ok(sequence.some(s=>s.damage>0),'The recorded native beam never contacted its target');
 assert.ok(sequence.every(s=>!s.secondaryActive),'The conflicting recorded beam was emitted');
 assert.deepEqual(errors,[]);await writeFile(`${out}/browser.json`,JSON.stringify({denied,retry,fired,studio,errors},null,2));
 await writeFile(`${out}/sequence.json`,JSON.stringify(sequence,null,2));
 console.log(JSON.stringify({gameplay:{denied:denied.denied,retry:retry.retry,fired:fired.secondaryCd>0},studio,errors}));
}catch(error){await page.screenshot({path:`${out}/failure.png`});throw error;}
finally{await browser.close();}
await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/hand-ownership.mp4`]);
