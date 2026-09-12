import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/squad-transport-touch-walk';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:844,height:390}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.getByRole('button',{name:'Select character',exact:true}).tap();await page.getByRole('button',{name:'Enter with squad',exact:true}).tap();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing'&&window.PW.game.pwStage.transport?.state==='parked',{}, {timeout:90000});await page.waitForTimeout(1800);await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.destination,{}, {timeout:30000});
 // Spatial fixture isolates transport controls from the unfinished on-foot route.
 await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;g.player.pos.copy(t.entry);g.player.pos.z+=10;g.player.vel.set(0,0,0);g.player.flying=false;g.player.flyHeld=false;g.world._lookYaw=Math.PI;g.world._lookPitch=0;});await page.waitForTimeout(1000);await page.screenshot({path:out+'/boarding.png'});
 const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:280}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:230}]});
 await page.waitForFunction(()=>window.PW.game.pwStage.transport.insideCabin(window.PW.game.player),{}, {timeout:12000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
 await page.evaluate(()=>{const g=window.PW.game,t=g.pwStage.transport;g.world._lookYaw=Math.atan2(t.cabin.x-g.player.pos.x,t.cabin.z-g.player.pos.z);});await page.waitForTimeout(250);
 await page.screenshot({path:out+'/inside.png'});await page.locator('[data-b=grab]').tap();await page.waitForFunction(()=>!!window.PW.game.player._passengerTransport,{}, {timeout:5000});await page.screenshot({path:out+'/seated.png'});
 await page.locator('[data-b=transportDepart]').tap();await page.waitForFunction(()=>window.PW.game.pwStage.transport.state==='flying',{}, {timeout:5000});await page.waitForTimeout(2000);await page.screenshot({path:out+'/flight.png'});
 if(!await page.locator('[data-b=transportExit]').isDisabled())throw Error('Exit button enabled airborne');if(!await page.evaluate(()=>!!window.PW.game.player._passengerTransport))throw Error('Airborne exit allowed');
 await page.waitForFunction(()=>window.PW.game.pwStage.transport.state==='parked',{}, {timeout:40000});await page.locator('[data-b=transportExit]').tap();await page.waitForFunction(()=>!window.PW.game.player._passengerTransport,{}, {timeout:5000});await page.screenshot({path:out+'/landed.png'});
 await writeFile(out+'/result.json',JSON.stringify({kind:'native startup/deployment, staged approach position, keyboard portal setup, touch-stick ramp walk and context seating, touch Depart and Exit at 844x390; not navigation or full campaign proof',errors,result:await page.evaluate(()=>({state:window.PW.game.pwStage.transport.state,passengers:window.PW.game.pwStage.transport.passengers.size,player:window.PW.game.player.pos.toArray()}))},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
