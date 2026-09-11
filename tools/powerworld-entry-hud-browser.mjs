import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180',out='artifacts/powerworld-entry-hud-2026-09-11';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.LSW?.game&&document.querySelector('#hSelect.on'));
 await page.waitForSelector('#hSelect .scard.on.portrait-ready');await page.waitForFunction(()=>document.querySelectorAll('#hSelect .scard.portrait-ready').length>=12,null,{timeout:20000});
 assert.equal(await page.locator('#pwTitle').evaluate(element=>getComputedStyle(element).visibility),'hidden','Legacy configuration door is visible behind character selection');
 assert.equal(await page.locator('#pwInventory').count(),0,'Standalone Loadout/Armory button still exists');
 assert.equal(await page.locator('.movement-gears').count(),0,'Duplicate movement-gears panel still exists');
 await page.screenshot({path:`${out}/startup-character-selection.png`});
 await page.keyboard.press('Enter');await page.waitForFunction(()=>LSW.game.running&&LSW.game.pwStage?.frontlineReady&&!LSW.game._frontlinePreparing,null,{timeout:90000});
 const state=await page.evaluate(()=>{
  const {game:g}=LSW,p=g.player,w=g.world;g.update=()=>{};for(const f of g.entities)f.obj.visible=f===p;
  p.pos.set(0,70,0);p.vel.set(38,0,160);p.flying=true;p.gait='airborne';p._openSky=true;p._vis=1;p.movementGear.gear=3;p.movementGear.profile={maxGear:3,air:[1.5,3,5]};
  g.vfx.flightWake(p);const wake=p._flightWake;
  for(let i=0;i<42;i++){p.pos.z+=2.7;p.pos.x=14*Math.sin(i/28);p.obj.position.copy(p.pos);p._animate(1/60);p.obj.updateMatrixWorld(true);wake.update(1/60);}
  p.faceDir(.23,1);w._lookActive=true;w._lookYaw=p.facing;w._lookPitch=0;w.snapChase();w.chase(p,null,1/60,'bfp');w._freeLook.yaw=.72;w._freeLook.held=true;w.chase(p,null,1/60,'bfp');g.hud.update();w.render();
  return {gearPanel:document.querySelector('.movement-gears'),inventory:document.querySelector('#pwInventory'),flight:document.querySelector('.ps-flight')?.textContent,wakeSamples:wake.n,wakeVisible:wake.mesh.visible};
 });
 assert.equal(state.gearPanel,null);assert.equal(state.inventory,null);assert.match(state.flight,/FLIGHT · GEAR III/);assert.ok(state.wakeSamples>20&&state.wakeVisible,'Fast flight did not leave a long visible trail');
 await page.screenshot({path:`${out}/flight-speed-in-player-panel.png`});
 await writeFile(`${out}/evidence.json`,JSON.stringify({base,state,errors},null,2));assert.deepEqual(errors,[]);
 console.log('PASS direct character selection and consolidated flight feedback',state);
}finally{await browser.close();}
