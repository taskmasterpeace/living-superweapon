// Native Studio motion and attacks; shader-only A/B, scripted inspection camera.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const label=process.argv[2]||'after',baseline=process.argv.includes('--baseline');assert.match(label,/^[a-z0-9-]+$/);
const out=`artifacts/beam-hollow/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),rows=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
try{
 if(baseline){
  const now='1.2*(1.0-sideView)*smoothstep(.35,.85,facing)',old='3.0*axialStrand*smoothstep(.35,.85,facing)';
  await page.route('**/src/engine/beam-surface.js*',async route=>{
   const response=await route.fetch(),source=await response.text();
   assert.equal(source.split(now).length,2,'Baseline shader override must match exactly one current expression');
   await route.fulfill({response,body:source.replace(now,old)});
  });
 }
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.evaluate(()=>{
  const p=STUDIO.preview;p.playing=false;p.view='front';p.controls.enabled=false;p.profile.model.body='procedural';
  p.combat.shooterMotion='ground-right';p.combat.motion='orbit-right';p.combat.targetSpeed=18;p.combat.elevation=14;p.seek(0);
  for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;width:100vw;height:100vh;z-index:100';p.resize();
  window.volumeStep=frame=>{
   p.time=frame/60;p.step(1/60,false,false);const f=p.fighter,center=f.pos.clone().setY(f.pos.y+5.2),angle=(frame/360*Math.PI*2)+.3;
   p.camera.position.copy(center).add(new p.camera.position.constructor(Math.sin(angle)*18,4.5,Math.cos(angle)*18));p.camera.lookAt(center);p.camera.fov=42;p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
   const b=p.combat.game.projectiles.list.find(b=>b.core);
   return {frame,root:f.pos.toArray(),target:p.combat.target.pos.toArray(),damage:p.combat.damage,brace:p.combat.target._hitReaction?.beam?.weight||0,
    path:b?[...b.path.slice(0,b.pn*3)]:null,velocity:b?[...b.pvel.slice(0,b.pn*3)]:null,calls:p.renderer.info.render.calls,triangles:p.renderer.info.render.triangles};
  };
 });
 for(let sample=0;sample<120;sample++){
  const result=await page.evaluate(sample=>{const rows=[];for(let k=1;k<=3;k++)rows.push(volumeStep(sample*3+k));return {rows,jpg:STUDIO.preview.renderer.domElement.toDataURL('image/jpeg',.94)};},sample);
  rows.push(...result.rows);await writeFile(`${out}/frames/${String(sample).padStart(4,'0')}.jpg`,Buffer.from(result.jpg.split(',')[1],'base64'));
 }
 assert.deepEqual(errors,[]);assert.ok(rows.at(-1).damage>0);console.log({label,frames:120,damage:rows.at(-1).damage,errors});
}finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Actual Studio powers; scripted travel and camera; baseline changes shader only',baseline,rows,errors},null,2));await browser.close();}
execFileSync('ffmpeg',['-y','-v','error','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/beam-volume.mp4`]);
