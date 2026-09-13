import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/modular-character';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5184/character-foundation.html');
await page.waitForFunction(()=>window.FOUNDATION);
await page.evaluate(()=>FOUNDATION.set('Idle_Loop',.3));
await page.screenshot({path:out+'/refined-neutral.png'});
await page.evaluate(()=>{const v=FOUNDATION;v.camera.position.set(24,8,0);v.orbit.update();v.draw();});
await page.screenshot({path:out+'/refined-side.png'});
await page.evaluate(()=>{
 const v=FOUNDATION,h=v.actor.getObjectByName('DEF-head');
 h.getWorldPosition(v.orbit.target);v.orbit.target.y+=.5;
 v.camera.position.copy(v.orbit.target);v.camera.position.z+=4.6;
 v.orbit.update();v.draw();
});
for(const name of ['neutral','happy','angry','talkA','talkB','surprised','sad']){
 await page.locator('#expression').selectOption(name);
 await page.evaluate(()=>FOUNDATION.draw());
 await page.screenshot({path:`${out}/face-${name}.png`});
}
await writeFile(out+'/expression-review.json',JSON.stringify({errors,expressions:7},null,2));
await browser.close();
if(errors.length)throw Error(errors.join('\n'));
