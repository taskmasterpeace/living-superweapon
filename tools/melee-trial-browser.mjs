import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/melee-threat-room-2026-09-12';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=rage');await page.waitForTimeout(2500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click({timeout:15000});await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});
 const report=await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab.meleeTrial;if(!t)throw Error('No clear trial pad');t.start('retreat');g.player.pos.copy(t.origin).add({x:0,y:0,z:-18});g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;return {kind:'controlled setup with native V input; not walking-entry acceptance',trial:t.kind,player:g.player.def.id};});
 await page.waitForTimeout(400);await page.keyboard.press('v');await page.waitForTimeout(700);await page.keyboard.press('v');await page.waitForTimeout(1500);await page.screenshot({path:out+'/retreat-trial.png'});report.records=await page.evaluate(()=>window.PW.game.ms.threatLab.meleeTrial.records);report.errors=errors;await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await context.close();await browser.close();}
