import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/reload-studio';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
const result={scope:'Studio native UI selects reload rehearsal and saves duration. Explicitly staged phase seek, no native gameplay claim.',errors:[]};page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sarge');await page.waitForFunction(()=>STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
 const field=page.getByLabel('Reload duration value',{exact:true});await field.fill('3');await field.press('Tab');await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>STUDIO?.preview?.fighter);
 result.duration=await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.reloadTime);assert.equal(result.duration,3);
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.getByLabel('Preview attack',{exact:true}).selectOption('lmb');
 await page.getByLabel('Contact test',{exact:true}).selectOption('reload');if(await page.evaluate(()=>STUDIO.preview.playing))await page.locator('#play').click();
 await page.getByRole('button',{name:'Front view',exact:true}).click();await page.locator('#isolate-fighter').check();
 result.phases=[];
 for(const [name,time]of [['start',.61],['quarter',1.35],['middle',2.1],['three-quarter',2.85],['end',3.61],['recovery',3.85]]){
  const row=await page.evaluate(time=>{STUDIO.preview.seek(time);const p=STUDIO.preview,f=p.fighter;return{time,phase:p.combat.phase,elapsed:f._firearmReload?.elapsed,ammo:f.slots.lmb.ammo.loaded,shots:p.combat.game.projectiles.list.length};},time);
  result.phases.push({name,...row});await page.screenshot({path:`${out}/front-${name}.png`});
 }
 for(const view of ['Side','Rear']){
  await page.getByRole('button',{name:`${view} view`,exact:true}).click();
  for(const [name,time]of [['draw',1.7],['insert',2.5],['chamber',3.25],['recovered',3.85]]){await page.evaluate(t=>STUDIO.preview.seek(t),time);await page.screenshot({path:`${out}/${view.toLowerCase()}-${name}.png`});}
 }
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-crouch-forward');await page.evaluate(()=>STUDIO.preview.seek(1.7));await page.screenshot({path:`${out}/crouch-draw.png`});
 assert.match(await page.locator('.measurements').textContent(),/Magazine 15 \/ 30/);assert.match(await page.locator('#attack-sequence-note').textContent(),/Half-used magazine/);
 assert.ok(result.phases.every(p=>p.shots===0));assert.equal(result.phases.at(-1).phase,'reload-complete');assert.equal(result.phases.at(-1).ammo,30);assert.equal(result.phases[2].ammo,15);assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await browser.close();console.log(JSON.stringify(result));}
