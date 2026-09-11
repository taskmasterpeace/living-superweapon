// Art inspection fixtures are explicitly posed; gameplay has its own input test.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-mesa-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwEncounter [data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady);
 // Composition fixture: remove opponent decision-making only; native movement,
 // terrain, flight pose and camera remain live, with no artificial victory.
 await page.evaluate(()=>{for(const f of LSW.game.entities)if(f!==LSW.game.player)f.ai=null;});
 await page.mouse.click(835,470,{button:'middle'});await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>140);await page.keyboard.up('Space');
 await page.mouse.move(835,535,{steps:3});await page.keyboard.down('w');await page.waitForTimeout(650);await page.screenshot({path:`${out}/native-flight.png`});await page.keyboard.up('w');
 const result=await page.evaluate(()=>{
  const g=LSW.game,s=g.pwStage;g.update=()=>g.world.render();
  g.player.pos.set(-40,160,0);g.player.obj.position.copy(g.player.pos);g.player.flying=true;g.player.vel.set(0,0,45);g.player.aim.set(0,0,1);g.player._animate(.016);
  g.world.camera.position.set(-40,185,-150);g.world.camera.lookAt(-40,110,400);g.world.camera.updateMatrixWorld(true);g.world.render();
  return {label:'native input flight and separately posed terrain composition',rocks:s.frontlineRockCount,cover:s._cover.filter(c=>!c.frontlineVehicle).length,totalCover:g.world.coverAll.length,variants:s.group.children.filter(m=>m.geometry?.userData.frontlineMesa).map(m=>({variant:m.geometry.userData.frontlineMesa.variant,lod:m.geometry.userData.frontlineMesa.lod})),ema:g.world._ema};
 });
 await page.screenshot({path:`${out}/posed-composition.png`});
 await page.evaluate(()=>{const g=LSW.game,c=g.world.coverAll.find(c=>c.mesh.geometry?.userData.frontlineMesa?.variant===2),T=LSW.THREE;g.world.camera.position.set(c.x+220,c.top*.8,c.z+220);g.world.camera.lookAt(c.x,c.top*.45,c.z);g.world.camera.updateMatrixWorld(true);g.world.render();});
 await page.screenshot({path:`${out}/posed-scarp.png`});
 await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors}));
}finally{await browser.close();}
