import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='artifacts/highwall-fleet';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const report={method:'Production Highwall deep link, scenario dropdown and native J/W/A/Space/Control keys. Vite live reload disabled to keep the test stable during concurrent edits. No direct enter/drive/exit calls.',errors:[],scenarios:{}};
page.on('pageerror',e=>report.errors.push(e.message));
const sample=()=>page.evaluate(()=>{
 const g=PW.game,h=g._highwall,a=h?.vehicle,p=g.player;
 return {preset:h?.preset,ready:h?.ready,error:h?.error,boarded:g._fleetPilot?.actor?.id||null,player:{position:p?.pos.toArray(),alive:p?.alive,flightTier:p?.flightTier,visible:p?.obj.visible},vehicle:a?{id:a.id,position:{...a.pos},radius:a.bodyRadius,height:a.bodyHeight,yaw:a.motion.yaw,speed:a.motion.speed,roll:a.motion.rollSpin,hips:Object.values(a.parts?.legs||{}).map(l=>l.hip.rotation.x)}:null,controls:document.getElementById('fleetControls')?.textContent};
});
try{
 await page.route('**/@vite/client',route=>route.fulfill({contentType:'text/javascript',body:`
 export class ErrorOverlay extends HTMLElement {}
 export function createHotContext(){return {data:{},accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){}}}
 const styles=new Map();export function updateStyle(id,text){let el=styles.get(id);if(!el){el=document.createElement('style');styles.set(id,el);document.head.append(el)}el.textContent=text}
 export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}
 export function injectQuery(url,query){return url+(url.includes('?')?'&':'?')+query}
 `}));
 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=vehicle');
 await page.getByLabel('Highwall scenario').waitFor({timeout:60000});
 for(const scenario of ['vehicle','motorcycle','mech','helicopter']){
  await page.getByLabel('Highwall scenario').selectOption(scenario);
  await page.waitForFunction(id=>PW.game._highwall?.preset===id&&(PW.game._highwall.vehicle?.ready||PW.game._highwall.error),scenario,{timeout:90000});
  await page.waitForTimeout(800);
  const result=report.scenarios[scenario]={before:await sample()};
  await page.screenshot({path:`${out}/${scenario}-ready.png`});
  if(result.before.error){result.failure=result.before.error;continue;}
  await page.keyboard.press('j');await page.waitForTimeout(300);result.boarded=await sample();
  if(!result.boarded.boarded){result.failure='Native J did not board from scenario spawn.';continue;}
  assert.doesNotMatch(result.boarded.controls,/L next vehicle/,'Highwall must not advertise unavailable simulation shortcut');
  if(scenario==='helicopter'){
   await page.keyboard.down('Space');await page.waitForTimeout(1300);await page.keyboard.up('Space');
   result.raised=await sample();await page.screenshot({path:`${out}/${scenario}-airborne.png`});
   await page.keyboard.press('j');await page.waitForTimeout(200);result.airExitAttempt=await sample();
   await page.keyboard.down('w');await page.keyboard.down('a');await page.waitForTimeout(400);await page.keyboard.up('a');await page.keyboard.up('w');
   result.moving=await sample();
   await page.keyboard.down('ControlLeft');await page.waitForFunction(()=>PW.game._fleetPilot.actor?.pos.y<1,null,{timeout:15000});await page.keyboard.up('ControlLeft');
  }else{
   await page.keyboard.down('w');await page.keyboard.down('a');await page.waitForTimeout(900);
   result.moving=await sample();await page.screenshot({path:`${out}/${scenario}-moving.png`});await page.keyboard.up('a');await page.keyboard.up('w');
   await page.keyboard.down('Space');await page.waitForTimeout(400);await page.keyboard.up('Space');
  }
  result.afterDrive=await sample();await page.screenshot({path:`${out}/${scenario}-drive.png`});
  await page.keyboard.press('j');await page.waitForTimeout(300);result.exited=await sample();
  await page.screenshot({path:`${out}/${scenario}-exit.png`});
  try{
   assert.equal(result.exited.boarded,null,'Native J should exit after landing/stopping');
   assert.equal(result.exited.player.visible,true);
   if(scenario==='helicopter'){
    assert.ok(result.raised.vehicle.position.y>result.before.vehicle.position.y+6,'Helicopter should rise');
    assert.equal(result.airExitAttempt.boarded,'helicopter','Non-flyer cannot exit in air');
   }else{
    assert.notEqual(result.moving.vehicle.yaw,result.boarded.vehicle.yaw,'Native A should steer');
    assert.notDeepEqual(result.afterDrive.vehicle.position,result.before.vehicle.position,'Native W should drive');
    if(scenario==='mech')assert.notDeepEqual(result.moving.vehicle.hips,result.before.vehicle.hips,'Mech legs should articulate');
   }
  }catch(e){result.failure=e.message;}
 }
 assert.deepEqual(report.errors,[],'No browser exceptions');
 assert.equal(Object.values(report.scenarios).filter(s=>s.failure).length,0,'Every scenario must pass');
}catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
