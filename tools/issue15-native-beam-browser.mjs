import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/issue15-native-beam-'+(process.argv[2]||'ground');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const sample=async label=>{rows.push({label,...await page.evaluate(()=>{const g=window.PW.game,p=g.player;return {hero:p.def.id,ki:p.ki,pos:p.pos.toArray(),aim:p.aim3.toArray(),charging:p.slots.rmb.charging,charge:p.slots.rmb.chargeT,shots:g.projectiles.list.map(b=>({kind:b.constructor.name,radius:b.radius,length:b.len,pn:b.pn,dead:b.dead,sustaining:b.sustaining,preparing:b.pendingLaunch,tip:b.tip?.position?.toArray?.(),path:b.path?Array.from(b.path.slice(0,b.pn*3)):null})),scorches:g.vfx.scorches?.length};})});};
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1500);await page.keyboard.press('d');await page.keyboard.press('d');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1000);
 await page.mouse.click(720,450);await page.keyboard.down('d');await page.waitForTimeout(1800);await page.keyboard.up('d');await page.waitForTimeout(500);await page.mouse.move(720,570,{steps:10});await sample('before');
 await page.mouse.down({button:'right'});await page.waitForTimeout(450);await sample('short-charge');await page.mouse.up({button:'right'});
 for(let i=0;i<12;i++){await page.waitForTimeout(80);await sample('short-'+i);if(i===4)await page.screenshot({path:out+'/short-ground.png'});}
 await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.waitForTimeout(1800);
 await page.mouse.down({button:'right'});await page.waitForTimeout(1250);await sample('long-charge');await page.mouse.up({button:'right'});
 for(let i=0;i<15;i++){await page.waitForTimeout(80);await sample('long-'+i);if(i===5)await page.screenshot({path:out+'/long-ground.png'});if(i===6)await page.mouse.move(1000,570,{steps:25});}
 await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.waitForTimeout(1000);await sample('after');await page.mouse.down({button:'right'});await page.waitForTimeout(450);await page.mouse.up({button:'right'});for(let i=0;i<30;i++){await page.waitForTimeout(200);await sample('depletion-'+i);}await sample('depleted');await page.screenshot({path:out+'/depleted.png'});
 await writeFile(out+'/result.json',JSON.stringify({kind:'Normal selector/squad entry and mouse input; no actor/energy/camera/simulation overrides',rows,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
