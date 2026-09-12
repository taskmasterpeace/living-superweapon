import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/convoy-arrival-recovery';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1500);await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.scientist,{}, {timeout:30000});
 // Delivery-state fixture: staged approach, player damage disabled. Scientist,
 // enemy and convoy remain native. Not end-to-end combat acceptance.
 await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;g.player.takeDamage=()=>0;g.player.pos.copy(o.scientist.pos);g.player.pos.z+=10;g.player.vel.set(0,0,0);g.world._lookYaw=Math.PI;});
 await page.waitForTimeout(500);await page.keyboard.press('g');await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientistLeader===window.PW.game.player,{}, {timeout:5000});
 await page.evaluate(()=>{const g=window.PW.game,v=g.ms.convoyOperation.vehicle;g.player.pos.set(v.cover.x+19,v.ground,v.cover.z);g.player.vel.set(0,0,0);g.world._lookYaw=-Math.PI/2;});
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.state==='loaded',{}, {timeout:30000});await page.screenshot({path:out+'/loaded.png'});
 await page.evaluate(()=>{const o=window.PW.game.ms.convoyOperation;window.arrivalRelease=o.release.bind(o);o.release=()=>false;});
 for(let i=0;i<4;i++){await page.keyboard.press('g');await page.waitForTimeout(500);if(await page.evaluate(()=>window.PW.game.ms.convoyOperation.state==='travel'))break;}
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.state==='travel',{}, {timeout:5000});
 for(let i=0;i<16;i++){await page.waitForTimeout(5000);const t=await page.evaluate(()=>{const o=window.PW.game.ms.convoyOperation;return {state:o.state,index:o.routeIndex,hp:o.scientist.hp,finished:o.finished};});console.log(t);if(t.state==='disembarking'){const pending=await page.evaluate(()=>({finished:window.PW.game.ms.convoyOperation.finished,save:window.PW.game.campaign.snapshot()}));if(pending.finished||pending.save.awarded.length)throw Error('Award before exit');await page.screenshot({path:out+'/waiting-exit.png'});await page.evaluate(()=>{window.PW.game.ms.convoyOperation.release=window.arrivalRelease;});}if(t.finished||t.state==='disabled')break;}
 const result=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {state:o.state,scientistHp:o.scientist.hp,events:o.events,save:g.campaign.snapshot()};});
 await page.screenshot({path:out+'/delivered.png'});await writeFile(out+'/result.json',JSON.stringify({kind:'Native menus/deployment and G recruit/dispatch; staged approach, player damage disabled, forced blocked exit at arrival then restored; no-award-before-exit assertion passed',result,errors},null,2));
 if(result.state!=='complete'||result.save.supplies!==190||result.save.research!==30)throw Error(JSON.stringify(result));
 // Reload the actual earned save, buy an upgrade through the campaign UI,
 // then issue and activate it in a second operation. No funded-save fixture.
 await page.reload();await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Escape');
 await page.locator('#pwCampaign').click();const campaign=page.getByRole('dialog',{name:'Campaign records'});
 await campaign.getByRole('button',{name:'60 supplies + 30 research',exact:true}).click();await page.screenshot({path:out+'/earned-research.png'});
 await campaign.getByRole('button',{name:'Close',exact:true}).click();
 await page.reload();await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1500);
 await page.keyboard.press('i');const inventory=page.getByRole('dialog',{name:'Inventory'});
 await inventory.getByRole('button',{name:'Threat Scanner → slot 1',exact:true}).click();
 await inventory.getByRole('button',{name:'Shield Cell → slot 2',exact:true}).click();
 await inventory.locator('section').filter({has:page.getByRole('heading',{name:'2 · Shield Cell',exact:true})}).getByRole('button',{name:'Use and return'}).click();
 const next=await page.evaluate(()=>({shield:window.PW.game.player._shieldHp,save:window.PW.game.campaign.snapshot()}));
 await page.screenshot({path:out+'/next-operation-shield.png'});await writeFile(out+'/earned-research.json',JSON.stringify({next,errors},null,2));
 if(next.shield!==54||next.save.supplies!==130||next.save.research!==0||!next.save.purchased.includes('shield_endurance')||next.save.awarded.length!==1)throw Error(JSON.stringify(next));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
