import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/marketing/settlement-recovery';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1500);await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.scientist,{}, {timeout:30000});
 await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;window.restoreStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='powerworld.campaign.v1')throw Error('Test storage unavailable');return window.restoreStorage.call(this,k,v);};o.finish(true,'Storage recovery test — outcome injected.');});
 await page.waitForTimeout(2200);
 const pending=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {state:o.state,finished:!!o.finished,text:o.hud.textContent,balance:g.campaign.snapshot()};});
 assert.equal(pending.state,'saving');assert.equal(pending.finished,false);assert.equal(pending.balance.supplies,120);assert.match(pending.text,/RESULT PENDING/);
 await page.screenshot({path:out+'/pending.png'});
 await page.evaluate(()=>{Storage.prototype.setItem=window.restoreStorage;});
 await page.waitForFunction(()=>window.PW.game.campaign.snapshot().awarded.length===1);
 await page.waitForTimeout(1200);
 const settled=await page.evaluate(()=>window.PW.game.campaign.snapshot());assert.equal(settled.supplies,190);assert.equal(settled.research,30);
 await page.screenshot({path:out+'/settled.png'});
 await page.reload();await page.locator('#hSelect.on').waitFor();
 const restored=await page.evaluate(()=>window.PW.game.campaign.snapshot());assert.deepEqual(restored,settled);assert.equal(errors.length,0);
 await writeFile(out+'/result.json',JSON.stringify({kind:'Normal startup and deployment; injected winning outcome and temporary localStorage failure. Not a completed gameplay operation.',pending,settled,restored,errors},null,2));
}finally{await context.close();await browser.close();}
