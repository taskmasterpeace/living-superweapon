import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-driving';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const result={kind:'positioned runtime fixture, real keyboard driving; not navigation proof'};
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=merc');await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game.pwStage?.frontlineReady&&PW.game.pwStage.convoy?.ready,null,{timeout:60000});
 await page.evaluate(()=>{const g=PW.game,v=g.pwStage.convoy.vehicles[0],p=g.player;window.driveVehicle=v;p.pos.set(v.cover.x+v.cover.hx+4,v.ground,v.cover.z);p.vel.set(0,0,0);p.flying=false;p.flyHeld=false;g.world._lookActive=true;g.world._lookYaw=v.yaw;g.world._lookPitch=.12;g.world._chaseSnap=true;});
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!!PW.game.player._scoutVehicle);
 await page.evaluate(()=>{window.driveFaults=[];const g=PW.game,report=g.reportError.bind(g);g.reportError=(e,c)=>{driveFaults.push(e.stack);report(e,c);};});
 const before=await page.evaluate(()=>({x:driveVehicle.cover.x,z:driveVehicle.cover.z}));
 await page.keyboard.down('KeyW');await page.waitForTimeout(1700);await page.keyboard.up('KeyW');
 result.drive=await page.evaluate(()=>({x:driveVehicle.cover.x,z:driveVehicle.cover.z,speed:driveVehicle.speed,hidden:!PW.game.player.obj.visible,seated:!!PW.game.player._scoutVehicle,camera:PW.game.world.camMode}));
 assert.ok(Math.hypot(result.drive.x-before.x,result.drive.z-before.z)>8);assert.equal(result.drive.hidden,true);assert.equal(result.drive.camera,'chase');
 await page.screenshot({path:out+'/scout-driving.png'});
 await page.keyboard.down('Space');await page.waitForTimeout(1200);await page.keyboard.up('Space');assert.ok(Math.abs(await page.evaluate(()=>driveVehicle.speed))<.1);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!PW.game.running);const stop=await page.evaluate(()=>[driveVehicle.cover.x,driveVehicle.cover.z]);await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>[driveVehicle.cover.x,driveVehicle.cover.z]),stop);
 await page.locator('#hPaused [data-p="resume"]').click();await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!PW.game.player._scoutVehicle);
 result.exit=await page.evaluate(()=>({visible:PW.game.player.obj.visible,alive:PW.game.player.alive}));assert.equal(result.exit.visible,true);
 // Same public key twice, no direct evade invocation.
 const x=await page.evaluate(()=>PW.game.player.pos.clone().toArray());await page.keyboard.press('KeyA');await page.waitForTimeout(90);await page.keyboard.press('KeyA');
 result.blink=await page.evaluate(()=>({pos:PW.game.player.pos.toArray(),cd:PW.game.player.evadeCd}));assert.ok(result.blink.cd>0);assert.ok(Math.hypot(result.blink.pos[0]-x[0],result.blink.pos[2]-x[2])>8);
 result.errors=errors;result.faults=await page.evaluate(()=>driveFaults);console.log(JSON.stringify(result.faults));assert.deepEqual(result.faults,[]);assert.deepEqual(errors,[]);await page.screenshot({path:out+'/merc-after-blink.png'});
 console.log(JSON.stringify(result));
}catch(e){result.error=e.stack;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
finally{await writeFile(out+'/results.json',JSON.stringify(result,null,2));await browser.close();}
