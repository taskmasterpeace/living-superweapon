import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/studio-beam-pressure';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:1100},recordVideo:{dir:out,size:{width:1600,height:1100}}}),page=await context.newPage();
const result={scope:'Native Studio UI; disclosed autohealed defender receives a scripted forward intent through production movement, beam, damage and guard. Not gameplay AI or performance evidence.',errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
async function seek(time){const box=await page.locator('.timeline').boundingBox();await page.mouse.click(box.x+8+(box.width-16)*time/8,box.y+box.height/2);await page.waitForTimeout(160);}
async function sample(label){const data=await page.evaluate(()=>{const p=STUDIO.preview,c=p.combat,t=c.target;return{time:p.time,hero:t.def.id,pos:t.pos.toArray(),velocity:t.vel.toArray(),damage:c.damage,blocked:c.blockedContacts,guard:t.guarding,meter:t.guardMeter,push:c.fighter.slots[c.slot]?.active?.pushForce,brace:t._hitReaction?.beam?.weight||0,readout:document.querySelector('#target-pressure-readout').textContent};});result.samples.push({label,...data});return data;}
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.bringToFront();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.getByLabel('Target motion',{exact:true}).selectOption('advance');
 await page.getByLabel('Target distance',{exact:true}).fill('55');await page.getByLabel('Target distance',{exact:true}).press('Tab');
 await page.getByLabel('Target speed',{exact:true}).fill('70');await page.getByLabel('Target speed',{exact:true}).press('Tab');
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 const push=page.locator('input[type="number"][data-attack-key="pushForce"]');await push.fill('368');await push.press('Tab');
 await page.getByRole('button',{name:'Side view',exact:true}).click();
 await seek(3.3);const strong=await sample('strong-open');assert.ok(strong.damage>0&&strong.pos[2]<52&&strong.brace>.8);
 await page.screenshot({path:`${out}/strong-advance.png`});
 await page.getByLabel('Defender character',{exact:true}).selectOption('sarge');await seek(3.3);const weak=await sample('soldier-open');
 assert.equal(weak.hero,'sarge');assert.ok(weak.damage>0&&weak.pos[2]>strong.pos[2]+3);
 await page.screenshot({path:`${out}/soldier-pressure.png`});
 await page.getByLabel('Defender character',{exact:true}).selectOption('vanguard');await page.getByLabel('Target defense',{exact:true}).selectOption('guard');
 await seek(3.3);const guard=await sample('strong-guard');assert.ok(guard.damage<strong.damage*.4&&guard.blocked>0);
 await page.screenshot({path:`${out}/strong-guard.png`});
 await page.getByLabel('Target defense',{exact:true}).selectOption('open');await seek(0);
 await page.getByRole('button',{name:'Play preview',exact:true}).click();
 for(let i=0;i<6;i++){await page.waitForTimeout(750);await sample(`play-${i}`);await page.locator('.viewport').screenshot({path:`${out}/play-${i}.png`});}
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await page.video().saveAs(`${out}/pressure-comparison.webm`);await browser.close();console.log(JSON.stringify(result));}
