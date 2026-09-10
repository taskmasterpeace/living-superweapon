import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/close-melee-camera/studio';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByRole('tab',{name:'Camera',exact:true}).click();
 const control=page.getByLabel('Opponent visibility cutaway value',{exact:true});assert.equal(Number(await control.inputValue()),.9);
 await page.getByLabel('Motion state',{exact:true}).selectOption('melee');await page.getByLabel('Melee sequence',{exact:true}).selectOption('heavy');
 await page.evaluate(()=>STUDIO.preview.seek(1.4));
 const read=()=>page.evaluate(()=>({amount:STUDIO.preview.fighter.parts.foreground.uniforms.uCloseAmount.value,view:STUDIO.preview.view,cutaway:STUDIO.preview.fighter.def.model.camera.cutaway}));
 assert.ok((await read()).amount>.5);
 await page.screenshot({path:`${out}/game-view.png`});
 await control.fill('0');await control.press('Tab');await page.evaluate(()=>STUDIO.preview.seek(1.4));assert.equal((await read()).amount,0);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.evaluate(()=>STUDIO.preview.seek(1.4));assert.ok((await read()).amount>.5);
 await page.getByRole('button',{name:'Front view',exact:true}).click();assert.equal((await read()).amount,0,'inspection camera must restore full body immediately');
 await page.getByRole('button',{name:'Game camera',exact:true}).click();await page.evaluate(()=>STUDIO.preview.seek(1.4));assert.ok((await read()).amount>.5);
 await control.fill('0.75');await control.press('Tab');await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Camera',exact:true}).click();assert.equal(Number(await control.inputValue()),.75);
 await page.screenshot({path:`${out}/desktop.png`});
 // An existing saved v1 camera has no cutaway key. Opening it must not modify
 // storage, and the inspector must still offer a finite default (no NaN).
 const legacy=await page.evaluate(()=>{const key='lsw.studio.profiles.v1',data=JSON.parse(localStorage.getItem(key));delete data.sol.camera.cutaway;const raw=JSON.stringify(data);localStorage.setItem(key,raw);return raw;});
 await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('tab',{name:'Camera',exact:true}).click();
 assert.equal(Number(await control.inputValue()),.9);assert.equal(await page.evaluate(()=>localStorage.getItem('lsw.studio.profiles.v1')),legacy);
 await page.setViewportSize({width:390,height:844});await control.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`${out}/mobile.png`});assert.deepEqual(errors,[]);
 await writeFile(`${out}/results.json`,JSON.stringify({saveReload:.75,legacyUntouched:true,inspectionRestores:true,errors},null,2));console.log('PASS cutaway editor, actual preview, undo, save/reload, untouched legacy profile, mobile');
}finally{await context.close();await browser.close();}
