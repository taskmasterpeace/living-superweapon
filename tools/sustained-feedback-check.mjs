import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage();
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const f=g.player,src=g.entities.find(e=>e!==f&&!e.isDummy),failures=[];
  f.invuln=0;f.hitFlash=0;const hp=f.hp;
  for(let i=0;i<60;i++)f.takeDamage(.1,{src,dot:true,hitstop:0});
  const sustained=f.hitFlash;
  if(f.hp>=hp||sustained<=0||sustained>.3)failures.push('sustained hits must damage and signal contact without full-body glare');
  if(f.hitstop>0)failures.push('sustained hits freeze the target');
  f.takeDamage(1,{src,strike:true,hitstop:0});
  f.takeDamage(.1,{src,dot:true,hitstop:0});
  if(f.hitFlash!==1)failures.push('beam suppressed a discrete impact flash');
  f._openSky=false;f.hitFlash=0;f.takeDamage(.1,{src,dot:true,hitstop:0});
  if(f.hitFlash!==1)failures.push('city feedback changed');
  return {sustained,damage:hp-f.hp,failures};
 });
 console.log(JSON.stringify(result,null,2));if(result.failures.length)process.exitCode=1;
}finally{await browser.close();}
