import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-camera-explore';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1671,height:941}}),results=[];
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwGo').click();
 // Camera-only exploration: remove opponent intent before assets finish so a
 // KO cannot silently turn flight-framing evidence into ragdoll evidence.
 await page.evaluate(()=>{for(const f of LSW.game.entities)if(f!==LSW.game.player)f.ai=null;});
 await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady&&LSW.game.pwStage.convoy?.ready);
 await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145);await page.keyboard.up('Space');await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(500);
 for(const [name,camera]of [['bfp',{}],['field',{range:20,height:6,shoulder:3.5,fov:68}],['close-field',{range:18,height:5,shoulder:4,fov:65}]]){
  await page.evaluate(camera=>{const p=LSW.game.player;p.def.model={...p.def.model,camera};},camera);await page.waitForTimeout(200);await page.screenshot({path:out+'/'+name+'.png'});
  results.push({name,camera,...await page.evaluate(()=>{if(!LSW.game.player.alive)throw Error('Invalid camera witness: player is KO');return {position:LSW.game.player.pos.toArray(),ema:LSW.game.world._ema};})});
 }
 await page.keyboard.up('w');await page.keyboard.up('d');
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
