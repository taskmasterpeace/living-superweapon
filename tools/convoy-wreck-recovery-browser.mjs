import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/convoy-wreck-recovery';await mkdir(out,{recursive:true});
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
 await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation,f=o.scientist;window.crashHits=[];const damage=f.takeDamage.bind(f);f.takeDamage=(n,opts)=>{window.crashHits.push({n,type:opts?.dtype});return damage(n,opts);};window.realRelease=o.release.bind(o);o.release=()=>false;o.convoy.destroy(o.vehicle,g.player);});
 await page.waitForTimeout(1000);
 const blocked=await page.evaluate(()=>({hp:window.PW.game.ms.convoyOperation.scientist.hp,seated:!!window.PW.game.ms.convoyOperation.scientist._scoutVehicle,hits:window.crashHits}));
 await page.evaluate(()=>{window.PW.game.ms.convoyOperation.release=window.realRelease;});
 await page.waitForFunction(()=>!window.PW.game.ms.convoyOperation.scientist._scoutVehicle);
 await page.waitForTimeout(500);await page.screenshot({path:out+'/released.png'});
 const released=await page.evaluate(()=>{const o=window.PW.game.ms.convoyOperation;return {hp:o.scientist.hp,state:o.state,alive:o.scientist.alive,seated:!!o.scientist._scoutVehicle,hits:window.crashHits};});
 await writeFile(out+'/result.json',JSON.stringify({kind:'Staged approach, player damage disabled, native convoy destruction; release blocked for one second as fault fixture',blocked,released,errors},null,2));
 if(!blocked.seated||!released.alive||released.seated||released.state!=='disabled'||released.hits.filter(h=>h.n===25&&h.type==='physical').length!==1||errors.length)throw Error(JSON.stringify({blocked,released,errors}));
}finally{await context.close();await browser.close();}
