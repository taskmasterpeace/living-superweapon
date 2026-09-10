import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-piloting';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false}),page=await browser.newPage({viewport:{width:1672,height:941}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));const result={kind:'Real keyboard flight after positioning grounded MERC next to parked craft; not walking navigation proof'};
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=merc');await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&PW.game.pwStage.aircraft?.ready,null,{timeout:60000});
 await page.evaluate(()=>{window.pilotFaults=[];const g=PW.game,report=g.reportError.bind(g);g.reportError=(e,c)=>{pilotFaults.push(e.stack);report(e,c);};});
 result.parked=await page.evaluate(()=>PW.game.pwStage.aircraft.actors.filter(a=>a.pilotable).map(a=>({kind:a.kind,pos:a.wrapper.position.toArray(),radius:a.bodyRadius,offset:a.groundOffset})));
 assert.equal(result.parked.length,2,'Both parked aircraft must find actual clear terrain');
 for(const kind of process.env.AIRCRAFT_ONLY?[process.env.AIRCRAFT_ONLY]:['helicopter','jet']){
  await page.evaluate(kind=>{const g=PW.game,p=g.player,a=g.pwStage.aircraft.actors.find(a=>a.pilotable&&a.kind===kind);window.testCraft=a;
   p.pos.set(a.wrapper.position.x+a.bodyRadius+4,a.ground,a.wrapper.position.z);p.vel.set(0,0,0);p.flying=false;g.world._lookActive=true;g.world._lookYaw=a.yaw;g.world._lookPitch=.1;g.world._chaseSnap=true;
  },kind);
  await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!!PW.game.player._aircraftVehicle,null,{timeout:5000});
  const start=await page.evaluate(()=>testCraft.wrapper.position.toArray());
  if(kind==='helicopter'){
   await page.keyboard.down('Space');await page.waitForTimeout(3200);await page.keyboard.up('Space');
   await page.keyboard.down('KeyW');await page.waitForTimeout(1600);await page.keyboard.up('KeyW');
  }else{await page.keyboard.down('KeyR');await page.keyboard.down('KeyS');await page.waitForTimeout(4600);await page.keyboard.up('KeyS');await page.keyboard.up('KeyR');}
  result[kind]=await page.evaluate(()=>({pos:testCraft.wrapper.position.toArray(),speed:testCraft.speed,parked:testCraft.parked,destroyed:!!testCraft.destroyed,seated:!!PW.game.player._aircraftVehicle,hidden:!PW.game.player.obj.visible,cam:PW.game.world.camMode}));
  assert.ok(result[kind].seated,`${kind} pilot survived native movement`);assert.ok(result[kind].pos[1]>start[1]+20,`${kind} took off`);assert.ok(Math.hypot(result[kind].pos[0]-start[0],result[kind].pos[2]-start[2])>20,`${kind} moved forward`);assert.equal(result[kind].hidden,true);
  await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();await page.screenshot({path:out+`/${kind}-piloting.png`});
  if(kind==='helicopter'){
   // Return toward the known clear departure footprint before descending;
   // landing on the nearby parked jet is deliberately a real collision.
   await page.keyboard.down('KeyS');await page.waitForTimeout(1600);await page.keyboard.up('KeyS');await page.waitForTimeout(2500);
   await page.keyboard.down('KeyZ');await page.waitForFunction(()=>testCraft.parked||testCraft.destroyed,null,{timeout:10000});await page.keyboard.up('KeyZ');assert.equal(await page.evaluate(()=>!!testCraft.destroyed),false,'Clear-pad helicopter landing');
   await page.waitForTimeout(1200);await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!PW.game.player._aircraftVehicle,null,{timeout:5000});
  }
 }
 result.performance=await page.evaluate(async()=>{
  const frames=[];let last=performance.now();for(let i=0;i<60;i++)await new Promise(resolve=>requestAnimationFrame(now=>{frames.push(now-last);last=now;resolve();}));
  const w=PW.game.world,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {headed:true,frameSamples:frames.length,meanRafMs:frames.reduce((a,b)=>a+b,0)/frames.length,emaMs:w._ema,fps:w.fps,renderCalls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
 });
 result.faults=await page.evaluate(()=>pilotFaults);assert.deepEqual(result.faults,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(e){result.error=e.stack;result.last=await page.evaluate(()=>({craft:window.testCraft?{pos:testCraft.wrapper.position.toArray(),parked:testCraft.parked,dead:testCraft.destroyed,occupant:!!testCraft.occupant}:null,faults:window.pilotFaults})).catch(()=>null);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
finally{result.errors=errors;await writeFile(out+'/results.json',JSON.stringify(result,null,2));await browser.close();}
