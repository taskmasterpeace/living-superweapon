import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/soldier-crouch-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false}),context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),video=page.video(),result={scope:'Native SARGE Practice C crouch, moving fire and release; no actor/pose edits.',samples:[],errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
async function sample(label){const row=await page.evaluate(()=>{const g=PW.game,f=g.player;return{crouching:f.crouching,guarding:f.guarding,pos:f.pos.toArray(),speed:Math.hypot(f.vel.x,f.vel.z),head:f.parts.head.getWorldPosition(f.pos.clone()).y,anchor:g.world._flightAnchor?.y,camera:g.world.camera.position.y,drop:f._crouchPose?.drop||0,ammo:f.slots.lmb.ammo.loaded,reloading:!!f._firearmReload,rifleAim:f._riflePose?.aimWeight,faults:[...(g._errSeen||[])]};});result.samples.push({label,...row});return row;}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.mouse.click(800,450);await page.waitForFunction(()=>!!document.pointerLockElement);await page.waitForTimeout(500);
 const standing=await sample('standing');await page.screenshot({path:`${out}/01-standing.png`});
 await page.keyboard.down('KeyC');await page.waitForTimeout(800);const duck=await sample('crouched');await page.screenshot({path:`${out}/02-crouched.png`});
 assert.ok(duck.crouching&&!duck.guarding,'C must crouch the soldier without triggering guard');
 assert.ok(standing.head-duck.head>1.25);assert.ok(standing.anchor-duck.anchor>1.2,'camera anchor must follow crouch');
 await page.keyboard.down('KeyW');await page.mouse.down();await page.waitForTimeout(600);const fire=await sample('moving-fire');await page.screenshot({path:`${out}/03-moving-fire.png`});
 assert.ok(fire.crouching&&fire.speed>3&&fire.ammo<duck.ammo,'crouched locomotion must allow real fire');
 await page.mouse.up();await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');await page.waitForTimeout(1100);const recovered=await sample('released');await page.screenshot({path:`${out}/04-recovery.png`});
 assert.ok(!recovered.crouching&&recovered.drop<.01);
 await page.mouse.move(800,260);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
 const aimed=await sample('before-reload');await page.screenshot({path:`${out}/05-aimed.png`});
 await page.keyboard.press('KeyR');await page.waitForTimeout(70);const lowering=await sample('reload-lowering');await page.screenshot({path:`${out}/06-reload-lowering.png`});
 assert.ok(lowering.reloading&&lowering.rifleAim<aimed.rifleAim,'native reload must lower the aimed carrier');
 await page.waitForTimeout(350);await sample('reload-ready');await page.screenshot({path:`${out}/07-reload-ready.png`});
 await page.waitForFunction(()=>!PW.game.player._firearmReload);const loaded=await sample('reloaded');
 assert.ok(loaded.ammo>aimed.ammo);await page.screenshot({path:`${out}/08-reloaded.png`});
 assert.deepEqual(result.errors,[]);assert.ok(result.samples.every(s=>s.faults.length===0));result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await page.mouse.up().catch(()=>{});await page.keyboard.up('KeyW').catch(()=>{});await page.keyboard.up('KeyC').catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/crouch-native.webm`);await browser.close();console.log(JSON.stringify(result));}
