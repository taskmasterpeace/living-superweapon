import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/inventory-touch';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:844,height:390}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).tap();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);
 await page.getByRole('button',{name:'Open inventory',exact:true}).tap();const inventory=page.getByRole('dialog',{name:'Inventory',exact:true});await inventory.waitFor();
 await inventory.getByRole('button',{name:'Threat Scanner → slot 1',exact:true}).tap();await inventory.getByRole('button',{name:'Shield Cell → slot 2',exact:true}).tap();
 const second=inventory.locator('section').filter({has:page.getByRole('heading',{name:'2 · Shield Cell',exact:true})});await second.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/inventory.png'});
 await second.getByRole('button',{name:'Use and return',exact:true}).tap();await inventory.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Open inventory',exact:true}).tap();await inventory.getByRole('button',{name:'Return to game',exact:true}).tap();
 const result=await page.evaluate(()=>{const g=window.PW.game;return {overlay:g.combatOverlayOpen,shield:g.player._shieldHp,slots:g.player.items.map(i=>i.def.kind),selected:g.player._selectedGadget,held:g.touch.cur,axes:[g.touch.lx,g.touch.ly,g.touch.rx,g.touch.ry]};});
 if(result.overlay||result.shield!==45||result.selected!==1||result.axes.some(Boolean))throw Error(JSON.stringify(result));
 await page.screenshot({path:out+'/returned.png'});await writeFile(out+'/result.json',JSON.stringify({kind:'Keyboard character confirmation; native landscape touch inventory, issue both slots, use second slot and return',result,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
