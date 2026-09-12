import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/operation-gadgets';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
// Funded campaign fixture; purchase, issue and activation below use normal controls.
await context.addInitScript(()=>localStorage.setItem('powerworld.campaign.v1',JSON.stringify({version:1,supplies:200,research:100,purchased:[],awarded:[],transactions:[]})));
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Escape');
 await page.locator('#pwCampaign').click();const campaign=page.getByRole('dialog',{name:'Campaign records'});
 await campaign.getByRole('button',{name:'60 supplies + 30 research',exact:true}).click();await campaign.getByRole('button',{name:'40 supplies + 20 research',exact:true}).click();
 await page.screenshot({path:out+'/research.png'});await campaign.getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-pick="you"]').click();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1500);
 await page.keyboard.press('i');const inventory=page.getByRole('dialog',{name:'Inventory'});
 await inventory.getByRole('button',{name:'Threat Scanner → slot 1',exact:true}).click();await inventory.getByRole('button',{name:'Shield Cell → slot 2',exact:true}).click();await page.screenshot({path:out+'/issued.png'});
 await inventory.locator('section').filter({has:page.getByRole('heading',{name:'2 · Shield Cell',exact:true})}).getByRole('button',{name:'Use and return'}).click();
 const shield=await page.evaluate(()=>window.PW.game.player._shieldHp);if(shield!==54)throw Error(`Expected upgraded shield 54, got ${shield}`);
 await page.keyboard.press('Shift+n');await page.waitForTimeout(500);await page.keyboard.press('i');
 await inventory.locator('section').filter({has:page.getByRole('heading',{name:'1 · Threat Scanner',exact:true})}).getByRole('button',{name:'Use and return'}).click();
 await page.waitForFunction(()=>window.PW.game.player._threatScan?.phase==='locked',{}, {timeout:5000});await page.screenshot({path:out+'/scanner.png'});
 const result=await page.evaluate(()=>{const g=window.PW.game,f=g.player;return {shield:f._shieldHp,scanner:{phase:f._threatScan.phase,snapshot:f._threatScan.snapshot,charges:f.items[0].charges,cd:f.items[0].cd},campaign:g.campaign.snapshot()};});
 await writeFile(out+'/result.json',JSON.stringify({kind:'funded-save fixture; native research purchases, inventory issue, both slots and Shift+N firing range',result,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
