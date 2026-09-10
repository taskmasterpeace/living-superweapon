import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/web-zip-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out,size:{width:1672,height:941}}});
const page=await context.newPage(),result={scope:'Native Free practice WEBLINE Shift web zip against the actual command building, followed by release; no gameplay overrides',samples:[],errors:[]};
page.on('pageerror',e=>result.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
let mx=836,my=470;
async function read(label){const s=await page.evaluate(()=>{const g=PW.game,f=g.player,G=f._grapple||f.hanging;return {pos:f.pos.toArray(),alive:f.alive,hp:f.hp,ki:f.ki,flightTier:f.flightTier,flying:f.flying,grapple:!!f._grapple,hanging:!!f.hanging,zip:G?.zip,anchor:G?{x:G.x,y:G.y,z:G.z,normal:G.normal}:null,aim:f.aim3.toArray(),line:f._grapLine?{visible:f._grapLine.visible,points:Array.from(f._grapLine.geometry.attributes.position.array)}:null};});result.samples.push({label,...s});return s;}
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=webline');
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&PW.game.pwStage.aircraft?.ready,null,{timeout:60000});
 result.target=await page.evaluate(()=>{const g=PW.game,c=g.world.cover.find(c=>c.frontlineBuilding&&Math.hypot(c.x+105,c.z-55)<10);if(!c)return {missing:true,buildings:g.world.cover.filter(c=>c.frontlineBuilding).map(c=>({x:c.x,z:c.z,top:c.top,hx:c.hx,hz:c.hz}))};return {x:c.x,y:(c.bottom||0)+((c.top??c.h)-(c.bottom||0))*.65,z:c.z,top:c.top,hx:c.hx,hz:c.hz,kind:c.frontlineBuilding};});
 assert.ok(!result.target.missing,'Real command-building collider is present');
 await page.mouse.click(mx,my,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 for(let i=0;i<10;i++){
  const v=await page.evaluate(target=>{const w=PW.game.world,q=w.camera.position.clone().set(target.x,target.y,target.z);w.camera.worldToLocal(q);return {p:q.toArray(),sens:w._lookSens};},result.target);
  const [x,y,z]=v.p,dx=Math.max(-130,Math.min(130,Math.atan2(x,-z)/v.sens)),dy=Math.max(-100,Math.min(100,-Math.atan2(y,Math.hypot(x,z))/v.sens));
  mx+=Math.round(dx);my+=Math.round(dy);await page.mouse.move(mx,my);await page.waitForTimeout(110);
 }
 await read('before');await shot('01-aim-at-command');
 await page.keyboard.press('ShiftLeft');
 let held=false;
 for(let i=0;i<45;i++){await page.waitForTimeout(65);const s=await read('zip');if(i===3)await shot('02-reeling');if(s.hanging){held=true;break;}}
 assert.ok(result.samples.some(s=>s.grapple&&s.zip),'Native Shift actually initiated anchored zip');assert.ok(held,'Native zip reached a stable wall hold');
 await page.waitForTimeout(450);await read('wall-hold');await shot('03-wall-hold');
 await page.keyboard.press('Space');await page.waitForTimeout(250);const released=await read('released');await shot('04-release');assert.equal(released.hanging,false);assert.equal(released.grapple,false);assert.equal(released.flying,false);assert.equal(released.flightTier,0);
 await page.waitForTimeout(1500);await read('fall-after-release');await shot('05-return-to-ground');
 assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.error=e.stack;await read('failure').catch(()=>{});await shot('failure').catch(()=>{});process.exitCode=1;}
finally{await context.close();await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
