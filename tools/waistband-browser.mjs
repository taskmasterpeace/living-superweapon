// Actual Studio motion/powers and rig; scripted travel and inspection camera.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const label=process.argv[2];assert.match(label||'',/^[a-z0-9-]+$/);
const out=`artifacts/waistband/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),rows=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
try{
 for(const [chapter,[hero,body]] of [['sol','procedural'],['kano','procedural'],['sol','superhero-male'],['sol','superhero-female']].entries()){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
  await page.evaluate(body=>{
   const p=STUDIO.preview;p.playing=false;p.view='front';p.controls.enabled=false;p.profile.model.body=body;
   p.combat.shooterMotion='ground-right';p.combat.motion='orbit-right';p.combat.targetSpeed=18;p.combat.elevation=14;p.seek(0);
   if((p.fighter.parts.skin?.id||'procedural')!==body)throw Error('The requested body was lost on Studio seek');
   for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
   document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;width:100vw;height:100vh;z-index:100';p.resize();
   window.beltStep=frame=>{
    p.time=frame/60;p.step(1/60,false,false);const f=p.fighter,center=f.pos.clone().setY(f.pos.y+5.2),angle=(frame/360*Math.PI*2)+.3;
    p.camera.position.copy(center).add(new p.camera.position.constructor(Math.sin(angle)*18,4.5,Math.cos(angle)*18));
    p.camera.lookAt(center);p.camera.fov=42;p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
    document.querySelector('.view-tag').textContent=`${f.def.id.toUpperCase()} / ${body} / NATIVE MOVING ATTACK`;
    document.querySelector('.viewport-note').textContent='Studio-scripted travel and inspection camera · actual rig and power · no frame-rate claim';
    return {frame,body:f.parts.skin?.id||'procedural',hero:f.def.id,take:f._groundMotion?.take,root:f.pos.toArray(),damage:p.combat.damage,
     calls:p.renderer.info.render.calls,triangles:p.renderer.info.render.triangles};
   };
  },body);
  for(let sample=0;sample<120;sample++){
   const result=await page.evaluate(sample=>{const rows=[];for(let k=1;k<=3;k++)rows.push(beltStep(sample*3+k));return {rows,jpg:STUDIO.preview.renderer.domElement.toDataURL('image/jpeg',.94)};},sample);
   rows.push(...result.rows);await writeFile(`${out}/frames/${String(chapter*120+sample).padStart(4,'0')}.jpg`,Buffer.from(result.jpg.split(',')[1],'base64'));
   if([0,29,59,89,119].includes(sample))await page.screenshot({path:`${out}/${chapter}-${sample}.png`});
  }
  console.log(`waistband ${label}: ${hero}/${body}`);
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await browser.close();}
execFileSync('ffmpeg',['-y','-v','error','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/waistband.mp4`]);
