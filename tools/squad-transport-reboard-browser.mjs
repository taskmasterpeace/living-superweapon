import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/squad-transport-reboard';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing'&&window.PW.game.pwStage.transport?.state==='parked',{}, {timeout:90000});await page.waitForTimeout(1800);await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.destination,{}, {timeout:30000});
 // Spatial fixture isolates transport controls from the unfinished on-foot route.
 await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;g.player.pos.copy(t.entry);g.player.pos.z+=10;g.player.vel.set(0,0,0);g.player.flying=false;g.player.flyHeld=false;g.player.descendHeld=false;g.world._lookYaw=Math.PI;g.world._lookPitch=0;});await page.waitForTimeout(1000);await page.screenshot({path:out+'/boarding.png'});
 await page.keyboard.down('w');for(let i=0;i<20;i++){await page.waitForTimeout(200);const s=await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;return {p:t.model.worldToLocal(g.player.pos.clone()).toArray(),v:g.player.vel.toArray(),inside:t.insideCabin(g.player)};});console.log(s);if(s.inside)break;}await page.keyboard.up('w');await page.screenshot({path:out+'/inside.png'});console.log(await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;return {local:t.model.worldToLocal(g.player.pos.clone()).toArray(),flying:g.player.flying,inside:t.insideCabin(g.player)};}));await page.evaluate(()=>{const t=window.PW.game.pwStage.transport,original=t.board;t.board=function(f){const r=original.call(this,f);console.log('BOARD_RESULT',r);window.boardAttempt={r,radius:f.radius,scale:f.obj.scale.y,carry:!!f._carry,grabbing:!!f.grabbing,local:this.model.worldToLocal(f.pos.clone()).toArray()};return r;};});await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;g.world._lookYaw=Math.atan2(t.cabin.x-g.player.pos.x,t.cabin.z-g.player.pos.z);});await page.waitForTimeout(250);await page.keyboard.press('g');await page.waitForTimeout(300);console.log(await page.evaluate(()=>window.boardAttempt));await page.waitForFunction(()=>!!window.PW.game.player._passengerTransport,{}, {timeout:5000});await page.screenshot({path:out+'/seated.png'});
 await page.keyboard.press('Enter');await page.waitForFunction(()=>window.PW.game.pwStage.transport.state==='flying',{}, {timeout:5000});await page.waitForTimeout(2000);await page.screenshot({path:out+'/flight.png'});
 await page.keyboard.press('j');if(!await page.evaluate(()=>!!window.PW.game.player._passengerTransport))throw Error('Airborne exit allowed');
 await page.waitForFunction(()=>window.PW.game.pwStage.transport.state==='parked',{}, {timeout:40000});await page.keyboard.press('j');await page.waitForFunction(()=>!window.PW.game.player._passengerTransport,{}, {timeout:5000});await page.screenshot({path:out+'/landed.png'});
 for(const goal of ['entry','cabin']){
  for(let i=0;i<100;i++){
   const done=await page.evaluate(goal=>{const g=window.PW.game,t=g.pwStage.transport,q=t[goal],dx=q.x-g.player.pos.x,dz=q.z-g.player.pos.z;g.world._lookYaw=Math.atan2(dx,dz);return goal==='cabin'?t.insideCabin(g.player):Math.hypot(dx,dz)<3;},goal);
   if(done)break;await page.keyboard.down('w');await page.waitForTimeout(100);
  }await page.keyboard.up('w');
 }
 await page.screenshot({path:out+'/reboard-approach.png'});
 const check=await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;return {inside:t.insideCabin(g.player),local:t.model.worldToLocal(g.player.pos.clone()).toArray(),yaw:t.model.rotation.y};});
 await writeFile(out+'/reboard.json',JSON.stringify(check,null,2));if(!check.inside)throw Error('Landed cabin unreachable');
 await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;g.world._lookYaw=Math.atan2(t.cabin.x-g.player.pos.x,t.cabin.z-g.player.pos.z);});await page.waitForTimeout(250);await page.keyboard.press('g');await page.waitForFunction(()=>!!window.PW.game.player._passengerTransport,{}, {timeout:5000});
 await page.screenshot({path:out+'/reboarded.png'});
 await writeFile(out+'/result.json',JSON.stringify({kind:'native startup/deployment, staged approach position, native W ramp walk/G sit/Enter flight/J safe exit, native movement back to landed ramp and G reboarding; automated camera heading; not full campaign proof',errors,result:await page.evaluate(()=>({state:window.PW.game.pwStage.transport.state,passengers:window.PW.game.pwStage.transport.passengers.size,player:window.PW.game.player.pos.toArray()}))},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
