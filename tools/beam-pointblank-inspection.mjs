import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/beam-pointblank-inspection';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),report={scope:'Staged fixed-root production KANO charged two-hand pose, forward flight velocity, close target marker. Not native gameplay travel or hostile combat.',errors:[],samples:[]};
page.on('pageerror',e=>report.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{handStartupFixture}=await import('/tools/helpers/hand-startup-fixture.mjs'),{cancelHeldAttacks}=await import('/src/engine/abilities.js'),T=await import('/node_modules/three/build/three.module.js');
  p.playing=false;p.controls.enabled=false;p.combat.clear();p.scene.remove(p.fighter.obj);
  const marker=new T.Mesh(new T.SphereGeometry(.14,12,8),new T.MeshBasicMaterial({color:'#ff6644'}));p.scene.add(marker);
  window.pointblankStart=scale=>{
   window.pointblank?.close();const x=window.pointblank=handStartupFixture({scene:p.scene,motion:'fly',charge:true,scale});
   x.f.aimWorld.copy(x.f.pos).add(new T.Vector3(0,7*scale,4*scale));marker.position.copy(x.f.aimWorld);x.input(true,true,false);
   window.pointblankFrame=-1;
  };
  window.pointblankRender=(angle=-.9)=>{
   const x=window.pointblank,scale=x.f.parts.g.userData.frame.scale;
   p.camera.position.set(Math.sin(angle)*18*scale,50+8*scale,Math.cos(angle)*18*scale);p.camera.lookAt(0,50+5*scale,2*scale);p.camera.fov=38;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent='KANO · CLOSE TWO-HAND RELEASE · PROCEDURAL FLIGHT';
   document.querySelector('.measurements').textContent=`Scale ${scale} · frame ${window.pointblankFrame} · red marker = captured target`;
   document.querySelector('.viewport-note').textContent='Fixed-root production pose inspection, not gameplay travel. Charge → release → guard interruption.';
   p.scene.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);
  };
  window.pointblankStep=()=>{
   const x=window.pointblank,i=++window.pointblankFrame;
   if(i<42)x.input(false,true,false);if(i===42)x.input(false,false,true);if(i===90){cancelHeldAttacks(x.f);x.f.guarding=true;x.f.poseGuard=1;}
   x.step();pointblankRender();const b=x.f.slots.lmb.active;
   return {frame:i,scale:x.f.parts.g.userData.frame.scale,pending:b?.pendingLaunch,sustaining:!!b?.sustaining,age:b?.emissionAge||0,root:x.f.pos.toArray(),velocity:x.f.vel.toArray()};
  };
 });
 for(const scale of [.65,1,1.5]){
  await page.evaluate(s=>pointblankStart(s),scale);
  for(let i=0;i<120;i++){
   const row=await page.evaluate(()=>pointblankStep());
   if([0,21,41,48,60,75,89,105,119].includes(i)){
    report.samples.push(row);await page.locator('.viewport').screenshot({path:`${out}/scale-${scale}-frame-${i}.png`});
   }
   if(i===75)assert.ok(row.age>0&&!row.pending,'Close pose must release before recovery');
   if(i===105)assert.equal(row.sustaining,false,'Guard cancellation must retire the emitted beam');
   await page.waitForTimeout(16);
  }
  for(const [name,angle]of [['front',0],['left',-Math.PI/2],['right',Math.PI/2],['rear',Math.PI]]){
   await page.evaluate(s=>{pointblankStart(s);for(let i=0;i<61;i++)pointblankStep();},scale);
   await page.evaluate(a=>pointblankRender(a),angle);
   await page.locator('.viewport').screenshot({path:`${out}/scale-${scale}-${name}.png`});
  }
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));await context.close();await page.video().saveAs(`${out}/pointblank-inspection.webm`);await browser.close();console.log(JSON.stringify(report));}
