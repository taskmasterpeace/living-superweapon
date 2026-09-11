import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/terrain-detail-render';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false}),context=await browser.newContext({viewport:{width:1672,height:941}}),page=await context.newPage();
const result={errors:[],scope:'Native practice startup and flight/fire; read-only terrain draw measurements. Inspection-only alternate-camera/scope probes are explicitly separate.'};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();
 await page.evaluate(()=>{
  const w=PW.game.world,m=w._terrainDetail.mesh,before=m.onBeforeRender,after=m.onAfterRender;window.detailWitness={frames:[],last:0};
  m.onBeforeRender=function(r,...args){before.call(this,r,...args);detailWitness.last=r.info.render.triangles;};
  m.onAfterRender=function(r,scene,camera,...args){after.call(this,r,scene,camera,...args);if(detailWitness.frames.length<1500)detailWitness.frames.push({camera:camera===w.camera?'player':'other',actualTriangles:r.info.render.triangles-detailWitness.last,...w._terrainDetail.stats});};
 });
 await page.screenshot({path:out+'/01-native-spawn.png'});
 await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');await page.keyboard.down('KeyW');await page.waitForTimeout(1600);
 await page.mouse.move(836,400);await page.mouse.down();await page.waitForTimeout(1400);await page.screenshot({path:out+'/02-native-flight-fire.png'});await page.mouse.up();await page.keyboard.up('KeyW');
 result.native=await page.evaluate(()=>({witness:detailWitness,alive:PW.game.player.alive,sourceTriangles:PW.game.world._terrainDetail.fullIndices.length/3,cacheSize:PW.game.world._terrainDetail.cameraCache.size}));
 assert.ok(result.native.alive);assert.ok(result.native.witness.frames.some(f=>f.camera==='player'&&f.actualTriangles>0&&f.actualTriangles<result.native.sourceTriangles*.65));
 assert.ok(result.native.witness.frames.every(f=>f.actualTriangles===f.triangles));
 result.inspection=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),w=PW.game.world,d=w._terrainDetail,cam=new T.PerspectiveCamera(58,1672/941,.6,4200);
  cam.position.set(0,160,1000);cam.lookAt(0,80,2500);cam.updateMatrixWorld();d.update(cam,941);const wide={...d.stats,levels:d.stats.levels.slice()};
  cam.fov=12;cam.updateProjectionMatrix();d.update(cam,941);const scope={...d.stats,levels:d.stats.levels.slice()};
  for(let i=0;i<12;i++){const other=cam.clone();other.position.x=i*150;d.update(other,941);}
  const cacheSize=d.cameraCache.size;d.update(w.camera,w.renderer.domElement.height);return{wide,scope,cacheSize};
 });
 assert.ok(result.inspection.wide.levels[1]+result.inspection.wide.levels[2]>0);assert.ok(result.inspection.scope.maxPixelError<=.75);assert.ok(result.inspection.cacheSize<=3);
 assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,native:result.native?{...result.native,witness:{frames:result.native.witness.frames.length,first:result.native.witness.frames[0]}}:undefined},null,2));await browser.close();}
