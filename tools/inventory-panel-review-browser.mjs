import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/inventory-current-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}});
page.setDefaultTimeout(15000);
const report={kind:'Production Game training setup; real keyboard/panel interaction, current model',errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5193/');await page.waitForFunction(()=>window.LSW?.game?.inventoryPanel,null,{timeout:60000});
 await page.evaluate(async()=>{const g=LSW.game;g.startMode('training',{p1:'sarge'});g.modeId='powerworld';g.mode=null;for(const e of [...g.entities])if(e!==g.player){e.dispose();e.obj.removeFromParent();}g.entities=[g.player];g.humans=[{fighter:g.player,scheme:'kbm'}];g.ms.chaseCam=true;g.hud.hideTitle();g.hud.setPlayer(g.player.def);document.body.classList.add('playing');for(const e of document.querySelectorAll('#hSelect,#hTitle,#hSquad'))e.classList.remove('on');const {weaponById}=await import('/src/data/armory.js');g.equipFrom(g.player,weaponById('m16'),{primary:true});g.player.slots._gear.ammo.loaded=7;g.equipFrom(g.player,weaponById('p9'));});
 await page.waitForTimeout(800);await page.keyboard.press('i');const panel=page.getByRole('dialog',{name:'Backpack and equipment'});await panel.waitFor();
 report.soldier=await page.evaluate(()=>({model:!!LSW.game.player._modularCharacter,overlay:LSW.game.combatOverlayOpen,held:LSW.game.player._gearHeld.rowId,stored:LSW.game.player._inventoryWeapons.length}));assert.equal(report.soldier.model,true);assert.equal(report.soldier.overlay,true);
 await page.screenshot({path:out+'/soldier.png'});
 await panel.getByRole('button',{name:'Stow weapon',exact:true}).click();assert.equal(await page.evaluate(()=>LSW.game.player._inventoryStowed),true);
 await page.screenshot({path:out+'/stowed.png'});await panel.getByRole('button',{name:'Draw weapon',exact:true}).click();
 await panel.locator('.inventory-item').filter({hasText:'Stored'}).click();await panel.getByRole('button',{name:'Equip weapon',exact:true}).click();assert.equal(await page.evaluate(()=>LSW.game.player.slots._gear.ammo.loaded),7);
 const h=panel.locator('header');const box=await h.boundingBox();await page.mouse.move(box.x+150,box.y+20);await page.mouse.down();await page.mouse.move(200,150,{steps:8});await page.mouse.up();report.drag=await panel.boundingBox();assert.ok(report.drag.x<300);
 await panel.getByRole('button',{name:'Game device',exact:true}).click();await panel.getByText('COMING SOON',{exact:true}).waitFor();await page.screenshot({path:out+'/device.png'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>LSW.game.inventoryPanel.isOpen),false);assert.equal(await page.locator('#pwTitle').isVisible(),false,'Escape leaked through to the title menu');
 await page.evaluate(()=>{const g=LSW.game;g.startMode('training',{p1:'sol'});g.modeId='powerworld';g.mode=null;for(const e of [...g.entities])if(e!==g.player){e.dispose();e.obj.removeFromParent();}g.entities=[g.player];g.humans=[{fighter:g.player,scheme:'kbm'}];g.ms.chaseCam=true;g.hud.hideTitle();g.hud.setPlayer(g.player.def);document.body.classList.add('playing');});await page.waitForTimeout(600);await page.keyboard.press('i');await panel.waitFor();report.lsw=await panel.innerText();assert.match(report.lsw,/2\/8 cells/);await page.screenshot({path:out+'/lsw.png'});await page.keyboard.press('i');assert.equal(await page.evaluate(()=>LSW.game.combatOverlayOpen),false);
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e);await page.screenshot({path:out+'/failure.png'});process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
