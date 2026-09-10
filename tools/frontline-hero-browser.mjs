import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-hero-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 const surface=page.getByLabel('Material surface',{exact:true});assert.equal(await surface.count(),1,'Creator needs a selectable surface, not a hard-coded game-only treatment');
 assert.equal(await surface.inputValue(),'field');await surface.selectOption('standard');
 await page.waitForFunction(()=>!STUDIO.preview.fighter.parts.mats.suit.map);await surface.selectOption('field');
 await page.waitForFunction(()=>STUDIO.preview.fighter.parts.mats.suit.map?.image);
 await page.screenshot({path:out+'/studio-field.png'});
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwGo').click();await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady);
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');
 await page.keyboard.down('w');await page.waitForTimeout(1200);await page.screenshot({path:out+'/native-flight.png'});await page.keyboard.up('w');
 result.flight=await page.evaluate(()=>{const f=LSW.game.player;return {hero:f.def.id,body:f.parts.skin?.id,root:f.pos.toArray(),weaveLoaded:!!f.parts.mats.suit.map?.image,geometry:f.parts.skin?.meshes.map(m=>({name:m.name,vertices:m.geometry.attributes.position.count})),ema:LSW.game.world._ema};});
 assert.equal(result.flight.body,'superhero-male');assert.ok(result.flight.weaveLoaded);assert.ok(result.flight.root[1]>140);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(error){result.failure=error.message;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally{await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));await browser.close();}
