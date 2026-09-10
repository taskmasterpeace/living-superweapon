import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/crouch-studio';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage();
const result={scope:'Studio UI production crouch/crouch-walk and paid attack rehearsal; opposite profile is a disclosed inspection camera.',samples:[],errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sarge');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 for(const state of ['groundCrouch','groundCrouchWalk']){
  await page.getByLabel('Motion state',{exact:true}).selectOption(state);
  for(const view of ['front','side','rear']){
   await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(1100);
   const sample=await page.evaluate(()=>{const p=STUDIO.preview,f=p.fighter;return{state:p.state,crouching:f.crouching,drop:f._crouchPose?.drop||0,velocity:f.vel.toArray(),pos:f.pos.toArray()};});result.samples.push({...sample,view});
   assert.ok(sample.crouching&&sample.drop>1);await page.locator('.viewport').screenshot({path:`${out}/${state}-${view}.png`});
  }
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.evaluate(()=>{const p=STUDIO.preview;p.camera.position.set(p.controls.target.x-32,p.controls.target.y+1,p.controls.target.z);p.camera.lookAt(p.controls.target);p.renderer.render(p.scene,p.camera);});
  await page.locator('.viewport').screenshot({path:`${out}/${state}-opposite-profile.png`});
  await page.getByRole('button',{name:'Play preview',exact:true}).click();
 }
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.locator('#combat-slot').selectOption('lmb');
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-crouch-forward');await page.waitForTimeout(1700);
 const attack=await page.evaluate(()=>{const p=STUDIO.preview;return{crouching:p.fighter.crouching,damage:p.combat.damage,drop:p.fighter._crouchPose?.drop||0};});result.attack=attack;
 assert.ok(attack.crouching&&attack.damage>0);await page.locator('.viewport').screenshot({path:`${out}/crouched-attack.png`});
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await page.video().saveAs(`${out}/studio-crouch.webm`);await browser.close();console.log(JSON.stringify(result));}
