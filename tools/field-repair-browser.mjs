import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/field-repair';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing'&&window.PW.game.pwStage.convoy?.ready,{}, {timeout:90000});await page.waitForTimeout(1200);
 await page.keyboard.press('i');const inventory=page.getByRole('dialog',{name:'Inventory'});
 await inventory.getByRole('button',{name:'Vehicle Repair Kit → slot 1',exact:true}).click();
 async function use(){await inventory.locator('section').filter({has:page.getByRole('heading',{name:'1 · Vehicle Repair Kit',exact:true})}).getByRole('button',{name:'Use and return'}).click();await page.waitForTimeout(200);}
 await use();const denied=await page.evaluate(()=>({save:window.PW.game.campaign.snapshot(),charges:window.PW.game.player.items[0].charges}));
 if(denied.save.supplies!==120||denied.charges!==3)throw Error('Empty repair spent resources');
 // Damage/approach fixture: repair action and resource debit use native inventory.
 const before=await page.evaluate(()=>{const g=window.PW.game,v=g.pwStage.convoy.vehicles[0];window.repairVehicle=v;v.cover.hp=v.cover.maxHp-50;g.player.pos.copy(v.mesh.position);g.player.pos.x+=20;g.player.vel.set(0,0,0);return v.cover.hp;});
 await page.keyboard.press('i');await use();
 const repaired=await page.evaluate(()=>({hp:window.repairVehicle.cover.hp,charges:window.PW.game.player.items[0].charges,save:window.PW.game.campaign.snapshot()}));
 if(repaired.hp!==before+40||repaired.charges!==2||repaired.save.supplies!==110||repaired.save.spent.length!==1)throw Error(JSON.stringify({before,repaired}));
 await page.screenshot({path:out+'/repaired.png'});await page.reload();await page.locator('#hSelect.on').waitFor();
 const saved=await page.evaluate(()=>window.PW.game.campaign.snapshot());if(saved.supplies!==110||saved.spent.length!==1)throw Error('Repair debit lost');
 await writeFile(out+'/result.json',JSON.stringify({kind:'Native inventory issue/use; vehicle HP and approach staged; default campaign funds; no mission completed',denied,before,repaired,saved,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
