import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/prone-studio';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
const result={scope:'Native Studio UI selects prone crawl and rifle/reload rehearsals. Explicit staged timeline seeks, not native gameplay travel.',errors:[],phases:[]};page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sarge');await page.waitForFunction(()=>STUDIO?.preview?.fighter);
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.getByLabel('Preview attack',{exact:true}).selectOption('lmb');
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-prone-forward');
 if(await page.evaluate(()=>STUDIO.preview.playing))await page.locator('#play').click();
 for(const view of ['Side','Front','Rear']){
  await page.getByRole('button',{name:`${view} view`,exact:true}).click();
  for(const [name,time]of [['start',.1],['quarter',.5],['middle',1],['end',2]]){
   const state=await page.evaluate(time=>{STUDIO.preview.seek(time);const p=STUDIO.preview,f=p.fighter;return{prone:f.prone,weight:f._pronePose?.weight,phase:p.combat.phase,bounds:f._pronePose?.bounds,damage:p.combat.damage};},time);
   result.phases.push({view,name,...state});await page.screenshot({path:`${out}/${view}-${name}.png`});
  }
 }
 await page.getByLabel('Contact test',{exact:true}).selectOption('reload');await page.getByRole('button',{name:'Side view',exact:true}).click();await page.locator('#isolate-fighter').check();
 for(const [name,time]of [['draw',1.3],['insert',1.9],['chamber',2.3],['recovery',3]]){await page.evaluate(t=>STUDIO.preview.seek(t),time);await page.screenshot({path:`${out}/reload-${name}.png`});}
 assert.ok(result.phases.every(p=>p.prone));assert.ok(result.phases.some(p=>p.damage>0));assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await browser.close();console.log(JSON.stringify(result));}
