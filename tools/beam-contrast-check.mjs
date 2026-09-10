// A visible target is not enough: the attack shaft must also read against the scene.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('../node_modules/playwright-core/lib/utilsBundle.js');
const out='artifacts/flight-review/beam-contrast';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const f=g.player,foe=g.entities.find(e=>e!==f&&!e.isDummy);g.fov=false;g.world.setFogEnabled(false);
  for(const e of g.entities)e.obj.visible=e===f||e===foe;
  f.pos.set(0,140,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
  foe.pos.set(0,150,50);foe.flying=true;foe.gait='airborne';foe.invuln=100;foe._vis=1;foe.obj.visible=true;
  f.hasAimWorld=true;foe.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.pos).setY(f.aimWorld.y-f.pos.y-5.2).normalize();
  const beam=g.spawnBeamFor(f,f.slots.lmb.def,2.4);f.slots.lmb.active=beam;
  for(let i=0;i<180;i++){f.ki=f.maxKi;g.time+=1/120;f.update(1/120,g);foe.vel.set(0,0,0);foe._animate(1/120);beam.update(1/120,g);g.particles.update(1/120);g.vfx.update(1/120);}
  g.hud?.setPlayer(f.def);g.hardLock=foe;g.hud?.update();
  window.beamContrastView=view=>{
   if(view==='rear'){g.world.snapChase();for(let i=0;i<120;i++)g.world.chase(f,foe,1/120);}
   else {g.world.camera.position.set(48,152,28);g.world.camera.lookAt(0,149,28);}
   g.world.render();g.update=()=>g.world.composer.render();
   // Opponent pixels belong to the separate visibility test, not shaft contrast.
   foe.obj.visible=false;
   const v=beam.muzzle.clone().addScaledVector(beam.dir,24).project(g.world.camera);
   return {x:Math.round((v.x+1)*640)-6,y:Math.round((1-v.y)*360)-6,width:12,height:12};
  };
  window.beamContrastVisible=visible=>{beam.grp.visible=visible;g.world.composer.render();};
  window.beamContrastTime=offset=>{beam._surfaceTime.value=g.time+offset;g.world.composer.render();};
 });
 const rows=[];
 for(const view of ['rear','side']){
  const crop=await page.evaluate(view=>beamContrastView(view),view),frames=[];
  for(const visible of [false,true]){await page.evaluate(v=>beamContrastVisible(v),visible);frames.push(PNG.sync.read(await page.screenshot({clip:crop})).data);}
  let difference=0,readable=0;
  for(let i=0;i<frames[0].length;i+=4){const d=Math.abs(frames[1][i]-frames[0][i])+Math.abs(frames[1][i+1]-frames[0][i+1])+Math.abs(frames[1][i+2]-frames[0][i+2]);difference+=d;if(d>=30)readable++;}
  const pixels=frames[0].length/4;
  let motion=0,minReadableFraction=readable/pixels;
  // Sample a whole band cycle: two nearby times can both fall between bands.
  for(const offset of [.06,.12,.18]){
   await page.evaluate(offset=>beamContrastTime(offset),offset);
   const later=PNG.sync.read(await page.screenshot({clip:crop})).data;
   let change=0,phaseReadable=0;
   for(let i=0;i<later.length;i+=4){
    let contrast=0;for(let c=0;c<3;c++){change+=Math.abs(later[i+c]-frames[1][i+c]);contrast+=Math.abs(later[i+c]-frames[0][i+c]);}
    if(contrast>=30)phaseReadable++;
   }
   minReadableFraction=Math.min(minReadableFraction,phaseReadable/pixels);
   motion=Math.max(motion,change);
  }
  await page.evaluate(()=>beamContrastTime(0));
  rows.push({view,crop,meanRGBDifference:difference/pixels,readableFraction:readable/pixels,minReadableFraction,motionDifference:motion/pixels});
  await page.screenshot({path:`${out}/${process.argv.includes('--before')?'before':'after'}-${view}.png`});
 }
 const failures=rows.filter(r=>r.minReadableFraction<.75).map(r=>`${r.view} attack shaft disappears into the background`);
 if(rows.some(r=>r.motionDifference<1))failures.push('Energy bands do not move in the rendered rear/side shaft');
 console.log(JSON.stringify({rows,failures,errors},null,2));await writeFile(`${out}/checks.json`,JSON.stringify({rows,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
