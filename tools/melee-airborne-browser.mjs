import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const grab=process.argv.includes('--grab');const out=`artifacts/marketing/${grab?'airborne-throw':'airborne-trial'}-2026-09-12`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await page.waitForTimeout(2500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});
 await page.waitForTimeout(1500);
 await page.evaluate(grab=>{const g=window.PW.game,t=g.ms.threatLab.meleeTrial;t.start('airborne');g.player.pos.copy(t.origin).add({x:0,y:0,z:grab?-5:-10});g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;},grab);
 await page.keyboard.down('Space');await page.waitForFunction(()=>{const g=window.PW.game;return g.player.flying&&g.player.pos.y-g.world.heightAt(g.player.pos.x,g.player.pos.z)>=24;},{},{timeout:30000});await page.keyboard.up('Space');
 await page.waitForFunction(()=>{const t=window.PW.game.ms.threatLab.meleeTrial;return t.target.flying&&!t.target.flyHeld;},{},{timeout:30000});
 if(grab){
  await page.keyboard.press('e');await page.waitForFunction(()=>!!window.PW.game.player._personCarry,{},{timeout:10000});
  await page.evaluate(()=>{window.PW.game.world._lookPitch=-.9;});
  await page.keyboard.down('e');await page.waitForTimeout(450);await page.keyboard.up('e');
  await page.waitForFunction(()=>window.PW.game.ms.threatLab.meleeTrial.records.some(r=>r.result==='TERRAIN IMPACT'),{},{timeout:15000});
 }else await page.keyboard.press('v');await page.waitForTimeout(1800);
 const report=await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab.meleeTrial;const result={setup:'Controlled ground placement; native held Space takeoff and V strike',player:{flying:g.player.flying,y:g.player.pos.y},target:{flying:t.target.flying,y:t.target.pos.y,hp:t.target.hp},records:t.records};t.openReview();return result;});
 await page.getByRole('button',{name:'Side',exact:true}).click();
 const contact=page.getByRole('button',{name:grab?/s · TERRAIN IMPACT$/:/s · CONTACT$/});if(await contact.count())await contact.first().click();
 await page.screenshot({path:out+'/airborne-contact.png'});
 await page.getByRole('button',{name:'Cinematic replay',exact:true}).click();await page.locator('[data-time]').focus();await page.keyboard.press('Home');await page.locator('[data-speed]').selectOption('0.5');await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(6000);
 report.errors=errors;
 if(grab)report.setup='Controlled ground placement and downward camera aim; native Space takeoff, E grab, hold/release E throw';
 await writeFile(out+'/result.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
 if(errors.length||!report.records.some(r=>r.healthLost>0))throw Error('Aerial native contact not proven');
}finally{const path=await page.video().path();await context.close();await copyFile(path,out+'/sol-airborne-trial.webm');await browser.close();}
