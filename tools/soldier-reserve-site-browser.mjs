import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/soldier-reserve-site';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1000);await page.locator('.scard').filter({has:page.locator('.snm',{hasText:/^SARGE$/})}).click();await page.keyboard.press('Enter');await page.getByRole('button',{name:'SOLDIER SIDE',exact:true}).click();await page.locator('.squad-roster button').first().click();await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);await page.keyboard.press('e');await page.keyboard.down('w');await page.waitForFunction(()=>window.PW.game.ms.threatLab.deployed.has(window.PW.game.player),{}, {timeout:8000});await page.keyboard.up('w');await page.waitForFunction(()=>window.PW.game.ms.threatLab.state==='field');
 await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab;window.lostCompanion=g.ms.squad.members[0];window.reserveBefore=t.stock.snapshot();window.lostCompanion.takeDamage(10000,{dtype:'physical'});g.player.pos.copy(t.destination);g.player.pos.z+=16;g.player.vel.set(0,0,0);g.player.flying=false;g.world._lookYaw=Math.PI;});
 await page.waitForTimeout(500);await page.screenshot({path:out+'/request.png'});await page.keyboard.press('e');
 await page.waitForFunction(()=>window.PW.game.ms.squad.members[0]!==window.lostCompanion,{}, {timeout:5000});
 for(let i=0;i<3;i++){await page.keyboard.press('e');await page.waitForTimeout(150);}
 const result=await page.evaluate(()=>{const g=window.PW.game,t=g.ms.threatLab;return {before:window.reserveBefore,after:t.stock.snapshot(),members:g.ms.squad.members.map(f=>({id:f.def.id,alive:f.alive,team:f.team})),sameLeader:g.ms.squad.members[0]._squadLeader===g.player,deployed:t.deployed.size,manifest:t.manifest.length};});
 await page.screenshot({path:out+'/replaced.png'});await writeFile(out+'/result.json',JSON.stringify({kind:'Native menu/deployment; injected lethal damage to companion and staged player at reserve point; native Soldier E replacement and repeat presses',result,errors},null,2));
 if(result.after.remaining.soldier!==result.before.remaining.soldier||result.after.remaining.lsw!==result.before.remaining.lsw-1||result.members.length!==1||!result.members[0].alive||!result.sameLeader||errors.length)throw Error('Reserve replacement failed');
}finally{await context.close();await browser.close();}
