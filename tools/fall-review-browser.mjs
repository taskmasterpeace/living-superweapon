import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/fall-review-2026-09-12';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await page.waitForTimeout(2500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});
 await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab.meleeTrial,b=t.start('stationary'),p=g.player;p.pos.copy(t.origin).add({x:0,y:90,z:-10});p.vel.set(0,0,0);p.flying=true;b.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;});
 await page.waitForTimeout(400);
 await page.evaluate(()=>{const g=window.PW.game,b=g.ms.threatLab.meleeTrial.target;g._fallTestAt=g.time;g.player.invuln=0;g.player.takeDamage(12,{src:b,kb:{x:40,z:0},launch:30,hitstop:0});});
 await page.waitForFunction(()=>window.PW.game.time-window.PW.game._fallTestAt>=3&&window.PW.game.player.launchT<=0&&window.PW.game.player._lostControlPose?.weight<.02,{}, {timeout:60000});
 const report=await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab.meleeTrial;const states=t.recording.frames.map(f=>({time:f.time,state:f.actors[0].airControl}));t.openReview();return {setup:'Controlled airborne setup; nonfatal native takeDamage launch; real physics and animation, not a player-earned hit',states,records:t.records,hp:g.player.hp,alive:g.player.alive,ragdoll:!!g.player.ragdoll,weight:g.player._lostControlPose?.weight,time:g.time};});
 await page.getByRole('dialog',{name:'Threat Room combat review'}).waitFor();await page.getByLabel('Review subject').selectOption('0');const slider=page.locator('[data-time]'),box=await slider.boundingBox();await slider.click({position:{x:box.width*.3,y:box.height*.5}});await page.getByRole('button',{name:'Side',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:out+'/lost-control-side.png'});
 await page.locator('[data-speed]').selectOption('0.5');await slider.focus();await page.keyboard.press('Home');await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(6500);await page.getByRole('button',{name:'Return to practice'}).click();
 report.errors=errors;if(!report.states.some(s=>s.state==='uncontrolled')||report.states.at(-1).state!=='flight'||report.weight>=.02||!report.alive||report.ragdoll||errors.length)throw Error(JSON.stringify(report));
 await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{console.log('Video: '+await page.video().path());await context.close();await browser.close();}


