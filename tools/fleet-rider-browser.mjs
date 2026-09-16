// Story 7 browser evidence: the motorcycle rider is VISIBLE, seated on the
// saddle, and leans with the machine. Needs the dev server on 127.0.0.1:5193.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/fleet-rider';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:1440,height:900}});
const r={errors:[]};p.on('pageerror',e=>r.errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5193/powerworld.html');await p.locator('#hSelect.on').waitFor({timeout:60000});
 await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await p.waitForFunction(()=>PW.game.ms?.threatLab?.state==='preparing',null,{timeout:90000});
 await p.keyboard.press('Shift+V');
 await p.waitForFunction(()=>PW.game._simActive&&!PW.game._frontlinePreparing,null,{timeout:60000});
 await p.evaluate(()=>PW.game.deployVehicleSim('motorcycle'));
 await p.waitForFunction(()=>PW.game._fleetActors?.some(a=>a.id==='motorcycle'&&a.ready),null,{timeout:30000});
 await p.keyboard.press('j');
 await p.waitForTimeout(300);
 r.seated=await p.evaluate(()=>{const g=PW.game,a=g._fleetPilot.actor,pl=g.player;return {
  id:a?.id,visible:pl.obj.visible,dx:Math.abs(pl.pos.x-a.pos.x),dz:Math.abs(pl.pos.z-a.pos.z),
  saddle:pl.pos.y-a.pos.y,armX:pl.parts?.armL?.rotation.x,kneeX:pl.parts?.legL?.userData?.knee?.rotation.x}});
 assert.equal(r.seated.visible,true,'the rider is VISIBLE in the real game');
 assert.ok(r.seated.dx<1&&r.seated.dz<1,'seated on the machine');
 assert.ok(r.seated.armX<-0.5,'hands to the bars');
 assert.ok(r.seated.kneeX>0.5,'knees bent to the pegs');
 await p.screenshot({path:out+'/rider-seated.png'});
 await p.keyboard.down('w');await p.waitForTimeout(1200);await p.keyboard.down('d');await p.waitForTimeout(500);
 r.leaning=await p.evaluate(()=>{const g=PW.game,a=g._fleetPilot.actor,pl=g.player;return {lean:a.motion.lean,riderRoll:pl.obj.rotation.z,speed:a.motion.speed}});
 await p.screenshot({path:out+'/rider-leaning.png'});
 await p.keyboard.up('d');await p.keyboard.up('w');
 assert.ok(Math.abs(r.leaning.lean)>0.05,'the bike leans in the turn');
 assert.ok(Math.abs(r.leaning.riderRoll-r.leaning.lean)<0.02,'the rider leans WITH it');
 assert.deepEqual(r.errors,[]);r.verdict='RIDER VISIBLE PASS';
}catch(e){r.failure=String(e);process.exitCode=1;await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,1));await b.close();}
