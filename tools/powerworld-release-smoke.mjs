import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

if(!process.argv[2])throw new Error('Usage: node tools/powerworld-release-smoke.mjs <baseURL> [output-directory]');
const base=new URL(process.argv[2]);
assert.ok(['http:','https:'].includes(base.protocol),'baseURL must use HTTP(S)');
const out=process.argv[3]||'artifacts/powerworld-release-smoke';
await mkdir(out,{recursive:true});
const result={baseURL:base.href,checks:[],pageErrors:[],consoleErrors:[],networkErrors:[],failures:[]};
const browser=await chromium.launch({headless:false});
let page;
function watch(p,label){
 p.on('pageerror',e=>result.pageErrors.push({label,message:String(e)}));
 p.on('console',m=>{if(m.type()==='error')result.consoleErrors.push({label,message:m.text()});});
 p.on('requestfailed',r=>result.networkErrors.push({label,url:r.url(),type:r.resourceType(),failure:r.failure()?.errorText}));
 p.on('response',r=>{if(r.status()>=400)result.networkErrors.push({label,url:r.url(),type:r.request().resourceType(),status:r.status()});});
}
async function check(name,fn){
 console.log('checking',name);
 try{await fn();result.checks.push(name);}
 catch(error){result.failures.push({name,error:String(error)});await page?.screenshot({path:`${out}/failure-${name.replace(/[^a-z0-9]+/gi,'-')}.png`,timeout:10000}).catch(()=>{});}
}
async function rootMatch(p,touch=false){
 const response=await p.goto(new URL('/',base).href,{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200,'root response');
 await p.locator('#pwTitle').waitFor({state:'visible'});
 assert.ok(await p.locator('[data-encounter="practice"]').isVisible(),'Practice is missing from root title');
 await p.locator('[data-encounter="practice"]')[touch?'tap':'click']();
 await p.locator('#pwGo')[touch?'tap':'click']();
 await p.waitForFunction(()=>window.PW?.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await p.waitForFunction(()=>document.querySelector('.ps-portrait img')?.naturalWidth>0);
 assert.equal(await p.evaluate(()=>PW.game.running),true);
 assert.equal(await p.locator('.player-status').isVisible(),true);
}
try{
 const desktop=await browser.newContext({viewport:{width:1600,height:900}});
 page=await desktop.newPage();watch(page,'desktop-root');
 await check('root title to Practice gameplay',async()=>{
  await rootMatch(page);
  result.hero=await page.locator('.ps-name').textContent();
  await page.screenshot({path:`${out}/root-gameplay.png`});
 });
 if(result.checks.includes('root title to Practice gameplay')){
  await check('native W movement',async()=>{
   // Enter was the last pointer action; moving the cursor needs no canvas click.
   await page.mouse.move(800,470);
   const before=await page.evaluate(()=>PW.game.player.pos.toArray());
   await page.keyboard.down('KeyW');await page.waitForTimeout(650);await page.keyboard.up('KeyW');
   const after=await page.evaluate(()=>PW.game.player.pos.toArray());
   const distance=Math.hypot(...after.map((x,i)=>x-before[i]));
   result.movement={before,after,distance};assert.ok(distance>.5,'W did not move the player');
  });
  await check('native mouse look without pointer lock',async()=>{
   assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false,'unexpected pointer capture before fallback test');
   await page.mouse.move(780,470);await page.waitForTimeout(80);
   const before=await page.evaluate(()=>PW.game.world._lookYaw);
   await page.mouse.move(950,445,{steps:14});await page.waitForTimeout(180);
   const after=await page.evaluate(()=>PW.game.world._lookYaw);
   result.mouseLook={before,after,locked:await page.evaluate(()=>!!document.pointerLockElement)};
   assert.ok(Number.isFinite(after)&&Math.abs(after-before)>.05,'uncaptured mouse did not turn view');
   assert.equal(result.mouseLook.locked,false);
   await page.screenshot({path:`${out}/root-gameplay-after-input.png`});
  });
 }
 await desktop.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 page=await mobile.newPage();watch(page,'mobile-root');
 await check('mobile root top-pinned HUD',async()=>{
  await rootMatch(page,true);
  const bounds=await page.locator('.player-status').boundingBox();result.mobile=bounds;
  assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.y<=16&&bounds.width<=240&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844,'mobile HUD is not compact/top-pinned');
  assert.equal(await page.locator('#hud .combat-dock').isVisible(),false);
  await page.screenshot({path:`${out}/mobile-root.png`});
 });
 await mobile.close();
 const tools=await browser.newContext({viewport:{width:1440,height:900}});
 page=await tools.newPage();watch(page,'studio');
 await check('studio route boots',async()=>{
  const response=await page.goto(new URL('/studio.html',base).href,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.STUDIO?.preview,null,{timeout:60000});
  assert.equal(await page.getByRole('heading',{name:'Character Studio',exact:true}).isVisible(),true);
  assert.ok(await page.locator('#studio canvas').count()>0,'studio renderer canvas absent');
  await page.screenshot({path:`${out}/studio.png`});
 });
 await page.close();page=await tools.newPage();watch(page,'legacy-city');
 await check('citygame route retains legacy title',async()=>{
  const response=await page.goto(new URL('/citygame.html',base).href,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  await page.locator('#title #startBtn').waitFor({state:'visible',timeout:60000});
  assert.equal(await page.locator('#pwTitle:visible').count(),0,'legacy route shows PowerWorld title');
  result.cityTitle=await page.title();await page.screenshot({path:`${out}/legacy-city-title.png`});
 });
 await tools.close();
}finally{
 result.sameOriginResourceFailures=result.networkErrors.filter(r=>r.url.startsWith(base.origin+'/')&&r.failure!=='net::ERR_ABORTED');
 result.passed=result.failures.length===0&&result.pageErrors.length===0&&result.sameOriginResourceFailures.length===0;
 await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));await browser.close();if(!result.passed)process.exitCode=1;
}
