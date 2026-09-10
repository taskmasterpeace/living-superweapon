// Compare the real target's pixel contribution with/without the real beam, using the HDR pipeline.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('../node_modules/playwright-core/lib/utilsBundle.js');
const out='artifacts/flight-review/beam-visibility';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=[];
 for(const gap of [25,50,90]){
  const row=await page.evaluate(({gap})=>{
   const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
   const f=g.player,foe=g.entities.find(e=>e!==f&&!e.isDummy);g.fov=false;g.world.setFogEnabled(false);
   for(const e of g.entities)e.obj.visible=e===f||e===foe;
   f.pos.set(0,140,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
   foe.pos.set(0,150,gap);foe.vel.set(0,0,0);foe.flying=true;foe.gait='airborne';foe.invuln=0;foe.hp=foe.maxHp=50000;foe._vis=1;foe.obj.visible=true;
   f.hasAimWorld=true;foe.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.pos).setY(f.aimWorld.y-f.pos.y-5.2).normalize();
   const beam=g.spawnBeamFor(f,f.slots.lmb.def,2.4);f.slots.lmb.active=beam;
   for(let i=0;i<180;i++){f.ki=f.maxKi;g.time+=1/120;f.update(1/120,g);foe.vel.set(0,0,0);foe._animate(1/120);g.projectiles.update(1/120,g);g.particles.update(1/120);g.vfx.update(1/120);}
   g.world.snapChase();for(let i=0;i<120;i++)g.world.chase(f,foe,1/120);
   g.hud?.setPlayer(f.def);g.hardLock=foe;g.hud?.update();
   const box=new T.Box3().setFromObject(foe.parts.body),corners=[];
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const v=new T.Vector3(x,y,z).project(g.world.camera);corners.push([(v.x+1)*640,(1-v.y)*360]);
   }
   const x=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))-3),y=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))-3);
   const w=Math.min(1280-x,Math.ceil(Math.max(...corners.map(p=>p[0])))-x+3),h=Math.min(720-y,Math.ceil(Math.max(...corners.map(p=>p[1])))-y+3);
   // Hold sim, lighting and camera across the four compositor screenshots. Copying a
   // non-preserved WebGL canvas to 2D can clear its displayed backbuffer in Chromium.
   g.world.render();g.update=()=>g.world.composer.render();
   window.visibilityCapture=({visible,effect})=>{foe.obj.visible=visible;beam.grp.visible=effect;g.world.composer.render();};
   window.visibilitySide=()=>{
    const camera=g.world.camera;
    camera.position.copy(beam.muzzle).add(new T.Vector3(50,0,0));camera.lookAt(beam.muzzle);
    g.world.composer.render();const first=beam.core.material.opacity;
    for(let i=0;i<5;i++)g.world.composer.render();
    return {first,repeat:beam.core.material.opacity,base:beam.core.userData.beamOpacity};
   };
   return {gap,radius:beam.radius,damage:foe.maxHp-foe.hp,hitFlash:foe.hitFlash,crop:{x,y,width:w,height:h}};
  },{gap});
  const images=[];for(const [visible,effect] of [[true,false],[false,false],[true,true],[false,true]]){
   await page.evaluate(args=>visibilityCapture(args),{visible,effect});images.push(PNG.sync.read(await page.screenshot({clip:row.crop})).data);
  }
  const [baseOn,baseOff,fxOn,fxOff]=images;let base=0,withEffect=0,pixels=0;
  for(let i=0;i<baseOn.length;i+=4){const d=Math.abs(baseOn[i]-baseOff[i])+Math.abs(baseOn[i+1]-baseOff[i+1])+Math.abs(baseOn[i+2]-baseOff[i+2]);if(d>25){base+=d;withEffect+=Math.abs(fxOn[i]-fxOff[i])+Math.abs(fxOn[i+1]-fxOff[i+1])+Math.abs(fxOn[i+2]-fxOff[i+2]);pixels++;}}
  Object.assign(row,{pixels,retention:withEffect/Math.max(1,base)});rows.push(row);
  await page.evaluate(()=>visibilityCapture({visible:true,effect:true}));
  await page.screenshot({path:`${out}/${process.argv.includes('--before')?'before':'after'}-${gap}.png`});
  await page.evaluate(()=>visibilityCapture({visible:true,effect:false}));await page.screenshot({path:`${out}/baseline-${gap}.png`});
  await page.evaluate(()=>visibilityCapture({visible:true,effect:true}));
  row.side=await page.evaluate(()=>visibilitySide());
  if(gap===50)await page.screenshot({path:`${out}/side-50.png`});
 }
 const failures=rows.filter(r=>r.pixels<30||r.retention<.3).map(r=>`Opponent washed out at ${r.gap}u: retained ${(r.retention*100).toFixed(1)}% of silhouette contribution`);
 for(const r of rows)if(Math.abs(r.side.first-r.side.repeat)>1e-6||Math.abs(r.side.first-r.side.base)>.01)failures.push(`Side-on beam lost strength or compounded opacity at ${r.gap}u`);
 for(const r of rows)if(r.damage<=0||r.hitFlash>.3)failures.push(`Fixture must exercise real, readable sustained damage at ${r.gap}u`);
 console.log(JSON.stringify({rows,failures,errors},null,2));await writeFile(`${out}/checks.json`,JSON.stringify({rows,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
