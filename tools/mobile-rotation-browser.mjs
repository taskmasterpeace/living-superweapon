import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/mobile-rotation';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:844,height:844}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).tap();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);
 // Held input fixture tests rotation cancellation, not touch gesture recognition.
 await page.evaluate(()=>{const t=window.PW.game.touch;t.lx=1;t.pressButton('lmb');});
 await page.setViewportSize({width:390,height:844});await page.getByRole('dialog',{name:'Landscape required'}).waitFor();
 const before=await page.evaluate(()=>window.PW.game.time);await page.waitForTimeout(1000);
 const portrait=await page.evaluate(()=>{const g=window.PW.game;return {time:g.time,held:g.touch.cur,axes:[g.touch.lx,g.touch.ly,g.touch.rx,g.touch.ry],portrait:g.touch.portrait};});
 await page.screenshot({path:out+'/portrait.png'});
 if(portrait.time!==before||Object.values(portrait.held).some(Boolean)||portrait.axes.some(Boolean))throw Error(JSON.stringify({before,portrait}));
 await page.setViewportSize({width:844,height:390});await page.getByRole('dialog',{name:'Landscape required'}).waitFor({state:'hidden'});await page.waitForTimeout(300);
 if(!await page.evaluate(t=>window.PW.game.time>t,before))throw Error('Did not resume');
 await page.getByRole('button',{name:'Open inventory',exact:true}).tap();
 await page.setViewportSize({width:390,height:844});await page.getByRole('dialog',{name:'Landscape required'}).waitFor();await page.setViewportSize({width:844,height:390});
 await page.getByRole('dialog',{name:'Inventory',exact:true}).waitFor();await page.getByRole('button',{name:'Return to game',exact:true}).tap();
 await page.screenshot({path:out+'/landscape.png'});await writeFile(out+'/result.json',JSON.stringify({kind:'Mobile browser rotation; keyboard character confirm; held input fixture; native inventory taps',before,portrait,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
