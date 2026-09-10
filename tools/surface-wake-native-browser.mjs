// Native keyboard/UI evidence. Observations never change fighter or camera state.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/surface-wake-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out+'/video',size:{width:1600,height:900}}});
const page=await context.newPage(),result={errors:[],samples:[],native:true};
page.on('pageerror',e=>result.errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',cameraPreset:'frontline'})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');
 await page.locator('#pwEncounter [data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.bringToFront();
 async function sample(phase,shot=false){const value=await page.evaluate(()=>{const f=PW.game.player,w=PW.game.world,s=f._surfaceWake;return {pos:f.pos.toArray(),speed:Math.hypot(f.vel.x,f.vel.z),agl:f.pos.y-w.heightAt(f.pos.x,f.pos.z),surface:w.surfaceAt(f.pos.x,f.pos.z),airborne:f.airborne,active:s?.active||0,emitted:s?.emitted||0,visible:s?.mesh.visible||false};});result.samples.push({phase,...value});console.log(phase,value);if(shot)await page.screenshot({path:out+'/'+phase+'.png'});return value;}
 await sample('ground');
 await page.keyboard.down('s');await page.waitForTimeout(3800);await page.keyboard.up('s');
 await page.keyboard.press('f');await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');await page.waitForTimeout(400);
 await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(750);await sample('low-flight',true);
 await page.waitForTimeout(650);const wake=await sample('widening-wake',true);
 await page.keyboard.up('w');await page.keyboard.up('Shift');
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.mouse.move(2400,680,{steps:8});await page.waitForTimeout(120);await sample('wake-turn-view',true);
 await page.keyboard.down('Space');
 await page.waitForFunction(()=>{const f=PW.game.player;return f.pos.y-PW.game.world.heightAt(f.pos.x,f.pos.z)>65;});
 await page.keyboard.up('Space');await page.waitForTimeout(2800);const high=await sample('climbed-clear',true);
 assert.ok(wake.airborne&&wake.active>0&&wake.visible,'Low native flight must produce visible dust');assert.equal(high.active,0,'Climbing stops dust and old wake settles');
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Flight',exact:true}).click();
 const field=page.getByLabel('Dust intensity value',{exact:true});await field.fill('0.65');await field.press('Tab');
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 result.editor=await page.evaluate(()=>STUDIO.history.value.surfaceWake);assert.equal(result.editor.intensity,.65);
 await page.getByRole('tab',{name:'Flight',exact:true}).click();await page.getByLabel('Dust intensity value',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/studio-controls.png'});
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwEncounter [data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 result.runtimeProfile=await page.evaluate(()=>PW.game.player.def.model.surfaceWake);assert.equal(result.runtimeProfile.intensity,.65);
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);console.error(e);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));await context.close();await page.video()?.saveAs(out+'/native-flight-and-editor.webm');await browser.close();}
