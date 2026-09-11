// Native KANO Wave Cannon into SOL's production reaction. Studio prescribes a
// six-second advance; actual beam contacts and damage are not mocked.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const label=process.argv[2]||'final',frames=process.argv.includes('--frames');
assert.match(label,/^[a-z0-9-]+$/);
const out=`artifacts/beam-pressure/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.evaluate(async()=>{
  const p=STUDIO.preview;p.playing=false;p.controls.enabled=false;p.view='front';p.combat.shooterMotion='ground-forward';p.seek(0);
  const {ROSTER}=await import('/src/data/characters.js'),c=p.combat;
  c.scene.remove(c.target.obj);c.target.dispose();
  const t=c.target=new p.fighter.constructor(ROSTER.find(d=>d.id==='sol'),{team:2});
  Object.assign(t,{_openSky:true,_game:c.game,invuln:0,hp:1e6,maxHp:1e6,isDummy:true});c.scene.add(t.obj);c.game.entities=[p.fighter,t];
  c.place=time=>{
   const f=p.fighter,z=30-Math.max(0,Math.min(3,time-1.7))*5;
   f.pos.set(0,0,0);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f._flyPose=0;
   t.pos.set(0,0,z);t.flying=false;t.gait='grounded';t._flyPose=0;
   c.pathVelocity.set(0,0,time>1.7&&time<4.7?-5:0);
   f.hasAimWorld=true;f.aimWorld.copy(t.pos).y+=5.2;f.aim3.copy(f.aimWorld).sub(f.pos.clone().setY(5.2)).normalize();f.faceDir(0,1);
   t.faceDir(0,-1);t.aim3.set(0,0,-1);
  };
  c.place(0);
  for(let i=0;i<120;i++){p.fighter._animate(1/60);t._animate(1/60);}
  for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0';p.resize();
  window.pressureStep=frame=>{
   p.time=frame/60;p.step(1/60,false,false);const b=c.game.projectiles.list.find(s=>s.sustaining);
   p.camera.position.set(29,18,40);p.camera.lookAt(0,5.5,17);p.camera.fov=43;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent='SOL / ADVANCING INTO A NATIVE WAVE CANNON';
   document.querySelector('.viewport-note').textContent='Procedural response · Studio-scripted advance · real beam contact · silent';
   document.querySelector('.measurements').textContent=`${p.time.toFixed(2)}s · ${c.damage.toFixed(0)} damage`;
   p.renderer.render(p.scene,p.camera);
   return {frame,time:p.time,target:t.pos.toArray(),damage:c.damage,tip:b?.tip.position.toArray(),brace:t._hitReaction?.beam?.weight||0,
    groundTake:t._groundMotion?.take||'procedural',arm:t.parts.armL.children[2].getWorldPosition(t.pos.clone()).toArray()};
  };
 });
 for(let sample=0;sample<120;sample++){
  const result=await page.evaluate(sample=>{
   const rows=[];for(let k=1;k<=3;k++)rows.push(pressureStep(sample*3+k));
   return {rows,png:STUDIO.preview.renderer.domElement.toDataURL('image/jpeg',.94)};
  },sample);rows.push(...result.rows);
  if(frames)await writeFile(`${out}/frames/${String(sample).padStart(4,'0')}.jpg`,Buffer.from(result.png.split(',')[1],'base64'));
  if([0,34,54,74,94,119].includes(sample))await page.screenshot({path:`${out}/${sample}.png`});
  if(sample%40===0)console.log(`pressure ${label} ${sample}/120`);
 }
 assert.deepEqual(errors,[]);assert.ok(rows.at(-1).damage>0);
 console.log(JSON.stringify({damage:rows.at(-1).damage,errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Native beam and real body; scripted Studio advance, not AI gameplay',rows,errors},null,2));await browser.close();}
if(frames)await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.jpg`,'-c:v','libx264','-threads','2','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/advance.mp4`]);
