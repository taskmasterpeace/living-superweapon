import {chromium} from 'playwright';import {mkdir} from 'node:fs/promises';
const out='artifacts/marketing/bow-draw-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out}}),page=await context.newPage();
await page.goto('http://127.0.0.1:5184/studio.html?hero=gale');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
await page.evaluate(()=>{const v=STUDIO.preview;v.playing=false;cancelAnimationFrame(v.raf);v.controls.enabled=false;v.controls.update=()=>{};const f=v.fighter;f._openSky=true;f.flying=false;f.gait='grounded';f.pos.set(0,0,0);f.vel.set(0,0,0);});
for(let i=0;i<140;i++){
 await page.evaluate(i=>{const v=STUDIO.preview,f=v.fighter;f._bowDrawT=i>=10&&i<85?Math.min(1,(i-9)/50):0;f.update(1/60,v.combat.game);v.camera.position.copy(f.pos).add({x:10,y:8,z:12});v.camera.lookAt(f.pos.x,f.pos.y+5,f.pos.z+1);v.renderer.render(v.scene,v.camera);},i);
 if([25,60,90,130].includes(i))await page.screenshot({path:`${out}/draw-${i}.png`});await page.waitForTimeout(17);
}
const video=page.video();await context.close();await video.saveAs(`${out}/bow-draw.webm`);await browser.close();
