import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const skyId=process.argv[2]||'kloppenheim_06_puresky';
if(!['kloppenheim_05_puresky','kloppenheim_06_puresky','table_mountain_1_puresky'].includes(skyId))throw Error('Unreviewed comparison sky');
const out='artifacts/frontline-lighting/'+skyId;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline'})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady&&LSW.game.pwStage.aircraft.ready&&LSW.game.pwStage.convoy.ready);
 await page.evaluate(()=>{for(const f of LSW.game.entities)if(f!==LSW.game.player)f.ai=null;});
 await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');await page.mouse.move(835,535,{steps:5});
 await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
 await page.evaluate(()=>{const g=LSW.game;g.update=()=>g.world.render();const label=document.createElement('div');label.textContent='LIGHTING COMPARISON — frozen native flight frame';label.style.cssText='position:fixed;top:18px;left:80px;background:#211c16df;color:#fff1d5;padding:8px 12px;font:12px system-ui;z-index:99999';document.body.append(label);});
 await page.keyboard.up('w');await page.keyboard.up('d');await page.screenshot({path:out+'/midday.png'});
 await page.evaluate(async id=>{const {RGBELoader}=await import('/node_modules/three/examples/jsm/loaders/RGBELoader.js');const t=await new RGBELoader().loadAsync('/textures/frontline/'+id+'-2k.hdr'),w=LSW.game.world;t.mapping=LSW.THREE.EquirectangularReflectionMapping;w.skyMesh.material.uniforms.uFrontlineSky.value=t;w.scene.environment=t;},skyId);
 await page.waitForTimeout(300);await page.screenshot({path:out+'/sunset.png'});
 await page.evaluate(()=>{const w=LSW.game.world;w.sunOff.set(150,60,96);w.sun.position.copy(w.sun.target.position).add(w.sunOff);w.scene.environmentIntensity=.07;w.skyMesh.material.fragmentShader=w.skyMesh.material.fragmentShader.replace('photographed*=.60;','photographed*=.12;');w.skyMesh.material.needsUpdate=true;});await page.waitForTimeout(300);await page.screenshot({path:out+'/sunset-low-key.png'});
 await page.evaluate(()=>{const m=LSW.game.world.skyMesh.material;m.fragmentShader=m.fragmentShader.replace('photographed*=.12;','photographed*=.06;');m.needsUpdate=true;});await page.waitForTimeout(300);await page.screenshot({path:out+'/sunset-exposure-06.png'});
 await page.evaluate(()=>{const m=LSW.game.world.skyMesh.material;m.fragmentShader=m.fragmentShader.replace('photographed*=.06;','photographed*=.60; photographed*=min(1.0,2.0/max(max(photographed.r,photographed.g),max(photographed.b,.0001)));');m.needsUpdate=true;});await page.waitForTimeout(300);await page.screenshot({path:out+'/sunset-bounded.png'});
 await page.evaluate(()=>{const m=LSW.game.world.skyMesh.material;m.fragmentShader=m.fragmentShader.replace('2.0/max(max(photographed.r','0.85/max(max(photographed.r');m.needsUpdate=true;});await page.waitForTimeout(300);await page.screenshot({path:out+'/sunset-no-spill.png'});
 await page.evaluate(()=>{const w=LSW.game.world,s=w.sun.shadow,c=s.camera;w.sunOff.multiplyScalar(6);w.sun.position.copy(w.sun.target.position).add(w.sunOff);c.left=c.bottom=-1000;c.right=c.top=1000;c.near=10;c.far=3500;c.updateProjectionMatrix();s.mapSize.set(4096,4096);s.map?.dispose();s.map=null;s.needsUpdate=true;});await page.waitForTimeout(400);await page.screenshot({path:out+'/valley-shadows.png'});
 console.log(JSON.stringify({errors}));await writeFile(out+'/results.json',JSON.stringify({errors},null,2));
}finally{await browser.close();}
