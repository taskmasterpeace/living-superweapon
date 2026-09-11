import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const out=process.argv[2]||'artifacts/power-pilot/flight-before';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage(),video=page.video();
const result={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),url:'http://127.0.0.1:5182/powerworld.html?hero=apex',scope:'Native practice spawn and keyboard/mouse flight/retreat/fire. Observation only; no pose, actor, camera, energy or simulation overrides. Video contains no audio.',errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(e.message));
const read=()=>page.evaluate(()=>{const g=PW.game,f=g.player;return {time:g.time,pos:f.pos.toArray(),velocity:f.vel.toArray(),state:f._flightPoseState,flight:f.flying,hp:f.hp,ki:f.ki,pitch:f.parts.g.rotation.x,yaw:f.parts.g.rotation.y,hips:[f.parts.legL.rotation.x,f.parts.legR.rotation.x],knees:[f.parts.legL.userData.knee.rotation.x,f.parts.legR.userData.knee.rotation.x],charging:!!f.slots.lmb.charging,emitting:!!f.slots.lmb.active?.sustaining,slots:Object.fromEntries(Object.entries(f.slots).map(([k,v])=>[k,v.def?.name])),faults:[...(g._errSeen||[])]};});
async function sample(label,ms){await page.waitForTimeout(ms);result.samples.push({label,...await read()});await page.screenshot({path:`${out}/${label}.png`});}
try{
 await page.goto(result.url);
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.bringToFront();await page.mouse.click(720,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await sample('01-rise',900);await page.keyboard.up('Space');
 await page.keyboard.down('KeyW');await sample('02-forward',1100);await page.keyboard.up('KeyW');
 await page.keyboard.down('KeyS');await sample('03-retreat-entry',220);await sample('04-retreat-held',750);
 await page.mouse.down({button:'left'});await sample('05-retreat-charge',800);await sample('06-retreat-emission',1400);
 await page.mouse.up({button:'left'});
 await page.keyboard.up('KeyS');await sample('07-recover',600);
 await page.waitForTimeout(1800);await page.mouse.down();await sample('08-beam-charge',700);await sample('09-beam-held',1600);await page.mouse.up();await sample('10-beam-stop',350);
 result.render=await page.evaluate(()=>{const w=PW.game.world,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{viewport:[innerWidth,innerHeight],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),quality:w._qTier,pixelRatio:w.renderer.getPixelRatio(),drawCalls:w.renderer.info.render.calls};});
 assert.ok(result.samples.some(s=>s.state==='backward'&&s.charging),'Native retreat charge must be observed');
 assert.ok(result.samples.some(s=>s.state==='backward'&&s.emitting),'Native retreat emission must be observed');
 assert.deepEqual(result.errors,[]);assert.ok(result.samples.every(s=>!s.faults.length));
 result.finished=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-flight.webm`);await browser.close();console.log(JSON.stringify(result));}
