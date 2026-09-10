import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const impact=process.argv.includes('--impact-glow'),field=impact?'impactGlow':'tipSpeed',value=impact?'1.6':'4000';
const out=impact?'artifacts/beam-impact-authoring':'artifacts/beam-optics-authoring';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false}),context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),video=page.video(),result={scope:`Native Studio ${field} edit, save/reload, Play Test and live optical firing.`,errors:[]};page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 const input=page.locator(`input[type="number"][data-attack-key="${field}"]`);await input.fill(value);await input.press('Tab');await page.getByRole('button',{name:'Save local',exact:true}).click();
 await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('tab',{name:'Attacks',exact:true}).click();assert.equal(await input.inputValue(),value);await page.screenshot({path:`${out}/editor.png`});
 if(!impact){await page.getByRole('button',{name:'Beam Library ↗',exact:true}).click();await page.getByLabel('Find a beam').fill('sol');assert.match(await page.locator('.beam-library tbody').textContent(),/4,000 u\/s/);await page.getByRole('button',{name:'Close Beam Library'}).click();}
 await page.getByRole('button',{name:'Play Test ↗',exact:true}).click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.waitForTimeout(700);
 await page.mouse.click(800,450);await page.waitForFunction(()=>!!document.pointerLockElement);await page.keyboard.down('KeyC');await page.waitForTimeout(200);await page.keyboard.up('KeyC');await page.waitForTimeout(650);
 await page.mouse.down();await page.waitForFunction(()=>PW.game.projectiles.list.some(b=>b.caster===PW.game.player&&b.path&&!b.pendingLaunch));
 result.runtime=await page.evaluate(()=>{const b=PW.game.projectiles.list.find(b=>b.caster===PW.game.player&&b.path&&!b.pendingLaunch);return {hero:PW.game.player.def.id,speed:b.tipSpeed,impactGlow:b.impactGlow,radius:b.radius,travel:b._arcLen()};});assert.equal(impact?result.runtime.impactGlow:result.runtime.speed,Number(value));assert.equal(result.runtime.hero,'sol');await page.screenshot({path:`${out}/runtime.png`});await page.mouse.up();assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/authoring-to-runtime.webm`);await browser.close();console.log(JSON.stringify(result));}
