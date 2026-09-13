import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/weapon-support-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
for(const [hero,label]of [['vega','bat'],['trench','spear']]){
 const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out}}),page=await context.newPage();
 await page.goto(`http://127.0.0.1:5184/studio.html?hero=${hero}`);
 await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.evaluate(async label=>{
  const v=STUDIO.preview;v.playing=false;v.view='orbit';v.controls.enabled=false;v.resizeObserver.disconnect();
  v.combat.meleeSequence='heavy';v.combat.meleeStage='grounded';v.setState('melee');v.controls.update=()=>{};
  if(label==='bat'){
   const {buildWeapon}=await import('/src/engine/figure.js'),{alignWeaponGrip}=await import('/src/engine/weapon-grip.js');
   const bat=buildWeapon('bat',{});alignWeaponGrip(bat,1);
   const hand=v.fighter.parts.armR.children[2];hand.add(bat);hand.userData.gripOccupied=true;hand.userData.gripKind='cylinder';
  }
 },label);
 let last=null;
 for(let i=0;i<90;i++){
  last=await page.evaluate(()=>{
   const v=STUDIO.preview;for(let j=0;j<2;j++){v.time+=1/60;v.step(1/60,true,false);}
   v.fighter.obj.getWorldPosition(v.camera.position);v.camera.position.x+=10;v.camera.position.y+=8;v.camera.position.z+=12;v.camera.lookAt(v.camera.position.x-10,v.camera.position.y-3,v.camera.position.z-10);v.renderer.render(v.scene,v.camera);
   return {time:v.time,phase:v.fighter.mstate,damage:v.combat.damage,contacts:v.combat.contacts};
  });
  if([3,20,34,43,55,75].includes(i))await page.screenshot({path:`${out}/${label}-${i}.png`});
  await page.waitForTimeout(33);
 }
 results.push({label,...last});const video=page.video();await context.close();await video.saveAs(`${out}/${label}.webm`);
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();


