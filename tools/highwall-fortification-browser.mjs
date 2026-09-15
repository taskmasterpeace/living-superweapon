import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/highwall/fortification';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const report={method:'Native Highwall; fixed inspection starting points. AI movement uses controlBot/Fighter.update. Diagnostic architecture views explicitly disable player concealment.'};
try{
 await page.route('**/@vite/client',r=>r.fulfill({contentType:'text/javascript',body:`export class ErrorOverlay extends HTMLElement{};export function createHotContext(){return{data:{},accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){}}};export function updateStyle(){};export function removeStyle(){};export function injectQuery(u){return u}`}));
 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=corridor');
 await page.waitForFunction(()=>window.PW?.game?._highwall?.panel&&!document.querySelector('#highwall-loading'),null,{timeout:90000});
 await page.waitForTimeout(700);await page.screenshot({path:out+'/soldier-height.png'});
 report.distance=await page.evaluate(()=>{const g=PW.game,p=g.player,e=g._highwall.units[1];p.pos.set(212,90,-200);e.pos.set(212,90,700);p.aim3.set(0,0,1);p.aim.set(0,0,1);g.updateVision(.1);return {distance:p.pos.distanceTo(e.pos),visible:e.obj.visible,range:String(g.characterSightRange)};});
 assert.equal(report.distance.visible,true);
 await page.getByRole('button',{name:'Start combat',exact:true}).click();
 report.tower=await page.evaluate(()=>{
  const g=PW.game,f=g._highwall.units[2],goal={x:-28,y:48,z:-268};
  f.pos.set(-28,0,-154);f.vel.set(0,0,0);f._highwallOrder={kind:'move',point:goal};delete f._highwallRoute;
  const samples=[];let arrived=false;
  for(let i=0;i<1080;i++){g.dt=1/60;g.time+=g.dt;g.controlBot(f,g.dt);f.update(g.dt,g);if(i%120===0)samples.push(f.pos.toArray());if(Math.hypot(f.pos.x-goal.x,f.pos.z-goal.z)<3&&Math.abs(f.pos.y-goal.y)<.2){arrived=true;break;}}
  return {arrived,position:f.pos.toArray(),samples};
 });
 report.bunker=await page.evaluate(()=>{
  const g=PW.game,f=g._highwall.units[3],goal={x:242,y:12,z:238};
  f.pos.set(235,0,292);f.vel.set(0,0,0);f._highwallOrder={kind:'move',point:goal};delete f._highwallRoute;
  let arrived=false;const samples=[];
  for(let i=0;i<1080;i++){g.dt=1/60;g.time+=g.dt;g.controlBot(f,g.dt);f.update(g.dt,g);if(i%120===0)samples.push(f.pos.toArray());if(Math.hypot(f.pos.x-goal.x,f.pos.z-goal.z)<3&&Math.abs(f.pos.y-goal.y)<.2){arrived=true;break;}}
  return {arrived,position:f.pos.toArray(),samples};
 });
 await page.evaluate(()=>{const g=PW.game,p=g.player;p.pos.set(220,12,241);p.vel.set(0,0,0);p.flying=false;g.world._lookYaw=Math.PI;g.world._lookPitch=0;g.world._chaseSnap=true;document.activeElement?.blur();});
 await page.keyboard.press('e');
 await page.getByRole('dialog',{name:'Highwall live surveillance'}).waitFor({state:'visible',timeout:15000});
 await page.screenshot({path:out+'/native-terminal-controls.png'});
 report.terminal=await page.evaluate(()=>({focus:PW.game._highwall.devices.focus?.kind,target:PW.game._highwall.devices.target.width}));
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!PW.game._highwall.devices.isOpen);
 await page.evaluate(()=>{const g=PW.game;g.fov=false;g.world.setFogEnabled(false);g.update=()=>g.world.render();g.world.surfaceSight.uniforms.wwSightOn.value=0;g.player.pos.set(-247,0,240);g.player.obj.position.copy(g.player.pos);g.player.vel.set(0,0,0);});
 const camera=async(position,look,file,fov=60)=>{await page.evaluate(({position,look,fov})=>{const w=PW.game.world;w.camera.fov=fov;w.camera.updateProjectionMatrix();w.camera.position.set(...position);w.camera.lookAt(...look);w.camera.updateMatrixWorld(true);w.render();},{position,look,fov});await page.screenshot({path:out+'/'+file});};
 await camera([570,570,730],[0,0,0],'battlefield-diagnostic.png',35);
 await camera([-169,30,148],[-169,23,80],'fortified-gate.png',76);
 await camera([280,46,303],[240,22,234],'bunker-approach.png');
 await page.evaluate(()=>PW.game._highwall.devices.renderFeed());
 await camera([243,24,249],[220,20,229],'bunker-terminal.png');
 assert.equal(report.tower.arrived,true,JSON.stringify(report.tower));assert.equal(report.bunker.arrived,true,JSON.stringify(report.bunker));
 report.engineErrors=await page.evaluate(()=>[...PW.game._errSeen.keys()]);assert.deepEqual(report.engineErrors,[]);assert.deepEqual(errors,[]);
}catch(error){report.failure=String(error);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.errors=errors;await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
