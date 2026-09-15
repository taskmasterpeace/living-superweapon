import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {checkoutIdentity,assertSameCheckout} from './playtest/identity.mjs';
const base='http://127.0.0.1:5193',out='artifacts/integration-20260915';await mkdir(out,{recursive:true});
const identity=await(await fetch(base+'/__pw_playtest_identity')).json();assertSameCheckout(await checkoutIdentity(process.cwd()),identity);
const result={identity,errors:[],vehicles:[],evidence:'Native squad entry and Shift+V; scripted five-model spawn/boarding/control fixtures'},browser=await chromium.launch({headless:false});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>result.errors.push(e.message));
try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.locator('#hSelect.on').waitFor({timeout:60000});await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,{},{timeout:60000});
 await page.keyboard.press('Shift+V');await page.waitForFunction(()=>PW.game._simActive&&PW.game._simVehicle?.ready,{},{timeout:30000});
 await page.waitForFunction(()=>!PW.game._frontlinePreparing&&PW.game.pwStage?.frontlineReady,{},{timeout:60000});
 result.sim=await page.evaluate(()=>{const g=PW.game;return {mode:g.modeId,active:g._simActive,vehicle:g._simVehicle?.id,structures:['Walls','Water','Ring','BoxRing','Maze','Gate','Defenses'].map(n=>({name:n,present:!!g['_sim'+n]}))}});
 await page.screenshot({path:out+'/proving-ground.png',timeout:15000});
 for(const id of ['motorcycle','tank','mech-light','helicopter','jet-a']){
  const row=await page.evaluate(async id=>{const g=PW.game;await g.deployVehicleSim(id);const a=g._simVehicle;if(!a)throw Error('No vehicle '+id);g._fleetPilot.enter(a,g.player);const before={...a.pos};for(let n=0;n<120;n++){g._fleetPilot._c={fwd:1,turn:.2,bank:.1,throttle:1,pitch:.1,lift:.3,brake:false};g._fleetPilot.update(1/60);}const after={...a.pos};g._fleetPilot.exit();return {id:a.id,cls:a.cls,before,after,moved:Math.hypot(after.x-before.x,after.y-before.y,after.z-before.z),exitCleared:!g.player._fleetVehicle,finite:Object.values(after).every(Number.isFinite)}},id);result.vehicles.push(row);
 }
 result.audio=await page.evaluate(async()=>{const audio=PW.game.audio;const b=await audio.prepareSamples?.();return {prepared:!!b,decoded:b?.filter(Boolean).length,total:b?.length}});
}catch(e){result.error=String(e)}finally{await writeFile(out+'/playable-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
if(result.error||result.errors.length)process.exitCode=1;
