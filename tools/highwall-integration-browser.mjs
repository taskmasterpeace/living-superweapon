import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/highwall/resume';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:process.env.HEADLESS!=='0'}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE',e.message);});
const ready=()=>page.waitForFunction(()=>window.PW?.game?._highwall?.panel&&!document.querySelector('#highwall-loading'),{},{timeout:60000});
const moveNear=async id=>page.evaluate(id=>{const g=PW.game,h=g._highwall,p=g.player,it=h.devices.items.find(it=>it.id===id);p.pos.copy(it.pos).add({x:0,y:0,z:10});p.vel.set(0,0,0);g.world._lookYaw=Math.PI;return {id,pos:p.pos.toArray()};},id);
const report={setup:'Native E / UI actions with explicitly arranged approach positions for devices; no replacement interaction logic.'};
try{
 // Keep this already-loaded QA page stable while other workers edit files. App code remains real.
 await page.route('**/@vite/client',route=>route.fulfill({contentType:'text/javascript',body:`
 export class ErrorOverlay extends HTMLElement {}
 export function createHotContext(){return {data:{},accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){}}}
 const styles=new Map();export function updateStyle(id,text){let el=styles.get(id);if(!el){el=document.createElement('style');styles.set(id,el);document.head.append(el)}el.textContent=text}
 export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}
 export function injectQuery(url,query){return url+(url.includes('?')?'&':'?')+query}
 `}));
 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=systems');await ready();console.log('READY');
 await page.waitForTimeout(1000);await page.screenshot({path:out+'/systems-ready.png'});
 await page.keyboard.down('w');try{await page.waitForFunction(()=>PW.game.player.pos.y>=9.8,{},{timeout:25000});}catch{}finally{await page.keyboard.up('w');}
 report.stairs=await page.evaluate(()=>({pos:PW.game.player.pos.toArray(),grounded:PW.game.player.grounded}));assert.ok(report.stairs.pos[1]>=9.8,'native W must ascend the observation-post steps');await page.screenshot({path:out+'/post-approach.png'});
 await moveNear('monitor');await page.keyboard.press('e');await page.waitForTimeout(750);
 report.monitor=await page.evaluate(()=>{const g=PW.game,d=g._highwall.devices,c=d.feedCanvas.getContext('2d'),pixels=c.getImageData(0,0,320,180).data,colors=new Set();for(let i=0;i<pixels.length;i+=16)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);return {focused:d.focus?.kind,overlay:g.combatOverlayOpen,feed:d.lastFeed,colors:colors.size,pos:g.player.pos.toArray(),ammo:g.player.slots.lmb?.ammo?.loaded};});assert.equal(report.monitor.focused,'monitor');assert.equal(report.monitor.overlay,true);assert.ok(report.monitor.colors>30,'live feed must contain scene detail, not housing flat color');
 await page.keyboard.down('w');await page.mouse.move(200,450);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();await page.keyboard.up('w');report.focusHold=await page.evaluate(()=>({pos:PW.game.player.pos.toArray(),ammo:PW.game.player.slots.lmb?.ammo?.loaded}));assert.ok(Math.hypot(...report.focusHold.pos.map((v,i)=>v-report.monitor.pos[i]))<.5,'monitor focus must block movement');assert.equal(report.focusHold.ammo,report.monitor.ammo,'monitor focus must block fire');await page.keyboard.press('e');await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>PW.game._highwall.devices.feedIndex),1);
 await page.screenshot({path:out+'/live-monitor.png'});await page.keyboard.press('Escape');
 report.monitorExit=await page.evaluate(()=>!PW.game.combatOverlayOpen);
 await moveNear('speaker');await page.keyboard.press('e');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>PW.game._highwall.devices.media[0].state),'stopped');await page.getByRole('button',{name:'Play / Resume',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await page.evaluate(()=>PW.game._highwall.devices.media[0].el.currentTime);await page.waitForTimeout(200);assert.ok(Math.abs(await page.evaluate(()=>PW.game._highwall.devices.media[0].el.currentTime)-paused)<.05);await page.getByRole('button',{name:'Play / Resume',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:out+'/speaker-controls.png'});await page.keyboard.press('Escape');
 report.speaker=await page.evaluate(()=>{const m=PW.game._highwall.devices.media[0];return {state:m.state,time:m.el.currentTime};});
 assert.equal(report.speaker.state,'playing');assert.ok(report.speaker.time>0);await moveNear('screen');await page.keyboard.press('e');await page.getByRole('button',{name:'Play / Resume',exact:true}).click();await page.waitForTimeout(1500);await page.screenshot({path:out+'/video-screen.png'});
 report.video=await page.evaluate(()=>{const m=PW.game._highwall.devices.media[1];return {state:m.state,time:m.el.currentTime,width:m.el.videoWidth};});
 assert.equal(report.video.state,'playing');assert.ok(report.video.time>0&&report.video.width>0);await page.keyboard.press('Escape');
 await moveNear('door');await page.keyboard.press('e');await page.waitForFunction(()=>PW.game._highwall.door.fraction===1,{},{timeout:15000});
 report.door=await page.evaluate(()=>({fraction:PW.game._highwall.door.fraction,bottom:PW.game._highwall.door.collider.bottom,revision:PW.game._highwall.nav.revision}));
 assert.equal(report.door.fraction,1);await page.getByRole('button',{name:'Save',exact:true}).click();
 report.saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warworld.highwall.session.v1')).units.length);
 await page.getByRole('button',{name:'Reset',exact:true}).click();await ready();
 await page.getByRole('button',{name:'Resume',exact:true}).click();await ready();
 report.resumed=await page.evaluate(()=>({preset:PW.game._highwall.preset,gate:PW.game._highwall.door.fraction,units:PW.game.entities.length,held:PW.game.player._gearHeld?.rowId,media:PW.game._highwall.devices.media.map(m=>m.state)}));assert.equal(report.resumed.preset,'systems');assert.equal(report.resumed.gate,1);assert.equal(report.resumed.units,report.saved);assert.ok(report.resumed.media.every(s=>s==='stopped'));
 console.log('DEVICES AND RESUME PASS');await page.getByLabel('Highwall scenario').selectOption('outbreak');await ready();
 report.outbreakStart=await page.evaluate(()=>({units:PW.game.entities.length,blocked:PW.game.entities.filter(f=>!PW.game._highwall.nav.isClear(f.pos,{radius:2.2,height:12})).map(f=>f.def.id)}));
 assert.equal(report.outbreakStart.blocked.length,0);await page.getByRole('button',{name:'Start combat',exact:true}).click();report.fireBefore=await page.evaluate(()=>PW.game.player.slots.lmb?.ammo?.loaded);await page.mouse.move(700,410);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();report.fireAfter=await page.evaluate(()=>PW.game.player.slots.lmb?.ammo?.loaded);assert.ok(report.fireAfter<report.fireBefore,'native LMB must consume rounds');await page.keyboard.press('r');await page.waitForTimeout(100);report.reloadStarted=await page.evaluate(()=>({active:!!PW.game.player._firearmReload,elapsed:PW.game.player._firearmReload?.elapsed,alive:PW.game.player.alive,overlay:PW.game.combatOverlayOpen}));try{await page.waitForFunction(before=>PW.game.player.slots.lmb?.ammo?.loaded>before,report.fireAfter,{timeout:15000});}catch{}report.reloaded=await page.evaluate(()=>({loaded:PW.game.player.slots.lmb?.ammo?.loaded,reserve:PW.game.player.slots.lmb?.ammo?.reserve}));assert.ok(report.reloaded.loaded>report.fireAfter,'native R must reload');await page.waitForTimeout(6000);
 report.outbreak=await page.evaluate(()=>({units:PW.game.entities.length,alive:PW.game.entities.filter(f=>f.alive).length,events:PW.game._highwall.infection.events,loot:PW.game._highwall.loot.snapshot()}));
 await page.screenshot({path:out+'/outbreak-live.png'});
 assert.deepEqual(errors,[]);report.errors=errors;await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){report.failure=e.message;report.errors=errors;await writeFile(out+'/result.json',JSON.stringify(report,null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.log(await page.locator('body').innerText());throw e;}finally{await browser.close();}
