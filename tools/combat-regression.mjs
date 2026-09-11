import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:960,height:600}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const baseURL=process.env.LSW_BASE_URL || 'http://127.0.0.1:5180';
const abilities=[];
let world=null;
let calibration=null;
await mkdir('artifacts/flight-review',{recursive:true});
const save=()=>writeFile('artifacts/flight-review/combat-checks.json',JSON.stringify({baseURL,world,abilities,calibration,errors},null,2));
try{
  await page.goto(`${baseURL}/powerworld.html`);
  await page.waitForFunction(()=>window.LSW?.pwSuite);
  world=await page.evaluate(()=>LSW.pwSuite({quiet:true}));
  console.log('World regression',JSON.stringify({checks:world.checks,failures:world.failures,consoleErrors:world.consoleErrors}));
  // pwSuite restores its caller's title-screen state. Ability measurements need an active
  // simulation; otherwise direct-spawn powers "pass" while movement powers cannot move.
  await page.evaluate(()=>{LSW.game.startMode('training',{p1:'sol'});LSW.game.running=true;LSW.game.world.render=()=>{};});
  const ids=process.argv.includes('--all')?await page.evaluate(()=>LSW.ROSTER.map(d=>d.id)):['sol','kano','vega','titan','gale'];
  for(const id of ids){
    const result=await page.evaluate(id=>LSW.abilitySuite({only:id}),id);
    abilities.push({id,result});console.log(id,JSON.stringify({total:result.total,ok:result.ok,failed:result.failed,needsContext:result.needsContext,failures:result.failures,contextRows:result.contextRows}));
    await save();
  }
  calibration=await page.evaluate(async()=>{
    const hero=LSW.ROSTER.find(d=>d.id==='sol'), original=hero.abilities.lmb;
    try{
      hero.abilities.lmb={type:'__deliberately_unimplemented__',name:'Inert calibration',cost:5,cd:1};
      const row=await LSW.stageAbility('sol','lmb',{resume:true});
      return {ok:!row.ok&&!row.needsContext&&row.evidence.length===0&&row.errors.length===0,row};
    }finally{hero.abilities.lmb=original;}
  });
  console.log('Inert calibration',calibration.ok?'PASS (correctly rejected)':'FAIL');
  await save();
  if(world.failures||world.consoleErrors||errors.length||!calibration.ok||abilities.some(a=>a.result.failed))process.exitCode=1;
}catch(e){errors.push(String(e.stack||e));await save();process.exitCode=1;console.error(e.message);}finally{await browser.close();}
