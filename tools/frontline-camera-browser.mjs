import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-camera-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1671,height:941}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Camera',exact:true}).click();const before=await page.evaluate(()=>STUDIO.history.value);
 await page.getByRole('button',{name:'Use front-line close preset',exact:true}).click();await page.getByRole('button',{name:'Apply close framing',exact:true}).click();
 const after=await page.evaluate(()=>STUDIO.history.value);assert.equal(after.camera.range,20);assert.deepEqual({...after,camera:before.camera},before);
 await page.screenshot({path:out+'/studio-camera.png'});await page.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await page.evaluate(()=>STUDIO.history.value),before);
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');assert.equal(await page.locator('[data-camera="character"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy.ready);
 await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(800);
 result.flight=await page.evaluate(()=>({distance:LSW.game.world._chaseDist,fov:LSW.game.world._chaseFov,alive:LSW.game.player.alive,position:LSW.game.player.pos.toArray(),boot:LSW.game.player.parts.legL.userData.boot.geometry.name,ema:LSW.game.world._ema}));
 assert.equal(result.flight.distance,20);assert.equal(result.flight.fov,68);assert.equal(result.flight.boot,'field-boot');assert.ok(result.flight.alive);await page.screenshot({path:out+'/native-frontline-flight.png'});await page.keyboard.up('w');await page.keyboard.up('d');
 result.restore=await page.evaluate(()=>{const g=LSW.game;g.startMode('powerworld',{p1:'vega',p2:'kano',cameraPreset:'character'});return {camera:g.player.def.model?.camera??null,override:g.player._cameraPreset??null};});assert.equal(result.restore.override,null);
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(error){result.failure=error.message;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally{await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));await browser.close();}
