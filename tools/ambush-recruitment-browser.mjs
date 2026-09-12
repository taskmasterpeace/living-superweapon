import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/ambush-recruitment';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'AMBUSH RESEARCH CONVOY',exact:true}).click();await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1500);await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.scientist,{}, {timeout:30000});
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientist._scoutVehicle);
 // Controlled interception: stop native convoy and stage player at released scientist.
 await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;o.stop();g.player.pos.copy(o.scientist.pos);g.player.pos.z+=10;g.player.vel.set(0,0,0);g.world._lookYaw=Math.PI;});
 await page.waitForTimeout(500);await page.keyboard.press('g');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientistLeader===window.PW.game.player);
 await page.waitForTimeout(1000);
 const result=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {assignment:o.assignment,state:o.state,scientistTeam:o.scientist.team,playerTeam:g.player.team,foe:g.isFoe(g.player,o.scientist),seated:!!o.scientist._scoutVehicle,alive:o.scientist.alive};});
 await page.screenshot({path:out+'/recruited.png'});await writeFile(out+'/result.json',JSON.stringify({kind:'Native ambush selection/deployment and G recruitment; native stop invoked and approach staged; no damage override',result,errors},null,2));
 if(result.assignment!=='ambush'||result.state!=='disabled'||result.foe||result.seated||!result.alive||result.scientistTeam!==result.playerTeam||errors.length)throw Error(JSON.stringify({result,errors}));
}finally{await context.close();await browser.close();}
