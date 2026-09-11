import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const out=process.env.LSW_PW_ENTRY_OUT||'artifacts/powerworld-correct-entry';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],result={};
page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>{
 const g=LSW.game,f=g.player,w=g.world;
 return {url:location.href,mode:g.modeId,stage:!!g.pwStage,openSky:!!f._openSky,
  camera:w.camera.type,fov:w.camera.fov,yaw:w._lookYaw,pitch:w._lookPitch,
  position:f.pos.toArray(),aim:f.aim3.toArray(),move:{...f.moveDir},flying:f.flying,grounded:f.grounded,gait:f.gait,
  alive:f.alive,guard:f.guarding,police:g.police.active,
  pointer:document.pointerLockElement===w.renderer.domElement,
  bodyClasses:document.body.className,hero:f.def.id,running:g.running};
});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.PW?.game);
 await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.running&&LSW.game.player&&LSW.game.world.camMode==='chase');
 result.entry=await state();await page.screenshot({path:`${out}/arena-entry.png`});
 assert.equal(result.entry.mode,'powerworld');assert.equal(result.entry.stage,true);
 assert.equal(result.entry.openSky,true);assert.equal(result.entry.police,false);
 assert.equal(result.entry.camera,'PerspectiveCamera');assert.equal(result.entry.fov,73.74);
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 const beforeLook=await state();await page.mouse.move(895,420,{steps:6});
 await page.waitForFunction(yaw=>Math.abs(LSW.game.world._lookYaw-yaw)>.05,beforeLook.yaw);
 result.look=await state();assert.ok(Math.abs(result.look.pitch-beforeLook.pitch)>.01);
 await page.keyboard.down('w');
 await page.waitForFunction(p=>Math.hypot(LSW.game.player.pos.x-p[0],LSW.game.player.pos.z-p[2])>2,result.look.position);
 result.groundForward=await state();await page.keyboard.up('w');
 assert.equal(result.groundForward.flying,false);
 const flatMove=result.groundForward.move;
 const groundForwardDot=flatMove.x*Math.sin(result.groundForward.yaw)+flatMove.z*Math.cos(result.groundForward.yaw);
 result.groundForwardDot=groundForwardDot;
 assert.ok(groundForwardDot>.95,'Ground forward must follow the camera heading');
 await page.keyboard.down('Space');
 await page.waitForFunction(y=>LSW.game.player.flying&&LSW.game.player.pos.y>y+6,result.look.position[1]);
 await page.keyboard.up('Space');result.hover=await state();
 await page.keyboard.down('d');
 await page.waitForFunction(p=>Math.hypot(LSW.game.player.pos.x-p[0],LSW.game.player.pos.z-p[2])>4,result.hover.position);
 result.strafe=await state();await page.keyboard.up('d');
 assert.ok(result.strafe.flying);assert.ok(Math.abs(result.strafe.yaw-result.hover.yaw)<.01);
 result.strafeAimDot=result.strafe.aim.reduce((sum,v,i)=>sum+v*result.hover.aim[i],0);
 assert.ok(result.strafeAimDot>.95,'Strafing should retain camera-directed aim');
 await page.keyboard.down('w');const beforeForward=await state();
 await page.waitForFunction(p=>Math.hypot(...LSW.game.player.pos.toArray().map((v,i)=>v-p[i]))>4,beforeForward.position);
 result.forward=await state();await page.keyboard.up('w');
 await page.keyboard.down('c');await page.waitForFunction(()=>LSW.game.player.guarding);
 result.guard=await state();await page.screenshot({path:`${out}/arena-native-guard.png`});
 await page.keyboard.up('c');await page.waitForFunction(()=>!LSW.game.player.guarding);
 await page.screenshot({path:`${out}/arena-native-flight.png`});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!LSW.game.running&&!document.pointerLockElement);
 result.paused=await state();assert.deepEqual(errors,[]);
 console.log(JSON.stringify(result));
}catch(e){result.failure=e.message;result.last=await state().catch(()=>null);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
