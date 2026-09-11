import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const hero=process.argv.find(a=>a.startsWith('--hero='))?.slice(7)||'kano';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||`artifacts/beam-turn-${hero}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),video=page.video(),result={hero,scope:'Native practice startup, takeoff, mouse-aimed beam and turn/recovery. No position, time, energy, AI or camera overrides.',errors:[],frames:[]};page.on('pageerror',e=>result.errors.push(String(e)));
let mx=800,my=450;
async function frame(name){
 result.frames.push(await page.evaluate(name=>({name,time:PW.game.time,flying:PW.game.player.flying,beams:PW.game.projectiles.list.filter(b=>b.caster===PW.game.player&&b.path).map(b=>({sustaining:b.sustaining,pending:b.pendingLaunch,radius:b.radius,len:b._arcLen(),maxLen:b.maxLen,speed:b.tipSpeed,n:b.pn,path:[...b.path.slice(0,b.pn*3)],muzzle:b.muzzle.toArray(),dir:b.dir.toArray()}))}),name));
 await page.screenshot({path:`${out}/${name}.png`});
}
try{
 await page.goto(`http://127.0.0.1:5180/powerworld.html?hero=${hero}`);await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.waitForTimeout(800);
 await page.mouse.click(mx,my);await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('KeyC');await page.waitForTimeout(250);await page.keyboard.up('KeyC');await page.waitForTimeout(650);
 await page.keyboard.press('KeyF');await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');
 const correction=await page.evaluate(()=>({dy:(PW.game.world._lookPitch-.04)/PW.game.world._lookSens}));my+=correction.dy;await page.mouse.move(mx,my);await page.waitForTimeout(450);
 await frame('01-ready');await page.mouse.down();if(hero==='kano'){await page.waitForTimeout(600);await page.mouse.up();}
 await page.waitForFunction(()=>PW.game.projectiles.list.some(b=>b.caster===PW.game.player&&b.path&&!b.pendingLaunch&&b._arcLen()>70),null,{timeout:12000});await frame('02-straight');
 for(let i=0;i<7;i++){mx+=62;await page.mouse.move(mx,my);await page.waitForTimeout(55);if([0,2,5].includes(i))await frame(`03-turn-${i}`);}
 await page.waitForTimeout(250);await frame('04-new-heading');
 for(let i=0;i<7;i++){mx-=95;await page.mouse.move(mx,my);await page.waitForTimeout(45);if([1,4].includes(i))await frame(`05-reverse-${i}`);}
 await page.mouse.up();await page.keyboard.press('KeyC');await page.waitForTimeout(900);await frame('06-recovered');
 result.faults=await page.evaluate(()=>[...(PW.game._errSeen||[])]);
 assert.ok(result.frames.some(f=>f.beams.some(b=>b.len>70)));assert.ok(result.frames.filter(f=>f.name.includes('turn')||f.name.includes('reverse')).every(f=>f.beams.some(b=>b.sustaining&&!b.pending)),'Turn evidence must contain a sustaining beam');assert.ok(result.frames[0].flying);assert.deepEqual(result.errors,[]);assert.deepEqual(result.faults,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await page.mouse.up().catch(()=>{});await page.keyboard.up('Space').catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-turn.webm`);await browser.close();console.log(JSON.stringify({passed:result.passed,hero,result:result.failure,frames:result.frames.map(f=>({name:f.name,beams:f.beams.map(b=>({len:b.len,n:b.n}))})),errors:result.errors}));}
