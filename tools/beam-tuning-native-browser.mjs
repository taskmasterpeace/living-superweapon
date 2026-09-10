import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {BUILD_LOOK} from '../src/data/visual.js';
const sourcePass=process.argv.includes('--source');
const shape=process.argv.includes('--heavy')?'torrent':'ray';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||(sourcePass?'artifacts/beam-source-native':'artifacts/beam-tuning-native');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),video=page.video(),result={scope:'Actual Studio save/reload and native PowerWorld beam input; guard balance covered separately by tests',errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.bringToFront();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 for(const [key,value]of [['pushForce','0'],['guardChip','0.1'],['guardDrain','0.12'],['tipSpeed','900']]){const input=page.locator(`input[type="number"][data-attack-key="${key}"]`);await input.fill(value);await input.press('Tab');}
 if(sourcePass)for(const [key,value]of [['sourceGlow','1.4'],['sourceScale','0.8']]){const input=page.locator(`input[type="number"][data-attack-key="${key}"]`);await input.fill(value);await input.press('Tab');}
 await page.locator('select[data-attack-key="build"]').selectOption(shape);await page.locator('select[data-attack-key="temper"]').selectOption('steady');
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 assert.equal(await page.locator('input[type="number"][data-attack-key="pushForce"]').inputValue(),'0');assert.equal(await page.locator('select[data-attack-key="build"]').inputValue(),shape);
 if(sourcePass){assert.equal(await page.locator('input[type="number"][data-attack-key="sourceGlow"]').inputValue(),'1.4');assert.equal(await page.locator('input[type="number"][data-attack-key="sourceScale"]').inputValue(),'0.8');await page.locator('input[type="number"][data-attack-key="sourceGlow"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/studio-source-controls.png`});}
 await page.locator('input[type="number"][data-attack-key="guardChip"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/studio-guard-controls.png`});
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=kano');await page.bringToFront();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.waitForTimeout(600);
 await page.mouse.move(800,450);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();await page.waitForFunction(()=>PW.game.projectiles.list.some(b=>b.sustaining&&b.pn>2));
 result.beam=await page.evaluate(()=>{const b=PW.game.projectiles.list.find(b=>b.sustaining);return{speed:b.tipSpeed,push:b.pushForce,chip:b.guardChip,drain:b.guardDrain,core:b.build.coreR,detail:b.temper.n,faults:[...(PW.game._errSeen||[])]}});
 assert.deepEqual(result.beam,{speed:900,push:0,chip:.1,drain:.12,core:BUILD_LOOK[shape].coreR,detail:0,faults:[]});result.shape=shape;
 if(sourcePass){result.source=await page.evaluate(()=>{const b=PW.game.projectiles.list.find(b=>b.sustaining);return{glow:b.sourceGlow,scale:b.sourceScale,visible:b.source.visible,intensity:b.sourceLight?.intensity??0,emitterError:b.source.position.distanceTo(b.muzzle)}});assert.equal(result.source.glow,1.4);assert.equal(result.source.scale,.8);assert.equal(result.source.visible,true);assert.ok(result.source.intensity>0);assert.ok(result.source.emitterError<.0001);}
 await page.screenshot({path:`${out}/authored-ray-gameplay.png`});
 // Real pointer-locked mouse movement, not a camera override or edited beam path.
 await page.mouse.move(940,450,{steps:15});await page.waitForTimeout(180);await page.screenshot({path:`${out}/authored-ray-turn.png`});
 await page.keyboard.press('Escape');await page.waitForTimeout(400);assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await page.mouse.up().catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/studio-to-game-beam.webm`);await browser.close();console.log(JSON.stringify(result));}
