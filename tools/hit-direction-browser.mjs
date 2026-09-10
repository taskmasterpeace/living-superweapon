import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/hit-direction';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1600,height:900}});
const result={scope:'Staged HUD signals on native Practice. Camera-relative cardinal sources; no combat/damage or animation proof.',rows:[],errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sol');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 for(const [width,height] of [[1600,900],[900,1600],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  for(const bearing of ['front','right','back','left']){
   const row=await page.evaluate(({bearing})=>{
    const g=PW.game,h=g.hud,w=g.world;h.el.hits.replaceChildren();
    const at=g.player.pos.clone(),m=w.camera.matrixWorld.elements;
    const right=at.clone().set(m[0],0,m[2]).normalize(),forward=at.clone().set(-m[8],0,-m[10]).normalize();
    at.addScaledVector(bearing==='left'||bearing==='right'?right:forward,bearing==='left'||bearing==='back'?-100:100);
    for(let i=0;i<12;i++)h.hitDirection(at);
    const e=h.el.hits.lastElementChild,b=e.getBoundingClientRect();
    return {bearing,count:h.el.hits.children.length,x:b.x,y:b.y,width:b.width,height:b.height,html:e.outerHTML};
   },{bearing});result.rows.push({viewport:[width,height],...row});
   // Signals belong in the outer 15% on their correct edge, not a large circle within the field.
   const cx=row.x+row.width/2,cy=row.y+row.height/2;
   assert.ok(bearing==='front'?cy<height*.15:bearing==='back'?cy>height*.85:bearing==='right'?cx>width*.85:cx<width*.15,JSON.stringify(row));
   assert.ok(Math.min(row.width,row.height)<=24,'Damage ribbon is too thick');
   assert.equal(row.count,1,'Repeated beam ticks must not stack opaque ribbons');
  }
  await page.screenshot({path:`${out}/${width}x${height}.png`});
 }
 await page.waitForTimeout(700);assert.equal(await page.locator('#hHits > *').count(),0,'Damage signals must clean up');
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result));}
