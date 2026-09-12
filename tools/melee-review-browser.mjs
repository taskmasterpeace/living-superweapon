import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/melee-review-2026-09-12';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=rage');await page.waitForTimeout(2500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});
 await page.waitForTimeout(2500);await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab.meleeTrial;t.start('retreat');g.player.pos.copy(t.origin).add({x:0,y:0,z:-18});g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;});
 await page.waitForTimeout(400);await page.evaluate(()=>{window.PW.game._reviewTestAt=window.PW.game.time;});await page.keyboard.press('v');await page.waitForFunction(()=>window.PW.game.time-window.PW.game._reviewTestAt>=1.8,{}, {timeout:60000});
 const report=await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab.meleeTrial;t.openReview();return {setup:'Controlled placement; native V strike; review opened through trial owner',records:t.records,frames:t.recording.frames.length,nodes:t.recording.actors.map(a=>a.nodes.length),time:g.time,hp:g.player.hp,targetHp:t.target.hp};});
 await page.getByRole('dialog',{name:'Threat Room combat review'}).waitFor();
 const slider=page.locator('[data-time]'),box=await slider.boundingBox();await slider.click({position:{x:box.width*.3,y:box.height*.5}});
 for(const name of ['Side','Front','Overhead','Gameplay angle']){await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(200);await page.screenshot({path:`${out}/${name.replaceAll(' ','-').toLowerCase()}.png`});}
 await page.getByRole('button',{name:'Side',exact:true}).click();await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(4000);
 report.paused=await page.evaluate(()=>({time:window.PW.game.time,running:window.PW.game.running,hp:window.PW.game.player.hp,targetHp:window.PW.game.ms.threatLab.meleeTrial.target.hp}));
 await page.getByRole('button',{name:'Return to practice',exact:true}).click();await page.waitForTimeout(500);
 report.resumed=await page.evaluate(()=>({running:window.PW.game.running,overlay:window.PW.game.combatOverlayOpen,review:!!window.PW.game.ms.threatLab.meleeTrial.review}));
 report.errors=errors;if(errors.length||report.paused.time!==report.time||!report.resumed.running||report.resumed.review)throw Error(JSON.stringify(report));
 await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{console.log('Video: '+await page.video().path());await context.close();await browser.close();}
