import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/highwall/presentation';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:process.env.HEADLESS!=='0'}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const report={method:'Production Highwall with explicit sight-fixture placement; native world LOS and rendering. Orbit uses existing camera state. Overview is diagnostic, not a player knowledge claim.'};
try{
 await page.route('**/@vite/client',r=>r.fulfill({contentType:'text/javascript',body:`export class ErrorOverlay extends HTMLElement{};export function createHotContext(){return{data:{},accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){}}};export function updateStyle(id,text){let e=document.getElementById(id);if(!e){e=document.createElement('style');e.id=id;document.head.append(e)}e.textContent=text};export function removeStyle(id){document.getElementById(id)?.remove()};export function injectQuery(u,q){return u+(u.includes('?')?'&':'?')+q}`}));
 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=corridor');
 await page.waitForFunction(()=>window.PW?.game?._highwall?.panel&&!document.querySelector('#highwall-loading'),null,{timeout:90000});
 await page.waitForTimeout(1200);await page.screenshot({path:out+'/ready.png'});
 report.behindWall=await page.evaluate(()=>{const g=PW.game,p=g.player,e=g._highwall.units[1];p.pos.set(-247,0,-172);p.vel.set(0,0,0);p.aim.set(0,0,1);p.aim3.set(0,0,1);e.pos.set(-247,0,-148);g.updateVision(.1);return {sight:g._humanSees(p,e),visible:e.obj.visible,team:e.team,playerTeam:p.team};});
 assert.equal(report.behindWall.visible,false);assert.equal(report.behindWall.sight,false);
 await page.evaluate(()=>Object.assign(PW.game.world._freeLook,{latched:true,orbit:true,yaw:Math.PI,pitch:.7,zoom:1.4}));
 await page.waitForTimeout(350);await page.screenshot({path:out+'/orbit-wall.png'});
 assert.equal(await page.evaluate(()=>PW.game._highwall.units[1].obj.visible),false);
 report.overWall=await page.evaluate(()=>{const g=PW.game,p=g.player,e=g._highwall.units[1];p.pos.y=e.pos.y=60;p.aim.set(0,0,1);p.aim3.set(0,0,1);g.updateVision(.1);return {sight:g._humanSees(p,e),visible:e.obj.visible};});
 assert.equal(report.overWall.visible,true);
 report.audio=await page.evaluate(()=>({context:PW.game.audio.ctx.state,loaded:PW.game.audio._bank?.buffers?.size}));
 // Native reset and move inputs after inspection preserve a playable scenario.
 await page.getByRole('button',{name:'Reset',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('#highwall-loading'),null,{timeout:90000});
 const before=await page.evaluate(()=>PW.game.player.pos.toArray());
 await page.evaluate(()=>document.activeElement?.blur());
 await page.keyboard.down('w');try{await page.waitForFunction(before=>Math.hypot(...PW.game.player.pos.toArray().map((n,i)=>n-before[i]))>3,before,{timeout:15000});}finally{await page.keyboard.up('w');}
 const after=await page.evaluate(()=>PW.game.player.pos.toArray());
 report.movement={before,after};assert.ok(Math.hypot(...after.map((n,i)=>n-before[i]))>1,JSON.stringify(report.movement));
 await page.screenshot({path:out+'/native-movement.png'});
 report.engineErrors=await page.evaluate(()=>[...PW.game._errSeen.keys()]);assert.deepEqual(report.engineErrors,[]);
 report.errors=errors;assert.deepEqual(errors,[]);
}catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/visibility.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
