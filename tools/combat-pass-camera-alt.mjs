import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {captureProvenance} from './capture-provenance.mjs';
const sourceBefore=await captureProvenance();
const out=(process.env.PW_CAPTURE_ROOT||'artifacts/marketing/combat-pass-2026-09-12')+'/camera-alt-'+(process.argv[2]||'round2');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=async label=>{const row=await page.evaluate(()=>{const g=window.PW.game,f=g.player,w=g.world;return {time:g.time,pos:f.pos.toArray(),velocity:f.vel.toArray(),aim:f.aim3.toArray(),head:f.parts.head.rotation.toArray(),feet:[f.parts.legL.userData.boot.rotation.toArray(),f.parts.legR.userData.boot.rotation.toArray()],headScreen:f.parts.head.getWorldPosition(f.pos.clone()).project(w.camera).toArray(),fov:w.camera.fov,flying:f.flying,ki:f.ki,gear:f.movementGear,poseState:f._flightPoseState,bodyRotation:f.parts.g.rotation.toArray(),flightBrake:f._flightBrake,bodyForwardVelocity:f.vel.x*Math.sin(f.parts.g.rotation.y)+f.vel.z*Math.cos(f.parts.g.rotation.y),look:{yaw:w._lookYaw,pitch:w._lookPitch,free:{...w._freeLook}},pointerLocked:!!document.pointerLockElement,mode:g.modeId,aimPoint:f.aimWorld.toArray(),camera:w.camera.position.toArray(),cameraDirection:w.camera.getWorldDirection(f.pos.clone()).toArray(),aimHit:g._aimHit?{hit:g._aimHit.hit,dist:g._aimHit.dist}:null};});rows.push({label,...row});await page.screenshot({path:out+'/'+label+'.png'});};
try{
 await page.goto(process.env.PW_TEST_URL||'http://127.0.0.1:5182/powerworld.html',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1000);await read('01-normal-spawn');
 await page.mouse.click(720,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);await page.waitForTimeout(250);await page.keyboard.down('Space');await page.waitForTimeout(3500);await page.keyboard.up('Space');await page.waitForTimeout(1200);await read('02-hover');
 await page.mouse.move(720,610,{steps:10});await page.keyboard.down('w');await page.waitForTimeout(650);await read('02b-forward-dive');await page.keyboard.up('w');await page.mouse.move(720,450,{steps:10});await page.waitForTimeout(300);
 await page.keyboard.down('w');await page.waitForTimeout(1000);await read('03-travel');
 await page.keyboard.down('AltLeft');await page.mouse.move(1100,400,{steps:12});await page.waitForTimeout(500);await read('04-alt-side');
 await page.mouse.move(1100,650,{steps:10});await page.waitForTimeout(500);await read('05-alt-down');
 await page.mouse.move(340,200,{steps:20});await page.waitForTimeout(500);await read('05b-alt-opposite-up');await page.keyboard.up('AltLeft');await page.waitForTimeout(800);await read('06-look-return');
 await page.keyboard.down('ShiftLeft');await page.waitForTimeout(700);await read('06b-speed-one');await page.keyboard.up('ShiftLeft');await page.waitForTimeout(100);await page.keyboard.down('ShiftLeft');await page.waitForTimeout(1500);await read('07-speed-hold');await page.keyboard.up('ShiftLeft');await page.waitForTimeout(100);await page.keyboard.down('ShiftLeft');await page.waitForTimeout(900);await read('07b-speed-three');
 await page.keyboard.up('ShiftLeft');await page.keyboard.up('w');await page.waitForTimeout(1000);await read('08-release');
 await page.mouse.move(340,400,{steps:10});await page.keyboard.down('w');await page.waitForTimeout(450);await read('08b-dive');await page.waitForTimeout(650);await read('08c-dive-settled');await page.keyboard.up('w');
 await page.keyboard.down('ControlLeft');await page.waitForTimeout(2500);await page.keyboard.up('ControlLeft');await page.waitForTimeout(600);await read('09-descend');
 for(const row of rows.filter(r=>r.label.includes('alt-'))){if(Math.abs(row.headScreen[0])>1||Math.abs(row.headScreen[1])>1)errors.push('Head outside viewport: '+row.label);}
 const sourceAfter=await captureProvenance();await writeFile(out+'/provenance.json',JSON.stringify({sourceBefore,sourceAfter},null,2));if(sourceBefore.sourceDigest!==sourceAfter.sourceDigest)errors.push('Runtime changed during capture');
 await writeFile(out+'/result.json',JSON.stringify({kind:'Normal selector/squad entry and browser keyboard/mouse input; no actor/camera/simulation staging',rows,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
