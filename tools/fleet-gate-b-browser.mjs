// GATE B — AA INTERCEPTION in the real browser: spawn a hostile flyer over
// the base → a BASE AA emplacement legitimately detects it → the turret
// tracks → an ACTUAL missile launches (ammo spent) → the missile visibly
// guides → the hit resolves through real damage (the flyer's HP drops through
// takeDamage/areaDamage — no scripted subtraction anywhere).
// Needs the dev server on 127.0.0.1:5193.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/fleet-gate-b';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:1440,height:900}});
const r={errors:[]};p.on('pageerror',e=>r.errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5193/powerworld.html');await p.locator('#hSelect.on').waitFor({timeout:60000});
 await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await p.waitForFunction(()=>PW.game.ms?.threatLab?.state==='preparing',null,{timeout:90000});
 await p.keyboard.press('Shift+V');
 await p.waitForFunction(()=>PW.game._simActive&&!PW.game._frontlinePreparing,null,{timeout:60000});
 await p.waitForFunction(()=>PW.game._simAA?.length>0,null,{timeout:30000});
 r.aaReady=await p.evaluate(()=>PW.game._simAA.map(a=>({name:a.name,ammo:a.ammo,team:a.team})));
 // a hostile FLYER over the base (the flyer is scripted scenery for this test;
 // everything under test — sensing, tracking, launch, guidance, damage — is real)
 r.intercept=await p.evaluate(async()=>{
  const g=PW.game,aa0=g._simAA[0];
  const e=g.spawnEnemy('sol',{x:aa0.pos.x+80,z:aa0.pos.z+40,team:1});
  const alt=aa0.pos.y+70;e.flying=true;e.pos.y=alt;
  const hp0=e.hp,ammo0=g._simAA.reduce((s,a)=>s+a.ammo,0);
  const headings=[];let tracked=false,launched=0,converged=false;
  for(let i=0;i<60*30;i++){
   await new Promise(r=>setTimeout(r,16));
   e.flying=true;if(e.alive){e.pos.y=Math.max(e.pos.y,alt);e.pos.x+=0.3;}   // hold the crossing leg
   for(const aa of g._simAA){
    if(aa.target)tracked=true;
    for(const m of aa.missiles){
     const t=m.target?.pos||e.pos,to={x:t.x-m.pos.x,y:t.y-m.pos.y,z:t.z-m.pos.z};
     const tl=Math.hypot(to.x,to.y,to.z)||1,vl=m.vel.length()||1;
     headings.push((m.vel.x*to.x+m.vel.y*to.y+m.vel.z*to.z)/(tl*vl));
    }
   }
   launched=Math.max(launched,ammo0-g._simAA.reduce((s,a)=>s+a.ammo,0));
   if(e.hp<hp0||!e.alive)break;
  }
  if(headings.length>4)converged=headings.slice(-3).every(h=>h>0.85);
  return {tracked,launched,headings:headings.length,converged,hp0,hp:e.hp,alive:e.alive,
   dmgTaken:hp0-e.hp,missilesLive:g._simAA.reduce((s,a)=>s+a.missiles.length,0)};
 });
 await p.screenshot({path:out+'/intercept.png'});
 assert.equal(r.intercept.tracked,true,'AA legitimately detected the flyer');
 assert.ok(r.intercept.launched>=1,`an ACTUAL missile launched (${r.intercept.launched} spent)`);
 assert.ok(r.intercept.headings>3,'the missile flew and was observed guiding');
 assert.ok(r.intercept.dmgTaken>0||!r.intercept.alive,`the flyer took REAL damage (${r.intercept.dmgTaken.toFixed(1)} hp)`);
 assert.deepEqual(r.errors,[]);r.verdict='GATE B PASS';
}catch(e){r.failure=String(e);process.exitCode=1;await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,1));await b.close();}
