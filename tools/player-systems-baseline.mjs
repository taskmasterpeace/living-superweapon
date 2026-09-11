import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/player-systems/baseline';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');
 await page.waitForFunction(()=>window.PW?.game);
 await page.screenshot({path:`${out}/selection.png`});
 await page.locator('#pwTitle [data-id="vega"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.running&&PW.game.player?.def.id==='vega');
 await page.getByText('Preparing the battlefield',{exact:true}).waitFor({state:'hidden',timeout:60000});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:`${out}/vega-gameplay.png`});
 const state=await page.evaluate(()=>({mode:PW.game.modeId,hero:PW.game.player.def.id,camera:PW.game.world.camera.position.toArray(),running:PW.game.running,url:location.href}));
 await writeFile(`${out}/result.json`,JSON.stringify({scope:'Native title selection and entry; headless capture, not performance evidence',state,errors},null,2));
 console.log(JSON.stringify({state,errors}));
}finally{await browser.close();}
