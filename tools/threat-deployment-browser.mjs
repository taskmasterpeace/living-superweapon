import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/threat-deployment';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1500);
 await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Choose your squad'});await dialog.waitFor();
 await dialog.getByRole('button',{name:'SOLDIER SIDE',exact:true}).click();
 await dialog.locator('.squad-roster button').first().click();
 const selected=await dialog.locator('.squad-roster button[aria-pressed=true]').innerText();
 if(await dialog.locator('.squad-roster button:not([aria-pressed=true]):not(:disabled)').count())throw Error('Soldier cap not enforced');
 await page.screenshot({path:out+'/selection.png'});
 await dialog.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.squad?.members?.length===1,{},{timeout:60000});
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000}); await page.waitForTimeout(2000); await page.screenshot({path:out+'/lab.png'}); await page.keyboard.press('g'); await page.waitForTimeout(500); const ready=await page.evaluate(()=>window.PW.game.ms.threatLab.state); console.log('Ready input state:',ready); if(ready==='preparing')throw Error('Native READY input did not activate'); await page.waitForFunction(()=>window.PW.game.ms.threatLab.deployed.size>=1,{}, {timeout:15000}); console.log('Ally passed portal'); await page.keyboard.down('w'); await page.waitForTimeout(850); await page.keyboard.up('w'); await page.waitForFunction(()=>window.PW.game.ms.threatLab.state==='field',{}, {timeout:10000}); await page.screenshot({path:out+'/deployed.png'}); console.log('Player crossed through native movement'); const result=await page.evaluate(()=>{const g=window.PW.game;return {side:g.ms.squad.side,player:g.player.def.id,companions:g.ms.squad.members.map(f=>({id:f.def.id,team:f.team,leader:f._squadLeader===g.player})),playerTeam:g.player.team};});
 if(result.companions.some(f=>f.team!==result.playerTeam||!f.leader))throw Error('Companion allegiance mismatch');
 await writeFile(out+'/result.json',JSON.stringify({kind:'native menu selection and deployment; not portal or campaign proof',selected,result,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
