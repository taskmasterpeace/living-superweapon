import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/retry-health-trace';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];let result={};
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.locator('.scard').filter({has:page.locator('.snm',{hasText:/^SARGE$/})}).click();await page.keyboard.press('Enter');await page.getByRole('button',{name:'SOLDIER SIDE',exact:true}).click();await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);await page.keyboard.press('e');await page.keyboard.down('w');await page.waitForFunction(()=>window.PW.game.ms.threatLab.deployed.has(window.PW.game.player),{}, {timeout:8000});await page.keyboard.up('w');await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.opponents?.length>0);
 result.before=await page.evaluate(()=>window.PW.game.campaign.snapshot());
 for(let i=0;i<240;i++){
  const s=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation,p=g.player,e=o.opponents.find(f=>f.alive);if(!e)return {finished:o.finished};const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z;g.world._lookYaw=Math.atan2(dx,dz);g.world._lookPitch=0;return {finished:o.finished,hp:p.hp,d:Math.hypot(dx,dz)};});
  if(s.finished)break;if(s.d>20)await page.keyboard.down('w');else await page.keyboard.up('w');if(i%20===0)console.log(s);await page.waitForTimeout(500);
 }
 await page.keyboard.up('w');result.failed=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {state:o.state,id:o.id,save:g.campaign.snapshot(),hp:g.player.hp};});await page.screenshot({path:out+'/failed.png'});
 if(result.failed.state!=='failed')throw Error('Natural defeat did not occur');
 await page.evaluate(()=>{const g=window.PW.game,hit=g.onHit;window.retryHits=[];g.onHit=function(target,amount,opts,...rest){if(target===this.player)window.retryHits.push({amount,hp:target.hp,maxHp:target.maxHp,source:opts?.src?.def?.id,dtype:opts?.dtype,stage:this.ms?.threatLab?.state,stack:new Error().stack});return hit.call(this,target,amount,opts,...rest);};});await page.locator('#eRematch').click();await page.waitForFunction(()=>window.PW.game.ms.threatLab?.state==='preparing',{}, {timeout:90000});
 await page.waitForTimeout(2500);result.retry=await page.evaluate(()=>{const g=window.PW.game;return {hp:g.player.hp,maxHp:g.player.maxHp,hits:window.retryHits,alive:g.player.alive,state:g.ms.threatLab.state,save:g.campaign.snapshot()};});await page.screenshot({path:out+'/retry.png'});
 if(!result.retry.alive||JSON.stringify(result.retry.save)!==JSON.stringify(result.failed.save))throw Error('Retry reset or duplicated campaign result');
 await page.reload();await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);result.reload=await page.evaluate(()=>window.PW.game.campaign.snapshot());if(JSON.stringify(result.reload)!==JSON.stringify(result.failed.save))throw Error('Reload changed failed operation save');
 if(result.failed.save.awarded.length!==1||result.failed.save.supplies!==result.before.supplies||result.failed.save.research!==result.before.research)throw Error('Failure reward incorrect');
}catch(e){result.failure=e.message;throw e;}finally{await page.keyboard.up('w').catch(()=>{});await writeFile(out+'/result.json',JSON.stringify({kind:'Native solo Soldier approach to hostile patrol; camera heading harness; no damage, position or outcome overrides. Native Rematch and reload.',...result,errors},null,2));await context.close();await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
