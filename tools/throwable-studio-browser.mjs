import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/throwable-studio';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
const result={scope:'Studio UI edits and local save/reload; explicitly staged production-rig seek for motion inspection, not travel evidence.',errors:[]};page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sarge');await page.waitForFunction(()=>STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('rmb');
 for(const [label,value]of [['Throw preparation',.8],['Throw recovery',.5]]){const field=page.getByLabel(`${label} value`,{exact:true});await field.fill(String(value));await field.press('Tab');}
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>STUDIO?.preview?.fighter);
 result.values=await page.evaluate(()=>{const d=STUDIO.preview.fighter.slots.rmb.def;return[d.throwWindup,d.throwRecovery];});assert.deepEqual(result.values,[.8,.5]);
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.getByLabel('Preview attack',{exact:true}).selectOption('rmb');
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-hold');
 if(await page.evaluate(()=>STUDIO.preview.playing))await page.locator('#play').click();
 assert.equal(await page.evaluate(()=>STUDIO.preview.playing),false);
 await page.getByRole('button',{name:'Front view',exact:true}).click();
 await page.locator('#isolate-fighter').check();
 result.phases=[];
 for(const [name,time]of [['ready',.5],['early',.8],['windup',1],['late',1.2],['release',1.42],['recovery',1.65],['complete',2]]){
  const row=await page.evaluate(time=>{STUDIO.preview.seek(time);const p=STUDIO.preview,m=p.fighter._throwAction;return{time,phase:p.combat.phase,elapsed:m?.elapsed,released:m?.released,shots:p.combat.game.projectiles.list.filter(s=>s.caster===p.fighter&&s.canister).length};},time);
  result.phases.push({name,...row});await page.screenshot({path:`${out}/${name}.png`});
 }
 assert.equal(result.phases.find(p=>p.name==='windup').shots,0);assert.equal(result.phases.find(p=>p.name==='windup').released,false);assert.equal(result.phases.find(p=>p.name==='release').released,true);
 assert.equal(result.phases.at(-1).elapsed,undefined);assert.deepEqual(result.errors,[]);result.passed=true;
 for(const view of ['Side','Rear']){
  await page.getByRole('button',{name:`${view} view`,exact:true}).click();
  for(const [phase,time]of [['windup',1],['release',1.42],['recovery',1.65]]){await page.evaluate(time=>STUDIO.preview.seek(time),time);await page.screenshot({path:`${out}/${view.toLowerCase()}-${phase}.png`});}
 }
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await browser.close();console.log(JSON.stringify(result));}
