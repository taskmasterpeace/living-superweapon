// STAGED layout evidence: native Fighter damage resolution, repositioned actor,
// injected damage inputs. Not proof of human aim, projectile collision or feel.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5182',out=resolve(process.env.LSW_IMPACT_OUT||'artifacts/impact-outcome-layout');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1440,height:900}});
const result={staged:true,scope:'Native damage result and comic layout only',rows:[],errors:[]};
page.on('pageerror',e=>result.errors.push(e.message));
try{
 await page.goto(base+'/powerworld.html');
 await page.locator('#pwRoster [data-id="vega"]').click();
 await page.locator('#pwEncounter [data-encounter="frontline"]').click();
 await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady);
 for(const kind of ['armor','shield','body','guard']){
  const row=await page.evaluate(kind=>{
   const g=PW.game,p=g.player,f=g.ms.frontline.soldiers[0];
   f.ai=null;f.pos.copy(p.pos).addScaledVector(p.aim3,30);f.pos.y=p.pos.y;f.vel.set(0,0,0);f._sync();
   f.hp=f.maxHp;f.invuln=0;f.armor=kind==='armor'?100:0;f._shieldHp=kind==='shield'?100:0;
   f.guarding=kind==='guard';f.guardMeter=1;f.faceDir(p.pos.x-f.pos.x,p.pos.z-f.pos.z);
   g.comic.clear?.();g._impactFeedbackTimes=new WeakMap();
   const before=f.hp;f.takeDamage(20,{src:p,dtype:'ballistic',ballistic:true,dir:p.aim3});
   return {kind,before,after:f.hp,loss:before-f.hp,words:g.comic.items.filter(i=>i.node?.dataset?.impact).map(i=>({text:i.node.textContent,id:i.node.dataset.impact}))};
  },kind);
  await page.waitForTimeout(80);
  await page.screenshot({path:resolve(out,`${kind}.png`)});
  result.rows.push(row);await page.waitForTimeout(1100);
 }
}catch(e){result.errors.push(String(e));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});}
finally{await browser.close();await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}
if(result.errors.length)process.exitCode=1;
