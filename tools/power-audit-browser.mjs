import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

// An isolated activation audit: no prior world bench and no user's saved profile.
// Rendering is disabled during accelerated simulation; this is NOT visual approval.
const baseURL=process.env.LSW_BASE_URL||'http://127.0.0.1:5182';
const out='artifacts/power-audit';
await mkdir(out,{recursive:true});
const result={baseURL,scope:'Fresh browser profile, native handlers, accelerated activation audit; not a visual or balance verdict',errors:[],abilities:[]};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:600}});
 page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(`${baseURL}/powerworld.html`);
 await page.waitForFunction(()=>window.LSW?.stageAbility);
 // Native entry closes the title. Direct startMode leaves titleOpen=true,
 // which correctly pauses animation-timed throws and produces false failures.
 await page.evaluate(()=>{LSW.enter({mode:'training',p1:'sol'});LSW.game.world.render=()=>{};});
 await page.waitForFunction(()=>LSW.game.running&&!LSW.hud.titleOpen);
 const ids=process.argv.includes('--all')?await page.evaluate(()=>LSW.ROSTER.map(d=>d.id)):['rime','torch','specter','webline'];
 for(const id of ids){
  const rows=await page.evaluate(id=>LSW.abilitySuite({only:id}),id);
  result.abilities.push({id,...rows});
  console.log(`${id}: ${rows.ok}/${rows.total} activation checks; ${rows.failed} failed`);
 }
 result.calibration=await page.evaluate(async()=>{
  const hero=LSW.ROSTER.find(d=>d.id==='sol'),original=hero.abilities.lmb;
  try{
   hero.abilities.lmb={type:'__deliberately_unimplemented__',name:'Inert calibration',cost:5,cd:1};
   return await LSW.stageAbility('sol','lmb',{resume:true});
  }finally{hero.abilities.lmb=original;}
 });
 result.runtimeFaults=await page.evaluate(()=>[...(LSW.game._errSeen||[])]);
 assert.equal(result.calibration.ok,false,'inert handler must fail');
 assert.deepEqual(result.calibration.evidence,[]);
 assert.deepEqual(result.errors,[]);
 assert.deepEqual(result.runtimeFaults,[]);
 assert.ok(result.abilities.every(r=>r.failed===0),'Inspect failed ability rows; activation failure is not yet a diagnosed game bug');
}catch(error){result.failure=error.message;process.exitCode=1;}
finally{
 await writeFile(`${out}/activation-results.json`,JSON.stringify(result,null,2));
 await browser.close();
}
console.log(`Evidence: ${out}/activation-results.json`);
