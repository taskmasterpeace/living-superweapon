import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/woodland-corridor';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);

 await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.depot?.sites.length>0,{}, {timeout:30000});
 const result=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation,s=o.woodland.trees[3];g.player.pos.set(s.x,s.y,s.z-35);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;return {trees:o.woodland.trees.length,meshes:o.woodland.group.children.length};});
 await page.waitForTimeout(1500);await page.screenshot({path:out+'/woodland.png'}); await page.evaluate(()=>{const g=window.PW.game,t=g.ms.convoyOperation.woodland.trees[3];g.player.pos.set(t.x,t.y,t.z-10);g.player.faceDir(0,1);});await page.waitForTimeout(300);await page.keyboard.press('g');await page.waitForFunction(()=>window.PW.game.player._carry?.kind==='tree',{}, {timeout:5000});await page.screenshot({path:out+'/lifted.png'});await writeFile(out+'/result.json',JSON.stringify({kind:'Native mission spawn with staged player position for woodland inspection and native G lift',result,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
