import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='D:/lsw/artifacts/marketing/audio-creator-2026-09-12';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});const context=await browser.newContext({viewport:{width:1440,height:1080},recordVideo:{dir:out,size:{width:1440,height:1080}}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.LSW_TEST_URL||'http://127.0.0.1:5184')+'/sound-library.html');await page.waitForFunction(()=>window.AUDIO_WORKSHOP?.library);
 
 await page.getByLabel('Sound type',{exact:true}).selectOption('loop');await page.getByLabel('Recording status',{exact:true}).selectOption('missing');
 await page.screenshot({path:out+'/01-loops-missing.png'});
 await page.getByRole('button',{name:'+ Add sound',exact:true}).click();
 await page.locator('.sl-add [name=label]').fill('Research lab ventilation');await page.locator('.sl-add [name=type]').selectOption('loop');await page.locator('.sl-add textarea').fill('Steady quiet industrial fan. Seamless air movement, no voices or music.');
 await page.getByRole('button',{name:'Save sound entry',exact:true}).click();
 await page.waitForFunction(()=>AUDIO_WORKSHOP.library.cues.some(c=>c.label==='Research lab ventilation'));
 await page.getByLabel('Existing sample',{exact:true}).selectOption('spaceEngineLow_000');
 await page.waitForFunction(()=>Object.values(AUDIO_WORKSHOP.library.state.bindings).some(b=>b.name==='spaceEngineLow_000.mp3'));
 await page.getByRole('button',{name:'Play recording',exact:true}).click();await page.waitForFunction(()=>AUDIO_WORKSHOP.library.lastPlayback?.loop);await page.getByRole('button',{name:'Stop cue',exact:true}).click();
 await page.locator('.sl-detail').evaluate(el=>el.scrollTop=0);await page.screenshot({path:out+'/02-custom-loop-assigned.png'});
 await page.getByLabel('Search sound cues',{exact:true}).fill('weather-rain');await page.locator('[data-cue="weather-rain"]').click();
 const id=await page.evaluate(()=>AUDIO_WORKSHOP.library.cues.find(c=>c.label==='Research lab ventilation').id);
 await page.getByLabel('Reuse recording',{exact:true}).selectOption(id);await page.waitForFunction(()=>AUDIO_WORKSHOP.library.state.bindings['weather-rain']?.name==='spaceEngineLow_000.mp3');
 await page.reload();await page.waitForFunction(()=>window.AUDIO_WORKSHOP?.library);await page.getByLabel('Sound type',{exact:true}).selectOption('loop');await page.getByLabel('Recording status',{exact:true}).selectOption('assigned');
 assert.equal(await page.locator('.sl-list [data-cue]').count(),2);await page.screenshot({path:out+'/03-persisted-assignments.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,customId:id,steps:['filter missing loops','add custom ambient entry','assign existing reference','play and stop loop','reuse recording on connected cue','reload retains both assignments']},null,2));
}finally{await context.close();await browser.close();}
