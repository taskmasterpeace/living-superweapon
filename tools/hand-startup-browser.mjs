import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/hand-startup-route';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}}),page=await context.newPage();
const result={scope:'Fixed-position production KANO procedural flight/paired hand startup at75 degrees, actual paid preparation, emission and release. Inspection camera, not gameplay travel.',errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.bringToFront();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{handStartupFixture}=await import('/tools/helpers/hand-startup-fixture.mjs');p.playing=false;p.controls.enabled=false;p.combat.clear();p.scene.remove(p.fighter.obj);
  window.startupChapter=scale=>{window.startupFixture?.close();window.startupFixture=handStartupFixture({scene:p.scene,motion:'fly',yaw:10,pitch:75,scale});window.startupFrame=-1;};
  window.startupStep=frame=>{const x=window.startupFixture;
   while(window.startupFrame<frame){const i=++window.startupFrame;if(i===0)x.input(true,true,false);if(i===1)x.aim(-20,0);if(i===60)x.input(false,false,true);x.step();}
   const b=x.f.slots.lmb.active;p.scene.updateMatrixWorld(true);
   return {frame,scale:x.f.parts.g.userData.frame.scale,position:x.f.pos.toArray(),velocity:x.f.vel.toArray(),preparing:b?.pendingLaunch,emissionAge:b?.emissionAge||0,ki:x.f.ki};
  };
  window.startupView=angle=>{p.camera.position.set(Math.sin(angle)*22,59,Math.cos(angle)*22);p.camera.lookAt(0,55,1);p.camera.fov=34;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent='KANO · PROCEDURAL FLIGHT / UPWARD TWO-HAND RELEASE';
   document.querySelector('.measurements').textContent=`Frame ${window.startupFrame} · ${(window.startupFrame/60).toFixed(2)}s`;
   document.querySelector('.viewport-note').textContent='Fixed-position production articulation inspection · velocity selects flight pose · not integrated travel';p.renderer.render(p.scene,p.camera);
  };
 });
 for(const scale of [.65,1]){
  await page.evaluate(scale=>startupChapter(scale),scale);
  for(const frame of [0,6,12,18,24,45,60,75,90,119]){
   const sample=await page.evaluate(frame=>startupStep(frame),frame);result.samples.push(sample);
   await page.evaluate(()=>startupView(-.8));await page.locator('.viewport').screenshot({path:`${out}/scale-${scale}-frame-${frame}.png`});
   if(frame===24)assert.ok(sample.emissionAge>0&&!sample.preparing);
  }
  for(const [view,angle]of [['front',0],['left',-Math.PI/2],['right',Math.PI/2],['rear',Math.PI]]){
   await page.evaluate(scale=>{startupChapter(scale);startupStep(24);},scale);await page.evaluate(angle=>startupView(angle),angle);await page.locator('.viewport').screenshot({path:`${out}/scale-${scale}-${view}.png`});
  }
 }
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await page.video().saveAs(`${out}/startup-inspection.webm`);await browser.close();console.log(JSON.stringify(result));}
