import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/military';await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/studio.html');await page.waitForFunction(()=>window.STUDIO);
 for(const id of ['merc','breach','recon']){
  await page.locator(`[data-hero="${id}"]`).click();await page.getByRole('button',{name:'Front view',exact:true}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('hover');await page.evaluate(()=>{STUDIO.preview.playing=false;STUDIO.preview.seek(1.3);});
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.parts.armR.children[2].userData.gripOccupied),true);
  await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO);await page.locator(`[data-hero="${id}"]`).click();
  await page.getByRole('button',{name:'Front view',exact:true}).click();await page.screenshot({path:`${out}/${id}-studio.png`});
 }
 await page.locator('#playtest').click();await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T,runSlot}=LSW;g.update=()=>{};const rows=[];
  for(const hz of [30,60,120])for(const id of ['merc','breach','recon']){
   g.startMode('powerworld',{p1:id,p2:'kano'});const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
   for(const f of g.entities){f.ai=null;if(f!==a&&f!==b)f.pos.set(1000,1000,1000);}
   for(const f of [a,b]){f.pos.set(0,140,f===a?0:25);f.vel.set(0,0,0);f.invuln=0;f.hp=f.maxHp=1000;f.flying=true;f.gait='airborne';}
   a.faceDir(0,1);b.faceDir(0,-1);a.aim3.set(0,0,1);a.hasAimWorld=true;b.center(a.aimWorld);a._animate(1);b._animate(1);
   const start=a.ki;let lowestKi=start;
   for(let i=0;i<hz*1.5;i++){
    runSlot(a,'lmb',{pressed:i===0,held:i<hz*.6,released:i===Math.ceil(hz*.6),dt:1/hz},g);
    lowestKi=Math.min(lowestKi,a.ki);
    a.update(1/hz,g);b.update(1/hz,g);g.projectiles.update(1/hz,g);
   }
   rows.push({hz,id,damage:1000-b.hp,spentBeforeRegen:start-lowestKi,grip:!!a.parts.armR.children[2].userData.gripOccupied});
  }
  return rows;
 });
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors},null,2));assert.deepEqual(errors,[]);assert.ok(rows.every(r=>r.damage>0&&r.grip&&r.spentBeforeRegen>0));
}finally{await browser.close();}
