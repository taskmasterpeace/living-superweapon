// Native-input reference audit. Does not reposition fighters, replace simulation,
// alter attack data, suppress errors or change the gameplay camera.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/reference-anatomy-audit';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const results=[];
try{
 for(const [label,width,height]of [['landscape',1600,900],['portrait',720,1280]]){
  const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});
  const page=await context.newPage(),video=page.video(),result={label,width,height,native:true,errors:[],samples:[]};results.push(result);
  page.on('pageerror',e=>result.errors.push(String(e)));
  try{
   await page.goto('http://127.0.0.1:5180/powerworld.html?hero=kano');await page.bringToFront();
   await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
   await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
   await page.bringToFront();await page.waitForTimeout(800);
   const sample=async name=>{
    result.samples.push({name,...await page.evaluate(()=>{const g=PW.game;return{hero:g.player.def.id,ki:g.player.ki,faults:[...(g._errSeen||[])],beams:g.projectiles.list.filter(b=>b.path).map(b=>({nodes:b.pn,sustaining:b.sustaining,bodyHit:!!b._bodyContact?.fighter,blocked:b.blocked,muzzle:b.muzzle.toArray(),tip:b.tip.position.toArray(),light:b.light?.position.toArray()})),hud:[...document.querySelectorAll('.status-dock,.trigger-deck,.slots')].map(e=>{const r=e.getBoundingClientRect();return{className:e.className,x:r.x,y:r.y,width:r.width,height:r.height,text:e.innerText}})}})});
    await page.screenshot({path:`${out}/${label}-${name}.png`});
   };
   await sample('idle');await page.mouse.move(width*.5,height*.5);await page.mouse.down();await page.waitForTimeout(900);await sample('charging');await page.mouse.up();
   await page.waitForTimeout(450);await sample('released');await page.waitForTimeout(650);await sample('stream');
   await page.waitForTimeout(1200);await sample('recovery');
  }catch(e){result.error=String(e);await page.screenshot({path:`${out}/${label}-failure.png`}).catch(()=>{});}
  finally{await page.mouse.up().catch(()=>{});await context.close();await video.saveAs(`${out}/${label}-native.webm`);}
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();console.log(JSON.stringify(results));}
