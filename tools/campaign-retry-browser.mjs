import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/campaign-retry';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 const attempts=[];
 for(let i=0;i<2;i++){
  await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1500);
  await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
  await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.scientist,{}, {timeout:30000});
  const before=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {id:o.id,scientists:g.entities.filter(f=>f.def.id==='operation-scientist').length,depots:g.scene.children.filter(o=>o.name==='research-industrial-depot').length,transports:g.scene.children.filter(o=>o.name==='squad-passenger-transport').length};});
  if(before.scientists!==1||before.depots!==1||before.transports!==1)throw Error('Duplicate or missing owner '+JSON.stringify(before));
  // Fault fixture: accepted native damage induces objective failure; no direct finish/end call.
  await page.evaluate(()=>{const g=window.PW.game;g.ms.convoyOperation.scientist.takeDamage(10000,{src:g.player,dtype:'physical'});});
  await page.getByText('Scientist lost. Live recovery failed.',{exact:true}).waitFor();await page.screenshot({path:out+`/failure-${i}.png`});
  attempts.push({...before,save:await page.evaluate(()=>window.PW.game.campaign.snapshot())});
  if(i===0)await page.getByRole('button',{name:'Rematch',exact:true}).click();
 }
 if(attempts[0].id===attempts[1].id)throw Error('Attempt ID reused');
 for(const a of attempts)if(a.save.awarded.filter(id=>id===a.id).length!==1)throw Error('Reward not settled once');
 const finalSave=attempts[1].save;await page.reload();await page.locator('#hSelect.on').waitFor();
 const reloaded=await page.evaluate(()=>window.PW.game.campaign.snapshot());
 if(JSON.stringify(reloaded)!==JSON.stringify(finalSave))throw Error('Reload changed save');
 await writeFile(out+'/result.json',JSON.stringify({kind:'Native startup and rematch; native-damage fault fixture induces scientist death. Cleanup and save proof, not combat acceptance.',attempts,reloaded,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
